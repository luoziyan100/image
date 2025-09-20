'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface ToolbarProps {
  activeMode: 'single_image' | 'comic_strip';
  activeTool: 'draw' | 'erase' | 'upload' | 'select';
  brushColor: string;
  brushSize: number;
  onModeChange: (mode: 'single_image' | 'comic_strip') => void;
  onToolChange: (tool: 'draw' | 'erase' | 'upload' | 'select') => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({
  activeMode,
  activeTool,
  brushColor,
  brushSize,
  onModeChange,
  onToolChange,
  onColorChange,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}: ToolbarProps) {
  const commonColors = [
    '#000000', '#FFFFFF', '#EF4444', '#F59E0B', 
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
  ];
  
  const brushSizes = [2, 5, 10, 15, 20, 30];
  
  return (
    <div className="toolbar-container bg-white border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        {/* 模式切换区 */}
        <div className="mode-section flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">模式:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => onModeChange('single_image')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                activeMode === 'single_image'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              🎯 单图
            </button>
            <button
              onClick={() => onModeChange('comic_strip')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300',
                activeMode === 'comic_strip'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              📚 连环画
            </button>
          </div>
        </div>
        
        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-300" />
        
        {/* 绘图工具区 */}
        <div className="tools-section flex items-center gap-2">
          <ToolButton
            icon="✏️"
            label="绘制"
            active={activeTool === 'draw'}
            onClick={() => onToolChange('draw')}
          />
          
          <ToolButton
            icon="🧽"
            label="擦除"
            active={activeTool === 'erase'}
            onClick={() => onToolChange('erase')}
          />
          
          <ToolButton
            icon="👆"
            label="选择"
            active={activeTool === 'select'}
            onClick={() => onToolChange('select')}
          />
          
          <ToolButton
            icon="📷"
            label="上传"
            active={activeTool === 'upload'}
            onClick={() => onToolChange('upload')}
          />
        </div>
        
        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-300" />
        
        {/* 颜色选择器 */}
        <div className="color-section flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">颜色:</span>
          <div className="flex items-center gap-1">
            {commonColors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={cn(
                  'w-6 h-6 rounded border-2 transition-all',
                  brushColor === color
                    ? 'border-indigo-500 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            
            {/* 自定义颜色选择器 */}
            <div className="relative ml-2">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                title="选择自定义颜色"
              />
            </div>
          </div>
        </div>
        
        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-300" />
        
        {/* 画笔大小 */}
        <div className="brush-size-section flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">大小:</span>
          <div className="flex items-center gap-1">
            {brushSizes.map(size => (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                className={cn(
                  'px-2 py-1 text-xs rounded border transition-colors',
                  brushSize === size
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
        
        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-300" />
        
        {/* 编辑操作区 */}
        <div className="edit-section flex items-center gap-2">
          <ToolButton
            icon="🔄"
            label="撤销"
            disabled={!canUndo}
            onClick={onUndo}
          />
          
          <ToolButton
            icon="↩️"
            label="重做"
            disabled={!canRedo}
            onClick={onRedo}
          />
          
          <ToolButton
            icon="🗑️"
            label="清空"
            onClick={onClear}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

function ToolButton({ 
  icon, 
  label, 
  active = false, 
  disabled = false, 
  variant = 'default',
  onClick 
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
        'hover:bg-gray-50 active:scale-95',
        active && 'bg-indigo-100 text-indigo-700 border border-indigo-300',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        variant === 'danger' && 'hover:bg-red-50 hover:text-red-700'
      )}
      title={label}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
