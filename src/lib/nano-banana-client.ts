// nano-banana AI 服务客户端
// 基于技术架构文档的标准实现

export interface GenerateImageOptions {
  prompt: string;
  imageData?: string; // Base64编码的图片数据
  seed?: number;
  quality?: 'standard' | 'high';
  aspectRatio?: '1:1' | '16:9' | '9:16';
  mode?: 'text-to-image' | 'image-to-image';
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  seed?: number;
  modelVersion: string;
  processingTimeMs: number;
}

class NanoBananaService {
  private apiKey: string;
  private baseUrl: string = 'https://api.nanobanana.ai/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateImage(params: GenerateImageOptions): Promise<GenerateImageResult> {
    const {
      prompt,
      imageData,
      seed = null,
      quality = 'high',
      aspectRatio = '1:1',
      mode = 'text-to-image'
    } = params;
    
    const startTime = Date.now();
    
    const requestBody: any = {
      prompt,
      quality,
      aspect_ratio: aspectRatio,
      response_format: 'b64_json'
    };
    
    // 图生图模式
    if (mode === 'image-to-image' && imageData) {
      requestBody.image = imageData;
      requestBody.strength = 0.7; // 重绘强度
    }
    
    // 一致性控制
    if (seed) {
      requestBody.seed = seed;
    }
    
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AI_API_ERROR: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const processingTimeMs = Date.now() - startTime;
    
    return {
      imageBuffer: Buffer.from(result.data[0].b64_json, 'base64'),
      seed: result.data[0].metadata?.seed,
      modelVersion: result.data[0].metadata?.model_version || 'nano-banana-v1.0',
      processingTimeMs
    };
  }
  
  // 连环画一致性支持
  async generateConsistentFrame(params: {
    projectId: string;
    frameIndex: number;
    prompt: string;
    previousFrameUrl?: string;
    baseSeed: number;
  }): Promise<GenerateImageResult> {
    const { projectId, frameIndex, prompt, previousFrameUrl, baseSeed } = params;
    
    let imageData = null;
    let seed = baseSeed;
    
    if (frameIndex > 0 && previousFrameUrl) {
      // 下载前一帧作为参考图
      imageData = await this.downloadImageAsBase64(previousFrameUrl);
      
      // 使用相同的基础seed，但添加帧序号偏移
      seed = baseSeed + frameIndex;
    }
    
    // 增强提示词以保持一致性
    const enhancedPrompt = this.enhancePromptForConsistency(projectId, prompt);
    
    return await this.generateImage({
      prompt: enhancedPrompt,
      imageData,
      seed,
      mode: imageData ? 'image-to-image' : 'text-to-image'
    });
  }
  
  private async downloadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
  
  private enhancePromptForConsistency(projectId: string, originalPrompt: string): string {
    // 这里应该集成角色一致性管理器
    // 暂时返回原始提示词，后续在Phase 2中完善
    const consistencyPrompt = 'consistent art style, coherent visual narrative, same lighting and color palette';
    return `${originalPrompt}, ${consistencyPrompt}`;
  }
}

export default NanoBananaService;