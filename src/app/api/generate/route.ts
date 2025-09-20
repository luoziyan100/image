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

    // === 参数校验（图片格式/大小/前缀） ===
    const MAX_MB = Number(process.env.MAX_IMAGE_BASE64_MB || process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 10);
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return NextResponse.json({ success: false, error: 'INVALID_IMAGE_DATA', message: 'imageData 必须是 data:image/*;base64,... 格式' }, { status: 400 });
    }
    const mime = imageData.substring(5, imageData.indexOf(';'));
    if (!allowedMime.includes(mime)) {
      return NextResponse.json({ success: false, error: 'UNSUPPORTED_IMAGE_TYPE', message: `不支持的图片类型: ${mime}` }, { status: 415 });
    }
    if (!/;base64,/.test(imageData)) {
      return NextResponse.json({ success: false, error: 'INVALID_IMAGE_ENCODING', message: '图片数据必须是 base64 编码' }, { status: 400 });
    }
    
    const result = await withDatabase(async (pg, mongo) => {
      // 1. 处理base64图片数据
      let imageBuffer: Buffer;
      try {
        // 移除data:image/png;base64,前缀
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
        console.log('✅ 成功处理图片数据，大小:', imageBuffer.length, 'bytes');
        const maxBytes = MAX_MB * 1024 * 1024;
        if (imageBuffer.length > maxBytes) {
          throw new Error(`图片过大(${(imageBuffer.length/1024/1024).toFixed(2)}MB)，最大 ${MAX_MB}MB`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : '无效的图片数据格式';
        throw new Error(msg);
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
      const userId = 'anonymous';

      const jobData: GenerationJobData = {
        assetId: asset.id,
        sketchData: {
          imageBuffer: imageBuffer, // 使用实际的图片Buffer
          prompt: prompt || '将这个手绘草图转换为精美的专业艺术作品，保持原有构图'
        },
        userId,
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
