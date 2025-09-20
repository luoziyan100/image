// 提供商能力映射器
// 管理各个AI提供商的能力和配置信息

import { ProviderCapabilities, ProviderConfig, StylePreset, GenerationQuality } from './types';

// 提供商能力映射
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  'gemini-tuzi': {
    textToImage: true,
    imageToImage: true,
    textToVideo: false,
    imageToVideo: false,
    maxImageSize: { width: 2048, height: 2048 },
    maxVideoLength: 0,
    supportedFormats: ['png', 'jpeg', 'webp'],
    supportedQualities: ['fast', 'standard', 'premium'],
    supportedStyles: ['photographic', 'digital-art', 'anime', 'realistic', 'abstract'],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 15,
      requestsPerDay: 3000
    },
    estimatedCost: {
      textToImage: 0.005, // $0.005 per image
      imageToImage: 0.008,
      textToVideo: 0,
      imageToVideo: 0,
      currency: 'USD'
    }
  },

  openai: {
    textToImage: true,
    imageToImage: false,
    textToVideo: false,
    imageToVideo: false,
    maxImageSize: { width: 1024, height: 1024 },
    maxVideoLength: 0,
    supportedFormats: ['png', 'jpeg'],
    supportedQualities: ['standard', 'premium'],
    supportedStyles: ['photographic', 'digital-art', 'cinematic'],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 1000
    },
    estimatedCost: {
      textToImage: 0.02, // $0.02 per image
      imageToImage: 0,
      textToVideo: 0,
      imageToVideo: 0,
      currency: 'USD'
    }
  },

  stability: {
    textToImage: true,
    imageToImage: true,
    textToVideo: false,
    imageToVideo: true,
    maxImageSize: { width: 2048, height: 2048 },
    maxVideoLength: 5,
    supportedFormats: ['png', 'jpeg', 'webp', 'mp4'],
    supportedQualities: ['fast', 'standard', 'premium'],
    supportedStyles: ['photographic', 'digital-art', 'fantasy-art', 'anime'],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerDay: 2000
    },
    estimatedCost: {
      textToImage: 0.01,
      imageToImage: 0.015,
      textToVideo: 0,
      imageToVideo: 0.05, // per second
      currency: 'USD'
    }
  },

  google: {
    textToImage: true,
    imageToImage: false,
    textToVideo: true,
    imageToVideo: false,
    maxImageSize: { width: 1536, height: 1536 },
    maxVideoLength: 8,
    supportedFormats: ['png', 'jpeg', 'mp4'],
    supportedQualities: ['fast', 'standard', 'premium'],
    supportedStyles: ['photographic', 'digital-art', 'cinematic', 'abstract'],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerDay: 5000
    },
    estimatedCost: {
      textToImage: 0.008,
      imageToImage: 0,
      textToVideo: 0.10, // per second
      imageToVideo: 0,
      currency: 'USD'
    }
  },

  runwayml: {
    textToImage: false,
    imageToImage: false,
    textToVideo: true,
    imageToVideo: true,
    maxImageSize: { width: 1280, height: 768 },
    maxVideoLength: 10,
    supportedFormats: ['mp4', 'gif'],
    supportedQualities: ['standard', 'premium'],
    supportedStyles: ['cinematic', 'realistic'],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 2,
      requestsPerDay: 100
    },
    estimatedCost: {
      textToImage: 0,
      imageToImage: 0,
      textToVideo: 0.15, // per second
      imageToVideo: 0.20, // per second
      currency: 'USD'
    }
  },

  anthropic: {
    textToImage: false,
    imageToImage: false,
    textToVideo: false,
    imageToVideo: false,
    maxImageSize: { width: 0, height: 0 },
    maxVideoLength: 0,
    supportedFormats: [],
    supportedQualities: [],
    requiresApiKey: true,
    rateLimit: {
      requestsPerMinute: 1000,
      requestsPerDay: 10000
    },
    estimatedCost: {
      textToImage: 0,
      imageToImage: 0,
      textToVideo: 0,
      imageToVideo: 0,
      currency: 'USD'
    }
  }
};

// 提供商配置映射
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  'gemini-tuzi': {
    id: 'gemini-tuzi',
    name: 'Gemini 2.5 Flash (兔子)',
    description: 'Gemini 2.5 Flash 通过兔子API - 支持文生图、图生图、chat模式',
    website: 'https://wiki.tu-zi.com',
    apiKeyUrl: 'https://wiki.tu-zi.com/zh/Code/gemini-2-5-flash-image',
    capabilities: PROVIDER_CAPABILITIES['gemini-tuzi'],
    models: [
      {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        description: '标准图像生成模型，支持文生图和图生图',
        capabilities: ['textToImage', 'imageToImage'],
        isDefault: true,
        isPremium: false
      },
      {
        id: 'gemini-2.5-flash-image-preview',
        name: 'Gemini 2.5 Flash Image Preview',
        description: '预览版本，支持谷歌官方格式调用',
        capabilities: ['textToImage', 'imageToImage'],
        isDefault: false,
        isPremium: false
      }
    ]
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'DALL-E 3 高质量图像生成，适合创意和艺术创作',
    website: 'https://openai.com',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    capabilities: PROVIDER_CAPABILITIES.openai,
    models: [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: '最新版本，支持1024x1024高清图像生成',
        capabilities: ['textToImage'],
        isDefault: true,
        isPremium: false
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        description: '经典版本，性价比更高',
        capabilities: ['textToImage'],
        isDefault: false,
        isPremium: false
      }
    ]
  },

  stability: {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion系列模型，支持图像和视频生成',
    website: 'https://stability.ai',
    apiKeyUrl: 'https://platform.stability.ai/account/keys',
    capabilities: PROVIDER_CAPABILITIES.stability,
    models: [
      {
        id: 'stable-diffusion-xl-1024-v1-0',
        name: 'SDXL 1.0',
        description: '高质量1024x1024图像生成',
        capabilities: ['textToImage', 'imageToImage'],
        isDefault: true,
        isPremium: false
      },
      {
        id: 'stable-video-diffusion-img2vid-xt',
        name: 'SVD-XT',
        description: '图片转视频模型',
        capabilities: ['imageToVideo'],
        isDefault: true,
        isPremium: true
      }
    ]
  },

  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini和Imagen系列，强大的多模态AI能力',
    website: 'https://ai.google.dev',
    apiKeyUrl: 'https://makersuite.google.com/app/apikey',
    capabilities: PROVIDER_CAPABILITIES.google,
    models: [
      {
        id: 'imagen-3.0',
        name: 'Imagen 3.0',
        description: '最新图像生成模型',
        capabilities: ['textToImage'],
        isDefault: true,
        isPremium: false
      },
      {
        id: 'veo',
        name: 'Veo',
        description: '高质量视频生成模型',
        capabilities: ['textToVideo'],
        isDefault: true,
        isPremium: true
      }
    ]
  },

  runwayml: {
    id: 'runwayml',
    name: 'RunwayML',
    description: '专业视频生成AI，创意工作者的首选',
    website: 'https://runwayml.com',
    apiKeyUrl: 'https://app.runwayml.com/account',
    capabilities: PROVIDER_CAPABILITIES.runwayml,
    models: [
      {
        id: 'gen-3-alpha-turbo',
        name: 'Gen-3 Alpha Turbo',
        description: '快速视频生成模型',
        capabilities: ['textToVideo', 'imageToVideo'],
        isDefault: true,
        isPremium: false
      },
      {
        id: 'gen-3-alpha',
        name: 'Gen-3 Alpha',
        description: '高质量视频生成模型',
        capabilities: ['textToVideo', 'imageToVideo'],
        isDefault: false,
        isPremium: true
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude系列模型，强大的视觉理解和分析能力',
    website: 'https://anthropic.com',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    capabilities: PROVIDER_CAPABILITIES.anthropic,
    models: [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: '最新视觉理解模型，可分析图像内容',
        capabilities: [],
        isDefault: true,
        isPremium: false
      }
    ]
  }
};

// 能力映射器类
export class CapabilityMapper {
  // 根据请求类型获取支持的提供商
  static getProvidersForRequestType(requestType: string): string[] {
    return Object.entries(PROVIDER_CAPABILITIES)
      .filter(([, capabilities]) => {
        switch (requestType) {
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
      })
      .map(([providerId]) => providerId);
  }

  // 获取提供商能力
  static getProviderCapabilities(providerId: string): ProviderCapabilities | null {
    return PROVIDER_CAPABILITIES[providerId] || null;
  }

  // 获取提供商配置
  static getProviderConfig(providerId: string): ProviderConfig | null {
    return PROVIDER_CONFIGS[providerId] || null;
  }

  // 获取所有可用提供商
  static getAllProviders(): ProviderConfig[] {
    return Object.values(PROVIDER_CONFIGS);
  }

  // 根据优先级排序提供商
  static sortProvidersByPriority(
    providerIds: string[], 
    priority: 'speed' | 'quality' | 'cost' = 'quality'
  ): string[] {
    return providerIds.sort((a, b) => {
      const capA = PROVIDER_CAPABILITIES[a];
      const capB = PROVIDER_CAPABILITIES[b];

      if (!capA || !capB) return 0;

      switch (priority) {
        case 'speed':
          // 基于请求频率限制排序（频率越高速度越快）
          return (capB.rateLimit?.requestsPerMinute || 0) - (capA.rateLimit?.requestsPerMinute || 0);
        
        case 'cost':
          // 基于预估成本排序（成本越低越好）
          const costA = capA.estimatedCost?.textToImage || Infinity;
          const costB = capB.estimatedCost?.textToImage || Infinity;
          return costA - costB;
        
        case 'quality':
        default:
          // 基于最大图像尺寸排序（尺寸越大质量越高）
          const sizeA = capA.maxImageSize.width * capA.maxImageSize.height;
          const sizeB = capB.maxImageSize.width * capB.maxImageSize.height;
          return sizeB - sizeA;
      }
    });
  }

  // 检查提供商是否支持特定功能
  static supportsFeature(providerId: string, feature: keyof ProviderCapabilities): boolean {
    const capabilities = PROVIDER_CAPABILITIES[providerId];
    if (!capabilities) return false;

    return Boolean(capabilities[feature]);
  }

  // 获取支持特定样式的提供商
  static getProvidersForStyle(style: StylePreset): string[] {
    return Object.entries(PROVIDER_CAPABILITIES)
      .filter(([, capabilities]) => 
        capabilities.supportedStyles?.includes(style) || !capabilities.supportedStyles
      )
      .map(([providerId]) => providerId);
  }

  // 获取支持特定质量级别的提供商
  static getProvidersForQuality(quality: GenerationQuality): string[] {
    return Object.entries(PROVIDER_CAPABILITIES)
      .filter(([, capabilities]) => 
        capabilities.supportedQualities.includes(quality)
      )
      .map(([providerId]) => providerId);
  }

  // 检查尺寸是否被提供商支持
  static isImageSizeSupported(providerId: string, width: number, height: number): boolean {
    const capabilities = PROVIDER_CAPABILITIES[providerId];
    if (!capabilities) return false;

    return width <= capabilities.maxImageSize.width && height <= capabilities.maxImageSize.height;
  }

  // 检查视频时长是否被提供商支持
  static isVideoDurationSupported(providerId: string, duration: number): boolean {
    const capabilities = PROVIDER_CAPABILITIES[providerId];
    if (!capabilities) return false;

    return duration <= capabilities.maxVideoLength;
  }
}
