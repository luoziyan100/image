// AI多模态统一类型定义
// 基于BYOK架构设计的统一接口类型

// 基础维度类型
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface VideoDimensions extends ImageDimensions {
  fps?: number;
}

// 样式预设
export type StylePreset = 
  | 'photographic'
  | 'digital-art' 
  | 'comic-book'
  | 'fantasy-art'
  | 'line-art'
  | 'anime'
  | 'cinematic'
  | 'abstract'
  | 'realistic';

// 生成质量级别
export type GenerationQuality = 'fast' | 'standard' | 'premium';

// 多模态生成请求类型
export interface TextToImageRequest {
  type: 'text-to-image';
  prompt: string;
  negativePrompt?: string;
  style?: StylePreset;
  dimensions?: ImageDimensions;
  quality?: GenerationQuality;
  seed?: number;
  steps?: number;
}

export interface ImageToImageRequest {
  type: 'image-to-image';
  sourceImage: string; // base64 or URL (兼容旧字段)
  // 新增：多图输入，按顺序传递；如提供此字段，优先使用该数组
  sourceImages?: string[]; // e.g. [refA, refB, pose, ...]
  prompt: string;
  negativePrompt?: string;
  strength?: number; // 0-1, how much to change the image
  style?: StylePreset;
  dimensions?: ImageDimensions;
  quality?: GenerationQuality;
  seed?: number;
}

export interface TextToVideoRequest {
  type: 'text-to-video';
  prompt: string;
  duration?: number; // seconds
  fps?: number;
  dimensions?: VideoDimensions;
  quality?: GenerationQuality;
  seed?: number;
}

export interface ImageToVideoRequest {
  type: 'image-to-video';
  sourceImage: string; // base64 or URL
  prompt?: string;
  motionStrength?: number; // 0-1
  duration?: number; // seconds
  fps?: number;
  dimensions?: VideoDimensions;
  quality?: GenerationQuality;
}

// 统一的生成请求类型
export type GenerationRequest = 
  | TextToImageRequest 
  | ImageToImageRequest
  | TextToVideoRequest 
  | ImageToVideoRequest;

// 生成结果类型
export interface GenerationResult {
  id: string;
  type: GenerationRequest['type'];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    url?: string;
    base64?: string;
    metadata?: GenerationMetadata;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  createdAt: string;
  completedAt?: string;
  processingTimeMs?: number;
}

// 生成元数据
export interface GenerationMetadata {
  provider: string;
  model: string;
  seed?: number;
  steps?: number;
  dimensions: ImageDimensions | VideoDimensions;
  fileSize?: number;
  format: string;
}

// 提供商能力定义
export interface ProviderCapabilities {
  // 支持的生成类型
  textToImage: boolean;
  imageToImage: boolean;
  textToVideo: boolean;
  imageToVideo: boolean;
  
  // 技术限制
  maxImageSize: ImageDimensions;
  maxVideoLength: number; // seconds
  supportedFormats: string[];
  supportedQualities: GenerationQuality[];
  supportedStyles?: StylePreset[];
  
  // API相关
  requiresApiKey: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  
  // 成本估算 (用于UI显示，实际成本由用户承担)
  estimatedCost?: {
    textToImage: number; // per image
    imageToImage: number;
    textToVideo: number; // per second
    imageToVideo: number; // per second
    currency: string;
  };
}

// 提供商配置
export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  website: string;
  apiKeyUrl?: string; // 获取API key的链接
  capabilities: ProviderCapabilities;
  models: ProviderModel[];
}

export interface ProviderModel {
  id: string;
  name: string;
  description: string;
  capabilities: (keyof Pick<ProviderCapabilities, 'textToImage' | 'imageToImage' | 'textToVideo' | 'imageToVideo'>)[];
  isDefault?: boolean;
  isPremium?: boolean;
}

// 用户API Key配置
export interface UserApiKeyConfig {
  id: string;
  provider: string;
  keyName: string; // 用户自定义名称
  encryptedKey: string; // 客户端加密存储
  capabilities: string[]; // 该key支持的功能
  isActive: boolean;
  isValid?: boolean; // 最近一次验证结果
  addedAt: string;
  lastUsed?: string;
  lastValidated?: string;
}

// API Key验证结果
export interface ApiKeyValidationResult {
  isValid: boolean;
  capabilities?: string[];
  quotaInfo?: {
    remaining: number;
    total: number;
    resetDate: string;
  };
  error?: string;
}

// 提供商错误类型
export interface ProviderError {
  code: string;
  message: string;
  provider: string;
  isRetryable: boolean;
  suggestedAction?: string;
}

// 生成选项
export interface GenerationOptions {
  provider?: string; // 指定提供商
  model?: string; // 指定模型
  priority?: 'speed' | 'quality' | 'cost';
  fallbackProviders?: string[]; // 备用提供商列表
}

// 请求上下文
export interface RequestContext {
  userId?: string;
  sessionId: string;
  userAgent?: string;
  timestamp: string;
}

// 批量生成请求
export interface BatchGenerationRequest {
  requests: GenerationRequest[];
  options?: GenerationOptions;
  context?: RequestContext;
}

export interface BatchGenerationResult {
  id: string;
  results: GenerationResult[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedCount: number;
  totalCount: number;
  errors?: ProviderError[];
}

// 事件类型定义
export interface GenerationEvent {
  type: 'started' | 'progress' | 'completed' | 'failed';
  requestId: string;
  data?: any;
  timestamp: string;
}

// 统计信息
export interface UsageStats {
  provider: string;
  period: 'day' | 'week' | 'month';
  textToImageCount: number;
  imageToImageCount: number;
  textToVideoCount: number;
  imageToVideoCount: number;
  totalRequests: number;
  successRate: number;
  averageProcessingTime: number;
  estimatedCost: number;
}

// 导出所有类型
export type {
  GenerationRequest as AIGenerationRequest,
  GenerationResult as AIGenerationResult,
  ProviderCapabilities as AIProviderCapabilities,
  ProviderConfig as AIProviderConfig,
  UserApiKeyConfig as AIUserApiKeyConfig,
  GenerationOptions as AIGenerationOptions
};
