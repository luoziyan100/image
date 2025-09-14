'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';

export type Tool = 'draw' | 'erase' | 'upload' | 'select';
export type Mode = 'single' | 'comic';

interface TopToolbarProps {
  // 模式和工具
  activeMode: Mode;
  activeTool: Tool;
  onModeChange: (mode: Mode) => void;
  onToolChange: (tool: Tool) => void;
  
  // 画笔属性
  brushColor: string;
  brushSize: number;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  
  // 操作
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
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
  activeMode,
  activeTool,
  onModeChange,
  onToolChange,
  brushColor,
  brushSize,
  onColorChange,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  className
}) => {
  return (
    <div className={cn(
      'top-toolbar bg-white border-b border-gray-200 px-6 py-3',
      'flex items-center justify-between',
      className
    )}>
      
      {/* 左侧：模式选择 */}
      <div className="toolbar-section flex items-center gap-4">
        <div className="mode-selector flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">模式:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => onModeChange('single')}
              className={cn(
                'px-3 py-1 text-sm transition-colors',
                activeMode === 'single'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              🖼️ 单图
            </button>
            <button
              onClick={() => onModeChange('comic')}
              className={cn(
                'px-3 py-1 text-sm transition-colors border-l border-gray-300',
                activeMode === 'comic'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              📚 连环画
            </button>
          </div>
        </div>
      </div>

      {/* 中间：绘制工具 */}
      <div className="toolbar-section flex items-center gap-6">
        
        {/* 工具选择 */}
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

        {/* 颜色选择器 */}
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

        {/* 画笔大小 */}
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
      </div>

      {/* 右侧：操作按钮 */}
      <div className="toolbar-section flex items-center gap-2">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          size="sm"
          variant="outline"
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </Button>
        
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          size="sm"
          variant="outline"
          title="重做 (Ctrl+Y)"
        >
          ↷ 重做
        </Button>
        
        <Button
          onClick={onClear}
          size="sm"
          variant="outline"
          title="清空画布"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          🗑️ 清空
        </Button>
      </div>
    </div>
  );
};