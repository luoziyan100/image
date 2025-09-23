// AI多模态统一接口
// BYOK架构的主入口，提供完整的AI生成能力

// 核心类型导出
export type {
  // 请求和结果类型
  GenerationRequest,
  GenerationResult,
  TextToImageRequest,
  ImageToImageRequest,
  TextToVideoRequest,
  ImageToVideoRequest,
  BatchGenerationRequest,
  BatchGenerationResult,
  
  // 提供商相关类型
  ProviderCapabilities,
  ProviderConfig,
  ProviderModel,
  ProviderError,
  
  // 用户配置类型
  UserApiKeyConfig,
  ApiKeyValidationResult,
  GenerationOptions,
  
  // 其他类型
  StylePreset,
  GenerationQuality,
  ImageDimensions,
  VideoDimensions,
  GenerationEvent,
  UsageStats
} from './core/types';

// 引入核心类型用于内部使用
import type { 
  GenerationRequest, 
  GenerationResult, 
  GenerationOptions,
  BatchGenerationRequest,
  BatchGenerationResult,
  UserApiKeyConfig,
  ApiKeyValidationResult,
  ProviderConfig,
  GenerationEvent,
  TextToImageRequest,
  ImageToImageRequest,
  TextToVideoRequest,
  ImageToVideoRequest
} from './core/types';

// 核心组件导出
export { BaseAIProvider, ProviderRegistry } from './core/base-provider';
export { CapabilityMapper } from './core/capability-mapper';

// 客户端组件导出
export { apiKeyManager } from './client/api-key-manager';
export { providerSelector } from './client/provider-selector';
export { requestRouter } from './client/request-router';

// 提供商导出
export { OpenAIProvider, createOpenAIProvider } from './providers/openai';
export { GeminiProvider, createGeminiProvider } from './providers/gemini';

// 主要AI服务类
export class AIService {
  private static instance: AIService;

  private constructor() {}

  static getInstance(): AIService {
    if (!this.instance) {
      this.instance = new AIService();
    }
    return this.instance;
  }

  // 生成内容 - 主要入口方法
  async generate(
    request: GenerationRequest,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    const { requestRouter } = await import('./client/request-router');
    return await requestRouter.processRequest(request, options);
  }

  // 批量生成
  async generateBatch(
    batchRequest: BatchGenerationRequest
  ): Promise<BatchGenerationResult> {
    const { requestRouter } = await import('./client/request-router');
    return await requestRouter.processBatchRequest(batchRequest);
  }

  // API Key管理
  async addApiKey(
    provider: string,
    apiKey: string,
    keyName: string
  ): Promise<UserApiKeyConfig> {
    const { apiKeyManager } = await import('./client/api-key-manager');
    return await apiKeyManager.storeApiKey(provider, apiKey, keyName);
  }

  async validateApiKey(provider: string, keyName: string): Promise<ApiKeyValidationResult> {
    const { apiKeyManager } = await import('./client/api-key-manager');
    return await apiKeyManager.validateApiKey(provider, keyName);
  }

  async removeApiKey(keyId: string): Promise<boolean> {
    const { apiKeyManager } = await import('./client/api-key-manager');
    return apiKeyManager.removeApiKey(keyId);
  }

  // 获取可用提供商
  async getAvailableProviders(): Promise<string[]> {
    const { apiKeyManager } = await import('./client/api-key-manager');
    return apiKeyManager.getAvailableProviders();
  }

  // 获取所有提供商配置
  async getAllProviderConfigs(): Promise<ProviderConfig[]> {
    const { CapabilityMapper } = await import('./core/capability-mapper');
    return CapabilityMapper.getAllProviders();
  }

  // 获取提供商推荐
  async getProviderRecommendations(request: GenerationRequest) {
    const { providerSelector } = await import('./client/provider-selector');
    return await providerSelector.getProviderRecommendations(request);
  }

  // 获取请求状态
  async getRequestStatus(requestId: string): Promise<GenerationResult | null> {
    const { requestRouter } = await import('./client/request-router');
    return requestRouter.getRequestStatus(requestId);
  }

  // 取消请求
  async cancelRequest(requestId: string): Promise<boolean> {
    const { requestRouter } = await import('./client/request-router');
    return await requestRouter.cancelRequest(requestId);
  }

  // 监听事件
  addEventListener(listener: (event: GenerationEvent) => void): void {
    import('./client/request-router').then(({ requestRouter }) => {
      requestRouter.addEventListener(listener);
    });
  }

  removeEventListener(listener: (event: GenerationEvent) => void): void {
    import('./client/request-router').then(({ requestRouter }) => {
      requestRouter.removeEventListener(listener);
    });
  }

  // 获取系统状态
  async getSystemStatus() {
    const [{ apiKeyManager }, { requestRouter }] = await Promise.all([
      import('./client/api-key-manager'),
      import('./client/request-router')
    ]);

    const [availableProviders, providerStatus] = await Promise.all([
      apiKeyManager.getAvailableProviders(),
      requestRouter.getProviderStatus()
    ]);

    return {
      availableProviders,
      providerStatus,
      activeRequests: requestRouter.getActiveRequests()
    };
  }

  // 清理资源
  async cleanup(): Promise<void> {
    if (!AIService.instance) {
      return;
    }

    const { requestRouter } = await import('./client/request-router');
    const activeRequests = requestRouter.getActiveRequests();

    await Promise.all(
      activeRequests.map(requestId => requestRouter.cancelRequest(requestId))
    );
  }
}

// 单例实例导出
export const aiService = AIService.getInstance();

// 便捷函数导出
export async function generateImage(
  prompt: string,
  options?: Partial<TextToImageRequest> & GenerationOptions
): Promise<GenerationResult> {
  const request: TextToImageRequest = {
    type: 'text-to-image',
    prompt,
    ...options
  };
  
  return await aiService.generate(request, options);
}

export async function generateVideo(
  prompt: string,
  options?: Partial<TextToVideoRequest> & GenerationOptions
): Promise<GenerationResult> {
  const request: TextToVideoRequest = {
    type: 'text-to-video',
    prompt,
    ...options
  };
  
  return await aiService.generate(request, options);
}

export async function transformImage(
  sourceImage: string,
  prompt: string,
  options?: Partial<ImageToImageRequest> & GenerationOptions
): Promise<GenerationResult> {
  console.log('🔄 transformImage调用:', {
    hasSourceImage: !!sourceImage,
    sourceImageType: sourceImage?.startsWith('data:') ? 'base64' : 'url',
    sourceImageLength: sourceImage?.length || 0,
    sourceImagePreview: sourceImage?.substring(0, 100) || 'null',
    prompt,
    options
  });

  const request: ImageToImageRequest = {
    type: 'image-to-image',
    sourceImage,
    prompt,
    ...options
  };
  // 兼容：如传入 sourceImages 数组，保留 sourceImage 但优先由 provider 读取 sourceImages 顺序

  return await aiService.generate(request, options);
}

export async function imageToVideo(
  sourceImage: string,
  prompt?: string,
  options?: Partial<ImageToVideoRequest> & GenerationOptions
): Promise<GenerationResult> {
  const request: ImageToVideoRequest = {
    type: 'image-to-video',
    sourceImage,
    prompt,
    ...options
  };
  
  return await aiService.generate(request, options);
}

// 配置管理函数
export async function configureProvider(
  provider: string,
  apiKey: string,
  keyName: string = 'Default'
): Promise<{
  success: boolean;
  config?: UserApiKeyConfig;
  error?: string;
}> {
  try {
    const config = await aiService.addApiKey(provider, apiKey, keyName);
    const validation = await aiService.validateApiKey(provider, keyName);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'API key validation failed'
      };
    }
    
    return {
      success: true,
      config
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Configuration failed'
    };
  }
}

// 系统信息函数
export async function getSystemInfo() {
  const status = await aiService.getSystemStatus();
  const allProviders = await aiService.getAllProviderConfigs();
  
  return {
    ...status,
    totalProviders: allProviders.length,
    configuredProviders: status.availableProviders.length,
    supportedFeatures: {
      textToImage: allProviders.some(p => p.capabilities.textToImage),
      imageToImage: allProviders.some(p => p.capabilities.imageToImage),
      textToVideo: allProviders.some(p => p.capabilities.textToVideo),
      imageToVideo: allProviders.some(p => p.capabilities.imageToVideo)
    }
  };
}

// 默认导出
export default aiService;
