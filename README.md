# Image2Video AI 创意工具

> AI 驱动的创意工具，帮助你把手绘草图或参考图片转化为精美插画，提供情感化等待体验与贴纸创作模式。

📚 想快速了解所有有效文档？请从 [`docs/README-docs.md`](./docs/README-docs.md) 开始，它列出了文档清单、负责人与复审日期。

## ✨ 当前能力
- 🖌️ **Fabric.js 画布**：绘制/橡皮擦/颜色与笔触控制，可加载上传图片继续编辑。
- 🎨 **AI 图像生成**：支持文本生图与图生图，通过 BullMQ 队列调用 nano-banana 模型并上传至 S3。
- 😌 **情感化等待**：生成过程提供“温暖提示 + 进度轮询”，配合 `/api/assets/status` 状态面板。
- 🔄 **多工作区**：在创作工作台与贴纸工作室之间一键切换，内置 6 种贴纸风格。
- 💰 **预算守护**：`BudgetGuardian` 避免月度额度透支，必要时降级服务。

_Not yet shipped_: 连环画批量生成、视频合成、鉴权体系、内容审核实装、作品分享。

## 🚀 快速开始
### 环境要求
- Node.js 18+
- npm / pnpm / yarn（二选一）
- （可选）Docker，用于启动 `docker-compose` 提供的 Postgres/Mongo/Redis
- nano-banana API Key 与 AWS S3 凭据

### 安装与启动
```bash
npm install
npm run dev          # 在 http://localhost:3000 启动应用
npm run dev:worker   # (可选) 同机启动带队列的开发进程
```
生产模式：
```bash
npm run build
npm run start
npm run start:worker # 单独部署队列 Worker 时启用
```

### 必需的环境变量
复制 `.env.example` 为 `.env.local` 并填写至少以下项：
```
DATABASE_URL=postgres://...
MONGODB_URL=mongodb://...
REDIS_URL=redis://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
NANO_BANANA_API_KEY=...
MONTHLY_BUDGET_CENTS=1000000
```

### 常用验证
- `npm run lint`：静态检查。
- `curl http://localhost:3000/api/health`：检查数据库与 Redis 连接。
- 在 UI 中完成“绘制 → 生成图片”，观察终端输出确保队列正常。

## 🧱 架构速览
- **前端**：Next.js (App Router) + React 19，Zustand 管理状态，TailwindCSS 负责样式。
- **API Routes**：`/api/generate`、`/api/assets/status`、`/api/projects` 负责校验、持久化、任务入队。
- **队列与 Worker**：BullMQ + Redis；`src/worker/start-worker.js` 负责消费任务并将结果写回 Postgres/S3。
- **数据存储**：PostgreSQL (元数据/账单)、MongoDB (画布草图 JSON/Base64)、S3 (生成图片)。
- 详见 [`docs/Technical-Architecture.md`](./docs/Technical-Architecture.md)。

## 📖 文档资源
- [产品需求文档 (PRD)](./docs/PRD.md)
- [技术架构文档](./docs/Technical-Architecture.md)
- [UI/UX 设计规范](./docs/UI-UX-Design.md)
- [Git 工作流指南](./docs/Git-Workflow.md)
- [归档想法](./docs/archive/)：历史方案，仅做参考

## 🤝 贡献方式
1. Fork 本仓库并创建特性分支 `git checkout -b feature/awesome`
2. 提交更改并附带必要的文档更新
3. 运行 `npm run lint` 与关键手动回归
4. 发起 Pull Request 并描述影响范围

## 📄 许可证
本项目基于 [MIT License](./LICENSE) 开源。

## 👥 贡献者
- [@luoziyan100](https://github.com/luoziyan100)

---
如果这个项目对你有帮助，欢迎点个 ⭐ 支持！
