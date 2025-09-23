// Gemini 2.5 Flash 文生图实现
import { 
  TextToImageRequest, 
  GenerationResult, 
  ProviderError,
  GenerationMetadata 
} from '../../core/types';
import { BaseAIProvider } from '../../core/base-provider';
import { GEMINI_API, GeminiAPIMode, STYLE_PROMPTS } from './config';

// OpenAI格式API响应类型
interface OpenAIImageResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

// 谷歌原生格式响应类型
interface GoogleNativeResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // base64
        };
      }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount: number;
  };
}

export class GeminiTextToImageProvider {
  constructor(private provider: BaseAIProvider) {}

  async generateImage(request: TextToImageRequest, apiKey: string): Promise<GenerationResult> {
    const requestId = this.provider.createRequestId();
    
    try {
      // 验证请求
      const validationError = this.validateRequest(request);
      if (validationError) {
        throw validationError;
      }

      // 选择最适合的API模式
      const apiMode = this.selectAPIMode(request);
      
      // 调用相应的API
      let result: GenerationResult;
      switch (apiMode) {
        case GeminiAPIMode.OPENAI_GENERATE:
          result = await this.callOpenAIGenerate(request, apiKey, requestId);
          break;
        case GeminiAPIMode.GOOGLE_NATIVE:
          result = await this.callGoogleNative(request, apiKey, requestId);
          break;
        case GeminiAPIMode.CHAT_COMPLETION:
          result = await this.callChatCompletion(request, apiKey, requestId);
          break;
        default:
          result = await this.callOpenAIGenerate(request, apiKey, requestId);
      }
      
      return result;

    } catch (error) {
      return this.createErrorResult(requestId, request, error);
    }
  }

  private validateRequest(request: TextToImageRequest): ProviderError | null {
    // 检查提示词长度
    if (request.prompt.length > GEMINI_API.maxPromptLength) {
      return {
        code: 'PROMPT_TOO_LONG',
        message: `Prompt exceeds maximum length of ${GEMINI_API.maxPromptLength} characters`,
        provider: 'gemini-tuzi',
        isRetryable: false,
        suggestedAction: 'Please shorten your prompt'
      };
    }

    // 检查图片尺寸（如果指定）
    if (request.dimensions) {
      const supportedSizes = GEMINI_API.supportedSizes;
      const { width, height } = request.dimensions;
      
      const isSupported = supportedSizes.some(size => 
        size.width === width && size.height === height
      );

      if (!isSupported) {
        console.warn(`Size ${width}x${height} may not be optimized for Gemini`);
      }
    }

    return null;
  }

  private selectAPIMode(request: TextToImageRequest): GeminiAPIMode {
    // 如果指定了特定尺寸或高级参数，使用OpenAI格式
    if (request.dimensions || request.quality === 'premium') {
      return GeminiAPIMode.OPENAI_GENERATE;
    }

    // 默认使用OpenAI格式，因为更简单直接
    return GeminiAPIMode.OPENAI_GENERATE;
  }

  private async callOpenAIGenerate(
    request: TextToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    const requestBody = {
      model: GEMINI_API.defaultModel,
      prompt: enhancedPrompt,
      n: 1,
      size: this.formatSize(request.dimensions),
      response_format: 'b64_json' // 优先使用base64格式
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GEMINI_API.timeout);

    let response: Response;
    try {
      response = await fetch(`${GEMINI_API.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await this.handleAPIError(response);
    }

    const result: OpenAIImageResponse = await response.json();
    return this.processOpenAIResponse(result, requestId, request);
  }

  private async callGoogleNative(
    request: TextToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    const requestBody = {
      contents: [{
        parts: [
          { text: enhancedPrompt }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 7680,
        temperature: request.quality === 'fast' ? 0.3 : 0.1
      }
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GEMINI_API.timeout);

    const response = await fetch(
      `${GEMINI_API.googleApiUrl}/models/${GEMINI_API.previewModel}:generateContent`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await this.handleAPIError(response);
    }

    const result: GoogleNativeResponse = await response.json();
    return this.processGoogleNativeResponse(result, requestId, request);
  }

  private async callChatCompletion(
    request: TextToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    const messages = [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `生成图片：${enhancedPrompt}`
        }
      ]
    }];

    const requestBody = {
      model: GEMINI_API.defaultModel,
      messages,
      stream: true // 使用流式响应获取完整数据
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GEMINI_API.timeout);

    const response = await fetch(`${GEMINI_API.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await this.handleAPIError(response);
    }

    return await this.processStreamResponse(response, requestId, request);
  }

  private async processStreamResponse(
    response: Response, 
    requestId: string, 
    request: TextToImageRequest
  ): Promise<GenerationResult> {
    let fullContent = '';
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new Error('Failed to read stream response');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  fullContent += parsed.choices[0].delta.content;
                }
              } catch {
                // 忽略JSON解析错误
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 从流式内容中提取图片数据
    return this.extractImageFromContent(fullContent, requestId, request);
  }

  private extractImageFromContent(
    content: string, 
    requestId: string, 
    request: TextToImageRequest
  ): GenerationResult {
    // 查找base64图片数据
    const base64Pattern = /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g;
    const matches = Array.from(content.matchAll(base64Pattern));

    if (matches.length > 0) {
      const imageData = matches[0][0]; // 取第一个匹配的图片

      const metadata: GenerationMetadata = {
        provider: 'gemini-tuzi',
        model: GEMINI_API.defaultModel,
        dimensions: request.dimensions || { width: 1024, height: 1024 },
        format: 'png'
      };

      return {
        id: requestId,
        type: 'text-to-image',
        status: 'completed',
        result: {
          base64: imageData,
          metadata
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
    }

    // 查找URL链接
    const urlPattern = /https?:\/\/[^\s<>"]+\.(png|jpg|jpeg|gif|webp)/gi;
    const urlMatches = content.match(urlPattern);

    if (urlMatches && urlMatches.length > 0) {
      const metadata: GenerationMetadata = {
        provider: 'gemini-tuzi',
        model: GEMINI_API.defaultModel,
        dimensions: request.dimensions || { width: 1024, height: 1024 },
        format: 'png'
      };

      return {
        id: requestId,
        type: 'text-to-image',
        status: 'completed',
        result: {
          url: urlMatches[0],
          metadata
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };
    }

    throw new Error('No image data found in response');
  }

  private processOpenAIResponse(
    response: OpenAIImageResponse, 
    requestId: string,
    request: TextToImageRequest
  ): GenerationResult {
    const imageData = response.data[0];
    
    if (!imageData?.b64_json && !imageData?.url) {
      throw new Error('No image data in response');
    }

    const metadata: GenerationMetadata = {
      provider: 'gemini-tuzi',
      model: GEMINI_API.defaultModel,
      dimensions: request.dimensions || { width: 1024, height: 1024 },
      format: 'png'
    };

    return {
      id: requestId,
      type: 'text-to-image',
      status: 'completed',
      result: {
        base64: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : undefined,
        url: imageData.url,
        metadata
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
  }

  private processGoogleNativeResponse(
    response: GoogleNativeResponse, 
    requestId: string,
    request: TextToImageRequest
  ): GenerationResult {
    const candidate = response.candidates[0];
    
    if (!candidate?.content?.parts) {
      throw new Error('No content in response');
    }

    // 查找图片数据
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        const metadata: GenerationMetadata = {
          provider: 'gemini-tuzi',
          model: GEMINI_API.previewModel,
          dimensions: request.dimensions || { width: 1024, height: 1024 },
          format: part.inlineData.mimeType.includes('png') ? 'png' : 'jpeg'
        };

        return {
          id: requestId,
          type: 'text-to-image',
          status: 'completed',
          result: {
            base64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            metadata
          },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        };
      }
    }

    throw new Error('No image data found in response');
  }

  private enhancePromptWithStyle(prompt: string, style?: string): string {
    if (!style || !STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS]) {
      return prompt;
    }

    const styleEnhancement = STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS];
    return `${prompt}, ${styleEnhancement}`;
  }

  private formatSize(dimensions?: { width: number; height: number }): string {
    if (!dimensions) {
      return '1024x1024';
    }

    return `${dimensions.width}x${dimensions.height}`;
  }

  private async handleAPIError(response: Response): Promise<Error> {
    try {
      const errorData = await response.json();
      return new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    } catch {
      return new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private createErrorResult(
    requestId: string, 
    request: TextToImageRequest, 
    error: unknown
  ): GenerationResult {
    return {
      id: requestId,
      type: 'text-to-image',
      status: 'failed',
      error: {
        code: this.getErrorCode(error),
        message: this.getErrorMessage(error),
        details: error
      },
      createdAt: new Date().toISOString()
    };
  }

  private getErrorCode(error: unknown): string {
    const errorRecord = isRecord(error) ? error : undefined;
    const message = (typeof errorRecord?.message === 'string'
      ? errorRecord.message
      : error instanceof Error
        ? error.message
        : String(error)
    ).toLowerCase();

    if (typeof errorRecord?.code === 'string') return errorRecord.code;
    if (message.includes('401')) return 'AUTHENTICATION_ERROR';
    if (message.includes('429')) return 'RATE_LIMIT_EXCEEDED';
    if (message.includes('400')) return 'INVALID_REQUEST';
    if (message.includes('timeout')) return 'TIMEOUT';
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (isRecord(error) && typeof error.message === 'string') {
      return error.message;
    }
    return String(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
