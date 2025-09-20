// 请求路由器
// 统一处理AI生成请求，管理提供商选择、错误处理和结果聚合

import {
  GenerationRequest,
  GenerationResult,
  GenerationOptions,
  BatchGenerationRequest,
  BatchGenerationResult,
  ProviderError,
  GenerationEvent,
  RequestContext
} from '../core/types';
import { BaseAIProvider, ProviderRegistry } from '../core/base-provider';
import { apiKeyManager } from './api-key-manager';
import { providerSelector } from './provider-selector';

// 事件监听器类型
type EventListener = (event: GenerationEvent) => void;

// 请求状态管理
interface RequestState {
  id: string;
  request: GenerationRequest;
  options?: GenerationOptions;
  context?: RequestContext;
  startTime: number;
  provider?: string;
  attempts: number;
  maxAttempts: number;
  errors: ProviderError[];
}

export class RequestRouter {
  private static instance: RequestRouter;
  private activeRequests = new Map<string, RequestState>();
  private eventListeners: EventListener[] = [];
  private requestQueue: RequestState[] = [];
  private isProcessing = false;

  private constructor() {}

  static getInstance(): RequestRouter {
    if (!this.instance) {
      this.instance = new RequestRouter();
    }
    return this.instance;
  }

  // 单个请求处理
  async processRequest(
    request: GenerationRequest,
    options?: GenerationOptions,
    context?: RequestContext
  ): Promise<GenerationResult> {
    const requestId = this.generateRequestId();
    const requestState: RequestState = {
      id: requestId,
      request,
      options,
      context,
      startTime: Date.now(),
      attempts: 0,
      maxAttempts: options?.fallbackProviders ? options.fallbackProviders.length + 1 : 3,
      errors: []
    };

    this.activeRequests.set(requestId, requestState);
    this.emitEvent('started', requestId, { request, options });

    try {
      const result = await this.executeRequest(requestState);
      this.emitEvent('completed', requestId, result);
      return result;
    } catch (error) {
      const errorResult = this.createErrorResult(requestId, request, error);
      this.emitEvent('failed', requestId, { error: errorResult.error });
      return errorResult;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  // 批量请求处理
  async processBatchRequest(
    batchRequest: BatchGenerationRequest
  ): Promise<BatchGenerationResult> {
    const batchId = this.generateRequestId();
    const { requests, options, context } = batchRequest;

    const results: GenerationResult[] = [];
    const errors: ProviderError[] = [];
    let completedCount = 0;

    // 并行处理所有请求
    const promises = requests.map(async (request, index) => {
      try {
        const result = await this.processRequest(request, options, context);
        results[index] = result;
        
        if (result.status === 'completed') {
          completedCount++;
        } else if (result.error) {
          errors.push({
            code: result.error.code,
            message: result.error.message,
            provider: 'unknown',
            isRetryable: false,
            suggestedAction: 'Check individual request errors'
          });
        }
      } catch (error) {
        const errorResult = this.createErrorResult(
          `${batchId}_${index}`,
          request,
          error
        );
        results[index] = errorResult;
        
        errors.push({
          code: 'REQUEST_FAILED',
          message: `Request ${index} failed: ${error}`,
          provider: 'unknown',
          isRetryable: false,
          suggestedAction: 'Check request parameters'
        });
      }
    });

    await Promise.all(promises);

    return {
      id: batchId,
      results,
      status: completedCount === requests.length ? 'completed' : 
              completedCount > 0 ? 'completed' : 'failed',
      completedCount,
      totalCount: requests.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // 获取请求状态
  getRequestStatus(requestId: string): GenerationResult | null {
    const state = this.activeRequests.get(requestId);
    if (!state) return null;

    return {
      id: requestId,
      type: state.request.type,
      status: 'processing',
      createdAt: new Date(state.startTime).toISOString(),
      processingTimeMs: Date.now() - state.startTime
    };
  }

  // 取消请求
  async cancelRequest(requestId: string): Promise<boolean> {
    const state = this.activeRequests.get(requestId);
    if (!state) return false;

    // 从队列中移除
    this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
    
    // 从活跃请求中移除
    this.activeRequests.delete(requestId);
    
    this.emitEvent('failed', requestId, { 
      error: { code: 'CANCELLED', message: 'Request cancelled by user' }
    });

    return true;
  }

  // 获取活跃请求列表
  getActiveRequests(): string[] {
    return Array.from(this.activeRequests.keys());
  }

  // 事件监听
  addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // 获取提供商状态
  async getProviderStatus(): Promise<{
    available: string[];
    unavailable: string[];
    total: number;
  }> {
    const availableProviders = apiKeyManager.getAvailableProviders();
    const allProviders = ProviderRegistry.getAvailableProviders().map(p => p.id);
    const unavailableProviders = allProviders.filter(p => !availableProviders.includes(p));

    return {
      available: availableProviders,
      unavailable: unavailableProviders,
      total: allProviders.length
    };
  }

  // 私有方法

  private async executeRequest(state: RequestState): Promise<GenerationResult> {
    let lastError: ProviderError | null = null;

    while (state.attempts < state.maxAttempts) {
      state.attempts++;

      try {
        // 选择提供商
        const providerSelection = await providerSelector.selectProvider(
          state.request,
          state.options
        );
        state.provider = providerSelection.selectedProvider;

        // 获取API Key
        const apiKey = apiKeyManager.getApiKey(state.provider);
        if (!apiKey) {
          throw new Error(`No API key found for provider: ${state.provider}`);
        }

        // 创建提供商实例
        const provider = ProviderRegistry.getProvider(state.provider, apiKey);
        if (!provider) {
          throw new Error(`Provider ${state.provider} not found`);
        }

        // 执行生成请求
        this.emitEvent('progress', state.id, {
          provider: state.provider,
          attempt: state.attempts,
          stage: 'generating'
        });

        const result = await provider.generateContent(state.request);

        // 更新请求使用记录
        this.updateUsageStats(state.provider, state.request.type);

        return result;

      } catch (error) {
        lastError = this.handleRequestError(error, state);
        state.errors.push(lastError);

        // 如果错误不可重试，直接抛出
        if (!lastError.isRetryable) {
          break;
        }

        // 尝试备用提供商
        if (state.options?.fallbackProviders && state.options.fallbackProviders.length > 0) {
          const nextProvider = state.options.fallbackProviders.shift();
          if (nextProvider) {
            state.options.provider = nextProvider;
            continue;
          }
        }

        // 如果还有重试次数，等待后重试
        if (state.attempts < state.maxAttempts) {
          await this.waitBeforeRetry(state.attempts);
        }
      }
    }

    // 所有尝试都失败了
    throw lastError || new Error('Request failed after all attempts');
  }

  private handleRequestError(error: unknown, state: RequestState): ProviderError {
    const provider = state.provider || 'unknown';

    if (error instanceof Error) {
      return {
        code: 'REQUEST_ERROR',
        message: error.message,
        provider,
        isRetryable: this.isRetryableError(error),
        suggestedAction: this.getSuggestedAction(error)
      };
    }

    if (isProviderErrorLike(error)) {
      return {
        code: error.code ?? 'UNKNOWN_ERROR',
        message: error.message ?? 'Unknown error',
        provider,
        isRetryable: error.isRetryable !== false,
        suggestedAction: error.suggestedAction ?? 'Please try again'
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: getUnknownErrorMessage(error),
      provider,
      isRetryable: false,
      suggestedAction: 'Please check your request and try again'
    };
  }

  private isRetryableError(error: Error): boolean {
    const retryableKeywords = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'server error',
      '500',
      '502',
      '503',
      '504'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableKeywords.some(keyword => errorMessage.includes(keyword));
  }

  private getSuggestedAction(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('api key')) {
      return 'Please check your API key configuration';
    }
    if (message.includes('rate limit')) {
      return 'Please wait before making more requests';
    }
    if (message.includes('timeout')) {
      return 'Please try again with a simpler request';
    }
    if (message.includes('quota') || message.includes('billing')) {
      return 'Please check your account quota and billing';
    }

    return 'Please try again or contact support';
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 指数退避，最多10秒
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createErrorResult(
    requestId: string,
    request: GenerationRequest,
    error: unknown
  ): GenerationResult {
    const code = getUnknownErrorCode(error) ?? 'REQUEST_FAILED';
    const message = getUnknownErrorMessage(error);
    return {
      id: requestId,
      type: request.type,
      status: 'failed',
      error: {
        code,
        message,
        details: error
      },
      createdAt: new Date().toISOString()
    };
  }

  private emitEvent(
    type: GenerationEvent['type'],
    requestId: string,
    data?: unknown
  ): void {
    const event: GenerationEvent = {
      type,
      requestId,
      data,
      timestamp: new Date().toISOString()
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateUsageStats(provider: string, requestType: string): void {
    // 这里可以实现使用统计更新逻辑
    // 例如记录到localStorage或发送到分析服务
    try {
      const stats = JSON.parse(localStorage.getItem('ai_usage_stats') || '{}');
      const today = new Date().toISOString().split('T')[0];
      
      if (!stats[today]) {
        stats[today] = {};
      }
      
      if (!stats[today][provider]) {
        stats[today][provider] = {};
      }
      
      stats[today][provider][requestType] = (stats[today][provider][requestType] || 0) + 1;
      
      localStorage.setItem('ai_usage_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }
}

// 单例导出
export const requestRouter = RequestRouter.getInstance();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface ProviderErrorLike {
  code?: string;
  message?: string;
  isRetryable?: boolean;
  suggestedAction?: string;
}

function isProviderErrorLike(error: unknown): error is ProviderErrorLike {
  return isRecord(error) && ('code' in error || 'message' in error);
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function getUnknownErrorCode(error: unknown): string | undefined {
  if (isRecord(error) && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}
