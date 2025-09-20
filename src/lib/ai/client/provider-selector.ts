// 提供商选择器
// 根据用户需求和偏好智能选择最合适的AI提供商

import { 
  GenerationRequest, 
  GenerationOptions, 
  ProviderConfig,
  ProviderCapabilities
} from '../core/types';
import { CapabilityMapper } from '../core/capability-mapper';
import { apiKeyManager } from './api-key-manager';

export interface ProviderSelectionResult {
  selectedProvider: string;
  alternativeProviders: string[];
  selectionReason: string;
  estimatedCost: number;
  estimatedTime: number; // seconds
}

export interface ProviderRecommendation {
  provider: string;
  score: number;
  reasons: string[];
  cost: number;
  capabilities: string[];
}

type CapabilityKey = Extract<
  keyof ProviderCapabilities,
  'textToImage' | 'imageToImage' | 'textToVideo' | 'imageToVideo'
>;

function mapRequestTypeToCapability(requestType: GenerationRequest['type']): CapabilityKey {
  switch (requestType) {
    case 'text-to-image':
      return 'textToImage';
    case 'image-to-image':
      return 'imageToImage';
    case 'text-to-video':
      return 'textToVideo';
    case 'image-to-video':
      return 'imageToVideo';
  }
  throw new Error(`Unsupported request type: ${requestType}`);
}

export class ProviderSelector {
  private static instance: ProviderSelector;

  private constructor() {}

  static getInstance(): ProviderSelector {
    if (!this.instance) {
      this.instance = new ProviderSelector();
    }
    return this.instance;
  }

  // 主要选择方法
  async selectProvider(
    request: GenerationRequest, 
    options?: GenerationOptions
  ): Promise<ProviderSelectionResult> {
    
    // 1. 获取支持该请求类型的提供商
    const supportingProviders = CapabilityMapper.getProvidersForRequestType(request.type);
    
    // 2. 过滤出用户已配置API Key的提供商
    const availableProviders = this.getAvailableProviders(supportingProviders);
    
    if (availableProviders.length === 0) {
      throw new Error(`No providers available for ${request.type}. Please configure API keys.`);
    }

    // 3. 如果用户指定了提供商，直接使用
    if (options?.provider && availableProviders.includes(options.provider)) {
      return this.buildResult(options.provider, availableProviders, 'User specified', request);
    }

    // 4. 根据优先级和请求特征选择提供商
    const selectedProvider = this.selectBestProvider(
      availableProviders, 
      request, 
      options
    );

    // 5. 构建选择结果
    return this.buildResult(selectedProvider, availableProviders, 'Auto selected', request);
  }

  // 获取所有可用的提供商推荐
  async getProviderRecommendations(
    request: GenerationRequest
  ): Promise<ProviderRecommendation[]> {
    const supportingProviders = CapabilityMapper.getProvidersForRequestType(request.type);
    const availableProviders = this.getAvailableProviders(supportingProviders);

    const recommendations: ProviderRecommendation[] = [];

    for (const providerId of availableProviders) {
      const config = CapabilityMapper.getProviderConfig(providerId);
      if (!config) continue;

      const score = this.calculateProviderScore(providerId, request);
      const reasons = this.getProviderReasons(providerId, request);
      const cost = this.estimateProviderCost(providerId, request);
      const capabilities = apiKeyManager.getProviderCapabilities(providerId);

      recommendations.push({
        provider: providerId,
        score,
        reasons,
        cost,
        capabilities
      });
    }

    // 按分数排序
    return recommendations.sort((a, b) => b.score - a.score);
  }

  // 检查提供商是否适合特定请求
  isProviderSuitable(providerId: string, request: GenerationRequest): {
    suitable: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // 检查基本支持
    const capabilityKey = mapRequestTypeToCapability(request.type);
    if (!CapabilityMapper.supportsFeature(providerId, capabilityKey)) {
      issues.push(`Does not support ${request.type}`);
    }

    // 检查API Key
    if (!apiKeyManager.isProviderAvailable(providerId)) {
      issues.push('No valid API key configured');
    }

    // 检查尺寸限制
    if ('dimensions' in request && request.dimensions) {
      const { width, height } = request.dimensions;
      if (!CapabilityMapper.isImageSizeSupported(providerId, width, height)) {
        issues.push(`Image size ${width}x${height} not supported`);
      }
    }

    // 检查视频时长限制
    if ('duration' in request && request.duration) {
      if (!CapabilityMapper.isVideoDurationSupported(providerId, request.duration)) {
        issues.push(`Video duration ${request.duration}s exceeds limit`);
      }
    }

    // 检查样式支持
    if ('style' in request && request.style) {
      const supportedProviders = CapabilityMapper.getProvidersForStyle(request.style);
      if (!supportedProviders.includes(providerId)) {
        issues.push(`Style "${request.style}" not supported`);
      }
    }

    // 检查质量支持
    if ('quality' in request && request.quality) {
      const supportedProviders = CapabilityMapper.getProvidersForQuality(request.quality);
      if (!supportedProviders.includes(providerId)) {
        issues.push(`Quality "${request.quality}" not supported`);
      }
    }

    return {
      suitable: issues.length === 0,
      issues
    };
  }

  // 获取提供商对比信息
  getProviderComparison(providerIds: string[], requestType: string): {
    provider: string;
    config: ProviderConfig;
    features: string[];
    pricing: string;
    speed: string;
  }[] {
    return providerIds.map(providerId => {
      const config = CapabilityMapper.getProviderConfig(providerId);
      if (!config) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const capabilities = config.capabilities;
      const features: string[] = [];
      
      if (capabilities.textToImage) features.push('文生图');
      if (capabilities.imageToImage) features.push('图生图');
      if (capabilities.textToVideo) features.push('文生视频');
      if (capabilities.imageToVideo) features.push('图生视频');

      const pricing = this.describePricing(capabilities.estimatedCost);
      const speed = this.describeSpeed(capabilities.rateLimit);

      return {
        provider: providerId,
        config,
        features,
        pricing,
        speed
      };
    });
  }

  // 私有方法

  private getAvailableProviders(supportingProviders: string[]): string[] {
    return supportingProviders.filter(providerId => 
      apiKeyManager.isProviderAvailable(providerId)
    );
  }

  private selectBestProvider(
    availableProviders: string[], 
    request: GenerationRequest, 
    options?: GenerationOptions
  ): string {
    // 如果只有一个可用提供商，直接返回
    if (availableProviders.length === 1) {
      return availableProviders[0];
    }

    // 根据优先级排序
    const priority = options?.priority || 'quality';
    const sortedProviders = CapabilityMapper.sortProvidersByPriority(availableProviders, priority);

    // 进一步筛选和评分
    const scoredProviders = sortedProviders.map(providerId => ({
      providerId,
      score: this.calculateProviderScore(providerId, request, options)
    }));

    // 按评分排序
    scoredProviders.sort((a, b) => b.score - a.score);

    return scoredProviders[0].providerId;
  }

  private calculateProviderScore(
    providerId: string, 
    request: GenerationRequest,
    options?: GenerationOptions
  ): number {
    let score = 0;
    const capabilities = CapabilityMapper.getProviderCapabilities(providerId);
    
    if (!capabilities) return 0;

    // 基础功能支持 (40分)
    const capabilityKey = mapRequestTypeToCapability(request.type);
    if (CapabilityMapper.supportsFeature(providerId, capabilityKey)) {
      score += 40;
    }

    // 质量评分 (20分)
    const maxImageSize = capabilities.maxImageSize.width * capabilities.maxImageSize.height;
    score += Math.min(20, (maxImageSize / (2048 * 2048)) * 20);

    // 速度评分 (20分)
    const rateLimit = capabilities.rateLimit?.requestsPerMinute || 1;
    score += Math.min(20, (rateLimit / 20) * 20);

    // 成本效益 (10分)
    const cost = capabilities.estimatedCost?.textToImage || 1;
    score += Math.max(0, 10 - cost * 100); // 成本越低分数越高

    // 特殊功能奖励 (10分)
    if ('style' in request && request.style) {
      const supportedProviders = CapabilityMapper.getProvidersForStyle(request.style);
      if (supportedProviders.includes(providerId)) {
        score += 5;
      }
    }

    if ('quality' in request && request.quality === 'premium') {
      if (capabilities.supportedQualities.includes('premium')) {
        score += 5;
      }
    }

    return Math.round(score);
  }

  private getProviderReasons(providerId: string, request: GenerationRequest): string[] {
    const reasons: string[] = [];
    const capabilities = CapabilityMapper.getProviderCapabilities(providerId);
    
    if (!capabilities) return reasons;

    // 基于能力的推荐理由
    if (capabilities.maxImageSize.width >= 2048) {
      reasons.push('支持高分辨率输出');
    }

    if (capabilities.rateLimit && capabilities.rateLimit.requestsPerMinute >= 10) {
      reasons.push('处理速度快');
    }

    if (capabilities.estimatedCost?.textToImage && capabilities.estimatedCost.textToImage < 0.02) {
      reasons.push('成本较低');
    }

    if ('style' in request && request.style) {
      const supportedProviders = CapabilityMapper.getProvidersForStyle(request.style);
      if (supportedProviders.includes(providerId)) {
        reasons.push(`支持${request.style}样式`);
      }
    }

    return reasons;
  }

  private estimateProviderCost(providerId: string, request: GenerationRequest): number {
    const capabilities = CapabilityMapper.getProviderCapabilities(providerId);
    if (!capabilities?.estimatedCost) return 0;

    switch (request.type) {
      case 'text-to-image':
        return capabilities.estimatedCost.textToImage || 0;
      case 'image-to-image':
        return capabilities.estimatedCost.imageToImage || 0;
      case 'text-to-video':
        const duration = 'duration' in request ? request.duration || 5 : 5;
        return (capabilities.estimatedCost.textToVideo || 0) * duration;
      case 'image-to-video':
        const imgDuration = 'duration' in request ? request.duration || 5 : 5;
        return (capabilities.estimatedCost.imageToVideo || 0) * imgDuration;
      default:
        return 0;
    }
  }

  private buildResult(
    selectedProvider: string, 
    allProviders: string[], 
    reason: string,
    request: GenerationRequest
  ): ProviderSelectionResult {
    const alternativeProviders = allProviders.filter(p => p !== selectedProvider);
    const estimatedCost = this.estimateProviderCost(selectedProvider, request);
    const estimatedTime = this.estimateProcessingTime(selectedProvider, request);

    return {
      selectedProvider,
      alternativeProviders,
      selectionReason: reason,
      estimatedCost,
      estimatedTime
    };
  }

  private estimateProcessingTime(providerId: string, request: GenerationRequest): number {
    // 基于请求类型和提供商的预估处理时间（秒）
    const baseTime = {
      'text-to-image': 15,
      'image-to-image': 20,
      'text-to-video': 45,
      'image-to-video': 60
    };

    let time = baseTime[request.type] || 30;

    // 根据质量调整时间
    if ('quality' in request && request.quality === 'premium') {
      time *= 1.5;
    }

    // 根据提供商速度调整
    const capabilities = CapabilityMapper.getProviderCapabilities(providerId);
    if (capabilities?.rateLimit?.requestsPerMinute) {
      const speedFactor = Math.max(0.5, capabilities.rateLimit.requestsPerMinute / 10);
      time = time / speedFactor;
    }

    return Math.round(time);
  }

  private describePricing(
    estimatedCost?: ProviderCapabilities['estimatedCost']
  ): string {
    if (!estimatedCost) return '价格未知';
    
    const imagePrice = estimatedCost.textToImage || 0;
    if (imagePrice === 0) return '免费';
    if (imagePrice < 0.01) return '非常便宜';
    if (imagePrice < 0.05) return '便宜';
    if (imagePrice < 0.1) return '中等价位';
    return '较贵';
  }

  private describeSpeed(
    rateLimit?: ProviderCapabilities['rateLimit']
  ): string {
    if (!rateLimit) return '速度未知';
    
    const rpm = rateLimit.requestsPerMinute || 1;
    if (rpm >= 20) return '非常快';
    if (rpm >= 10) return '快';
    if (rpm >= 5) return '中等';
    return '较慢';
  }
}

// 单例导出
export const providerSelector = ProviderSelector.getInstance();
