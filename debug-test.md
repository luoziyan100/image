# 调试日志测试计划

## 预期的调试日志顺序

当用户在画布上绘制时，应该看到以下日志：

1. **绘制开始**
   ```
   🖌️ Canvas: 路径创建完成
   🎨 getCanvasImage: 开始导出画布图像，对象数量: X
   📐 getCanvasImage: 画布尺寸: { width: 600, height: 400, scale: 1 }
   ✅ getCanvasImage: 成功导出，数据长度: XXXX, 前50字符: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...
   ```

2. **数据传输**
   ```
   📤 Canvas: 调用onCanvasChange, imageData存在: true, hasChanges: true
   🏠 工作区 - Canvas变化: { hasChanges: true, imageDataExists: true, imageDataLength: XXXX, currentHasCanvasContent: false }
   ✅ 工作区 - 设置画布图片数据，长度: XXXX
   ```

3. **AI生成检查**
   ```
   🤖 AI生成 - 检查输入源: { hasCanvasContent: true, canvasImageDataExists: true, canvasImageDataLength: XXXX, uploadedImagesCount: 0, canvasDataPreview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...' }
   ✅ 使用图生图模式 - 画布数据, 长度: XXXX
   ```

## 问题诊断

如果看到以下情况，说明有问题：

### 问题1: 画布导出失败
```
❌ getCanvasImage: Canvas未初始化或不存在
❌ getCanvasImage: 画布为空，没有对象
❌ getCanvasImage: 导出失败或数据异常
```

### 问题2: 数据传输失败  
```
❌ 工作区 - 清空画布图片数据
🤖 AI生成 - canvasImageDataExists: false
⚠️  没有找到图像输入，将使用文生图模式
```

### 问题3: 时序问题
```
📤 Canvas: 调用onCanvasChange, imageData存在: false
🏠 工作区 - imageDataLength: 0
```

## 修复验证

修复后应该确保：
1. ✅ 画布绘制后立即有调试日志
2. ✅ getCanvasImage返回有效的Base64数据  
3. ✅ 工作区正确接收并存储图片数据
4. ✅ AI生成组件能够正确识别画布内容
5. ✅ 实际调用transformImage而不是generateImage

## 测试步骤

1. 在画布上画一个简单的图形
2. 观察控制台日志输出
3. 点击"生成图片"按钮
4. 检查是否显示"图生图模式"
5. 确认调用的是transformImage API