'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Canvas } from './Canvas';

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

export const MainCanvasArea: React.FC<MainCanvasAreaProps> = ({
  projectId,
  activeTool,
  brushColor,
  brushSize,
  onCanvasChange,
  onImageUpload,
  isGenerating,
  className
}) => {
  const [hasCanvasContent, setHasCanvasContent] = useState(false);

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
          projectId={projectId}
          width={600}  // 主画布更大
          height={400}
          activeTool={activeTool}
          brushColor={brushColor}
          brushSize={brushSize}
          onCanvasChange={handleCanvasChange}
          onImageUpload={onImageUpload}
          isGenerating={isGenerating}
        />
      </div>

      {/* 画布底部信息栏 */}
      <div className="canvas-footer px-3 py-1 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          
          {/* 左侧：当前工具信息 */}
          <div className="tool-info flex items-center gap-4">
            <span>工具: {
              activeTool === 'draw' ? '🖌️ 画笔' :
              activeTool === 'erase' ? '🧽 橡皮擦' : 
              activeTool === 'select' ? '👆 选择' : '❓ 未知'
            }</span>
            
            {activeTool === 'draw' && (
              <span>颜色: 
                <span 
                  className="inline-block w-3 h-3 rounded-full ml-1 border border-gray-300" 
                  style={{ backgroundColor: brushColor }}
                />
              </span>
            )}
            
            {activeTool === 'erase' && (
              <span>模式: 擦除</span>
            )}
            
            {(activeTool === 'draw' || activeTool === 'erase') && (
              <span>大小: {brushSize}px</span>
            )}
          </div>
          
          {/* 右侧：画布信息 */}
          <div className="canvas-info flex items-center gap-4">
            <span>尺寸: 600×400</span>
            <span>状态: {hasCanvasContent ? '已编辑' : '空白'}</span>
          </div>
        </div>
      </div>

    </div>
  );
};