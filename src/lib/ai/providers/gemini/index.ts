// Gemini 2.5 Flash 提供商主入口
import { BaseAIProvider } from '../../core/base-provider';
import { 
  GenerationRequest, 
  GenerationResult, 
  ProviderCapabilities,
  ApiKeyValidationResult,
  TextToImageRequest,
  ImageToImageRequest
} from '../../core/types';
import { GEMINI_CONFIG, GEMINI_API } from './config';
import { GeminiTextToImageProvider } from './text-to-image';
import { GeminiImageToImageProvider } from './image-to-image';

export class GeminiProvider extends BaseAIProvider {
  private textToImageProvider: GeminiTextToImageProvider;
  private imageToImageProvider: GeminiImageToImageProvider;

  constructor(apiKey: string) {
    super(apiKey, GEMINI_CONFIG);
    this.textToImageProvider = new GeminiTextToImageProvider(this);
    this.imageToImageProvider = new GeminiImageToImageProvider(this);
  }

  getName(): string {
    return 'Gemini 2.5 Flash (兔子)';
  }

  getCapabilities(): ProviderCapabilities {
    return GEMINI_CONFIG.capabilities;
  }

  async validateApiKey(): Promise<ApiKeyValidationResult> {
    try {
      // 尝试简单的文本生图请求来验证API Key
      const testResponse = await fetch(`${GEMINI_API.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GEMINI_API.defaultModel,
          prompt: 'test image generation',
          n: 1,
          size: '512x512'
        })
      });

      if (testResponse.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key'
        };
      }

      if (testResponse.status === 403) {
        return {
          isValid: false,
          error: 'API key does not have permission for image generation'
        };
      }

      // 即使请求失败（比如其他错误），只要不是认证错误，我们认为key是有效的
      if (testResponse.status < 500) {
        return {
          isValid: true,
          capabilities: ['text-to-image', 'image-to-image'],
        };
      }

      return {
        isValid: false,
        error: `Validation failed with status ${testResponse.status}`
      };

    } catch (error) {
      // 网络错误等情况
      if (error instanceof Error && error.message.includes('401')) {
        return {
          isValid: false,
          error: 'Invalid API key'
        };
      }

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error during validation'
      };
    }
  }

  async generateContent(request: GenerationRequest): Promise<GenerationResult> {
    // 验证请求
    const validationError = this.validateRequest(request);
    if (validationError) {
      const requestId = this.generateRequestId();
      return {
        id: requestId,
        type: request.type,
        status: 'failed',
        error: {
          code: validationError.code,
          message: validationError.message,
          details: validationError
        },
        createdAt: new Date().toISOString()
      };
    }

    // 根据请求类型路由到相应的处理器
    switch (request.type) {
      case 'text-to-image':
        return await this.textToImageProvider.generateImage(
          request as TextToImageRequest,
          this.apiKey
        );

      case 'image-to-image':
        return await this.imageToImageProvider.transformImage(
          request as ImageToImageRequest,
          this.apiKey
        );

      case 'text-to-video':
        throw new Error('Text-to-video not supported by Gemini provider');

      case 'image-to-video':
        throw new Error('Image-to-video not supported by Gemini provider');
    }
    throw new Error(`Unsupported request type: ${request.type}`);
  }

  // 获取支持的模型列表
  getSupportedModels(): string[] {
    return GEMINI_CONFIG.models.map(model => model.id);
  }

  // 获取推荐设置
  getRecommendedSettings(requestType: string) {
    const baseSettings = {
      timeout: GEMINI_API.timeout,
      retryAttempts: 3,
      retryDelay: 1000
    };

    switch (requestType) {
      case 'text-to-image':
        return {
          ...baseSettings,
          preferredModel: GEMINI_API.defaultModel,
          recommendedSize: '1024x1024',
          qualityTips: '使用详细的描述词可以获得更好的效果'
        };

      case 'image-to-image':
        return {
          ...baseSettings,
          preferredModel: GEMINI_API.defaultModel,
          apiMode: 'openai-edit',
          qualityTips: '图生图功能支持多种调用方式，可以根据需求选择'
        };

      default:
        return baseSettings;
    }
  }

  // 估算成本
  estimateRequestCost(request: GenerationRequest): {
    estimatedCost: number;
    currency: string;
    breakdown: string;
  } {
    const baseCost = this.estimateCost(request);
    
    let breakdown = '';
    switch (request.type) {
      case 'text-to-image':
        breakdown = `文生图: $${baseCost.toFixed(4)} per image`;
        break;
      case 'image-to-image':
        breakdown = `图生图: $${baseCost.toFixed(4)} per transformation`;
        break;
      default:
        breakdown = `未知类型: $${baseCost.toFixed(4)}`;
    }

    return {
      estimatedCost: baseCost,
      currency: 'USD',
      breakdown
    };
  }
}

// 工厂函数
export function createGeminiProvider(apiKey: string): GeminiProvider {
  return new GeminiProvider(apiKey);
}

// 注册到提供商注册表
import { ProviderRegistry } from '../../core/base-provider';

ProviderRegistry.registerProvider(
  'gemini-tuzi',
  (apiKey: string) => new GeminiProvider(apiKey),
  GEMINI_CONFIG
);

// 默认导出
export default GeminiProvider;
