// 图片生成API端点
// 基于技术架构文档的完整实现

import { NextRequest, NextResponse } from 'next/server';
import { budgetMiddleware } from '@/lib/budget-guardian';
import { QueueManager } from '@/lib/queue-manager';
import { createAsset } from '@/lib/asset-service';
import { withDatabase } from '@/lib/database-config';
import type { GenerationJobData } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // 预算检查
    const budgetCheck = await budgetMiddleware(req);
    if (budgetCheck) {
      return budgetCheck; // 预算限制，直接返回错误响应
    }
    
    const body = await req.json();
    const { projectId, imageData, prompt } = body;
    
    if (!projectId || !imageData) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: '缺少必要参数'
      }, { status: 400 });
    }
    
    console.log('🚀 开始处理图片生成请求...');
    
    const result = await withDatabase(async (pg, mongo) => {
      // 1. 处理base64图片数据
      let imageBuffer: Buffer;
      try {
        // 移除data:image/png;base64,前缀
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
        console.log('✅ 成功处理图片数据，大小:', imageBuffer.length, 'bytes');
      } catch (error) {
        throw new Error('无效的图片数据格式');
      }
      
      // 2. 保存草图到MongoDB（保存原始图片数据）
      const sketches = mongo.db().collection('sketches');
      const sketchDoc = {
        projectId,
        imageData: imageData, // 保存完整的base64数据
        metadata: {
          canvasSize: { width: 1024, height: 1024 },
          imageSize: imageBuffer.length,
          format: imageData.startsWith('data:image/png') ? 'png' : 'jpeg'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const sketchResult = await sketches.insertOne(sketchDoc);
      const sketchId = sketchResult.insertedId.toString();
      
      // 3. 创建Asset记录
      const asset = await createAsset({
        projectId,
        sourceSketchId: sketchId,
        positionInProject: 0
      });
      
      // 4. 准备任务数据
      const jobData: GenerationJobData = {
        assetId: asset.id,
        sketchData: {
          imageBuffer: imageBuffer, // 使用实际的图片Buffer
          prompt: prompt || '将这个手绘草图转换为精美的专业艺术作品，保持原有构图'
        },
        options: {
          quality: 'high'
        }
      };
      
      // 5. 添加到队列
      const queueManager = QueueManager.getInstance();
      const job = await queueManager.addImageGenerationJob(jobData);
      
      return {
        assetId: asset.id,
        jobId: job.id,
        estimatedTimeMs: 30000 // 30秒预估
      };
    });
    
    console.log('✅ 生成任务已添加到队列:', result.assetId);
    
    return NextResponse.json({
      success: true,
      message: '图片生成任务已启动',
      data: result
    });
    
  } catch (error) {
    console.error('❌ 图片生成请求失败:', error);
    
    return NextResponse.json({
      success: false,
      error: 'GENERATION_REQUEST_FAILED',
      message: error instanceof Error ? error.message : '生成请求失败'
    }, { status: 500 });
  }
}