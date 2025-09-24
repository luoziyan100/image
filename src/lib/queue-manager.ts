// BullMQ 异步任务队列管理
// 基于技术架构文档的实现

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from './database-config';
import { processImageGeneration } from './image-generation-service';
import { auditContent } from './content-moderation-service';
import { updateAssetStatus, recordBillingEvent } from './asset-service';
import { uploadToS3 } from './s3-service';
import type { GenerationJobData } from '@/types';

interface GenerationJobResult {
  success: boolean;
  assetId: string;
  storageUrl: string;
}

// 队列定义
const redisConnection = getRedisClient();

export const imageQueue = new Queue<GenerationJobData, GenerationJobResult, string>('image-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1分钟起始延迟
    },
    removeOnComplete: 100, // 保留最近100个完成任务
    removeOnFail: 50,      // 保留最近50个失败任务
  }
});

// 任务类型定义
export const JOB_TYPES = {
  GENERATE_SINGLE_IMAGE: 'generate-single-image',
  PROCESS_VIDEO: 'process-video', // Phase 2
  CLEANUP_RESOURCES: 'cleanup-resources'
} as const;

// 环境开关：是否在当前进程启动 Worker
const WORKER_ENABLED = process.env.ENABLE_QUEUE_WORKER === 'true';

// Worker 进程实例（默认不在导入时启动，避免在Next服务进程内重复消费）
export let imageGenerationWorker: Worker<GenerationJobData, GenerationJobResult> | null = null;

async function workerProcessor(job: Job<GenerationJobData>): Promise<GenerationJobResult> {
  const { assetId, sketchData, userId } = job.data;
  
  try {
    console.log(`🚀 开始处理图片生成任务: ${assetId}`);
    
    // 更新状态: pending -> auditing_input
    await updateAssetStatus(assetId, 'auditing_input');
    
    // Step 1: 输入内容审核
    const inputAuditResult = await auditContent(sketchData.imageBuffer);
    if (!inputAuditResult.passed) {
      const inputReason = formatModerationReason(inputAuditResult);
      throw new Error(`INPUT_REJECTED: ${inputReason}`);
    }
    
    // 更新状态: auditing_input -> generating  
    await updateAssetStatus(assetId, 'generating');
    
    // Step 2: 调用AI生成
    const generationResult = await processImageGeneration(sketchData);
    
    // 更新状态: generating -> auditing_output
    await updateAssetStatus(assetId, 'auditing_output');
    
    // Step 3: 输出内容审核
    const outputAuditResult = await auditContent(generationResult.imageBuffer);
    if (!outputAuditResult.passed) {
      const outputReason = formatModerationReason(outputAuditResult);
      throw new Error(`OUTPUT_REJECTED: ${outputReason}`);
    }
    
    // 更新状态: auditing_output -> uploading
    await updateAssetStatus(assetId, 'uploading');
    
    // Step 4: 上传到S3
    const s3Url = await uploadToS3(generationResult.imageBuffer, assetId);
    
    // Step 5: 更新最终状态
    await updateAssetStatus(assetId, 'completed', { 
      storageUrl: s3Url,
      ...(typeof generationResult.processingTimeMs === 'number'
        ? { processingTimeMs: generationResult.processingTimeMs }
        : {}),
      ...(generationResult.modelVersion
        ? { aiModelVersion: generationResult.modelVersion }
        : {}),
      ...(typeof generationResult.seed === 'number'
        ? { generationSeed: generationResult.seed }
        : {})
    });
    
    // Step 6: 记录成本事件
    const GENERATION_COST_CENTS = 7; // ¥0.07 per image
    await recordBillingEvent(assetId, userId, GENERATION_COST_CENTS);
    
    console.log(`✅ 图片生成完成: ${assetId}`);
    
    return {
      success: true,
      assetId,
      storageUrl: s3Url
    };
    
  } catch (error) {
    console.error(`❌ 图片生成失败: ${assetId}`, error);
    
    await updateAssetStatus(assetId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof Error ? error.message.split(':')[0] : 'UNKNOWN_ERROR'
    });
    
    throw error;
  }
}

export function startImageGenerationWorker(options?: { concurrency?: number }) {
  if (imageGenerationWorker) {
    console.log('ℹ️ Worker already started');
    return imageGenerationWorker;
  }
  imageGenerationWorker = new Worker<GenerationJobData, GenerationJobResult>('image-generation', workerProcessor, {
    connection: redisConnection,
    concurrency: options?.concurrency ?? 3,
    limiter: { max: 5, duration: 60000 }
  });

  // Worker 事件监听
  imageGenerationWorker.on('completed', (job, result) => {
    console.log(`🎉 Worker完成任务: ${job.id}`, result);
  });
  
  imageGenerationWorker.on('failed', (job, error) => {
    console.error(`💥 Worker任务失败: ${job?.id}`, error);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('⏹️ 正在关闭队列系统...');
    await imageQueue.close();
    if (imageGenerationWorker) {
      await imageGenerationWorker.close();
    }
    console.log('✅ 队列系统已关闭');
    process.exit(0);
  });

  return imageGenerationWorker;
}

// 队列管理器
export class QueueManager {
  private static instance: QueueManager;
  
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  
  // 添加图片生成任务
  async addImageGenerationJob(data: GenerationJobData, options?: {
    priority?: number;
    delay?: number;
  }): Promise<Job<GenerationJobData>> {
    const job = await imageQueue.add(
      JOB_TYPES.GENERATE_SINGLE_IMAGE,
      data,
      {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
      }
    );
    
    console.log(`📋 添加生成任务到队列: ${job.id} (asset: ${data.assetId})`);
    return job;
  }
  
  // 获取队列状态
  async getQueueStatus() {
    const waiting = await imageQueue.getWaiting();
    const active = await imageQueue.getActive();
    const completed = await imageQueue.getCompleted();
    const failed = await imageQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length
    };
  }
  
  // 取消任务
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await imageQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }
  
  // 清理完成的任务
  async cleanupCompleted(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    await imageQueue.clean(maxAge, 100, 'completed');
    await imageQueue.clean(maxAge, 50, 'failed');
  }
}

// 如果显式启用，则在当前进程启动 Worker（用于本地独立进程或显式启用场景）
if (WORKER_ENABLED) {
  startImageGenerationWorker();
}

function formatModerationReason(result: {
  violations?: Array<{ category: string; detected: string; threshold?: string }>;
  error?: string;
  message?: string;
}): string {
  if (result.violations && result.violations.length > 0) {
    return result.violations
      .map(v => `${v.category}:${v.detected}`)
      .join(', ');
  }
  return result.error || result.message || 'UNKNOWN_REASON';
}
