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
      
      // 调用相应的API（带容错回退）
      let result: GenerationResult | null = null;
      const attempts: Array<GeminiAPIMode> = [];
      // 优先使用选择的模式，然后回退到其他模式
      if (apiMode === GeminiAPIMode.OPENAI_EDIT) {
        attempts.push(GeminiAPIMode.OPENAI_EDIT, GeminiAPIMode.CHAT_COMPLETION, GeminiAPIMode.GOOGLE_NATIVE);
      } else if (apiMode === GeminiAPIMode.CHAT_COMPLETION) {
        attempts.push(GeminiAPIMode.CHAT_COMPLETION, GeminiAPIMode.OPENAI_EDIT, GeminiAPIMode.GOOGLE_NATIVE);
      } else {
        attempts.push(GeminiAPIMode.GOOGLE_NATIVE, GeminiAPIMode.OPENAI_EDIT, GeminiAPIMode.CHAT_COMPLETION);
      }

      let lastError: any = null;
      for (const mode of attempts) {
        try {
          if (mode === GeminiAPIMode.OPENAI_EDIT) {
            result = await this.callOpenAIEdit(request, apiKey, requestId);
          } else if (mode === GeminiAPIMode.CHAT_COMPLETION) {
            result = await this.callChatCompletion(request, apiKey, requestId);
          } else {
            result = await this.callGoogleNative(request, apiKey, requestId);
          }
          // 成功则跳出
          if (result) break;
        } catch (e) {
          lastError = e;
          console.warn(`Gemini image-to-image attempt failed on ${mode}:`, e instanceof Error ? e.message : e);
        }
      }

      if (!result) {
        throw lastError || new Error('All image-to-image modes failed');
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

    // 处理图片数据（支持多图，按顺序）
    const images: string[] = (request.sourceImages && request.sourceImages.length > 0)
      ? request.sourceImages
      : [request.sourceImage];
    const blobs: Blob[] = [];
    for (let i = 0; i < images.length; i++) {
      const blob = await this.prepareImageBlob(images[i]);
      blobs.push(blob);
    }

    const formData = new FormData();
    // 基础必填参数（按 OpenAI Edit 兼容格式）
    formData.append('model', GEMINI_API.defaultModel);
    formData.append('prompt', enhancedPrompt);
    blobs.forEach((blob, idx) => {
      const name = `image_${idx + 1}.png`;
      formData.append('image', blob, name);
      try { formData.append('image[]', blob, name); } catch {}
    });
    formData.append('response_format', 'b64_json');
    // 兼容某些网关要求的数组字段名（image[]）
    // 明确生成数量
    formData.append('n', '1');
    
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
      // 读取更详细的错误信息，便于定位（可能不是JSON）
      let detail = '';
      try {
        const cloned = response.clone();
        detail = await cloned.text();
      } catch {}
      console.error('Gemini openai-edit upstream error:', response.status, detail?.slice(0, 400));

      // 如果是代理错误，尝试直接调用上游（可能会命中 CORS，但在部分环境可用）
      if (detail?.includes('AI_PROXY_ERROR')) {
        try {
          const directRes = await fetch(`${GEMINI_API.directBaseUrl}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData,
            signal: controller.signal
          });
          if (!directRes.ok) {
            throw await this.handleAPIError(directRes);
          }
          const directJson: OpenAIEditResponse = await directRes.json();
          return this.processOpenAIResponse(directJson, requestId, request);
        } catch (fallbackErr) {
          console.warn('Direct openai-edit fallback failed:', fallbackErr);
        }
      }

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
    // 准备图片数据用于Chat格式（多图）
    const imgList: string[] = (request.sourceImages && request.sourceImages.length > 0)
      ? request.sourceImages
      : [request.sourceImage];
    const imageDataList: string[] = [];
    for (const img of imgList) {
      imageDataList.push(await this.prepareImageData(img));
    }

    const messages = [{
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: enhancedPrompt
        },
        ...imageDataList.map((d) => ({
          type: 'image_url' as const,
          image_url: { url: d }
        }))
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
      let detail = '';
      try {
        const cloned = response.clone();
        detail = await cloned.text();
      } catch {}
      console.error('Gemini chat-completion upstream error:', response.status, detail?.slice(0, 400));

      if (detail?.includes('AI_PROXY_ERROR')) {
        try {
          const directRes = await fetch(`${GEMINI_API.directBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          if (!directRes.ok) throw await this.handleAPIError(directRes);
          return await this.processStreamResponse(directRes, requestId, request);
        } catch (fallbackErr) {
          console.warn('Direct chat-completion fallback failed:', fallbackErr);
        }
      }

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
    // 准备图片数据（多图）
    const imgList: string[] = (request.sourceImages && request.sourceImages.length > 0)
      ? request.sourceImages
      : [request.sourceImage];
    const parts: any[] = [];
    for (const img of imgList) {
      const { mimeType, data } = await this.prepareGoogleImageData(img);
      parts.push({ inline_data: { mime_type: mimeType, data } });
    }

    const requestBody = {
      contents: [{
        parts: [
          ...parts,
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
      let detail = '';
      try {
        const cloned = response.clone();
        detail = await cloned.text();
      } catch {}
      console.error('Gemini google-native upstream error:', response.status, detail?.slice(0, 400));

      if (detail?.includes('AI_PROXY_ERROR')) {
        try {
          const directRes = await fetch(
            `${GEMINI_API.directGoogleUrl}/models/${GEMINI_API.previewModel}:generateContent`,
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
          if (!directRes.ok) throw await this.handleAPIError(directRes);
          const directJson: GoogleNativeResponse = await directRes.json();
          return this.processGoogleNativeResponse(directJson, requestId, request);
        } catch (fallbackErr) {
          console.warn('Direct google-native fallback failed:', fallbackErr);
        }
      }

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
      const text = await response.text();
      // 尝试JSON解析，否则回退到纯文本
      try {
        const errorData = JSON.parse(text);
        return new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      } catch {
        return new Error(text || `HTTP ${response.status}: ${response.statusText}`);
      }
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
    if (error.message?.includes('413')) return 'PAYLOAD_TOO_LARGE';
    if (error.message?.includes('415')) return 'UNSUPPORTED_MEDIA_TYPE';
    return 'UNKNOWN_ERROR';
  }

  private getErrorMessage(error: any): string {
    return error.message || error.toString() || 'Unknown error occurred';
  }
}
