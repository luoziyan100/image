// OpenAI DALL-E 文生图实现
import { 
  TextToImageRequest, 
  GenerationResult, 
  ProviderError,
  GenerationMetadata 
} from '../../core/types';
import { BaseAIProvider } from '../../core/base-provider';
import { OPENAI_API } from './config';

// OpenAI API响应类型
interface OpenAIImageResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  created: number;
}

export class OpenAITextToImageProvider {
  constructor(private provider: BaseAIProvider) {}

  async generateImage(request: TextToImageRequest, apiKey: string): Promise<GenerationResult> {
    const requestId = this.provider.generateRequestId();
    
    try {
      // 验证请求
      const validationError = this.validateRequest(request);
      if (validationError) {
        throw validationError;
      }

      // 构建API请求
      const apiRequest = this.buildApiRequest(request);
      
      // 调用OpenAI API
      const response = await this.callOpenAIAPI(apiRequest, apiKey);
      
      // 处理响应
      return this.processResponse(response, requestId, request);

    } catch (error) {
      return {
        id: requestId,
        type: 'text-to-image',
        status: 'failed',
        error: {
          code: this.getErrorCode(error),
          message: this.getErrorMessage(error),
          details: error
        },
        createdAt: new Date().toISOString(),
        processingTimeMs: 0
      };
    }
  }

  private validateRequest(request: TextToImageRequest): ProviderError | null {
    // 检查提示词长度
    if (request.prompt.length > OPENAI_API.maxPromptLength) {
      return {
        code: 'PROMPT_TOO_LONG',
        message: `Prompt exceeds maximum length of ${OPENAI_API.maxPromptLength} characters`,
        provider: 'openai',
        isRetryable: false,
        suggestedAction: 'Please shorten your prompt'
      };
    }

    // 检查图片尺寸
    if (request.dimensions) {
      const supportedSizes = OPENAI_API.supportedSizes;
      const { width, height } = request.dimensions;
      
      const isSupported = supportedSizes.some(size => 
        size.width === width && size.height === height
      );

      if (!isSupported) {
        const supportedList = supportedSizes
          .map(size => `${size.width}x${size.height}`)
          .join(', ');
        
        return {
          code: 'UNSUPPORTED_SIZE',
          message: `Size ${width}x${height} is not supported`,
          provider: 'openai',
          isRetryable: false,
          suggestedAction: `Please use one of: ${supportedList}`
        };
      }
    }

    return null;
  }

  private buildApiRequest(request: TextToImageRequest): any {
    const apiRequest: any = {
      model: OPENAI_API.defaultModel,
      prompt: request.prompt,
      n: 1,
      size: this.formatSize(request.dimensions),
      quality: request.quality === 'premium' ? 'hd' : 'standard',
      response_format: 'url'
    };

    // 添加样式到提示词
    if (request.style) {
      apiRequest.prompt = this.enhancePromptWithStyle(request.prompt, request.style);
    }

    return apiRequest;
  }

  private formatSize(dimensions?: { width: number; height: number }): string {
    if (!dimensions) {
      return '1024x1024'; // 默认尺寸
    }

    const { width, height } = dimensions;
    return `${width}x${height}`;
  }

  private enhancePromptWithStyle(prompt: string, style: string): string {
    const stylePrompts: Record<string, string> = {
      photographic: 'photorealistic, high quality photography',
      'digital-art': 'digital artwork, concept art style',
      cinematic: 'cinematic lighting, movie poster style',
      'comic-book': 'comic book art style, illustrated',
      'fantasy-art': 'fantasy artwork, magical atmosphere',
      'line-art': 'clean line art, minimalist drawing',
      anime: 'anime art style, manga illustration',
      abstract: 'abstract art, artistic interpretation',
      realistic: 'realistic rendering, detailed artwork'
    };

    const styleEnhancement = stylePrompts[style] || '';
    return styleEnhancement ? `${prompt}, ${styleEnhancement}` : prompt;
  }

  private async callOpenAIAPI(request: any, apiKey: string): Promise<OpenAIImageResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${OPENAI_API.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(OPENAI_API.timeout)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.error?.message || response.statusText,
        code: errorData.error?.code,
        type: errorData.error?.type
      };
    }

    return await response.json() as OpenAIImageResponse;
  }

  private processResponse(
    response: OpenAIImageResponse, 
    requestId: string,
    originalRequest: TextToImageRequest
  ): GenerationResult {
    const imageData = response.data[0];
    
    if (!imageData?.url) {
      throw new Error('No image URL in response');
    }

    const metadata: GenerationMetadata = {
      provider: 'openai',
      model: OPENAI_API.defaultModel,
      dimensions: originalRequest.dimensions || { width: 1024, height: 1024 },
      format: 'png'
    };

    return {
      id: requestId,
      type: 'text-to-image',
      status: 'completed',
      result: {
        url: imageData.url,
        metadata
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - parseInt(requestId.split('-')[1])
    };
  }

  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status === 401) return 'AUTHENTICATION_ERROR';
    if (error.status === 429) return 'RATE_LIMIT_EXCEEDED';
    if (error.status === 400) return 'INVALID_REQUEST';
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: any): string {
    if (error.message) return error.message;
    if (error.status) return `HTTP ${error.status} error`;
    return 'Unknown error occurred';
  }
}