'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';

interface GenerateButtonProps {
  hasCanvasContent: boolean;
  isGenerating: boolean;
  creationMessage: string;
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  className?: string;
}

// 情感化的状态消息
const EMOTIONAL_MESSAGES = {
  idle: {
    button: '🚀 开始创作',
    description: '准备将你的想法变成现实'
  },
  creating: {
    button: '✨ 创作中...',
    description: '正在为你编织魔法'
  },
  almost_done: {
    button: '⏳ 快完成了...',
    description: '惊喜即将揭晓'
  },
  completed: {
    button: '🎉 创作完成！',
    description: '你的杰作诞生了'
  }
};

// 鼓励性的等待文案
const WAITING_MESSAGES = [
  '✨ 正在为你创作魔法...',
  '🎨 AI画师正在认真工作...',
  '🌟 好作品值得等待...',
  '🔮 奇迹正在发生...',
  '🎭 艺术正在诞生...'
];

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  hasCanvasContent,
  isGenerating,
  creationMessage,
  onStartGeneration,
  onStopGeneration,
  className
}) => {
  
  // 根据创作消息判断当前状态
  const getCurrentState = () => {
    if (!isGenerating) return 'idle';
    if (creationMessage.includes('快完成了') || creationMessage.includes('almost')) return 'almost_done';
    if (creationMessage.includes('完成') || creationMessage.includes('完成！')) return 'completed';
    return 'creating';
  };

  const currentState = getCurrentState();
  const stateConfig = EMOTIONAL_MESSAGES[currentState];

  return (
    <div className={cn('generate-button-area', className)}>
      
      {/* 生成状态显示 */}
      {isGenerating ? (
        <div className="generating-status bg-blue-50 border border-blue-200 rounded-lg p-4 text-center mb-3">
          
          {/* 动态加载动画 */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              {/* 主要加载动画 */}
              <div className="animate-spin w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full"></div>
              
              {/* 内部脉动动画 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* 情感化消息 */}
          <div className="text-blue-700 mb-2 font-medium">
            {creationMessage || WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)]}
          </div>
          
          <div className="text-sm text-blue-600 mb-3">
            {stateConfig.description}
          </div>

          {/* 进度提示 */}
          <div className="progress-hints text-xs text-blue-500 space-y-1 mb-3">
            {currentState === 'creating' && (
              <div>💫 AI正在理解你的创意...</div>
            )}
            {currentState === 'almost_done' && (
              <div>🎨 正在添加最后的细节...</div>
            )}
          </div>

          {/* 取消按钮 */}
          <Button
            onClick={onStopGeneration}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-600 hover:bg-blue-100"
          >
            暂停创作
          </Button>
        </div>
      ) : (
        
        /* 正常生成按钮 */
        <div className="generate-action">
          
          {/* 主生成按钮 */}
          <Button
            onClick={onStartGeneration}
            disabled={!hasCanvasContent}
            size="lg"
            className={cn(
              'w-full mb-3 h-12 text-base font-medium',
              hasCanvasContent 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {hasCanvasContent ? (
              <span className="flex items-center justify-center gap-2">
                {stateConfig.button}
              </span>
            ) : (
              '请先在画布上绘制内容'
            )}
          </Button>

          {/* 状态描述 */}
          {hasCanvasContent ? (
            <div className="text-center text-sm text-gray-600 mb-2">
              {stateConfig.description}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 mb-2">
              在左侧画布上画一些东西，或上传图片开始创作
            </div>
          )}

          {/* 创作鼓励 */}
          {hasCanvasContent && (
            <div className="encouragement bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-sm text-green-700 mb-1">
                <strong>💡 创作小贴士：</strong>
              </div>
              <div className="text-xs text-green-600">
                每一次创作都是独一无二的艺术体验，放松心情，让创意自然流淌！
              </div>
            </div>
          )}
        </div>
      )}

      {/* 预期时间提示 */}
      {!isGenerating && hasCanvasContent && (
        <div className="time-estimate text-xs text-gray-400 text-center mt-2">
          ⏱️ 预计创作时间：15-30秒
        </div>
      )}
    </div>
  );
};