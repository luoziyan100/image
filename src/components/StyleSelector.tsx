'use client';

import React from 'react';
import { cn } from '@/utils/cn';

// 风格DNA定义
export interface StyleDNA {
  id: string;
  name: string;
  description: string;
  emoji: string;
  
  // 核心风格基因
  colorTone: 'warm' | 'cool' | 'contrast';
  brushStyle: 'delicate' | 'bold' | 'impressionist';
  composition: 'symmetric' | 'dynamic' | 'minimal';
  mood: 'cozy' | 'mysterious' | 'energetic';
  
  // AI提示词模板
  promptTemplate: string;
  
  // 预览色彩
  previewColors: string[];
}

// 预设风格库
const PRESET_STYLES: StyleDNA[] = [
  {
    id: 'dreamy',
    name: '梦幻童话',
    description: '温暖柔和，如童话世界般美好',
    emoji: '🌙',
    colorTone: 'warm',
    brushStyle: 'delicate',
    composition: 'symmetric',
    mood: 'cozy',
    promptTemplate: 'dreamy fairy tale style, soft warm colors, delicate brushstrokes, magical atmosphere',
    previewColors: ['#FFB6C1', '#DDA0DD', '#F0E68C', '#98FB98']
  },
  
  {
    id: 'vibrant',
    name: '活力四射',
    description: '鲜艳对比，充满生命力',
    emoji: '⚡',
    colorTone: 'contrast',
    brushStyle: 'bold',
    composition: 'dynamic',
    mood: 'energetic',
    promptTemplate: 'vibrant energetic style, bold contrasting colors, dynamic composition, lively atmosphere',
    previewColors: ['#FF4500', '#00CED1', '#FFD700', '#FF1493']
  },
  
  {
    id: 'mysterious',
    name: '神秘幽雅',
    description: '深邃冷调，充满神秘感',
    emoji: '🔮',
    colorTone: 'cool',
    brushStyle: 'impressionist',
    composition: 'minimal',
    mood: 'mysterious',
    promptTemplate: 'mysterious elegant style, cool deep colors, impressionist brushwork, minimal composition',
    previewColors: ['#483D8B', '#2F4F4F', '#8B4513', '#4B0082']
  },
  
  {
    id: 'gentle',
    name: '温柔日系',
    description: '清新淡雅，温柔治愈',
    emoji: '🌸',
    colorTone: 'warm',
    brushStyle: 'delicate',
    composition: 'minimal',
    mood: 'cozy',
    promptTemplate: 'gentle Japanese style, soft pastel colors, delicate details, clean minimal composition',
    previewColors: ['#FFE4E1', '#F5DEB3', '#E6E6FA', '#F0FFF0']
  },
  
  {
    id: 'bold_modern',
    name: '现代简约',
    description: '几何线条，现代感强烈',
    emoji: '📐',
    colorTone: 'contrast',
    brushStyle: 'bold',
    composition: 'symmetric',
    mood: 'energetic',
    promptTemplate: 'bold modern style, geometric shapes, strong lines, minimalist design, contemporary',
    previewColors: ['#000000', '#FFFFFF', '#FF0000', '#0066CC']
  }
];

interface StyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  className?: string;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onStyleChange,
  className
}) => {
  const currentStyle = PRESET_STYLES.find(style => style.id === selectedStyle) || PRESET_STYLES[0];
  
  return (
    <div className={cn('style-selector', className)}>
      
      {/* 当前选择的风格预览 */}
      <div className="current-style mb-3 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentStyle.emoji}</span>
            <span className="font-medium text-gray-800">{currentStyle.name}</span>
          </div>
          <div className="flex gap-1">
            {currentStyle.previewColors.map((color, index) => (
              <div
                key={index}
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600">{currentStyle.description}</p>
      </div>

      {/* 风格选择网格 */}
      <div className="styles-grid grid grid-cols-1 gap-2">
        {PRESET_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onStyleChange(style.id)}
            className={cn(
              'style-option text-left p-3 rounded-lg border transition-all',
              'hover:shadow-sm',
              selectedStyle === style.id
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{style.emoji}</span>
                <div>
                  <div className="font-medium text-gray-800 text-sm">
                    {style.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {style.description}
                  </div>
                </div>
              </div>
              
              {/* 风格预览色块 */}
              <div className="flex gap-1">
                {style.previewColors.slice(0, 3).map((color, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 风格说明 */}
      <div className="style-info mt-3 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-700 mb-1">
          <strong>当前风格特征：</strong>
        </div>
        <div className="text-xs text-blue-600 space-y-1">
          <div>🎨 色调：{
            currentStyle.colorTone === 'warm' ? '温暖色调' : 
            currentStyle.colorTone === 'cool' ? '冷色调' : '高对比'
          }</div>
          <div>🖌️ 笔触：{
            currentStyle.brushStyle === 'delicate' ? '细腻' :
            currentStyle.brushStyle === 'bold' ? '大胆' : '印象派'
          }</div>
          <div>📐 构图：{
            currentStyle.composition === 'symmetric' ? '对称平衡' :
            currentStyle.composition === 'dynamic' ? '动态活泼' : '极简留白'
          }</div>
          <div>💫 氛围：{
            currentStyle.mood === 'cozy' ? '温馨舒适' :
            currentStyle.mood === 'mysterious' ? '神秘深邃' : '充满活力'
          }</div>
        </div>
      </div>
    </div>
  );
};

// 导出风格数据，供其他组件使用
export { PRESET_STYLES };