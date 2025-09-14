// Gemini 2.5 Flash 图生图实现
import { 
  ImageToImageRequest, 
  GenerationResult, 
  ProviderError,
  GenerationMetadata 
} from '../../core/types';
import { BaseAIProvider } from '../../core/base-provider';
import { GEMINI_API, GeminiAPIMode, STYLE_PROMPTS } from './config';

// OpenAI Edit格式响应类型
interface OpenAIEditResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

// Chat模式响应类型
interface ChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
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

export class GeminiImageToImageProvider {
  constructor(private provider: BaseAIProvider) {}

  async transformImage(request: ImageToImageRequest, apiKey: string): Promise<GenerationResult> {
    const requestId = this.provider.generateRequestId();
    
    console.log('🤖 Gemini图生图 - 开始处理请求:', {
      requestId,
      hasSourceImage: !!request.sourceImage,
      sourceImageType: request.sourceImage?.startsWith('data:') ? 'base64' : 'url',
      sourceImageLength: request.sourceImage?.length || 0,
      prompt: request.prompt,
      style: request.style
    });
    
    try {
      // 验证请求
      const validationError = this.validateRequest(request);
      if (validationError) {
        console.log('❌ Gemini图生图 - 请求验证失败:', validationError);
        throw validationError;
      }

      // 选择最适合的API模式
      const apiMode = this.selectAPIMode(request);
      console.log('🔧 Gemini图生图 - 选择API模式:', apiMode);
      
      // 调用相应的API
      let result: GenerationResult;
      switch (apiMode) {
        case GeminiAPIMode.OPENAI_EDIT:
          result = await this.callOpenAIEdit(request, apiKey, requestId);
          break;
        case GeminiAPIMode.CHAT_COMPLETION:
          result = await this.callChatCompletion(request, apiKey, requestId);
          break;
        case GeminiAPIMode.GOOGLE_NATIVE:
          result = await this.callGoogleNative(request, apiKey, requestId);
          break;
        default:
          result = await this.callOpenAIEdit(request, apiKey, requestId);
      }
      
      console.log('✅ Gemini图生图 - 请求完成:', {
        requestId,
        status: result.status,
        hasResult: !!result.result,
        resultType: result.result?.base64 ? 'base64' : result.result?.url ? 'url' : 'none'
      });
      
      return result;

    } catch (error) {
      console.log('❌ Gemini图生图 - 请求失败:', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.createErrorResult(requestId, request, error);
    }
  }

  private validateRequest(request: ImageToImageRequest): ProviderError | null {
    // 检查是否有源图片
    if (!request.sourceImage) {
      return {
        code: 'MISSING_SOURCE_IMAGE',
        message: 'Source image is required for image-to-image generation',
        provider: 'gemini-tuzi',
        isRetryable: false,
        suggestedAction: 'Please provide a source image'
      };
    }

    // 检查提示词
    if (!request.prompt || request.prompt.trim().length === 0) {
      return {
        code: 'MISSING_PROMPT',
        message: 'Prompt is required for image transformation',
        provider: 'gemini-tuzi',
        isRetryable: false,
        suggestedAction: 'Please provide a transformation prompt'
      };
    }

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

    return null;
  }

  private selectAPIMode(request: ImageToImageRequest): GeminiAPIMode {
    // 如果需要更精确的控制，使用OpenAI Edit格式
    if (request.strength !== undefined || request.dimensions) {
      return GeminiAPIMode.OPENAI_EDIT;
    }

    // 复杂的图片分析和生成任务使用Chat模式
    if (request.prompt.length > 100) {
      return GeminiAPIMode.CHAT_COMPLETION;
    }

    // 默认使用OpenAI Edit格式
    return GeminiAPIMode.OPENAI_EDIT;
  }

  private async callOpenAIEdit(
    request: ImageToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    // 处理图片数据
    const imageBlob = await this.prepareImageBlob(request.sourceImage);
    
    const formData = new FormData();
    formData.append('model', GEMINI_API.defaultModel);
    formData.append('prompt', enhancedPrompt);
    formData.append('image', imageBlob, 'image.png');
    formData.append('response_format', 'b64_json');
    
    if (request.dimensions) {
      formData.append('size', this.formatSize(request.dimensions));
    }

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GEMINI_API.timeout);

    let response: Response;
    try {
      response = await fetch(`${GEMINI_API.baseUrl}/images/edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData,
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

    const result: OpenAIEditResponse = await response.json();
    return this.processOpenAIResponse(result, requestId, request);
  }

  private async callChatCompletion(
    request: ImageToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    // 准备图片数据用于Chat格式
    const imageData = await this.prepareImageData(request.sourceImage);
    
    const messages = [{
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: enhancedPrompt
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: imageData
          }
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

    let response: Response;
    try {
      response = await fetch(`${GEMINI_API.baseUrl}/chat/completions`, {
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

    return await this.processStreamResponse(response, requestId, request);
  }

  private async callGoogleNative(
    request: ImageToImageRequest, 
    apiKey: string, 
    requestId: string
  ): Promise<GenerationResult> {
    const enhancedPrompt = this.enhancePromptWithStyle(request.prompt, request.style);
    
    // 准备图片数据
    const { mimeType, data } = await this.prepareGoogleImageData(request.sourceImage);
    
    const requestBody = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data } },
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

    let response: Response;
    try {
      response = await fetch(
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

    const result: GoogleNativeResponse = await response.json();
    return this.processGoogleNativeResponse(result, requestId, request);
  }

  private async prepareImageBlob(sourceImage: string): Promise<Blob> {
    if (sourceImage.startsWith('data:')) {
      // Base64数据
      const base64Data = sourceImage.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/png' });
    } else {
      // URL数据
      const response = await fetch(sourceImage);
      return await response.blob();
    }
  }

  private async prepareImageData(sourceImage: string): Promise<string> {
    if (sourceImage.startsWith('data:')) {
      return sourceImage;
    } else {
      // 如果是URL，需要转换为base64
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return `data:image/png;base64,${base64}`;
    }
  }

  private async prepareGoogleImageData(sourceImage: string): Promise<{ mimeType: string; data: string }> {
    if (sourceImage.startsWith('data:')) {
      const [header, data] = sourceImage.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
      return { mimeType, data };
    } else {
      // URL转换为base64
      const response = await fetch(sourceImage);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return { mimeType: 'image/png', data: base64 };
    }
  }

  private async processStreamResponse(
    response: Response, 
    requestId: string, 
    request: ImageToImageRequest
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
              } catch (e) {
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
    request: ImageToImageRequest
  ): GenerationResult {
    // 查找base64图片数据
    const base64Pattern = /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g;
    const matches = Array.from(content.matchAll(base64Pattern));

    if (matches.length > 0) {
      const imageData = matches[0][0];

      const metadata: GenerationMetadata = {
        provider: 'gemini-tuzi',
        model: GEMINI_API.defaultModel,
        dimensions: request.dimensions || { width: 1024, height: 1024 },
        format: 'png'
      };

      return {
        id: requestId,
        type: 'image-to-image',
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
        type: 'image-to-image',
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
    response: OpenAIEditResponse, 
    requestId: string,
    request: ImageToImageRequest
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
      type: 'image-to-image',
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
    request: ImageToImageRequest
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
          type: 'image-to-image',
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
    request: ImageToImageRequest, 
    error: any
  ): GenerationResult {
    return {
      id: requestId,
      type: 'image-to-image',
      status: 'failed',
      error: {
        code: this.getErrorCode(error),
        message: this.getErrorMessage(error),
        details: error
      },
      createdAt: new Date().toISOString()
    };
  }

  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.message?.includes('401')) return 'AUTHENTICATION_ERROR';
    if (error.message?.includes('429')) return 'RATE_LIMIT_EXCEEDED';
    if (error.message?.includes('400')) return 'INVALID_REQUEST';
    if (error.message?.includes('timeout')) return 'TIMEOUT';
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: any): string {
    return error.message || error.toString() || 'Unknown error occurred';
  }
}