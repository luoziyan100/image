# Image2Video AI 创意工具

> AI驱动的创意工具，支持手绘草图转换为精美艺术作品

## 🎨 项目简介

Image2Video 是一个基于AI的创意工具，允许用户通过手绘草图或上传图片，结合AI生成精美的艺术作品。项目支持单图生成和连环画创作，并提供贴纸工作室等多种创意模式。

### ✨ 主要特性

- 🖌️ **双重输入模式**：支持画布绘制和图片上传
- 🤖 **AI图像生成**：集成先进的AI模型
- 🎭 **贴纸工作室**：6种预设风格（波普艺术、昭和火柴盒、像素艺术等）
- 🔄 **工作区切换**：画布模式和贴纸模式无缝切换
- 📱 **响应式设计**：支持多设备访问
- 💾 **自动保存**：实时保存创作进度

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm/yarn/pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🛠️ 技术栈

- **前端**: React 19 + Next.js 15 + TypeScript
- **画布**: Fabric.js 6.7+
- **状态管理**: Zustand
- **样式**: TailwindCSS 4
- **数据库**: PostgreSQL + MongoDB
- **存储**: AWS S3
- **部署**: Vercel

## 📁 项目结构

```
src/
├── app/                 # Next.js App Router
├── components/          # React 组件
│   ├── Canvas.tsx      # 主画布组件
│   ├── StickerStudio.tsx # 贴纸工作室
│   └── ...
├── hooks/              # 自定义 Hooks
│   └── useFabricCanvas.ts
├── stores/             # Zustand 状态管理
├── lib/                # 工具库
└── utils/              # 辅助函数
```

## 📖 文档

- [产品需求文档 (PRD)](docs/PRD.md)
- [技术架构文档](docs/Technical-Architecture.md)
- [UI/UX 设计规范](docs/UI-UX-Design.md)

## 🤝 贡献指南

欢迎提交 Pull Request 和 Issue！

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 👥 贡献者

- [@luoziyan100](https://github.com/luoziyan100) - 项目创建者

---

⭐ 如果这个项目对你有帮助，请给它一个 Star！
