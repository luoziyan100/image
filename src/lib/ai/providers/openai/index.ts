// OpenAI提供商主入口
import { BaseAIProvider } from '../../core/base-provider';
import { 
  GenerationRequest, 
  GenerationResult, 
  ProviderCapabilities,
  ApiKeyValidationResult,
  TextToImageRequest
} from '../../core/types';
import { OPENAI_CONFIG, OPENAI_API } from './config';
import { OpenAITextToImageProvider } from './text-to-image';

export class OpenAIProvider extends BaseAIProvider {
  private textToImageProvider: OpenAITextToImageProvider;

  constructor(apiKey: string) {
    super(apiKey, OPENAI_CONFIG);
    this.textToImageProvider = new OpenAITextToImageProvider(this);
  }

  getName(): string {
    return 'OpenAI';
  }

  getCapabilities(): ProviderCapabilities {
    return OPENAI_CONFIG.capabilities;
  }

  async validateApiKey(): Promise<ApiKeyValidationResult> {
    try {
      const response = await fetch(`${OPENAI_API.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key'
        };
      }

      if (response.ok) {
        const data = await response.json();
        const hasImageModels = data.data?.some((model: any) => 
          model.id.includes('dall-e')
        );

        return {
          isValid: true,
          capabilities: hasImageModels ? ['text-to-image'] : [],
        };
      }

      return {
        isValid: false,
        error: `Validation failed with status ${response.status}`
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error'
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
        throw new Error('Image-to-image not supported by OpenAI provider');

      case 'text-to-video':
        throw new Error('Text-to-video not supported by OpenAI provider');

      case 'image-to-video':
        throw new Error('Image-to-video not supported by OpenAI provider');

      default:
        throw new Error(`Unsupported request type: ${(request as any).type}`);
    }
  }

  // 获取账户信息
  async getAccountInfo(): Promise<{
    organization?: string;
    usage?: any;
    limits?: any;
  }> {
    try {
      const response = await fetch(`${OPENAI_API.baseUrl}/organizations`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          organization: data.data?.[0]?.name,
          usage: data.usage,
          limits: data.limits
        };
      }

      return {};
    } catch (error) {
      console.error('Failed to get OpenAI account info:', error);
      return {};
    }
  }

  // 获取可用模型列表
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${OPENAI_API.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data
          ?.filter((model: any) => model.id.includes('dall-e'))
          .map((model: any) => model.id) || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to get OpenAI models:', error);
      return [];
    }
  }
}

// 工厂函数
export function createOpenAIProvider(apiKey: string): OpenAIProvider {
  return new OpenAIProvider(apiKey);
}

// 注册到提供商注册表
import { ProviderRegistry } from '../../core/base-provider';

ProviderRegistry.registerProvider(
  'openai',
  (apiKey: string) => new OpenAIProvider(apiKey),
  OPENAI_CONFIG
);