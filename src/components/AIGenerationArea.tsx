'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';
import { useAppStore } from '@/stores/app-store';

interface AIGenerationAreaProps {
  hasCanvasContent: boolean;
  isGenerating: boolean;
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  className?: string;
}

export const AIGenerationArea: React.FC<AIGenerationAreaProps> = ({
  hasCanvasContent,
  isGenerating,
  onStartGeneration,
  onStopGeneration,
  className
}) => {
  const { actions } = useAppStore();
  const [prompt, setPrompt] = useState('将这个手绘草图转换为精美的专业艺术作品，保持原有构图');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([
    {
      id: 'welcome',
      type: 'ai',
      content: '您好！我是您的AI绘画助手。我可以帮您将手绘草图转换为精美的艺术作品，或者根据您的描述生成新的图片。请告诉我您想要创作什么？',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');

  // 发送消息给AI
  const handleSendMessage = useCallback(() => {
    if (!userInput.trim()) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user' as const,
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');

    // 模拟AI回复
    setTimeout(() => {
      const aiReply = {
        id: `ai_${Date.now()}`,
        type: 'ai' as const,
        content: `好的！我理解您想要${userInput}。请在左侧画布上绘制您的想法，或上传相关图片，然后点击"生成图片"按钮，我会为您创作出精美的作品！`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiReply]);
    }, 1000);
  }, [userInput]);

  // 处理生成图片
  const handleGenerateImage = useCallback(async () => {
    if (!hasCanvasContent) {
      actions.showNotification({
        type: 'error',
        message: '请先在画布上绘制内容或上传图片'
      });
      return;
    }

    try {
      onStartGeneration();
      
      // 添加AI消息
      const aiMessage = {
        id: `ai_gen_${Date.now()}`,
        type: 'ai' as const,
        content: '正在为您生成精美的图片，请稍候...',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // 模拟生成过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 生成完成
      const completionMessage = {
        id: `ai_complete_${Date.now()}`,
        type: 'ai' as const,
        content: '🎉 图片生成完成！您可以在画布上查看结果。如果需要调整，请告诉我您的想法。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, completionMessage]);
      
      actions.showNotification({
        type: 'success',
        message: 'AI图片生成完成！'
      });
      
    } catch (error) {
      const errorMessage = {
        id: `ai_error_${Date.now()}`,
        type: 'ai' as const,
        content: '抱歉，生成过程中遇到了问题。请稍后重试。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      actions.showNotification({
        type: 'error',
        message: '生成失败，请重试'
      });
      console.error('AI生成失败:', error);
    } finally {
      onStopGeneration();
    }
  }, [hasCanvasContent, onStartGeneration, onStopGeneration, actions]);

  // 处理Enter键发送
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className={cn('ai-generation-area flex flex-col h-full', className)}>
      
      {/* AI对话区域 */}
      <div className="chat-area flex-1 border border-gray-200 rounded-lg mb-4 flex flex-col">
        
        {/* 消息列表 */}
        <div className="messages flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'message flex',
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'message-bubble max-w-[80%] p-3 rounded-lg',
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 输入区域 */}
        <div className="input-area border-t border-gray-200 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的想法或要求..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              disabled={!userInput.trim() || isGenerating}
            >
              发送
            </Button>
          </div>
        </div>
      </div>

      {/* 提示词输入 */}
      <div className="prompt-section mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          生成提示词
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述您想要生成的图片..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isGenerating}
        />
      </div>

      {/* 生成按钮 */}
      <div className="generation-actions">
        {isGenerating ? (
          <div className="generating-status bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-blue-700 mb-2">AI正在创作中...</p>
            <Button
              onClick={onStopGeneration}
              variant="outline"
              size="sm"
            >
              取消生成
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerateImage}
            size="lg"
            className="w-full"
            disabled={!hasCanvasContent}
          >
            🚀 生成图片
          </Button>
        )}
      </div>

      {/* 功能说明 */}
      <div className="help-info mt-4 text-xs text-gray-500">
        <p>💡 使用提示：</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>在左侧画布绘制或上传图片</li>
          <li>与AI交流描述您的想法</li>
          <li>调整提示词以获得更好效果</li>
        </ul>
      </div>
    </div>
  );
};
