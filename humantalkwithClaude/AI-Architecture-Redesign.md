# AI接口架构重新设计 - BYOK多模态平台

## 💡 设计理念转变

### 原设计问题
- ❌ 平台承担API成本和定价责任
- ❌ 架构复杂，需要成本控制和配额管理
- ❌ 单一关注图片生成

### 新设计理念
- ✅ **BYOK模式** - 用户提供自己的API Key
- ✅ **多模态统一** - 文生图、视频生成、图片编辑
- ✅ **中立平台** - 专注工具体验，不参与成本管理

## 🏗️ 重新设计的架构

### 核心设计原则

1. **用户API Key管理**
   - 用户在设置中配置自己的API密钥
   - 支持多个提供商的密钥并存
   - 本地加密存储，服务端不保存

2. **多模态能力统一**
   ```
   文生图: Prompt → Image
   图生图: Image + Prompt → Image  
   视频生成: Prompt → Video
   图生视频: Image + Prompt → Video
   ```

3. **提供商无关设计**
   - 统一的接口抽象层
   - 用户自由选择使用哪个提供商
   - 透明的能力映射

## 📁 新的文件组织结构

```
src/lib/ai/
├── core/
│   ├── types.ts                    # 多模态统一类型定义
│   ├── base-provider.ts            # 提供商基础接口
│   └── capability-mapper.ts        # 能力映射器
├── providers/
│   ├── openai/                     # OpenAI (DALL-E, GPT-Vision)
│   │   ├── text-to-image.ts
│   │   ├── image-to-video.ts
│   │   └── config.ts
│   ├── google/                     # Google (Gemini, Imagen)
│   │   ├── text-to-image.ts
│   │   ├── text-to-video.ts
│   │   └── config.ts
│   ├── anthropic/                  # Anthropic (Claude Vision)
│   │   └── image-analysis.ts
│   ├── stability/                  # Stability AI
│   │   ├── text-to-image.ts
│   │   └── image-to-video.ts
│   └── runwayml/                   # RunwayML (视频生成)
│       └── text-to-video.ts
├── client/
│   ├── api-key-manager.ts          # 用户API密钥管理
│   ├── provider-selector.ts        # 提供商选择逻辑
│   └── request-router.ts           # 请求路由器
└── index.ts                        # 统一导出接口
```

## 🔧 核心接口设计

### 统一的多模态接口

```typescript
// 多模态生成请求类型
type GenerationRequest = 
  | TextToImageRequest 
  | ImageToImageRequest
  | TextToVideoRequest 
  | ImageToVideoRequest;

interface TextToImageRequest {
  type: 'text-to-image';
  prompt: string;
  style?: StylePreset;
  dimensions?: ImageDimensions;
  quality?: 'fast' | 'standard' | 'premium';
}

interface TextToVideoRequest {
  type: 'text-to-video';
  prompt: string;
  duration?: number; // seconds
  fps?: number;
  dimensions?: VideoDimensions;
}

interface ImageToVideoRequest {
  type: 'image-to-video';
  sourceImage: string; // base64 or URL
  prompt?: string;
  motionStrength?: number;
  duration?: number;
}
```

### 提供商能力映射

```typescript
interface ProviderCapabilities {
  textToImage: boolean;
  imageToImage: boolean;
  textToVideo: boolean;
  imageToVideo: boolean;
  maxImageSize: ImageDimensions;
  maxVideoLength: number; // seconds
  supportedFormats: string[];
  requiresApiKey: boolean;
}

const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  openai: {
    textToImage: true,
    imageToImage: false,
    textToVideo: false, 
    imageToVideo: false,
    maxImageSize: { width: 1024, height: 1024 },
    maxVideoLength: 0,
    supportedFormats: ['png', 'jpeg'],
    requiresApiKey: true
  },
  
  runwayml: {
    textToImage: false,
    imageToImage: false,
    textToVideo: true,
    imageToVideo: true,
    maxImageSize: { width: 1280, height: 768 },
    maxVideoLength: 10,
    supportedFormats: ['mp4', 'gif'],
    requiresApiKey: true
  },
  
  stability: {
    textToImage: true,
    imageToImage: true,
    textToVideo: false,
    imageToVideo: true,
    maxImageSize: { width: 2048, height: 2048 },
    maxVideoLength: 5,
    supportedFormats: ['png', 'jpeg', 'mp4'],
    requiresApiKey: true
  }
};
```

## 🔑 API Key管理设计

### 安全存储策略

```typescript
interface UserApiKeyConfig {
  provider: string;
  keyName: string;        // 用户自定义名称
  encryptedKey: string;   // 客户端加密存储
  capabilities: string[]; // 该key支持的功能
  isActive: boolean;
  addedAt: string;
  lastUsed?: string;
}

class ApiKeyManager {
  // 客户端加密存储
  async storeApiKey(provider: string, key: string, keyName: string): Promise<void>;
  
  // 获取可用的提供商列表
  async getAvailableProviders(): Promise<string[]>;
  
  // 验证API Key有效性
  async validateApiKey(provider: string, key: string): Promise<boolean>;
  
  // 获取提供商能力
  async getProviderCapabilities(provider: string): Promise<ProviderCapabilities>;
}
```

### 用户界面集成

```typescript
// 设置页面组件设计
interface ApiKeySettingsProps {
  onKeyAdded: (provider: string, keyName: string) => void;
  onKeyRemoved: (provider: string, keyName: string) => void;
}

// 生成界面的提供商选择
interface ProviderSelectorProps {
  requestType: GenerationType;
  availableProviders: string[];
  onProviderSelect: (provider: string) => void;
  showCapabilities?: boolean;
}
```

## 🎯 用户体验流程设计

### 1. 首次设置流程

```
用户注册 → 引导页面 → API Key配置 → 能力检测 → 开始创作
```

### 2. 创作流程

```
选择创作类型 → 自动筛选可用提供商 → 用户选择偏好 → 开始生成
```

### 3. 错误处理流程

```
API调用失败 → 检查Key有效性 → 提示用户处理 → 建议替代方案
```

## 💼 商业价值重新定位

### 我们的价值创造

1. **工具价值** - 提供最佳的创作界面和体验
2. **集成价值** - 统一多个AI提供商的复杂性
3. **效率价值** - 简化从想法到成品的流程

### 用户获得的价值

1. **成本控制** - 直接使用自己的API配额
2. **隐私保护** - API Key不经过我们的服务器
3. **选择自由** - 可以根据需求选择最适合的提供商

### 竞争优势

1. **中立性** - 不绑定任何特定AI提供商
2. **透明性** - 用户完全了解成本和使用情况
3. **灵活性** - 支持新提供商的快速接入

## 🚀 实施优先级

### Phase 1: 基础框架 (1-2周)
1. 建立BYOK的API Key管理系统
2. 实现2-3个主要提供商的文生图功能
3. 基础的用户界面集成

### Phase 2: 多模态扩展 (2-3周)
1. 添加视频生成功能
2. 实现图生图、图生视频
3. 优化提供商选择和能力展示

### Phase 3: 体验优化 (1-2周)
1. 添加更多AI提供商
2. 优化错误处理和用户引导
3. 高级功能和设置选项

## 📋 技术实现要点

### 安全考虑

1. **客户端加密** - API Key在浏览器中加密存储
2. **不经过服务端** - 直接从客户端调用AI API
3. **定期清理** - 过期和失效Key的自动清理

### 性能考虑

1. **并行请求** - 支持同时使用多个提供商
2. **缓存策略** - 能力查询和验证结果缓存
3. **请求优化** - 减少不必要的API调用

### 扩展性考虑

1. **插件化架构** - 新提供商通过插件方式添加
2. **配置驱动** - 提供商能力通过配置文件管理
3. **版本兼容** - 支持同一提供商的多个API版本

---

**总结：这个重新设计的架构将我们定位为AI创作工具平台，而不是AI服务提供商。我们专注于提供最佳的创作体验，让用户享受AI的强大能力，同时保持对成本和隐私的完全控制。**