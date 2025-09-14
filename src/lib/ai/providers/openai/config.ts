// OpenAI提供商配置
import { ProviderConfig } from '../../core/types';

export const OPENAI_CONFIG: ProviderConfig = {
  id: 'openai',
  name: 'OpenAI',
  description: 'DALL-E 3 高质量图像生成，适合创意和艺术创作',
  website: 'https://openai.com',
  apiKeyUrl: 'https://platform.openai.com/api-keys',
  capabilities: {
    textToImage: true,
    imageToImage: false,
    textToVideo: false,
    imageToVideo: false,
    maxImageSize: { width: 1024, height: 1024 },
    maxVideoLength: 0,
    supportedFormats: ['png'],
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
};

// OpenAI API配置
export const OPENAI_API = {
  baseUrl: 'https://api.openai.com/v1',
  timeout: 60000, // 60秒超时
  defaultModel: 'dall-e-3',
  imageFormats: ['png'] as const,
  maxPromptLength: 1000,
  supportedSizes: [
    { width: 1024, height: 1024, label: '正方形' },
    { width: 1792, height: 1024, label: '横向' },
    { width: 1024, height: 1792, label: '纵向' }
  ] as const
} as const;