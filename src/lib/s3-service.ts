// AWS S3 文件存储服务
// 基于技术架构文档的实现

import AWS from 'aws-sdk';

// S3 客户端配置
const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

export class S3StorageService {
  private bucket: string;
  
  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET!;
  }
  
  async uploadWithCacheHeaders(
    buffer: Buffer, 
    key: string, 
    contentType: string,
    fileType: 'user-generated-image' | 'user-avatar' | 'temp-upload' = 'user-generated-image'
  ): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      
      // 长期缓存策略（生成的图片不会变更）
      CacheControl: this.getCacheControlForType(fileType),
      
      // 元数据
      Metadata: {
        'upload-time': new Date().toISOString(),
        'generated-by': 'image2video-ai',
        'file-type': fileType
      }
    };
    
    const result = await s3Client.upload(params).promise();
    console.log(`📤 文件已上传到S3: ${key}`);
    
    return result.Location;
  }
  
  // 为不同类型内容设置不同的缓存策略
  private getCacheControlForType(fileType: string): string {
    const strategies = {
      'user-generated-image': 'public, max-age=31536000, immutable', // 1年
      'user-avatar': 'public, max-age=86400', // 1天
      'temp-upload': 'private, max-age=3600'  // 1小时
    };
    
    return strategies[fileType] || 'public, max-age=86400';
  }
  
  // 生成预签名URL（用于临时访问）
  async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expires
    };
    
    return s3Client.getSignedUrl('getObject', params);
  }
  
  // 删除文件
  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucket,
      Key: key
    };
    
    await s3Client.deleteObject(params).promise();
    console.log(`🗑️ 文件已从S3删除: ${key}`);
  }
  
  // 批量删除文件
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    
    const params = {
      Bucket: this.bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false
      }
    };
    
    const result = await s3Client.deleteObjects(params).promise();
    console.log(`🗑️ 批量删除${keys.length}个文件完成`);
    
    if (result.Errors && result.Errors.length > 0) {
      console.error('部分文件删除失败:', result.Errors);
    }
  }
}

// 便捷的上传函数
export async function uploadToS3(
  buffer: Buffer, 
  assetId: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const s3Service = new S3StorageService();
  
  // 生成唯一的文件键
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const fileExtension = contentType.split('/')[1] || 'jpg';
  const key = `assets/${timestamp}/${assetId}.${fileExtension}`;
  
  return await s3Service.uploadWithCacheHeaders(buffer, key, contentType);
}

// 清理S3中的孤儿文件
export async function scheduleS3Cleanup(urls: string[]): Promise<void> {
  // 从URL中提取S3键
  const keys = urls
    .filter(url => url && url.includes(process.env.AWS_S3_BUCKET!))
    .map(url => {
      const urlParts = url.split('/');
      return urlParts.slice(-3).join('/'); // 提取最后三部分作为键
    });
  
  if (keys.length > 0) {
    console.log(`🧹 计划清理${keys.length}个S3文件...`);
    
    // 异步执行清理，不阻塞主流程
    setTimeout(async () => {
      try {
        const s3Service = new S3StorageService();
        await s3Service.deleteFiles(keys);
      } catch (error) {
        console.error('S3清理失败:', error);
      }
    }, 1000);
  }
}