// BullMQ 异步任务队列管理
// 基于技术架构文档的实现

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from './database-config';
import { processImageGeneration } from './image-generation-service';
import { auditContent } from './content-moderation-service';
import { updateAssetStatus, recordBillingEvent } from './asset-service';
import { uploadToS3 } from './s3-service';
import type { GenerationJobData } from '@/types';

// 队列定义
const redisConnection = getRedisClient();

export const imageQueue = new Queue('image-generation', {
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
  GENERATE_COMIC_FRAME: 'generate-comic-frame',
  PROCESS_VIDEO: 'process-video', // Phase 2
  CLEANUP_RESOURCES: 'cleanup-resources'
} as const;

// Worker 进程实现
export const imageGenerationWorker = new Worker('image-generation', async (job: Job<GenerationJobData>) => {
  const { assetId, sketchData, userId } = job.data;
  
  try {
    console.log(`🚀 开始处理图片生成任务: ${assetId}`);
    
    // 更新状态: pending -> auditing_input
    await updateAssetStatus(assetId, 'auditing_input');
    
    // Step 1: 输入内容审核
    const inputAuditResult = await auditContent(sketchData.imageBuffer);
    if (!inputAuditResult.passed) {
      throw new Error(`INPUT_REJECTED: ${inputAuditResult.reason}`);
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
      throw new Error(`OUTPUT_REJECTED: ${outputAuditResult.reason}`);
    }
    
    // 更新状态: auditing_output -> uploading
    await updateAssetStatus(assetId, 'uploading');
    
    // Step 4: 上传到S3
    const s3Url = await uploadToS3(generationResult.imageBuffer, assetId);
    
    // Step 5: 更新最终状态
    await updateAssetStatus(assetId, 'completed', { 
      storage_url: s3Url,
      processing_time_ms: generationResult.processingTimeMs,
      ai_model_version: generationResult.modelVersion,
      generation_seed: generationResult.seed
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
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_code: error instanceof Error ? error.message.split(':')[0] : 'UNKNOWN_ERROR'
    });
    
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3, // 单个Worker实例最多同时处理3个任务
  limiter: {
    max: 5,    // 全局限制：每分钟最多5个API调用
    duration: 60000 // 1分钟
  }
});

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

// 队列事件监听
imageQueue.on('completed', (job, result) => {
  console.log(`✅ 任务完成: ${job.id}`, result);
});

imageQueue.on('failed', (job, error) => {
  console.error(`❌ 任务失败: ${job?.id}`, error);
});

imageQueue.on('progress', (job, progress) => {
  console.log(`📊 任务进度: ${job.id} - ${progress}%`);
});

// Worker 事件监听
imageGenerationWorker.on('completed', (job, result) => {
  console.log(`🎉 Worker完成任务: ${job.id}`);
});

imageGenerationWorker.on('failed', (job, error) => {
  console.error(`💥 Worker任务失败: ${job?.id}`, error);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('⏹️ 正在关闭队列系统...');
  await imageQueue.close();
  await imageGenerationWorker.close();
  console.log('✅ 队列系统已关闭');
  process.exit(0);
});