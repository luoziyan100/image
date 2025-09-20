// 基础提供商接口
// 定义所有AI提供商必须实现的统一接口

import { 
  GenerationRequest, 
  GenerationResult, 
  ProviderCapabilities, 
  ProviderConfig,
  ApiKeyValidationResult,
  ProviderError
} from './types';

// 基础提供商抽象类
export abstract class BaseAIProvider {
  protected apiKey: string;
  protected config: ProviderConfig;

  constructor(apiKey: string, config: ProviderConfig) {
    this.apiKey = apiKey;
    this.config = config;
  }

  // 抽象方法 - 子类必须实现
  abstract getName(): string;
  abstract getCapabilities(): ProviderCapabilities;
  abstract validateApiKey(): Promise<ApiKeyValidationResult>;
  abstract generateContent(request: GenerationRequest): Promise<GenerationResult>;

  // 公共方法
  getId(): string {
    return this.config.id;
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  // 检查请求是否支持
  supportsRequest(request: GenerationRequest): boolean {
    const capabilities = this.getCapabilities();
    
    switch (request.type) {
      case 'text-to-image':
        return capabilities.textToImage;
      case 'image-to-image':
        return capabilities.imageToImage;
      case 'text-to-video':
        return capabilities.textToVideo;
      case 'image-to-video':
        return capabilities.imageToVideo;
      default:
        return false;
    }
  }

  // 验证请求参数
  validateRequest(request: GenerationRequest): ProviderError | null {
    if (!this.supportsRequest(request)) {
      return {
        code: 'UNSUPPORTED_REQUEST_TYPE',
        message: `Provider ${this.getName()} does not support ${request.type}`,
        provider: this.getName(),
        isRetryable: false,
        suggestedAction: 'Please choose a different provider or request type'
      };
    }

    // 检查图片尺寸限制
    if ('dimensions' in request && request.dimensions) {
      const capabilities = this.getCapabilities();
      const { width, height } = request.dimensions;
      const { maxImageSize } = capabilities;

      if (width > maxImageSize.width || height > maxImageSize.height) {
        return {
          code: 'DIMENSIONS_TOO_LARGE',
          message: `Image dimensions ${width}x${height} exceed maximum ${maxImageSize.width}x${maxImageSize.height}`,
          provider: this.getName(),
          isRetryable: false,
          suggestedAction: `Please reduce image size to maximum ${maxImageSize.width}x${maxImageSize.height}`
        };
      }
    }

    // 检查视频长度限制
    if ('duration' in request && request.duration) {
      const capabilities = this.getCapabilities();
      
      if (request.duration > capabilities.maxVideoLength) {
        return {
          code: 'DURATION_TOO_LONG',
          message: `Video duration ${request.duration}s exceeds maximum ${capabilities.maxVideoLength}s`,
          provider: this.getName(),
          isRetryable: false,
          suggestedAction: `Please reduce video duration to maximum ${capabilities.maxVideoLength}s`
        };
      }
    }

    return null;
  }

  // 处理提供商特定错误
  protected handleProviderError(error: unknown): ProviderError {
    const providerName = this.getName();
    const errorRecord = isRecord(error) ? error : undefined;
    const code = typeof errorRecord?.code === 'string' ? errorRecord.code : undefined;
    const status = typeof errorRecord?.status === 'number' ? errorRecord.status : undefined;
    const message = extractErrorMessage(error);

    // 通用错误处理
    if (code === 'ENOTFOUND' || code === 'ECONNRESET') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        provider: providerName,
        isRetryable: true,
        suggestedAction: 'Please check your internet connection and try again'
      };
    }

    if (status === 401 || status === 403) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid API key or insufficient permissions',
        provider: providerName,
        isRetryable: false,
        suggestedAction: 'Please check your API key and permissions'
      };
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        provider: providerName,
        isRetryable: true,
        suggestedAction: 'Please wait a moment and try again'
      };
    }

    if (status === 402 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('billing')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'API quota exceeded or billing issue',
        provider: providerName,
        isRetryable: false,
        suggestedAction: 'Please check your API quota and billing status'
      };
    }

    // 默认错误
    return {
      code: 'PROVIDER_ERROR',
      message: message || 'Unknown provider error',
      provider: providerName,
      isRetryable: false,
      suggestedAction: 'Please try again or contact support'
    };
  }

  // 生成唯一请求ID
  protected generateRequestId(): string {
    return `${this.getName()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 估算请求成本（用于UI显示）
  estimateCost(request: GenerationRequest): number {
    const capabilities = this.getCapabilities();
    const estimatedCost = capabilities.estimatedCost;
    
    if (!estimatedCost) return 0;

    switch (request.type) {
      case 'text-to-image':
        return estimatedCost.textToImage || 0;
      case 'image-to-image':
        return estimatedCost.imageToImage || 0;
      case 'text-to-video':
        const videoDuration = 'duration' in request ? request.duration || 5 : 5;
        return (estimatedCost.textToVideo || 0) * videoDuration;
      case 'image-to-video':
        const imgVideoDuration = 'duration' in request ? request.duration || 5 : 5;
        return (estimatedCost.imageToVideo || 0) * imgVideoDuration;
      default:
        return 0;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

// 提供商接口类型
export interface AIProviderInterface {
  getName(): string;
  getId(): string;
  getCapabilities(): ProviderCapabilities;
  getConfig(): ProviderConfig;
  validateApiKey(): Promise<ApiKeyValidationResult>;
  generateContent(request: GenerationRequest): Promise<GenerationResult>;
  supportsRequest(request: GenerationRequest): boolean;
  validateRequest(request: GenerationRequest): ProviderError | null;
  estimateCost(request: GenerationRequest): number;
}

// 提供商工厂类型
export type AIProviderFactory = (apiKey: string, config?: Partial<ProviderConfig>) => BaseAIProvider;

// 提供商注册器
export class ProviderRegistry {
  private static providers = new Map<string, AIProviderFactory>();
  private static configs = new Map<string, ProviderConfig>();

  static registerProvider(id: string, factory: AIProviderFactory, config: ProviderConfig) {
    this.providers.set(id, factory);
    this.configs.set(id, config);
  }

  static getProvider(id: string, apiKey: string): BaseAIProvider | null {
    const factory = this.providers.get(id);
    const config = this.configs.get(id);
    
    if (!factory || !config) {
      return null;
    }

    return factory(apiKey, config);
  }

  static getAvailableProviders(): ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  static getProviderConfig(id: string): ProviderConfig | null {
    return this.configs.get(id) || null;
  }

  static isProviderRegistered(id: string): boolean {
    return this.providers.has(id);
  }
}
