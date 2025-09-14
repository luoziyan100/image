# 第一次对话记录 - image2video项目

**对话时间**: 2025-08-31  
**上下文窗口**: 已使用91%，需要传承记忆

---

## 项目概述

### 核心定位
AI驱动的创意工具，用户通过手绘草图结合AI生成精美的连环画作品。支持单图和连环画两种模式，可选视频合成。

### 目标用户
- **个人创作者**: 漫画爱好者、插画家、内容创作者  
- **电商商家**: 需要产品展示图、广告素材的商家

### 技术愿景
让每个人都能轻松创作出专业级的视觉内容，通过AI技术放大创意潜力。

---

## 完整技术架构

### 技术栈选择
```
前端: React + Next.js + Fabric.js + TailwindCSS + TypeScript
后端: Node.js + Next.js API Routes  
数据库: PostgreSQL (元数据) + MongoDB (草图JSON) + Redis (队列/缓存)
AI服务: nano-banana API + Google Cloud Vision (审核)
存储: AWS S3 + CDN
部署: Vercel (前端) + AWS Fargate (Worker)
状态管理: Zustand
任务队列: BullMQ
```

### 核心架构流程
```
用户绘图 → API收到请求 → 创建asset记录 → 推送任务到Redis队列 
                                                    ↓
Worker处理: 输入审核 → AI生成 → 输出审核 → 上传S3 → 更新状态 → 通知用户
```

### 数据库设计

**PostgreSQL核心表**:
```sql
users (id UUID, email, password_hash, plan_type, created_at)
projects (id UUID, user_id, title, project_type, status, created_at) 
assets (id UUID, project_id, source_sketch_id, storage_url, status, error_code, position_in_project)
usage_stats (month_year, total_cost_cents, total_api_calls, updated_at)
billing_events (asset_id, user_id, cost_cents, status, created_at)
```

**MongoDB集合**:
```json
sketches {
  _id: ObjectId,
  user_id: "uuid",
  project_id: "uuid", 
  fabric_json: { /* Fabric.js画布数据 */ },
  created_at: ISODate
}
```

---

## 关键技术决策

### 1. 数据一致性 - Saga模式
```javascript
// 解决PostgreSQL + MongoDB双数据库一致性
try {
  const project = await createProjectInPg(data);    // Step 1
  await createSketchInMongo(data, projectId);       // Step 2  
} catch (error) {
  if (projectId) await deleteProjectInPg(projectId); // 补偿事务
}
```

### 2. AI模型集成 - nano-banana API
```javascript
// RESTful接口，每张图¥0.039，月预算¥10,000
const response = await fetch('https://api.nanobanana.ai/v1/generate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    prompt,
    quality: 'high',
    aspect_ratio: '1:1',
    response_format: 'b64_json'
  })
});
```

### 3. 连环画一致性策略
**Phase 1**: 提示词工程（角色名称+特征描述）  
**Phase 2**: Seed固定 + 图生图模式，保持角色和风格一致

### 4. 成本控制机制
- **预算检查**: API中间件检查monthly usage < ¥10,000
- **用户限流**: 免费用户5次/分钟，付费用户25次/分钟
- **系统限流**: Worker全局限制5 QPS调用AI API  
- **事务日志**: billing_events表记录每次调用，独立Worker统计

### 5. 实时通知方案
- **MVP**: 短轮询，3秒间隔查询asset状态
- **生产**: Pusher WebSocket推送状态更新

### 6. 内容审核双重机制
```
输入审核: 用户草图 → Google Vision API → 通过/拒绝
输出审核: AI生成图 → Google Vision API → 发布/拒绝
```

---

## UI/UX设计方案

### 选定布局 - 方案二：现代Web应用
```
┌─ 顶部导航: Logo + 用户信息 + 预算显示 ─┐
├─ 工具栏: 绘制工具 + 颜色 + 大小 ────────┤  
├─ 主画布: 1024x1024绘图区域 ──────────────┤
├─ 操作栏: 保存草稿 + AI生成 + 分享 ──────┤
└─ 项目库: 最新作品展示和管理 ─────────────┘
```

### 核心组件架构
- **Toolbar**: 工具切换和参数控制
- **Canvas**: Fabric.js画布集成，支持双输入模式
- **GenerationProgress**: 实时进度展示和状态通知  
- **ProjectGallery**: 作品管理和展示
- **AutoSaveManager**: 30秒定时+5次修改触发保存

### 交互状态管理
使用Zustand进行全局状态管理，包含：
- 用户状态、项目状态、画布状态、生成状态、UI状态、预算状态

---

## 开发环境配置

### 混合架构策略
- **前端开发**: Node.js本地环境（快速迭代）
- **数据库**: Docker Compose（环境隔离）  
- **生产部署**: 全容器化

### 已完成配置
1. ✅ Next.js项目创建（TypeScript + TailwindCSS）
2. ✅ Docker Compose数据库服务启动
   - PostgreSQL: localhost:5432  
   - MongoDB: localhost:27017
   - Redis: localhost:6379
3. ✅ 核心依赖包安装
4. ✅ 目录结构创建
5. ✅ 基础配置文件（.env.local, types, db.ts, store.ts, api-client.ts）

### 当前状态
- 数据库服务正常运行（内存占用~120MB）
- 项目框架搭建完成
- 准备创建核心组件

---

## 关键技术疑问记录

### 🔴 高优先级待解决
1. **连环画一致性**: AI概率性 vs 商业可靠性需求
2. **成本黑天鹅**: API涨价/恶意刷量应对策略
3. **数据一致性**: Saga模式高并发下的幽灵读取问题

### 🟡 中优先级  
4. **错误恢复**: 用户友好的失败处理流程
5. **模型切换**: 多AI模型抽象层设计

### 技术债务
- 动态定价策略
- 服务降级机制
- 一致性评分AI模型  
- 跨地域数据同步

---

## 开发路线图

### Phase 1: MVP基础架构 (4-6周)
- Week 1-2: 项目初始化 + 数据库 + 认证系统
- Week 3-4: Fabric.js画布 + 双输入模式 + 自动保存  
- Week 5-6: AI生成流程 + 异步队列 + 内容审核

### Phase 2: 用户体验 (3-4周)  
- Week 7-8: 实时通知 + 状态管理优化
- Week 9-10: 成本控制 + 限流 + 监控

### Phase 3: 高级功能 (4-5周)
- Week 11-12: 连环画模式 + 一致性管理
- Week 13-15: 视频合成功能

### Phase 4: 生产就绪 (2-3周)
- Week 16-17: 性能优化 + 安全加固  
- Week 18: 部署 + 监控

---

## 重要文档位置
- **PRD**: `/docs/PRD.md`  
- **技术架构**: `/docs/Technical-Architecture.md`
- **UI设计**: `/docs/UI-UX-Design.md`
- **项目记忆**: `/CLAUDE.md`

---

## 下次对话继续点

**当前进度**: 项目基础架构已搭建完成，数据库服务运行正常

**下一步任务**:
1. 创建核心React组件（Toolbar, Canvas, GenerationProgress）
2. 实现API路由（认证、项目管理、生成）
3. 集成Fabric.js画布功能
4. 连接数据库并测试基础流程

**环境准备**:
```bash
# 启动数据库
docker-compose up -d

# 启动开发服务器  
npm run dev

# 访问: http://localhost:3000
```

**代码位置**: `/Users/zihao/image2video`

---

**致谢**: 这是一次深度的架构设计对话，从PRD到技术方案到UI设计，建立了完整的技术体系。项目已具备开发的所有基础条件。

**记录完毕** ✅