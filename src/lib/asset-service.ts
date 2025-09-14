// 资源管理服务
// 基于技术架构文档的实现

import { withDatabase } from './database-config';
import type { Asset, BillingEvent, ApiResponse } from '@/types';

// 更新资源状态
export async function updateAssetStatus(
  assetId: string, 
  status: Asset['status'], 
  additionalData?: Partial<Asset>
): Promise<void> {
  await withDatabase(async (pg) => {
    const updateFields = ['status = $2', 'updated_at = NOW()'];
    const values = [assetId, status];
    let paramIndex = 3;
    
    // 动态添加额外字段
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
    }
    
    const query = `
      UPDATE assets 
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `;
    
    await pg.query(query, values);
    
    console.log(`📊 资源状态已更新: ${assetId} -> ${status}`);
  });
}

// 创建新资源
export async function createAsset(data: {
  projectId: string;
  sourceSketchId: string;
  positionInProject?: number;
}): Promise<Asset> {
  return await withDatabase(async (pg) => {
    const result = await pg.query(`
      INSERT INTO assets (
        project_id, 
        source_sketch_id, 
        position_in_project,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'pending', NOW(), NOW())
      RETURNING *
    `, [data.projectId, data.sourceSketchId, data.positionInProject || 0]);
    
    const asset = result.rows[0];
    console.log(`✅ 新资源已创建: ${asset.id}`);
    
    return asset;
  });
}

// 获取资源状态
export async function getAssetStatus(assetId: string): Promise<ApiResponse<Asset>> {
  try {
    const asset = await withDatabase(async (pg) => {
      const result = await pg.query(`
        SELECT 
          id, 
          project_id,
          source_sketch_id,
          storage_url,
          status, 
          error_message, 
          error_code,
          position_in_project,
          ai_model_version,
          generation_seed,
          processing_time_ms,
          created_at,
          updated_at 
        FROM assets 
        WHERE id = $1
      `, [assetId]);
      
      return result.rows[0] || null;
    });
    
    if (!asset) {
      return {
        success: false,
        error: 'ASSET_NOT_FOUND',
        message: 'Asset not found'
      };
    }
    
    return {
      success: true,
      data: asset
    };
    
  } catch (error) {
    console.error('Failed to get asset status:', error);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Failed to retrieve asset status'
    };
  }
}

// 记录计费事件
export async function recordBillingEvent(
  assetId: string, 
  userId: string, 
  costCents: number, 
  apiCalls: number = 1
): Promise<void> {
  await withDatabase(async (pg) => {
    await pg.query(`
      INSERT INTO billing_events (asset_id, user_id, cost_cents, api_calls, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      ON CONFLICT (asset_id) 
      DO UPDATE SET 
        cost_cents = $3,
        api_calls = $4,
        status = 'pending'
    `, [assetId, userId, costCents, apiCalls]);
    
    console.log(`💰 计费事件已记录: ${assetId} - ¥${(costCents / 100).toFixed(2)}`);
  });
}

// 获取用户本月使用情况
export async function getUserMonthlyUsage(userId: string): Promise<{
  totalCostCents: number;
  totalImages: number;
  remainingBudget: number;
}> {
  return await withDatabase(async (pg) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-08"
    
    const result = await pg.query(`
      SELECT 
        COALESCE(SUM(be.cost_cents), 0) as total_cost_cents,
        COALESCE(COUNT(be.asset_id), 0) as total_images
      FROM billing_events be
      JOIN assets a ON be.asset_id = a.id
      WHERE be.user_id = $1 
        AND DATE_TRUNC('month', be.created_at) = DATE_TRUNC('month', NOW())
        AND be.status = 'processed'
    `, [userId]);
    
    const usage = result.rows[0];
    const monthlyBudgetCents = 10000 * 100; // ¥10,000
    
    return {
      totalCostCents: parseInt(usage.total_cost_cents) || 0,
      totalImages: parseInt(usage.total_images) || 0,
      remainingBudget: monthlyBudgetCents - (parseInt(usage.total_cost_cents) || 0)
    };
  });
}

// 获取资源列表
export async function getProjectAssets(projectId: string): Promise<Asset[]> {
  return await withDatabase(async (pg) => {
    const result = await pg.query(`
      SELECT * FROM assets 
      WHERE project_id = $1 
      ORDER BY position_in_project, created_at
    `, [projectId]);
    
    return result.rows;
  });
}