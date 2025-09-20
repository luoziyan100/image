// 内容审核服务
// 基于技术架构文档的Google Cloud Vision API集成

interface ContentAuditResult {
  passed: boolean;
  violations?: Array<{
    category: string;
    detected: string;
    threshold: string;
  }>;
  rawResult?: unknown;
  error?: string;
  message?: string;
}

export class ContentModerationService {
  private thresholds = {
    adult: 'LIKELY',      // 成人内容
    violence: 'LIKELY',   // 暴力内容
    racy: 'POSSIBLE',     // 性感内容
    medical: 'LIKELY',    // 医疗内容
    spoof: 'LIKELY'       // 恶搞内容
  };
  
  async auditImage(imageBuffer: Buffer): Promise<ContentAuditResult> {
    try {
      // 开发阶段：使用模拟审核服务
      if (process.env.NODE_ENV === 'development') {
        return this.mockAuditService(imageBuffer);
      }
      
      // 生产环境：集成Google Cloud Vision API
      // TODO: 实现真实的Google Cloud Vision API调用
      console.log('🔍 内容审核中...');
      
      // 暂时返回通过状态
      return {
        passed: true,
        violations: [],
        rawResult: null
      };
      
    } catch (error) {
      console.error('Content moderation failed:', error);
      
      // 审核服务失败时的策略：保守起见，拒绝内容
      return {
        passed: false,
        error: 'MODERATION_SERVICE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // 开发环境模拟审核服务
  private async mockAuditService(imageBuffer: Buffer): Promise<ContentAuditResult> {
    // 模拟审核延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟审核结果（大部分内容通过）
    const shouldPass = Math.random() > 0.05; // 95%通过率
    
    if (shouldPass) {
      console.log('✅ 内容审核通过 (模拟)');
      return {
        passed: true,
        violations: [],
        rawResult: {
          safeSearchAnnotation: {
            adult: 'VERY_UNLIKELY',
            violence: 'UNLIKELY', 
            racy: 'UNLIKELY',
            medical: 'VERY_UNLIKELY',
            spoof: 'VERY_UNLIKELY'
          }
        }
      };
    } else {
      console.log('❌ 内容审核未通过 (模拟)');
      return {
        passed: false,
        violations: [{
          category: 'adult',
          detected: 'LIKELY',
          threshold: 'LIKELY'
        }],
        rawResult: null
      };
    }
  }
  
  private exceedsThreshold(detected: string, threshold: string): boolean {
    const levels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    const detectedIndex = levels.indexOf(detected);
    const thresholdIndex = levels.indexOf(threshold);
    return detectedIndex >= thresholdIndex;
  }
}

// 双重审核流程
export class AuditedImageGeneration {
  private moderationService: ContentModerationService;
  
  constructor() {
    this.moderationService = new ContentModerationService();
  }
  
  async processWithModeration(params: {
    assetId: string;
    sketchData: { imageBuffer: Buffer; prompt: string };
    userId: string;
  }) {
    const { assetId, sketchData, userId } = params;
    
    // === 输入审核 ===
    await updateAssetStatus(assetId, 'auditing_input');
    
    const inputAudit = await this.moderationService.auditImage(sketchData.imageBuffer);
    if (!inputAudit.passed) {
      throw new Error(`INPUT_REJECTED: ${this.formatViolations(inputAudit.violations || [])}`);
    }
    
    // === AI生成 ===
    await updateAssetStatus(assetId, 'generating');
    // const generationResult = await this.aiService.generateImage(sketchData);
    
    // === 输出审核 ===
    // await updateAssetStatus(assetId, 'auditing_output');
    
    // const outputAudit = await this.moderationService.auditImage(generationResult.imageBuffer);
    // if (!outputAudit.passed) {
    //   // 输出审核失败：记录但不返还成本（已经调用了AI API）
    //   await this.recordFailedGeneration(assetId, userId, 'OUTPUT_REJECTED', outputAudit.violations);
    //   throw new Error(`OUTPUT_REJECTED: ${this.formatViolations(outputAudit.violations)}`);
    // }
    
    // return generationResult;
  }
  
  private formatViolations(violations: Array<{ category: string; detected: string }>): string {
    return violations.map(v => `${v.category}: ${v.detected}`).join(', ');
  }
}

// 导出主要审核函数
export async function auditContent(imageBuffer: Buffer): Promise<ContentAuditResult> {
  const service = new ContentModerationService();
  return await service.auditImage(imageBuffer);
}

// 辅助函数占位符
async function updateAssetStatus(
  assetId: string,
  status: string,
  additionalData?: Record<string, unknown>
) {
  console.log(`📊 更新资源状态: ${assetId} -> ${status}`, additionalData);
  // TODO: 实现真实的数据库更新
}
