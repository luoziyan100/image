// Gemini 2.5 Flash 第三方提供商配置
import { ProviderConfig } from '../../core/types';

export const GEMINI_CONFIG: ProviderConfig = {
  id: 'gemini-tuzi',
  name: 'Gemini 2.5 Flash (兔子)',
  description: 'Gemini 2.5 Flash 通过兔子API - 支持文生图、图生图、chat模式',
  website: 'https://wiki.tu-zi.com',
  apiKeyUrl: 'https://wiki.tu-zi.com/zh/Code/gemini-2-5-flash-image',
  capabilities: {
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
};

// Gemini API配置
export const GEMINI_API = {
  baseUrl: 'https://api.tu-zi.com/v1',
  googleApiUrl: 'https://api.tu-zi.com/v1beta', // 谷歌官方格式
  timeout: 120000, // 120秒超时（增加超时时间以处理复杂的图生图任务）
  defaultModel: 'gemini-2.5-flash-image',
  previewModel: 'gemini-2.5-flash-image-preview',
  imageFormats: ['png', 'jpeg', 'webp'] as const,
  maxPromptLength: 2000,
  supportedSizes: [
    { width: 512, height: 512, label: '正方形 512x512' },
    { width: 1024, height: 1024, label: '正方形 1024x1024' },
    { width: 1792, height: 1024, label: '横向 1792x1024' },
    { width: 1024, height: 1792, label: '纵向 1024x1792' },
    { width: 2048, height: 1024, label: '超宽屏 2048x1024' }
  ] as const
} as const;

// API调用模式
export enum GeminiAPIMode {
  OPENAI_GENERATE = 'openai-generate', // OpenAI格式 - images.generate
  OPENAI_EDIT = 'openai-edit',         // OpenAI格式 - images.edit
  CHAT_COMPLETION = 'chat-completion', // Chat格式 - 流式响应
  GOOGLE_NATIVE = 'google-native'      // 谷歌原生格式
}

// 风格增强提示词
export const STYLE_PROMPTS = {
  photographic: 'photorealistic, high quality photography, professional lighting, detailed',
  'digital-art': 'digital artwork, concept art, illustration, artistic',
  anime: 'anime art style, manga style, Japanese animation, colorful',
  realistic: 'realistic rendering, detailed, lifelike, high resolution',
  abstract: 'abstract art, artistic interpretation, creative, modern',
  cinematic: 'cinematic lighting, movie scene, dramatic, professional',
  'comic-book': 'comic book style, graphic novel art, bold colors',
  'fantasy-art': 'fantasy artwork, magical, mystical, ethereal',
  'line-art': 'line art, clean lines, minimalist, black and white'
} as const;