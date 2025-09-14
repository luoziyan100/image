# image2video - AI驱动的创意工具

## 项目概述
AI驱动的创意工具，允许用户通过手绘草图结合AI生成精美的连环画作品。支持生成单张图片或连环画序列，并可选择性地合成视频。

## 技术栈
- **前端**: React + Fabric.js
- **后端**: Next.js (Node.js)
- **数据库**: PostgreSQL (用户信息、作品元数据) + MongoDB (画布草图数据)
- **文件存储**: AWS S3
- **AI模型**: nano-banana (图片生成)
- **部署**: Vercel

## MVP功能范围
- ✅ 基础画布工具（铅笔、橡皮擦、颜色选择器）
- ✅ 单图生成模式
- ✅ 双重输入方式（画布绘制 + 图片上传）
- ✅ nano-banana AI集成
- ✅ 异步生成处理
- ✅ 1024x1024 JPEG输出
- ✅ 邮箱密码用户系统
- ✅ 基础作品集页面

## 开发阶段
1. **Phase 1**: 基础架构搭建 (1-2周)
2. **Phase 2**: 核心功能开发 (2-3周)
3. **Phase 3**: 用户体验优化 (1周)
4. **Phase 4**: 测试和部署 (1周)

## 重要文档
- PRD: `/docs/PRD.md`
- 技术架构: `/docs/Technical-Architecture.md`
- UI/UX设计: `/docs/UI-UX-Design.md`

## 常用命令
<!-- 项目启动、测试、构建命令将在项目初始化后添加 -->