// 预算控制与监控系统
// 基于技术架构文档的多层预算控制实现

import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from './database-config';
import type { BudgetInfo, ApiResponse } from '@/types';

export class BudgetGuardian {
  private monthlyLimitCents: number;
  private warningThresholds = [0.8, 0.95]; // 80%, 95%
  
  constructor() {
    this.monthlyLimitCents = parseInt(process.env.MONTHLY_BUDGET_CENTS!) || 1000000; // ¥10,000
  }
  
  async checkBudget(req: NextRequest): Promise<{
    allowed: boolean;
    budgetInfo?: BudgetInfo;
    error?: string;
    retryAfter?: number;
  }> {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      const budgetInfo = await this.getCurrentBudgetInfo(currentMonthYear);
      const usageRatio = budgetInfo.usedCents / this.monthlyLimitCents;
      
      // 硬限制：100%
      if (budgetInfo.usedCents >= this.monthlyLimitCents) {
        return {
          allowed: false,
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          retryAfter: this.getSecondsUntilNextMonth()
        };
      }
      
      // 软限制：95% 时降级服务
      if (usageRatio >= 0.95) {
        // 只允许付费用户使用，或限制为低质量模式
        const userPlan = await this.getUserPlan(req);
        if (userPlan !== 'premium') {
          return {
            allowed: false,
            error: 'QUOTA_NEARLY_EXCEEDED',
            budgetInfo
          };
        }
      }
      
      // 预警
      if (usageRatio >= 0.8) {
        await this.sendBudgetAlert(usageRatio, budgetInfo.usedCents);
      }
      
      return {
        allowed: true,
        budgetInfo
      };
      
    } catch (error) {
      console.error('Budget check failed:', error);
      // 预算检查失败时，采用保守策略
      return {
        allowed: false,
        error: 'SERVICE_UNAVAILABLE'
      };
    }
  }
  
  private async getCurrentBudgetInfo(monthYear: string): Promise<BudgetInfo> {
    return await withDatabase(async (pg) => {
      const result = await pg.query(`
        SELECT total_cost_cents, total_api_calls, total_images_generated
        FROM usage_stats 
        WHERE month_year = $1
      `, [monthYear]);
      
      const usage = result.rows[0];
      const usedCents = usage?.total_cost_cents || 0;
      
      return {
        totalCents: this.monthlyLimitCents,
        usedCents,
        remaining: this.monthlyLimitCents - usedCents,
        usagePercent: (usedCents / this.monthlyLimitCents) * 100,
        monthYear
      };
    });
  }
  
  private async getUserPlan(req: NextRequest): Promise<string> {
    // TODO: 从JWT token中提取用户信息
    // 暂时返回free用户
    return 'free';
  }
  
  private getSecondsUntilNextMonth(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.floor((nextMonth.getTime() - now.getTime()) / 1000);
  }
  
  private async sendBudgetAlert(usageRatio: number, currentCost: number): Promise<void> {
    console.log(`⚠️ 预算警告: 使用率 ${(usageRatio * 100).toFixed(1)}%, 已花费 ¥${(currentCost / 100).toFixed(2)}`);
    
    // TODO: 发送邮件或其他通知
    // 暂时只记录日志
  }
}

// 预算检查中间件
export async function budgetMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const guardian = new BudgetGuardian();
  const result = await guardian.checkBudget(req);
  
  if (!result.allowed) {
    if (result.error === 'SERVICE_TEMPORARILY_UNAVAILABLE') {
      return NextResponse.json({
        error: result.error,
        message: 'Service temporarily unavailable due to high demand. Please try again next month.',
        retryAfter: result.retryAfter
      }, { status: 503 });
    }
    
    if (result.error === 'QUOTA_NEARLY_EXCEEDED') {
      return NextResponse.json({
        error: result.error,
        message: 'Monthly quota nearly exceeded. Upgrade to premium for continued access.',
        upgradeUrl: '/pricing',
        budgetInfo: result.budgetInfo
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable.'
    }, { status: 503 });
  }
  
  // 在响应头中添加预算信息（用于前端显示）
  const response = NextResponse.next();
  if (result.budgetInfo) {
    response.headers.set('X-Budget-Usage', (result.budgetInfo.usagePercent / 100).toFixed(2));
    response.headers.set('X-Budget-Remaining-Cents', result.budgetInfo.remaining.toString());
  }
  
  return null; // 允许继续处理
}

// 获取用户预算信息的API函数
export async function getUserBudgetInfo(): Promise<ApiResponse<BudgetInfo>> {
  try {
    const guardian = new BudgetGuardian();
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    
    const budgetInfo = await guardian.getCurrentBudgetInfo(currentMonthYear);
    
    return {
      success: true,
      data: budgetInfo
    };
    
  } catch (error) {
    console.error('Failed to get budget info:', error);
    return {
      success: false,
      error: 'BUDGET_INFO_ERROR',
      message: 'Failed to retrieve budget information'
    };
  }
}