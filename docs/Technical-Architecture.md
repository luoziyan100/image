# 技术架构文档 — image2video
_版本: v0.4 • 最后更新: 2025-09-22_

本文描述目前线上/开发环境正在使用的技术方案。所有历史或探索性架构已归档至 `docs/archive/`。

## 1. 总览

```
Browser (Next.js App Router, client components)
        │
        ▼
Next.js API Routes  ──┬─ PostgreSQL (projects, assets, billing_events)
                      ├─ MongoDB (sketches collection)
                      ├─ Redis + BullMQ (image-generation queue)
                      └─ AWS S3 (generated image storage)
        │
        ▼
Worker (BullMQ consumer → nano-banana API → S3)
```

- 前端：App Router 下的客户端组件 (`src/app/page.tsx` + `src/components/*`)，通过 `fetch('/api/generate')` 发起生成。
- 后端：API Route 负责参数校验、预算守卫、持久化记录、入队任务；同一仓库中包含 Worker 启动脚本。
- 队列：BullMQ 管理生成任务，确保昂贵的 AI 调用在独立进程中执行。

## 2. 技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Next.js 15 + React 18 (client components) | Fabric.js 实现画布；Zustand 管理状态；TailwindCSS 风格化。 |
| API | Next.js Route Handlers | `src/app/api/generate`, `/assets/status`, `/projects`。 |
| 队列 | BullMQ + Redis | `src/lib/queue-manager.ts` 定义 queue/worker；`src/worker/start-worker.js` 启动消费者。 |
| AI | nano-banana API | `src/lib/nano-banana-client.ts`；当前 key 需配置环境变量。 |
| 数据库 | PostgreSQL + MongoDB | Postgres 存项目/资产；Mongo 保存草图 base64。 |
| 存储 | AWS S3 | 生成结果上传；可配置替换成本地 mock。 |

## 3. 关键模块

### 3.1 前端工作区
- `CreationWorkspace` 调度主画布、右侧工具栏、AI Demo；情感化提示在此实现。
- `Canvas` & `useFabricCanvas` 包装 Fabric.js，导出图片/遮罩/姿态数据。
- `GenerationStatusPanel` 轮询 `/api/assets/[id]/status` 查看队列进度。
- `useAppStore` (Zustand) 保存当前项目、画布设置、通知列表。

### 3.2 API 层
- **`POST /api/generate`**：
  1. `BudgetGuardian` 检查月度预算；
  2. 校验 `projectId`、base64 `imageData`；
  3. 将草图写入 Mongo `sketches` 集合；
  4. 在 Postgres `assets` 表创建记录（状态 `pending`）；
  5. 通过 `QueueManager` 入队任务，返回 `assetId`。
- **`GET /api/assets/status`**：按 `assetId` 查询 Postgres 记录，供轮询界面使用。
- **`GET /api/projects` / `POST /api/projects`**：提供基础项目列表与创建接口（当前 UI 仍用 mock 数据，将逐步对接）。
- 测试与健康检查：`/api/test/*`、`/api/health`。

### 3.3 队列与 Worker
- `QueueManager`：
  - 队列名称 `image-generation`，默认重试 5 次，指数退避。
  - 任务负载 `GenerationJobData` 包含 `assetId`、提示词、图片 buffer。
- Worker 流程：
  1. 更新资产状态 → `auditing_input`；调用 `auditContent`（当前为 mock）。
  2. 状态改为 `generating`，调用 `processImageGeneration`。
  3. AI 返回后再审核输出 → `auditing_output`（同为 mock）。
  4. 上传 S3，状态改为 `completed`；记录处理时长、模型版本、seed。
  5. 记录计费事件（仍处于 pending 状态，无真实扣费）。
- 启动：`ENABLE_QUEUE_WORKER=true node src/worker/start-worker.js` 或 `npm run worker`。

## 4. 数据模型

### PostgreSQL
- `projects`：`id`, `title`, `description`, `project_type`, `status`, `created_at`, `updated_at`。
- `assets`：`id`, `project_id`, `source_sketch_id`, `storage_url`, `status`, `error_message`, `ai_model_version`, `generation_seed`, `processing_time_ms`, 时间戳。
- `billing_events`：`asset_id`, `user_id`, `cost_cents`, `api_calls`, `status`, `created_at`。
- `usage_stats`：按月聚合成本/调用次数，为 `BudgetGuardian` 提供数据。

### MongoDB
- `sketches`：`projectId`, `imageData` (Base64), `metadata` (画布尺寸、大小、格式), 时间戳。

### Redis
- 作为 BullMQ 队列后端；任务数据仅存短期处理所需字段。

## 5. 环境配置

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串。 |
| `MONGODB_URL` | MongoDB 连接串。 |
| `REDIS_URL` | Redis/BullMQ 连接。 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` | 上传生成结果所需；本地可替换为 mock。 |
| `NANO_BANANA_API_KEY` | AI 调用密钥。 |
| `MONTHLY_BUDGET_CENTS` | BudgetGuardian 月度配额，默认 1,000,000 (¥10,000)。 |

本地开发可使用 `docker-compose.yml` 启动 Postgres/Mongo/Redis，但仍需手动提供 AI & S3 凭据或替代方案。

## 6. 未完成/待办
- **内容审核**：目前返回 mock 结果，需要接入 Google Cloud Vision 或其他提供商后，更新 `auditContent` 实现。
- **预算提醒**：`BudgetGuardian` 仅做硬性拦截，尚未配置告警渠道。
- **项目/作品列表**：前端仍使用 mock 数据，需要将 `/api/projects` 结果接入 UI。
- **贴纸工作区**：实验性模块，待确认是否纳入正式产品。

## 7. 运维与监控
- 单体部署：Next.js App + Worker 可以在同一仓库中分别运行。
- 建议的监控指标：
  - 队列长度与失败率（BullMQ 自带事件 + Redis 监控）。
  - AI 调用耗时与错误码。
  - `BudgetGuardian` 拦截次数。
- 日志：目前使用 `console`，部署上线后建议接入集中日志系统（如 CloudWatch / Logtail）。

---
_Owner: Engineering • 下次复审: 2025-10-15_
