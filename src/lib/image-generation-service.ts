// 图片生成服务
// 基于技术架构文档的标准化实现

import NanoBananaService from './nano-banana-client';
import type { GenerateImageResult } from './nano-banana-client';

interface ProcessImageGenerationParams {
  imageBuffer: Buffer;
  prompt: string;
}

// 图片生成服务
export async function processImageGeneration(params: ProcessImageGenerationParams): Promise<GenerateImageResult> {
  const nanoBanana = new NanoBananaService(process.env.NANO_BANANA_API_KEY!);
  
  // 将Buffer转换为base64
  const imageData = params.imageBuffer.toString('base64');
  
  // 标准化提示词
  const enhancedPrompt = enhancePrompt(params.prompt);
  
  console.log('🎨 开始AI图片生成...');
  console.log('📝 增强后提示词:', enhancedPrompt);
  
  const result = await nanoBanana.generateImage({
    prompt: enhancedPrompt,
    imageData: imageData,
    mode: 'image-to-image',
    quality: 'high',
    aspectRatio: '1:1'
  });
  
  console.log('✅ AI生成完成，耗时:', result.processingTimeMs, 'ms');
  
  return result;
}

// 提示词增强
function enhancePrompt(originalPrompt: string): string {
  // 基础增强规则
  const qualityEnhancers = [
    'high quality',
    'detailed artwork', 
    'professional illustration',
    'vibrant colors',
    '8k resolution'
  ];
  
  const styleEnhancers = [
    'digital art',
    'concept art style',
    'smooth rendering',
    'perfect composition'
  ];
  
  // 组合增强提示词
  const enhancedPrompt = `
    ${originalPrompt}, 
    ${qualityEnhancers.join(', ')}, 
    ${styleEnhancers.join(', ')}
  `.trim().replace(/\s+/g, ' ');
  
  return enhancedPrompt;
}

// 连环画一致性管理器
export class ComicConsistencyManager {
  private characterDescriptions: Map<string, string> = new Map();
  private stylePrompts: Map<string, string> = new Map();
  
  // 为连环画项目建立角色一致性
  establishCharacterConsistency(projectId: string, firstFramePrompt: string) {
    // 从首帧提示词中提取角色描述
    const characters = this.extractCharacters(firstFramePrompt);
    
    // 为每个角色生成唯一的描述符
    characters.forEach(char => {
      const consistentDesc = this.generateConsistentDescription(char);
      this.characterDescriptions.set(`${projectId}_${char.name}`, consistentDesc);
    });
  }
  
  // 为后续帧增强提示词
  enhancePromptForConsistency(projectId: string, originalPrompt: string): string {
    let enhancedPrompt = originalPrompt;
    
    // 添加已建立的角色描述
    this.characterDescriptions.forEach((desc, key) => {
      if (key.startsWith(projectId)) {
        enhancedPrompt = `${desc}, ${enhancedPrompt}`;
      }
    });
    
    // 添加统一的风格描述
    const stylePrompt = this.stylePrompts.get(projectId) || 
      'consistent art style, coherent visual narrative, same lighting and color palette';
    
    return `${enhancedPrompt}, ${stylePrompt}`;
  }
  
  private extractCharacters(prompt: string) {
    // 简化的角色提取逻辑
    // 实际实现可能需要使用NLP库
    const characters: Array<{ name: string; description: string }> = [];
    
    // 基础关键词匹配
    const characterKeywords = ['人物', '角色', '主角', '女孩', '男孩', '老人', '孩子'];
    
    characterKeywords.forEach(keyword => {
      if (prompt.includes(keyword)) {
        characters.push({
          name: keyword,
          description: `${keyword}相关描述`
        });
      }
    });
    
    return characters;
  }
  
  private generateConsistentDescription(character: { name: string; description: string }): string {
    // 为角色生成一致性描述
    return `consistent ${character.name} character, same appearance and style`;
  }
}

// 图生图一致性处理
export class ImageToImageConsistency {
  private nanoBanana: NanoBananaService;
  private consistencyManager: ComicConsistencyManager;
  
  constructor() {
    this.nanoBanana = new NanoBananaService(process.env.NANO_BANANA_API_KEY!);
    this.consistencyManager = new ComicConsistencyManager();
  }
  
  async generateConsistentFrame(params: {
    projectId: string;
    frameIndex: number;
    newPrompt: string;
    previousFrameUrl?: string;
    baseSeed: number;
  }): Promise<GenerateImageResult> {
    const { projectId, frameIndex, newPrompt, previousFrameUrl, baseSeed } = params;
    
    let imageData = null;
    let seed = baseSeed;
    
    if (frameIndex > 0 && previousFrameUrl) {
      // 下载前一帧作为参考图
      imageData = await this.downloadImage(previousFrameUrl);
      
      // 使用相同的基础seed，但添加帧序号偏移
      seed = baseSeed + frameIndex;
    }
    
    const enhancedPrompt = this.consistencyManager.enhancePromptForConsistency(projectId, newPrompt);
    
    return await this.nanoBanana.generateImage({
      prompt: enhancedPrompt,
      imageData,
      seed,
      mode: imageData ? 'image-to-image' : 'text-to-image'
    });
  }
  
  private async downloadImage(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}