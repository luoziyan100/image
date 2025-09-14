
# image2video - 技术架构详细设计文档

**版本**: v1.0  
**最后更新**: 2025-08-31  
**作者**: 架构团队  

---

## 目录

1. [概述](#概述)
2. [技术栈选择](#技术栈选择)
3. [数据库架构设计](#数据库架构设计)
4. [异步任务队列系统](#异步任务队列系统)
5. [AI模型集成方案](#ai模型集成方案)
6. [实时通知机制](#实时通知机制)
7. [内容审核集成](#内容审核集成)
8. [成本控制与监控](#成本控制与监控)
9. [缓存策略设计](#缓存策略设计)
10. [部署与扩容策略](#部署与扩容策略)
11. [用户体验核心功能](#用户体验核心功能)
12. [安全与合规](#安全与合规)
13. [关键技术疑问](#关键技术疑问)
14. [开发路线图](#开发路线图)

---

## 概述

本文档详细描述了 image2video 项目的技术架构设计，基于PRD需求，采用现代化的微服务架构，支持AI驱动的图像生成与视频合成功能。

### 架构哲学

采用**三层思维架构**：
- **现象层**: 用户界面和直接交互体验
- **本质层**: 系统核心逻辑和数据处理
- **哲学层**: 设计原则和架构美学

### 核心设计原则

1. **解耦优先**: 每个组件职责单一，便于独立扩展
2. **异步优先**: 所有耗时操作异步化，提升用户体验
3. **成本可控**: 建立完善的成本监控和限制机制
4. **最终一致性**: 接受短暂不一致，保证系统最终收敛
5. **优雅降级**: 系统部分失败时仍能提供基础服务

---

## 技术栈选择

### 前端技术栈

```
React 18+ (Next.js App Router)
├── Fabric.js 5.3+ (画布绘图引擎)
├── TailwindCSS (样式框架)
├── React Hook Form (表单管理)
├── SWR/TanStack Query (数据获取)
├── Framer Motion (动画库)
└── TypeScript (类型安全)
```

### 后端技术栈

```
Node.js 20+ (Next.js API Routes)
├── PostgreSQL 15+ (用户数据、项目元数据)
├── MongoDB 7+ (画布草图JSON数据)
├── Redis 7+ (任务队列、缓存、会话)
├── BullMQ (异步任务处理)
├── AWS S3 (文件存储)
├── JWT (用户认证)
└── TypeScript (类型安全)
```

### AI与第三方服务

```
nano-banana API (图像生成)
├── Google Cloud Vision API (内容审核)
├── AWS S3 (文件存储)
├── AWS CloudFront/Vercel CDN (内容分发)
├── Pusher/Ably (实时通知 - Phase 2)
└── AWS Fargate (Worker容器部署)
```

---

## 数据库架构设计

### PostgreSQL 表结构

#### 1. users 表 (用户信息)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 扩展字段 (Phase 2+)
    display_name VARCHAR(100),
    avatar_url TEXT,
    plan_type VARCHAR(50) DEFAULT 'free' -- 'free', 'premium'
);

-- 索引优化
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### 2. projects 表 (项目/作品信息)
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL CHECK (project_type IN ('single_image', 'comic_strip')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_status ON projects(status);
```

#### 3. assets 表 (生成的图片资源)
```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_sketch_id VARCHAR(255) NOT NULL, -- MongoDB中对应草图的_id
    storage_url TEXT, -- S3 URL，生成成功后填充
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'auditing_input', 'generating', 
        'auditing_output', 'uploading', 'completed', 'failed'
    )),
    error_message TEXT,
    error_code VARCHAR(100), -- 结构化错误码
    position_in_project INT DEFAULT 0, -- 连环画中的位置
    ai_model_version VARCHAR(100), -- 记录使用的AI模型版本
    generation_seed BIGINT, -- AI生成使用的种子值
    processing_time_ms INT, -- 生成耗时(毫秒)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_created_at ON assets(created_at);
```

#### 4. usage_stats 表 (成本统计)
```sql
CREATE TABLE usage_stats (
    id SERIAL PRIMARY KEY,
    month_year VARCHAR(7) UNIQUE NOT NULL, -- "2025-08"
    total_cost_cents INT NOT NULL DEFAULT 0,
    total_api_calls INT NOT NULL DEFAULT 0,
    total_images_generated INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5. billing_events 表 (事务日志)
```sql
CREATE TABLE billing_events (
    asset_id UUID PRIMARY KEY REFERENCES assets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    cost_cents INT NOT NULL,
    api_calls INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_events_status ON billing_events(status);
```

### MongoDB 集合结构

#### sketches 集合 (画布草图数据)
```json
{
  "_id": ObjectId("..."),
  "user_id": "a1b2c3d4-e5f6-...", // 对应PostgreSQL的UUID
  "project_id": "f6e5d4c3-b2a1-...",
  "fabric_json": {
    "version": "5.3.0",
    "objects": [
      // Fabric.js序列化的所有绘图对象
    ],
    "background": "#ffffff"
  },
  "metadata": {
    "canvas_size": { "width": 1024, "height": 1024 },
    "brush_strokes_count": 45,
    "total_objects": 12
  },
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

### 数据一致性保证

#### Saga模式实现

```javascript
// API层的Saga事务示例
async function createProjectSaga(projectData, userId) {
  let projectId = null;
  let sketchId = null;
  
  try {
    // Step 1: PostgreSQL 事务
    const project = await createProjectInPg(projectData, userId);
    projectId = project.id;
    
    // Step 2: MongoDB 事务
    const sketch = await createSketchInMongo(projectData.initialSketch, userId, projectId);
    sketchId = sketch._id;
    
    // Step 3: 状态标记为active（两个数据库都成功）
    await updateProjectStatus(projectId, 'active');
    
    return { success: true, project, sketchId };
    
  } catch (error) {
    // 补偿事务
    if (sketchId) {
      await deleteSketchInMongo(sketchId);
    }
    if (projectId) {
      await deleteProjectInPg(projectId);
    }
    
    throw new Error('Project creation failed');
  }
}
```

---

## 异步任务队列系统

### BullMQ 队列架构

```javascript
// 队列定义
const imageQueue = new Queue('image-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1分钟起始延迟
    },
    removeOnComplete: 100, // 保留最近100个完成任务
    removeOnFail: 50,      // 保留最近50个失败任务
  }
});

// 任务类型定义
const JOB_TYPES = {
  GENERATE_SINGLE_IMAGE: 'generate-single-image',
  GENERATE_COMIC_FRAME: 'generate-comic-frame',
  PROCESS_VIDEO: 'process-video', // Phase 2
  CLEANUP_RESOURCES: 'cleanup-resources'
};
```

### Worker 进程实现

```javascript
// image-worker.js
import { Worker } from 'bullmq';
import { processImageGeneration } from './services/ai-service';
import { auditContent } from './services/moderation-service';

const worker = new Worker('image-generation', async job => {
  const { assetId, sketchData, userId } = job.data;
  
  try {
    // 更新状态: pending -> auditing_input
    await updateAssetStatus(assetId, 'auditing_input');
    
    // Step 1: 输入内容审核
    const inputAuditResult = await auditContent(sketchData.imageBuffer);
    if (!inputAuditResult.passed) {
      throw new Error(`INPUT_REJECTED: ${inputAuditResult.reason}`);
    }
    
    // 更新状态: auditing_input -> generating  
    await updateAssetStatus(assetId, 'generating');
    
    // Step 2: 调用AI生成
    const generationResult = await processImageGeneration(sketchData);
    
    // 更新状态: generating -> auditing_output
    await updateAssetStatus(assetId, 'auditing_output');
    
    // Step 3: 输出内容审核
    const outputAuditResult = await auditContent(generationResult.imageBuffer);
    if (!outputAuditResult.passed) {
      throw new Error(`OUTPUT_REJECTED: ${outputAuditResult.reason}`);
    }
    
    // 更新状态: auditing_output -> uploading
    await updateAssetStatus(assetId, 'uploading');
    
    // Step 4: 上传到S3
    const s3Url = await uploadToS3(generationResult.imageBuffer, assetId);
    
    // Step 5: 更新最终状态
    await updateAssetStatus(assetId, 'completed', { 
      storage_url: s3Url,
      processing_time_ms: Date.now() - job.timestamp,
      ai_model_version: generationResult.modelVersion,
      generation_seed: generationResult.seed
    });
    
    // Step 6: 记录成本事件
    await recordBillingEvent(assetId, userId, GENERATION_COST_CENTS);
    
    // Step 7: 发送通知（Phase 2）
    await sendNotification(userId, 'asset-completed', { assetId, s3Url });
    
  } catch (error) {
    await updateAssetStatus(assetId, 'failed', {
      error_message: error.message,
      error_code: error.message.split(':')[0] // 提取错误码
    });
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3, // 单个Worker实例最多同时处理3个任务
  limiter: {
    max: 5,    // 全局限制：每分钟最多5个API调用
    duration: 60000 // 1分钟
  }
});
```

### 自动扩容策略

```yaml
# AWS Fargate 自动扩容配置
apiVersion: v1
kind: Service
metadata:
  name: image-worker
spec:
  autoScaling:
    minCapacity: 1
    maxCapacity: 10
    targetMetrics:
      - type: Custom
        customMetric:
          name: redis_queue_length
          target: 10 # 队列长度超过10时扩容
    scaleUpCooldown: 60s
    scaleDownCooldown: 300s # 5分钟缓冲期
```

---

## AI模型集成方案

### nano-banana API 集成

#### 请求格式标准化

```javascript
// AI服务抽象层
class NanoBananaService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.nanobanana.ai/v1';
  }
  
  async generateImage(params) {
    const {
      prompt,
      imageData, // Base64或Buffer
      seed = null,
      quality = 'high',
      aspectRatio = '1:1',
      mode = 'text-to-image' // 'text-to-image' 或 'image-to-image'
    } = params;
    
    const requestBody = {
      prompt,
      quality,
      aspect_ratio: aspectRatio,
      response_format: 'b64_json'
    };
    
    // 如果是图生图模式
    if (mode === 'image-to-image' && imageData) {
      requestBody.image = imageData;
      requestBody.strength = 0.7; // 重绘强度
    }
    
    // 一致性控制
    if (seed) {
      requestBody.seed = seed;
    }
    
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AI_API_ERROR: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    return {
      imageBuffer: Buffer.from(result.data[0].b64_json, 'base64'),
      seed: result.data[0].metadata?.seed,
      modelVersion: result.data[0].metadata?.model_version || 'unknown'
    };
  }
}
```

### 连环画一致性实现

#### Phase 1: 提示词工程
```javascript
class ComicConsistencyManager {
  constructor() {
    this.characterDescriptions = new Map();
    this.stylePrompts = new Map();
  }
  
  // 为连环画项目建立角色一致性
  establishCharacterConsistency(projectId, firstFramePrompt) {
    // 从首帧提示词中提取角色描述
    const characters = this.extractCharacters(firstFramePrompt);
    
    // 为每个角色生成唯一的描述符
    characters.forEach(char => {
      const consistentDesc = this.generateConsistentDescription(char);
      this.characterDescriptions.set(`${projectId}_${char.name}`, consistentDesc);
    });
  }
  
  // 为后续帧增强提示词
  enhancePromptForConsistency(projectId, originalPrompt) {
    let enhancedPrompt = originalPrompt;
    
    // 添加已建立的角色描述
    this.characterDescriptions.forEach((desc, key) => {
      if (key.startsWith(projectId)) {
        enhancedPrompt = `${desc}, ${enhancedPrompt}`;
      }
    });
    
    // 添加统一的风格描述
    const stylePrompt = this.stylePrompts.get(projectId) || 
      'consistent art style, coherent visual narrative, same lighting and color palette';
    
    return `${enhancedPrompt}, ${stylePrompt}`;
  }
}
```

#### Phase 2: 图生图一致性
```javascript
class ImageToImageConsistency {
  async generateConsistentFrame(params) {
    const {
      projectId,
      frameIndex,
      newPrompt,
      previousFrameUrl,
      baseSeed
    } = params;
    
    let imageData = null;
    let seed = baseSeed;
    
    if (frameIndex > 0 && previousFrameUrl) {
      // 下载前一帧作为参考图
      imageData = await this.downloadImage(previousFrameUrl);
      
      // 使用相同的基础seed，但添加帧序号偏移
      seed = baseSeed + frameIndex;
    }
    
    return await this.aiService.generateImage({
      prompt: this.consistencyManager.enhancePromptForConsistency(projectId, newPrompt),
      imageData,
      seed,
      mode: imageData ? 'image-to-image' : 'text-to-image'
    });
  }
}
```

---

## 实时通知机制

### Phase 1: 短轮询实现

```javascript
// 前端轮询实现
class TaskStatusPoller {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.pollingIntervals = new Map();
  }
  
  startPolling(assetId, callback, interval = 3000) {
    if (this.pollingIntervals.has(assetId)) {
      this.stopPolling(assetId);
    }
    
    const poll = async () => {
      try {
        const status = await this.apiClient.getAssetStatus(assetId);
        
        callback(status);
        
        // 如果任务完成或失败，停止轮询
        if (['completed', 'failed'].includes(status.status)) {
          this.stopPolling(assetId);
          return;
        }
        
        // 继续轮询
        const timeoutId = setTimeout(poll, interval);
        this.pollingIntervals.set(assetId, timeoutId);
        
      } catch (error) {
        console.error('Polling error:', error);
        // 发生错误时减慢轮询频率
        const timeoutId = setTimeout(poll, interval * 2);
        this.pollingIntervals.set(assetId, timeoutId);
      }
    };
    
    // 立即执行第一次轮询
    poll();
  }
  
  stopPolling(assetId) {
    const timeoutId = this.pollingIntervals.get(assetId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pollingIntervals.delete(assetId);
    }
  }
}
```

```javascript
// 后端状态查询API
// /api/assets/status
export default async function handler(req, res) {
  const { id: assetId } = req.query;
  
  try {
    const asset = await db.query(
      'SELECT id, status, storage_url, error_message, error_code, updated_at FROM assets WHERE id = $1',
      [assetId]
    );
    
    if (asset.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const assetData = asset.rows[0];
    
    res.status(200).json({
      id: assetData.id,
      status: assetData.status,
      storage_url: assetData.storage_url,
      error_message: assetData.error_message,
      error_code: assetData.error_code,
      updated_at: assetData.updated_at
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Phase 2: Pusher 实时推送

```javascript
// Worker中的通知发送
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

async function sendNotification(userId, eventType, data) {
  try {
    await pusher.trigger(`private-user-${userId}`, eventType, {
      timestamp: Date.now(),
      ...data
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    // 通知失败不应该影响主要流程
  }
}
```

```javascript
// 前端Pusher集成
import Pusher from 'pusher-js';

class RealTimeNotifications {
  constructor(userId, authEndpoint) {
    this.userId = userId;
    this.pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint
    });
    
    this.channel = this.pusher.subscribe(`private-user-${userId}`);
  }
  
  onAssetUpdate(callback) {
    this.channel.bind('asset-update', callback);
  }
  
  onAssetCompleted(callback) {
    this.channel.bind('asset-completed', callback);
  }
  
  onAssetFailed(callback) {
    this.channel.bind('asset-failed', callback);
  }
  
  disconnect() {
    this.pusher.disconnect();
  }
}
```

---

## 内容审核集成

### Google Cloud Vision API 集成

```javascript
// 内容审核服务
import vision from '@google-cloud/vision';

class ContentModerationService {
  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_PATH
    });
    
    // 审核阈值配置
    this.thresholds = {
      adult: 'LIKELY',      // 成人内容
      violence: 'LIKELY',   // 暴力内容
      racy: 'POSSIBLE',     // 性感内容
      medical: 'LIKELY',    // 医疗内容
      spoof: 'LIKELY'       // 恶搞内容
    };
  }
  
  async auditImage(imageBuffer) {
    try {
      const [result] = await this.client.safeSearchDetection({
        image: { content: imageBuffer }
      });
      
      const safeSearch = result.safeSearchAnnotation;
      
      // 检查各项指标是否超过阈值
      const violations = [];
      
      Object.entries(this.thresholds).forEach(([category, threshold]) => {
        const detected = safeSearch[category];
        if (this.exceedsThreshold(detected, threshold)) {
          violations.push({ category, detected, threshold });
        }
      });
      
      return {
        passed: violations.length === 0,
        violations,
        rawResult: safeSearch
      };
      
    } catch (error) {
      console.error('Content moderation failed:', error);
      
      // 审核服务失败时的策略：保守起见，拒绝内容
      return {
        passed: false,
        error: 'MODERATION_SERVICE_ERROR',
        message: error.message
      };
    }
  }
  
  exceedsThreshold(detected, threshold) {
    const levels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    const detectedIndex = levels.indexOf(detected);
    const thresholdIndex = levels.indexOf(threshold);
    return detectedIndex >= thresholdIndex;
  }
}
```

### 双重审核流程

```javascript
// Worker中的审核集成
class AuditedImageGeneration {
  constructor() {
    this.moderationService = new ContentModerationService();
  }
  
  async processWithModeration(params) {
    const { assetId, sketchData, userId } = params;
    
    // === 输入审核 ===
    await updateAssetStatus(assetId, 'auditing_input');
    
    const inputAudit = await this.moderationService.auditImage(sketchData.imageBuffer);
    if (!inputAudit.passed) {
      throw new Error(`INPUT_REJECTED: ${this.formatViolations(inputAudit.violations)}`);
    }
    
    // === AI生成 ===
    await updateAssetStatus(assetId, 'generating');
    const generationResult = await this.aiService.generateImage(sketchData);
    
    // === 输出审核 ===
    await updateAssetStatus(assetId, 'auditing_output');
    
    const outputAudit = await this.moderationService.auditImage(generationResult.imageBuffer);
    if (!outputAudit.passed) {
      // 输出审核失败：记录但不返还成本（已经调用了AI API）
      await this.recordFailedGeneration(assetId, userId, 'OUTPUT_REJECTED', outputAudit.violations);
      throw new Error(`OUTPUT_REJECTED: ${this.formatViolations(outputAudit.violations)}`);
    }
    
    return generationResult;
  }
  
  formatViolations(violations) {
    return violations.map(v => `${v.category}: ${v.detected}`).join(', ');
  }
}
```

---

## 成本控制与监控

### 多层预算控制

```javascript
// 预算检查中间件
class BudgetGuardian {
  constructor() {
    this.monthlyLimitCents = 10000 * 100; // ¥10,000
    this.warningThresholds = [0.8, 0.95]; // 80%, 95%
  }
  
  async checkBudget(req, res, next) {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      const usage = await db.query(
        'SELECT total_cost_cents, total_api_calls FROM usage_stats WHERE month_year = $1',
        [currentMonthYear]
      );
      
      const currentCost = usage.rows[0]?.total_cost_cents || 0;
      const usageRatio = currentCost / this.monthlyLimitCents;
      
      // 硬限制：100%
      if (currentCost >= this.monthlyLimitCents) {
        return res.status(503).json({
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: 'Service temporarily unavailable due to high demand. Please try again next month.',
          retryAfter: this.getSecondsUntilNextMonth()
        });
      }
      
      // 软限制：95% 时降级服务
      if (usageRatio >= 0.95) {
        // 只允许付费用户使用，或限制为低质量模式
        if (req.user.planType !== 'premium') {
          return res.status(429).json({
            error: 'QUOTA_NEARLY_EXCEEDED',
            message: 'Monthly quota nearly exceeded. Upgrade to premium for continued access.',
            upgradeUrl: '/pricing'
          });
        }
      }
      
      // 预警
      if (usageRatio >= 0.8) {
        await this.sendBudgetAlert(usageRatio, currentCost);
      }
      
      // 在请求头中添加预算信息（用于前端显示）
      res.setHeader('X-Budget-Usage', usageRatio.toFixed(2));
      res.setHeader('X-Budget-Remaining-Cents', this.monthlyLimitCents - currentCost);
      
      next();
      
    } catch (error) {
      console.error('Budget check failed:', error);
      // 预算检查失败时，采用保守策略
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable.'
      });
    }
  }
  
  getSecondsUntilNextMonth() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.floor((nextMonth - now) / 1000);
  }
}
```

### 用户级限流

```javascript
import { RateLimiterRedis } from 'rate-limiter-flexible';

// 多级限流器
class MultiTierRateLimiter {
  constructor(redisClient) {
    // 分钟级限制
    this.minutelyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_minute',
      points: 5,    // 免费用户每分钟5次
      duration: 60
    });
    
    // 小时级限制
    this.hourlyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_hour',
      points: 50,   // 免费用户每小时50次
      duration: 3600
    });
    
    // 日级限制
    this.dailyLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_day',
      points: 200,  // 免费用户每天200次
      duration: 86400
    });
    
    // 付费用户倍数
    this.premiumMultiplier = 5;
  }
  
  async checkLimits(userId, userPlan) {
    const multiplier = userPlan === 'premium' ? this.premiumMultiplier : 1;
    
    try {
      // 检查所有级别的限制
      await Promise.all([
        this.minutelyLimiter.consume(userId, 1),
        this.hourlyLimiter.consume(userId, 1),
        this.dailyLimiter.consume(userId, 1)
      ]);
      
      return { allowed: true };
      
    } catch (rejRes) {
      // 找出最严格的限制
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || 0;
      
      return {
        allowed: false,
        remainingPoints,
        resetTime: new Date(Date.now() + msBeforeNext),
        retryAfter: Math.ceil(msBeforeNext / 1000)
      };
    }
  }
}
```

### 成本事件溯源

```javascript
// 独立的成本统计Worker
class BillingAggregatorWorker {
  constructor() {
    this.worker = new Worker('billing-aggregation', this.processAggregation.bind(this), {
      connection: redisConnection,
      repeat: { cron: '*/5 * * * *' } // 每5分钟运行一次
    });
  }
  
  async processAggregation(job) {
    const transaction = await db.begin();
    
    try {
      // 获取所有待处理的计费事件
      const pendingEvents = await transaction.query(`
        SELECT asset_id, user_id, cost_cents, api_calls, created_at 
        FROM billing_events 
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 1000
      `);
      
      if (pendingEvents.rows.length === 0) {
        await transaction.commit();
        return;
      }
      
      // 按月份分组聚合
      const monthlyAggregates = this.groupByMonth(pendingEvents.rows);
      
      // 更新usage_stats表
      for (const [monthYear, aggregate] of Object.entries(monthlyAggregates)) {
        await transaction.query(`
          INSERT INTO usage_stats (month_year, total_cost_cents, total_api_calls, total_images_generated)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (month_year)
          DO UPDATE SET
            total_cost_cents = usage_stats.total_cost_cents + $2,
            total_api_calls = usage_stats.total_api_calls + $3,
            total_images_generated = usage_stats.total_images_generated + $4,
            updated_at = NOW()
        `, [monthYear, aggregate.totalCost, aggregate.totalCalls, aggregate.totalImages]);
      }
      
      // 标记事件为已处理
      const assetIds = pendingEvents.rows.map(row => row.asset_id);
      await transaction.query(`
        UPDATE billing_events 
        SET status = 'processed' 
        WHERE asset_id = ANY($1)
      `, [assetIds]);
      
      await transaction.commit();
      
      // 记录统计日志
      console.log(`Processed ${pendingEvents.rows.length} billing events`);
      
    } catch (error) {
      await transaction.rollback();
      console.error('Billing aggregation failed:', error);
      throw error;
    }
  }
  
  groupByMonth(events) {
    const aggregates = {};
    
    events.forEach(event => {
      const monthYear = event.created_at.toISOString().slice(0, 7);
      
      if (!aggregates[monthYear]) {
        aggregates[monthYear] = {
          totalCost: 0,
          totalCalls: 0,
          totalImages: 0
        };
      }
      
      aggregates[monthYear].totalCost += event.cost_cents;
      aggregates[monthYear].totalCalls += event.api_calls;
      aggregates[monthYear].totalImages += 1;
    });
    
    return aggregates;
  }
}
```

---

## 缓存策略设计

### 多级缓存架构

```javascript
// 缓存管理器
class CacheManager {
  constructor(redisClient) {
    this.redis = redisClient;
    
    // 缓存策略定义
    this.strategies = {
      USER_SESSION: { ttl: 7 * 24 * 3600, prefix: 'session:' },
      RATE_LIMIT: { ttl: 3600, prefix: 'rl:' },
      PROJECT_LIST: { ttl: 300, prefix: 'projects:' },
      ASSET_STATUS: { ttl: 60, prefix: 'asset:' },
      USER_PREFERENCES: { ttl: 24 * 3600, prefix: 'prefs:' }
    };
  }
  
  async set(strategy, key, value, customTTL = null) {
    const config = this.strategies[strategy];
    const fullKey = `${config.prefix}${key}`;
    const ttl = customTTL || config.ttl;
    
    await this.redis.setex(fullKey, ttl, JSON.stringify(value));
  }
  
  async get(strategy, key) {
    const config = this.strategies[strategy];
    const fullKey = `${config.prefix}${key}`;
    
    const result = await this.redis.get(fullKey);
    return result ? JSON.parse(result) : null;
  }
  
  async invalidate(strategy, key) {
    const config = this.strategies[strategy];
    const fullKey = `${config.prefix}${key}`;
    
    await this.redis.del(fullKey);
  }
  
  // 缓存穿透保护
  async getOrSet(strategy, key, fetchFunction, customTTL = null) {
    let value = await this.get(strategy, key);
    
    if (value === null) {
      value = await fetchFunction();
      if (value !== null) {
        await this.set(strategy, key, value, customTTL);
      }
    }
    
    return value;
  }
}
```

### CDN缓存策略

```javascript
// S3上传时的缓存头设置
class S3StorageService {
  async uploadWithCacheHeaders(buffer, key, contentType) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      
      // 长期缓存策略（生成的图片不会变更）
      CacheControl: 'public, max-age=31536000, immutable', // 1年
      
      // 元数据
      Metadata: {
        'upload-time': new Date().toISOString(),
        'generated-by': 'image2video-ai'
      }
    };
    
    const result = await this.s3Client.upload(params).promise();
    return result.Location;
  }
  
  // 为不同类型内容设置不同的缓存策略
  getCacheControlForType(fileType) {
    const strategies = {
      'user-generated-image': 'public, max-age=31536000, immutable',
      'user-avatar': 'public, max-age=86400', // 1天
      'temp-upload': 'private, max-age=3600'  // 1小时
    };
    
    return strategies[fileType] || 'public, max-age=86400';
  }
}
```

### 浏览器缓存策略

```javascript
// 前端缓存管理
class LocalStorageManager {
  constructor() {
    this.keys = {
      DRAFT_SKETCH: 'draft_sketch_',
      USER_PREFERENCES: 'user_prefs',
      CANVAS_STATE: 'canvas_state_'
    };
    
    this.maxDraftAge = 7 * 24 * 60 * 60 * 1000; // 7天
  }
  
  // 自动保存画布草稿
  saveDraft(projectId, canvasData) {
    const draftData = {
      projectId,
      canvasData,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    const key = `${this.keys.DRAFT_SKETCH}${projectId}`;
    localStorage.setItem(key, JSON.stringify(draftData));
  }
  
  // 恢复画布草稿
  loadDraft(projectId) {
    const key = `${this.keys.DRAFT_SKETCH}${projectId}`;
    const draftStr = localStorage.getItem(key);
    
    if (!draftStr) return null;
    
    try {
      const draft = JSON.parse(draftStr);
      
      // 检查草稿是否过期
      if (Date.now() - draft.timestamp > this.maxDraftAge) {
        this.clearDraft(projectId);
        return null;
      }
      
      return draft.canvasData;
    } catch (error) {
      console.error('Failed to parse draft:', error);
      this.clearDraft(projectId);
      return null;
    }
  }
  
  // 清理过期草稿
  cleanupExpiredDrafts() {
    const keys = Object.keys(localStorage);
    const draftKeys = keys.filter(key => key.startsWith(this.keys.DRAFT_SKETCH));
    
    draftKeys.forEach(key => {
      try {
        const draft = JSON.parse(localStorage.getItem(key));
        if (Date.now() - draft.timestamp > this.maxDraftAge) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // 损坏的数据，直接删除
        localStorage.removeItem(key);
      }
    });
  }
  
  clearDraft(projectId) {
    const key = `${this.keys.DRAFT_SKETCH}${projectId}`;
    localStorage.removeItem(key);
  }
}
```

---

## 部署与扩容策略

### Vercel 部署配置

```json
// vercel.json
{
  "version": 2,
  "functions": {
    "pages/api/**/*.js": {
      "maxDuration": 30
    },
    "pages/api/generate.js": {
      "maxDuration": 10
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "rewrites": [
    {
      "source": "/api/assets/:path*",
      "destination": "/api/assets/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://yourdomain.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ]
}
```

### 数据库连接优化

```javascript
// lib/db.js - Serverless 数据库连接管理
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

// PostgreSQL 连接池（模块作用域缓存）
let pgPool;

export function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Serverless 优化配置
      max: 1,                     // 每个实例最多1个连接
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,   // 30秒空闲超时
      allowExitOnIdle: true       // 允许进程退出时关闭连接
    });
    
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  
  return pgPool;
}

// MongoDB 连接（模块作用域缓存）
let mongoClient;

export async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URL, {
      maxPoolSize: 1,           // 每个实例最多1个连接
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await mongoClient.connect();
  }
  
  return mongoClient;
}

// 数据库操作封装
export async function withDatabase(operation) {
  const pg = getPgPool();
  const mongo = await getMongoClient();
  
  try {
    return await operation(pg, mongo);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}
```

### 环境变量管理

```bash
# .env.local (开发环境)
# === 数据库连接 ===
DATABASE_URL="postgresql://user:password@localhost:5432/image2video_dev"
MONGODB_URL="mongodb://localhost:27017/image2video_dev"
REDIS_URL="redis://localhost:6379"

# === AI服务 ===
NANO_BANANA_API_KEY="your-api-key"

# === 存储服务 ===
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="image2video-dev"
AWS_REGION="us-east-1"

# === 内容审核 ===
GOOGLE_CLOUD_KEY_PATH="./credentials/gcp-service-account.json"

# === 认证 ===
JWT_SECRET="your-very-long-and-random-jwt-secret-for-development"
JWT_EXPIRES_IN="7d"

# === 实时通知 (Phase 2) ===
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="us2"

# === 成本控制 ===
MONTHLY_BUDGET_CENTS=1000000  # ¥10,000 = 1,000,000 分
SINGLE_IMAGE_COST_CENTS=7     # ¥0.07 = 7分

# === 前端可访问变量 ===
NEXT_PUBLIC_APP_NAME="Image2Video AI"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
NEXT_PUBLIC_MAX_FILE_SIZE_MB=10
```

---

## 用户体验核心功能

### 双输入模式统一处理

```javascript
// 前端输入处理器
class InputProcessor {
  constructor(fabricCanvas) {
    this.canvas = fabricCanvas;
    this.standardSize = { width: 1024, height: 1024 };
  }
  
  // 处理用户绘制的草图
  async processSketchInput() {
    return this.standardizeCanvas(this.canvas);
  }
  
  // 处理用户上传的图片
  async processImageUpload(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB限制
        reject(new Error('File size exceeds 10MB limit'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          try {
            // 创建临时画布进行标准化处理
            const tempCanvas = new fabric.Canvas(null, this.standardSize);
            
            // 图片预处理
            this.preprocessUploadedImage(img, tempCanvas);
            
            // 返回标准化结果
            resolve(this.standardizeCanvas(tempCanvas));
          } catch (error) {
            reject(error);
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  preprocessUploadedImage(img, canvas) {
    // 1. 计算缩放比例（保持宽高比）
    const scale = Math.min(
      this.standardSize.width / img.width,
      this.standardSize.height / img.height
    );
    
    img.scale(scale);
    
    // 2. 设置画布背景
    canvas.setBackgroundColor('#FFFFFF', canvas.renderAll.bind(canvas));
    
    // 3. 居中放置图片
    canvas.add(img);
    img.center();
    
    // 4. 可选：应用预处理滤镜
    if (this.shouldApplyFilters(img)) {
      this.applyPreprocessingFilters(img);
    }
    
    canvas.renderAll();
  }
  
  shouldApplyFilters(img) {
    // 根据图片质量决定是否应用滤镜
    // 例如：低分辨率或模糊图片可能需要锐化处理
    return img.width < 512 || img.height < 512;
  }
  
  applyPreprocessingFilters(img) {
    // 应用轻微的锐化和对比度增强
    img.filters = [
      new fabric.Image.filters.Sharpen({ amount: 0.2 }),
      new fabric.Image.filters.Contrast({ contrast: 0.1 })
    ];
    img.applyFilters();
  }
  
  standardizeCanvas(canvas) {
    // 确保画布尺寸标准化
    if (canvas.width !== this.standardSize.width || 
        canvas.height !== this.standardSize.height) {
      canvas.setDimensions(this.standardSize);
    }
    
    // 导出为标准格式
    const dataURL = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.85,
      multiplier: 1,  // 确保输出尺寸就是1024x1024
    });
    
    return {
      dataURL,
      canvasJSON: canvas.toJSON(), // 保留矢量数据用于后续编辑
      metadata: {
        objectCount: canvas.getObjects().length,
        hasBackground: !!canvas.backgroundColor,
        processedAt: new Date().toISOString()
      }
    };
  }
}
```

### 自动保存机制

```javascript
// 自动保存管理器
class AutoSaveManager {
  constructor(projectId, fabricCanvas, apiClient) {
    this.projectId = projectId;
    this.canvas = fabricCanvas;
    this.apiClient = apiClient;
    this.localStorageManager = new LocalStorageManager();
    
    // 自动保存配置
    this.saveInterval = 30000;      // 30秒
    this.changeThreshold = 5;       // 5个操作后触发保存
    this.maxLocalDrafts = 10;       // 最多保留10个本地草稿
    
    // 状态跟踪
    this.unsavedChanges = 0;
    this.lastSaveTime = Date.now();
    this.saveTimer = null;
    this.isOnline = navigator.onLine;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 监听画布变化
    this.canvas.on('object:added', () => this.onCanvasChange());
    this.canvas.on('object:modified', () => this.onCanvasChange());
    this.canvas.on('object:removed', () => this.onCanvasChange());
    this.canvas.on('path:created', () => this.onCanvasChange()); // 自由绘制
    
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // 页面卸载前保存
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges > 0) {
        this.saveToLocal();
        e.preventDefault();
        e.returnValue = '您有未保存的修改，确定要离开吗？';
      }
    });
    
    // 定期保存定时器
    this.startAutoSaveTimer();
  }
  
  onCanvasChange() {
    this.unsavedChanges++;
    
    // 立即保存到本地
    this.saveToLocal();
    
    // 达到阈值时触发云端保存
    if (this.unsavedChanges >= this.changeThreshold) {
      this.saveToCloud();
    }
  }
  
  startAutoSaveTimer() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = setInterval(() => {
      if (this.unsavedChanges > 0) {
        this.saveToCloud();
      }
    }, this.saveInterval);
  }
  
  saveToLocal() {
    try {
      const canvasData = this.canvas.toJSON();
      this.localStorageManager.saveDraft(this.projectId, {
        canvasData,
        unsavedChanges: this.unsavedChanges,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Local save failed:', error);
    }
  }
  
  async saveToCloud() {
    if (!this.isOnline || this.unsavedChanges === 0) {
      return;
    }
    
    try {
      const canvasData = this.canvas.toJSON();
      
      await this.apiClient.updateProject(this.projectId, {
        sketchData: canvasData,
        lastModified: new Date().toISOString()
      });
      
      // 保存成功，重置计数器
      this.unsavedChanges = 0;
      this.lastSaveTime = Date.now();
      
      // 清除本地草稿（已同步到云端）
      this.localStorageManager.clearDraft(this.projectId);
      
      // 通知用户
      this.showSaveStatus('已保存', 'success');
      
    } catch (error) {
      console.error('Cloud save failed:', error);
      this.showSaveStatus('保存失败', 'error');
      
      // 保存失败时保持本地副本
      this.saveToLocal();
    }
  }
  
  async loadDraft() {
    // 首先尝试从云端加载
    if (this.isOnline) {
      try {
        const cloudData = await this.apiClient.getProject(this.projectId);
        if (cloudData.sketchData) {
          return cloudData.sketchData;
        }
      } catch (error) {
        console.warn('Failed to load from cloud, checking local draft');
      }
    }
    
    // 云端加载失败，检查本地草稿
    const localDraft = this.localStorageManager.loadDraft(this.projectId);
    if (localDraft) {
      // 询问用户是否恢复本地草稿
      const shouldRestore = await this.confirmDraftRestore(localDraft);
      if (shouldRestore) {
        return localDraft.canvasData;
      }
    }
    
    return null;
  }
  
  async confirmDraftRestore(draft) {
    const lastModified = new Date(draft.lastModified).toLocaleString();
    return window.confirm(
      `发现本地草稿（最后修改：${lastModified}），是否恢复？`
    );
  }
  
  showSaveStatus(message, type) {
    // 显示保存状态提示（可以集成到UI组件中）
    const statusElement = document.getElementById('save-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `save-status ${type}`;
      
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'save-status';
      }, 2000);
    }
  }
  
  destroy() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
  }
}
```

---

## 安全与合规

### 数据保护策略

```javascript
// 敏感数据加密服务
import crypto from 'crypto';

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // 从环境变量获取主密钥
    this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
  }
  
  // 加密敏感数据
  encrypt(plaintext) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('image2video', 'utf8'));
    
    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // 返回 iv + tag + ciphertext 的组合
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }
  
  // 解密敏感数据
  decrypt(encryptedData) {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.subarray(0, this.ivLength);
    const tag = buffer.subarray(this.ivLength, this.ivLength + this.tagLength);
    const ciphertext = buffer.subarray(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('image2video', 'utf8'));
    decipher.setAuthTag(tag);
    
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    
    return plaintext.toString('utf8');
  }
}
```

### GDPR 合规实现

```javascript
// 数据保护权利实现
class DataProtectionService {
  constructor() {
    this.encryptionService = new EncryptionService();
  }
  
  // 用户数据导出（GDPR Article 20）
  async exportUserData(userId) {
    const userData = {
      profile: await this.getUserProfile(userId),
      projects: await this.getUserProjects(userId),
      usage: await this.getUserUsageStats(userId),
      exportedAt: new Date().toISOString()
    };
    
    // 脱敏处理
    userData.profile = this.sanitizePersonalData(userData.profile);
    
    return userData;
  }
  
  // 用户数据删除（GDPR Article 17）
  async deleteUserData(userId, reason = 'user_request') {
    const transaction = await db.begin();
    
    try {
      // 1. 获取用户关联的所有S3文件
      const assets = await transaction.query(
        'SELECT storage_url FROM assets WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)',
        [userId]
      );
      
      // 2. 删除数据库记录（级联删除）
      await transaction.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // 3. 删除MongoDB中的草图数据
      const mongoClient = await getMongoClient();
      const sketches = mongoClient.db().collection('sketches');
      await sketches.deleteMany({ user_id: userId });
      
      await transaction.commit();
      
      // 4. 异步删除S3文件
      this.scheduleS3Cleanup(assets.rows.map(row => row.storage_url));
      
      // 5. 记录删除审计日志
      await this.logDataDeletion(userId, reason);
      
      return { success: true, deletedAt: new Date().toISOString() };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  // 数据处理同意管理
  async updateConsent(userId, consentData) {
    const consentRecord = {
      userId,
      analytics: consentData.analytics || false,
      marketing: consentData.marketing || false,
      aiTraining: consentData.aiTraining || false, // 用户数据用于AI训练
      updatedAt: new Date().toISOString(),
      ipAddress: this.hashIP(consentData.ipAddress),
      userAgent: consentData.userAgent
    };
    
    await db.query(`
      INSERT INTO user_consent (user_id, consent_data, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET consent_data = $2, updated_at = $3
    `, [userId, JSON.stringify(consentRecord), consentRecord.updatedAt]);
  }
  
  hashIP(ipAddress) {
    return crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16);
  }
}
```

---

## 关键技术疑问

基于我们的深度讨论，以下问题需要在实施过程中持续关注和解决：

### 🔴 高优先级疑问

#### 1. 连环画一致性的"不确定性原理"
```
问题核心：AI模型的概率性质 vs 商业级可靠性需求
技术挑战：
- Seed固定 + 提示词变化 = 相似但不完全一致
- 第N帧生成失败时的恢复策略
- 一致性阈值的量化定义

建议解决方案：
- Phase 1: 提示词工程 + 人工质检
- Phase 2: 引入一致性评分AI模型
- Phase 3: 考虑LoRA微调或ControlNet
```

#### 2. 成本控制的"黑天鹅"应对
```
异常场景：
- AI API突然涨价10倍
- 恶意用户刷量攻击
- 病毒式用户增长

缺失机制：
- 动态调价策略
- 紧急熔断机制
- 服务降级方案

技术债务：需要实现多级降级策略
```

#### 3. 数据一致性的"时序依赖"
```
Saga模式在高并发下的"幽灵读取"问题：
- 步骤1成功，步骤2失败
- 其他用户查询到中间状态
- 补偿事务的可见性窗口

解决方案：引入状态字段和软删除机制
```

### 🟡 中等优先级疑问

#### 4. 错误恢复的"用户心智模型"
```
用户期望 vs 技术实现的差异：
- 技术视角："API调用失败，请重试"
- 用户视角："我的创意被系统吞了吗？"

需要设计：符合直觉的错误恢复流程
```

#### 5. AI模型切换的"零停机"策略
```
模型抽象层设计：
- 不同模型的输入输出格式差异
- 历史数据的模型版本标记
- A/B测试不同模型效果的架构
```

### 🟢 低优先级疑问

#### 6. 跨地域部署的"数据同步"
```
全球化考虑：
- 数据本地化要求
- 跨地域数据同步
- 就近访问优化
```

---

## 开发路线图

### Phase 1: MVP基础架构 (4-6周)

**Week 1-2: 项目初始化**
- [x] Next.js项目搭建 + TypeScript配置
- [x] 数据库设计 + 连接配置
- [x] 基础UI组件开发（设计系统）
- [x] 用户认证系统（JWT）

**Week 3-4: 核心画布功能**
- [ ] Fabric.js集成 + 基础绘图工具
- [ ] 双输入模式实现
- [ ] 自动保存机制
- [ ] 项目管理CRUD

**Week 5-6: AI生成流程**
- [ ] nano-banana API集成
- [ ] 异步任务队列（BullMQ + Redis）
- [ ] Worker进程实现
- [ ] 内容审核集成
- [ ] S3存储配置

### Phase 2: 用户体验优化 (3-4周)

**Week 7-8: 实时通知**
- [ ] 短轮询实现（MVP）
- [ ] Pusher集成（生产）
- [ ] 前端状态管理优化
- [ ] 错误处理优化

**Week 9-10: 成本控制与监控**
- [ ] 预算控制中间件
- [ ] 多级限流实现
- [ ] 成本统计与告警
- [ ] 用户配额管理

### Phase 3: 高级功能 (4-5周)

**Week 11-12: 连环画模式**
- [ ] 多帧项目支持
- [ ] 一致性管理系统
- [ ] 批量处理优化
- [ ] 连环画专用UI

**Week 13-15: 视频合成**
- [ ] 第三方视频API集成
- [ ] 视频处理队列
- [ ] 格式适配功能
- [ ] 视频预览系统

### Phase 4: 生产就绪 (2-3周)

**Week 16-17: 性能与安全**
- [ ] 缓存策略实施
- [ ] GDPR合规实现
- [ ] 安全审计
- [ ] 性能测试与优化

**Week 18: 部署与监控**
- [ ] 生产环境部署
- [ ] 监控告警配置
- [ ] 备份恢复测试
- [ ] 文档完善

---

**最后更新**: 2025-08-31  
**下次评审**: MVP完成后  
**负责人**: 架构团队