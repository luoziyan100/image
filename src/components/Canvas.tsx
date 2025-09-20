'use client';

import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as fabric from 'fabric';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';

interface CanvasProps {
  projectId?: string;
  width: number;
  height: number;
  activeTool: 'draw' | 'erase' | 'upload' | 'select';
  brushColor: string;
  brushSize: number;
  onCanvasChange?: (hasChanges: boolean, imageData?: string) => void;
  onImageUpload?: (file: File) => void;
  isGenerating?: boolean;
  className?: string;
}

type LayeredFabricImage = fabric.FabricImage & {
  layerId: string;
  layerName: string;
};

const CanvasComponent = forwardRef<{
  loadImage: (imageUrl: string) => void;
  exportPoseImage: () => string | null;
  exportMaskImage: () => string | null;
}, CanvasProps>(({ 
  projectId: _,
  width,
  height,
  activeTool,
  brushColor,
  brushSize,
  onCanvasChange,
  onImageUpload,
  isGenerating = false,
  className
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // 使用自定义Hook管理Fabric.js画布
  const {
    canvasElementRef,
    fabricCanvas,
    isInitialized,
    updateBrush,
    setSelectMode,
    clearCanvas,
    getCanvasImage,
    hasCanvasContent,
    // 使用对象方式加载，避免背景覆盖
    loadImageAsObject,
    // 图层工具
    listImageLayers,
    setLayerVisibility,
    setLayerLocked,
    removeLayer,
    bringForward,
    sendBackwards,
    bringToFront,
    sendToBack,
    selectLayer,
    exportPoseImage,
    exportMaskImage,
  } = useFabricCanvas({
    width,
    height,
    onPathCreated: () => {
      console.log('🖌️ Canvas: 路径创建完成');
      setHasContent(true);
      
      // 只在延迟后导出，确保渲染完全完成
      setTimeout(() => {
        console.log('⏰ Canvas: 延迟导出图片数据');
        const imageData = getCanvasImage?.();
        console.log('📤 Canvas: 调用onCanvasChange, imageData存在:', !!imageData);
        if (imageData) {
          onCanvasChange?.(true, imageData);
        } else {
          onCanvasChange?.(true); // 有变化但没有图片数据
        }
      }, 100);
    },
    onObjectAdded: () => {
      console.log('➕ Canvas: 对象添加完成');
      setHasContent(true);
      
      // 只在延迟后导出，确保渲染完全完成
      setTimeout(() => {
        console.log('⏰ Canvas: 延迟导出图片数据');
        const imageData = getCanvasImage?.();
        console.log('📤 Canvas: 调用onCanvasChange, imageData存在:', !!imageData);
        if (imageData) {
          onCanvasChange?.(true, imageData);
        } else {
          onCanvasChange?.(true); // 有变化但没有图片数据
        }
      }, 100);
    }
  });

  // 添加图片到画布（作为图层加入）
  const addImageToCanvas = useCallback((imageUrl: string) => {
    if (!fabricCanvas || !isInitialized) return;
    
    fabric.FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      // 调整图片大小适应画布
      const maxWidth = width * 0.8;
      const maxHeight = height * 0.8;
      
      if (img.width && img.height) {
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        img.scale(scale);
      }
      
      // 居中放置
      img.set({
        left: (width - (img.width || 0) * (img.scaleX || 1)) / 2,
        top: (height - (img.height || 0) * (img.scaleY || 1)) / 2,
      });
      
      // 为图片设置自定义图层属性，便于管理
      const layeredImage = img as LayeredFabricImage;
      layeredImage.layerId = `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      layeredImage.layerName = '图片图层';

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      
      setHasContent(true);
      
      // 立即导出一次
      const immediateImageData = getCanvasImage?.();
      onCanvasChange?.(true, immediateImageData || undefined);
      
      // 延迟再次导出，确保拖拽图片渲染完成
      setTimeout(() => {
        console.log('🖼️ Canvas: 拖拽图片延迟导出');
        const imageData = getCanvasImage?.();
        console.log('📤 Canvas: 拖拽图片调用onCanvasChange, imageData存在:', !!imageData);
        onCanvasChange?.(true, imageData || undefined);
      }, 200); // 拖拽图片可能需要更长时间渲染
    }).catch((error) => {
      console.error('添加图片失败:', error);
    });
  }, [fabricCanvas, isInitialized, width, height, onCanvasChange, getCanvasImage]);

  // 暴露loadImage方法给父组件：作为可编辑图层放入
  useImperativeHandle(ref, () => ({
    loadImage: (imageUrl: string) => {
      // 统一走对象加载（与拖拽一致）
      addImageToCanvas(imageUrl);
    },
    exportPoseImage: () => exportPoseImage ? exportPoseImage() : null,
    exportMaskImage: () => exportMaskImage ? exportMaskImage() : null
  }), [addImageToCanvas]);

  // 工具切换
  useEffect(() => {
    if (!fabricCanvas || !isInitialized) return;

    switch (activeTool) {
      case 'draw':
        updateBrush(brushColor, brushSize, false);
        break;
      case 'erase':
        updateBrush(brushColor, brushSize, true); // 传递isEraser标志
        break;
      case 'select':
        setSelectMode();
        break;
    }
  }, [activeTool, brushColor, brushSize, isInitialized, fabricCanvas, updateBrush, setSelectMode]);

  // 拖拽处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理拖拽的图片文件
  const handleImageDrop = useCallback((file: File) => {
    console.log('拖拽图片到画布:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('图片读取完成, URL长度:', result.length);
      
      // 直接添加到画布
      addImageToCanvas(result);
    };
    
    reader.onerror = (error) => {
      console.error('文件读取错误:', error);
    };
    
    reader.readAsDataURL(file);
    onImageUpload?.(file);
  }, [addImageToCanvas, onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        handleImageDrop(file);
      }
    });
  }, [handleImageDrop]);

  // 简易图层面板状态与刷新
  const [layers, setLayers] = useState<Array<{ id: string; name: string; visible: boolean; locked: boolean; zIndex: number }>>([]);
  const refreshLayers = useCallback(() => {
    const list = listImageLayers ? listImageLayers() : [];
    setLayers(list);
  }, [listImageLayers]);

  useEffect(() => {
    refreshLayers();
  }, [isInitialized, hasContent, refreshLayers]);

  return (
    <div className={cn('canvas-component', className)}>
      {/* 主画布容器 */}
      <div 
        className="canvas-container relative bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Fabric.js Canvas元素 */}
        <canvas
          ref={canvasElementRef}
          width={width}
          height={height}
          className="block"
        />

        {/* 拖拽提示 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center pointer-events-none border-2 border-dashed border-blue-400 rounded-lg">
            <div className="text-center text-blue-600">
              <div className="text-6xl mb-4">🖼️</div>
              <p className="text-xl font-medium">松开添加图片到画布</p>
              <p className="text-sm">图片会自动调整大小</p>
            </div>
          </div>
        )}

        {/* 生成中遮罩 */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="bg-white p-6 rounded-lg text-center max-w-sm">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-800">AI正在创作...</p>
              <p className="text-sm text-gray-500">请勿移动画布</p>
            </div>
          </div>
        )}

      </div>

      {/* 画布状态栏 */}
      <div className="canvas-status mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>尺寸: {width}×{height}</span>
          <span className={cn(
            'flex items-center gap-1',
            hasContent ? 'text-green-600' : 'text-gray-400'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              hasContent ? 'bg-green-400' : 'bg-gray-300'
            )} />
            {hasContent ? '有内容' : '空白'}
          </span>
          {isInitialized && <span>• 就绪</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // 确保真正清空画布并同步上报无内容状态
              clearCanvas();
              setHasContent(false);
              // 通知父组件：没有内容；上层会将 canvasImageData 置空
              try {
                onCanvasChange?.(false);
              } catch (e) {
                console.warn('onCanvasChange after clear failed:', e);
              }
            }}
            disabled={!hasContent || isGenerating}
            className="text-xs"
          >
            清空
          </Button>
        </div>
      </div>

      {/* 简易图层面板（仅图片图层） */}
      <div className="layer-panel mt-2 px-3 py-2 border rounded-lg bg-white">
        <div className="text-xs text-gray-700 mb-2">图层</div>
        {layers.length === 0 ? (
          <div className="text-xs text-gray-400">无图片图层</div>
        ) : (
          <div className="space-y-1">
            {layers.map(layer => (
              <div key={layer.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <button type="button"
                    className={`w-5 h-5 ${layer.visible ? 'text-gray-700' : 'text-gray-300'}`}
                    title={layer.visible ? '隐藏' : '显示'}
                    onClick={() => { setLayerVisibility && setLayerVisibility(layer.id, !layer.visible); refreshLayers(); }}
                  >👁️</button>
                  <button type="button"
                    className={`w-5 h-5 ${layer.locked ? 'text-gray-700' : 'text-gray-300'}`}
                    title={layer.locked ? '解锁' : '锁定'}
                    onClick={() => { setLayerLocked && setLayerLocked(layer.id, !layer.locked); refreshLayers(); }}
                  >🔒</button>
                  <span className="truncate max-w-[140px] cursor-pointer" title={layer.name}
                    onClick={() => selectLayer && selectLayer(layer.id)}
                  >{layer.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="px-1" title="上移" onClick={() => { bringForward && bringForward(layer.id); refreshLayers(); }}>⬆️</button>
                  <button type="button" className="px-1" title="下移" onClick={() => { sendBackwards && sendBackwards(layer.id); refreshLayers(); }}>⬇️</button>
                  <button type="button" className="px-1" title="置顶" onClick={() => { bringToFront && bringToFront(layer.id); refreshLayers(); }}>⭱</button>
                  <button type="button" className="px-1" title="置底" onClick={() => { sendToBack && sendToBack(layer.id); refreshLayers(); }}>⭳</button>
                  <button type="button" className="px-1 text-red-600" title="删除" onClick={() => { removeLayer && removeLayer(layer.id); refreshLayers(); }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// 设置displayName
CanvasComponent.displayName = 'CanvasComponent';

// 正确组合forwardRef和memo
export const Canvas = React.memo(CanvasComponent);

Canvas.displayName = 'Canvas';
