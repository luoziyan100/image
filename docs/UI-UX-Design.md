# image2video — UI/UX 设计规范
**版本**: v0.4  
**最后更新**: 2025-09-22  
**设计理念**: 情感驱动的创作体验，优先保障“画布 → 生成 → 欣赏”主路径

> 本规范反映当前实现的界面与交互。历史方案已移至 `docs/archive/`。

---

## 1. 设计原则
- **创作优先**：任何界面元素都围绕“快速进入绘画/上传 → 获得成品”展开，减少次要干扰。
- **情感陪伴**：生成阶段以暖心文案和柔和动画缓解等待焦虑，避免冰冷的 loading。
- **即时反馈**：上传、绘制、生成、错误均有 toast 或状态指标回应。
- **可扩展**：布局基于 12 列网格与 Tailwind 变量，便于增减模块（如贴纸、项目库）。

---

## 2. 视觉系统

| Token | Tailwind 对应 | 用途 |
| --- | --- | --- |
| `color.primary` | `bg-blue-500` / `text-blue-600` | 主要交互按钮、高亮态 |
| `color.accent` | `from-purple-50 to-pink-50` 渐变 | 右侧栏标题、情绪背景 |
| `color.success` | `text-green-600` / `bg-green-50` | 生成成功提示、画布“有内容”指示 |
| `color.warning` | `bg-blue-50` / `text-blue-700` | 生成中的信息条 |
| `color.error` | `text-red-600` / `bg-red-50` | 错误提示文案 |
| `color.neutral` | `text-gray-600` / `border-gray-200` | 基础文字与分隔线 |

- **Typography**：浏览器加载 Inter（Next.js 默认），标题使用 `font-semibold`/`font-bold`，正文 `font-medium`/`font-normal`。
- **Spacing**：基于 Tailwind 尺寸刻度 (`px-4`, `gap-3`, `space-y-3`)；内容区最小边距 16px。
- **Iconography**：使用 emoji 传达轻松氛围（工具、状态、情绪提示）。

---

## 3. 页面布局
1. **Top Toolbar** — 固定在内容区顶部，白底 + 灰色边框，下方是主工作区。
2. **Creation Workspace (默认工作区)**
   - `grid grid-cols-12 gap-3`
   - 左侧主画布 `col-span-7`：Fabric.js 画布 + 状态栏 + 图层面板。
   - 右侧侧栏 `col-span-5`：素材上传、灵感区、AI Demo、生成状态。
3. **Overlay** — 当 `generationState.isGenerating` 为 true 时，使用全屏半透明遮罩，内嵌卡片 (`GenerationProgress`) 展示步骤和取消按钮。
4. **贴纸工作区** — 通过顶部“工作区”切换按钮进入，当前加载 `StickerStudio` 组件（试验中，布局独立）。

---

## 4. 核心组件

### 4.1 TopToolbar (`src/components/TopToolbar.tsx`)
- 左侧：工作区切换（创作工作台 / 贴纸模式），按钮组合使用圆角 + 选中蓝底白字。
- 中部：仅在画布模式显示，包含
  - 模式切换区域已简化，仅保留工作区（画布 / 贴纸）切换
  - 工具切换（画笔、橡皮、选择）
  - 预设颜色 8 个，选中时加粗边框、略放大
  - 画笔大小预设 6 档，选中时蓝色强调
- 贴纸模式下，中部区域替换为说明文案。

### 4.2 MainCanvasArea + Canvas
- 画布容器白底、圆角、浅阴影，固定尺寸 680×520。
- 状态栏：左侧以绿色/灰色圆点提示是否存在内容，右侧展示当前工具和颜色。
- 底部图层面板：列出图片图层，提供显隐、锁定、层级操作与删除。
- 清空按钮放置在状态栏右侧，禁用态为灰色。

### 4.3 RightSidebar
- Header：紫粉渐变背景、欢迎文案。
- Section 1 – **图片素材**：上传入口（点击/拖拽），下方列出已上传缩略图，可删除/排序/加载至画布。
- Section 2 – **创作灵感**：默认折叠，仅显示鼓励语；展开后出现 warm message 与提示列表。
- 侧栏底部原设计包含“生成”按钮，当前布局通过 `hideGenerateButton` 隐藏，生成体验托管给 `AIGenerationDemo`。

### 4.4 AIGenerationDemo
- 顶部展示可用的 BYOK 提供商下拉框及输入模式指示（图生图/文生图）。
- 用户可勾选“附加姿态图/遮罩图”（通过 canvas 导出函数）。
- 文本域输入提示词，主 CTA “生成图片” 位于组件底部。
- 生成状态：按钮切换为旋转动画文案，结果区展示大图、放大提示、下载按钮以及元数据表。

### 4.5 GenerationProgress & StatusPanel
- Progress overlay 使用步骤列表：输入审核 → 生成 → 输出审核 → 上传。
- 右侧 `GenerationStatusPanel` 同时显示 BYOK 客户端事件与服务端队列状态，失败时红色文本。

### 4.6 Notifications
- 由 `useAppStore` 驱动，默认在页面右上角淡入淡出，用于上传成功、生成完成、错误或温馨提示。

---

## 5. 交互与状态
- **情感文案循环**：`CreationWorkspace` 在生成时每 8 秒轮换三条提示，完成时显示庆祝语，失败时随机安慰语。
- **空白画布提醒**：用户尝试生成但 `canvasImageData` 为空时，toast 提醒“先画点什么”。
- **上传反馈**：上传成功出现在通知栏，同时在素材列表追加缩略图。
- **队列状态**：轮询间隔 2s；完成与失败均触发通知并关闭遮罩。

---

## 6. 状态管理
- 使用 Zustand (`useAppStore`) 储存当前项目、画布工具、生成状态、通知数组与工作区模式。
- 通知默认 3 秒自动消失；`showNotification` 支持 `autoHide=false` 长驻。
- 画布的“是否有内容”状态来自 `CreationWorkspace` 对 `handleCanvasChange` 的追踪，推动 UI 标识与生成按钮可用性。

---

## 7. 响应式与可访问性
- **桌面优先**：当前界面针对 ≥1024px 宽度设计，平板/移动尚未适配。
- **键盘支持**：核心按钮使用 `<button>` 并保持 `focus` outline；调色盘、画笔大小等需要后续优化键盘导航。
- **文本对比**：主色彩搭配遵循 Tailwind 默认值，基本满足 WCAG AA，但需在升级配色时复核。

---

## 8. 待办与改进
1. 统一色板：将剩余组件（如通知、贴纸工作区）切换到同一 token 体系。
2. 响应式策略：设计 768–1024 区间的折行，以及移动端简化模式。
3. 无障碍改进：为颜色按钮添加 `aria-label`，为情绪提示提供屏幕阅读器友好文本。
4. 贴纸工作区：完善视觉规范，确认是否纳入主规范或单独文档。

---
_Owner: Design • 下次复审: 2025-10-15_
