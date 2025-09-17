'use client';

import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Canvas } from './Canvas';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';

interface MainCanvasAreaProps {
  projectId: string;
  activeTool: 'draw' | 'erase' | 'upload' | 'select';
  brushColor: string;
  brushSize: number;
  onCanvasChange: (hasChanges: boolean, imageData?: string) => void;
  onImageUpload: (file: File) => void;
  isGenerating: boolean;
  className?: string;
}

export const MainCanvasArea = forwardRef<{
  loadImage: (imageUrl: string) => void;
  exportPoseImage: () => string | null;
  exportMaskImage: () => string | null;
}, MainCanvasAreaProps>(({ 
  projectId,
  activeTool,
  brushColor,
  brushSize,
  onCanvasChange,
  onImageUpload,
  isGenerating,
  className
}, ref) => {
  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const canvasRef = useRef<{
    loadImage: (imageUrl: string) => void;
    exportPoseImage: () => string | null;
    exportMaskImage: () => string | null;
  }>(null);

  // 暴露loadImage方法给父组件
  useImperativeHandle(ref, () => ({
    loadImage: (imageUrl: string) => {
      canvasRef.current?.loadImage(imageUrl);
    },
    exportPoseImage: () => canvasRef.current?.exportPoseImage() || null,
    exportMaskImage: () => canvasRef.current?.exportMaskImage() || null
  }), []);

  // 处理画布内容变化
  const handleCanvasChange = useCallback((hasChanges: boolean, imageData?: string) => {
    setHasCanvasContent(hasChanges);
    onCanvasChange(hasChanges, imageData);
  }, [onCanvasChange]);

  return (
    <div className={cn(
      'main-canvas-area bg-white rounded-lg shadow-sm border border-gray-200',
      'flex flex-col h-full',
      className
    )}>
      

      {/* 主画布区域 */}
      <div className="canvas-container flex-1">
        <Canvas
          ref={canvasRef}
          projectId={projectId}
          width={600}  // 主画布更大
          height={520} // 拉长高度，更多绘制空间
          activeTool={activeTool}
          brushColor={brushColor}
          brushSize={brushSize}
          onCanvasChange={handleCanvasChange}
          onImageUpload={onImageUpload}
          isGenerating={isGenerating}
        />
      </div>

      {/* 画布底部温暖提示 */}
      <div className="canvas-footer px-4 py-2 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs">
          
          {/* 左侧：温暖的状态提示 */}
          <div className="status-info flex items-center gap-3">
            <span className="flex items-center gap-1">
              {hasCanvasContent ? (
                <>
                  <span className="text-green-500">●</span>
                  <span className="text-green-700 font-medium">有内容啦！随时可以创作</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">○</span>
                  <span className="text-gray-500">空白画布，等待你的创意</span>
                </>
              )}
            </span>
          </div>
          
          {/* 右侧：简化的当前工具 */}
          <div className="tool-hint text-gray-600">
            {activeTool === 'draw' && (
              <span className="flex items-center gap-1">
                🖌️ 
                <span 
                  className="inline-block w-3 h-3 rounded-full border border-gray-300" 
                  style={{ backgroundColor: brushColor }}
                />
              </span>
            )}
            {activeTool === 'erase' && <span>🧽</span>}
            {activeTool === 'select' && <span>👆</span>}
          </div>
        </div>
      </div>

    </div>
  );
});
