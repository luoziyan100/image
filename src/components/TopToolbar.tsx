'use client';

import React from 'react';
import { cn } from '@/utils/cn';

export type Tool = 'draw' | 'erase' | 'upload' | 'select';
type Workspace = 'canvas' | 'sticker';

interface TopToolbarProps {
  // 模式和工具
  activeWorkspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  
  // 画笔属性
  brushColor: string;
  brushSize: number;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  
  className?: string;
}

// 预设颜色
const PRESET_COLORS = [
  '#000000', // 黑色
  '#EF4444', // 红色  
  '#F59E0B', // 橙色
  '#10B981', // 绿色
  '#3B82F6', // 蓝色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#6B7280'  // 灰色
];

// 画笔大小选项
const BRUSH_SIZES = [2, 4, 8, 12, 16, 20];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  activeWorkspace,
  onWorkspaceChange,
  activeTool,
  onToolChange,
  brushColor,
  brushSize,
  onColorChange,
  onSizeChange,
  className
}) => {
  return (
    <div className={cn(
      'top-toolbar bg-white border-b border-gray-200 px-6 py-3',
      'flex items-center justify-between',
      className
    )}>
      
      {/* 左侧：工作区 / 模式 */}
      <div className="toolbar-section flex items-center gap-6">
        <div className="workspace-selector flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">工作区:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => onWorkspaceChange('canvas')}
              className={cn(
                'px-3 py-1 text-sm transition-colors',
                activeWorkspace === 'canvas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              🎨 创作工作台
            </button>
            <button
              onClick={() => onWorkspaceChange('sticker')}
              className={cn(
                'px-3 py-1 text-sm transition-colors border-l border-gray-300',
                activeWorkspace === 'sticker'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              🧩 贴纸模式
            </button>
          </div>
        </div>

      </div>

      {/* 中间：绘制工具或贴纸说明 */}
      <div className="toolbar-section flex items-center gap-6">
        {activeWorkspace === 'canvas' ? (
          <>
            <div className="tool-selector flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">工具:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onToolChange('draw')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    activeTool === 'draw'
                      ? 'bg-blue-100 text-blue-600 border border-blue-300'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  title="画笔"
                >
                  🖌️
                </button>
                <button
                  onClick={() => onToolChange('erase')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    activeTool === 'erase'
                      ? 'bg-blue-100 text-blue-600 border border-blue-300'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  title="橡皮擦"
                >
                  🧽
                </button>
                <button
                  onClick={() => onToolChange('select')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    activeTool === 'select'
                      ? 'bg-blue-100 text-blue-600 border border-blue-300'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  title="选择"
                >
                  👆
                </button>
              </div>
            </div>

            <div className="color-selector flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">颜色:</span>
              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                      brushColor === color
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300'
                    )}
                    style={{ backgroundColor: color }}
                    title={`选择 ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="brush-size flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">大小:</span>
              <div className="flex gap-1">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => onSizeChange(size)}
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors',
                      brushSize === size
                        ? 'bg-blue-100 text-blue-600 border border-blue-300'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                    title={`画笔大小: ${size}px`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            贴纸模式：上传人物头像，选择风格与情绪，一键生成个性贴纸。
          </div>
        )}
      </div>
    </div>
  );
};
