'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

interface CreationChatProps {
  projectId: string;
  isGenerating: boolean;
  creationMessage: string;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// AI的鼓励和建议话术
const AI_RESPONSES = {
  welcome: [
    '✨ 你好！我是你的创作助手。画一些什么，或者告诉我你想创作什么样的作品吧！',
    '🎨 准备好开始创作了吗？无论是简单的涂鸦还是复杂的想法，我都能帮你实现！',
    '🌟 欢迎来到创意世界！让我们一起将你的想象变成现实吧！'
  ],
  
  encouragement: [
    '太棒了！我能感受到你的创意在流淌 ✨',
    '很有趣的想法！让我来为你增添一些魔法 🪄',
    '你的创意让我很兴奋！让我们看看会产生什么奇迹 🎉',
    '绝妙的构思！我迫不及待想要帮你实现了 🚀'
  ],
  
  suggestions: [
    '💡 试试添加一些细节，比如背景环境或者情感表达',
    '🌈 可以考虑调整色彩搭配，让画面更有层次感',
    '✨ 也许加入一些光影效果会让作品更有魅力',
    '🎭 想想这个画面想要传达什么情感或故事'
  ]
};

export const CreationChat: React.FC<CreationChatProps> = ({
  projectId,
  isGenerating,
  creationMessage,
  prompt,
  onPromptChange,
  className
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      type: 'ai',
      content: AI_RESPONSES.welcome[0], // 使用固定的第一条消息避免 hydration 错误
      timestamp: new Date(0) // 使用固定时间戳避免 hydration 错误
    }
  ]);
  
  const [userInput, setUserInput] = useState('');

  // 发送用户消息
  const handleSendMessage = useCallback(() => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');

    // 模拟AI回复
    setTimeout(() => {
      const responses = Math.random() > 0.5 ? AI_RESPONSES.encouragement : AI_RESPONSES.suggestions;
      const aiReply: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiReply]);
    }, 800 + Math.random() * 1200); // 0.8-2秒随机延迟
  }, [userInput]);

  // Enter键发送
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className={cn('creation-chat flex flex-col', className)}>
      
      {/* 对话历史 */}
      <div className="chat-history h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white mb-3">
        <div className="p-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'message flex',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'message-bubble max-w-[85%] p-2 rounded-lg text-sm',
                  message.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {/* 生成状态消息 */}
          {isGenerating && creationMessage && (
            <div className="message flex justify-start">
              <div className="message-bubble bg-green-100 text-green-800 p-2 rounded-lg text-sm rounded-bl-sm">
                {creationMessage}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提示词输入 */}
      <div className="prompt-input mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          创作描述
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="描述你想要的画面效果..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          disabled={isGenerating}
        />
      </div>

      {/* 快速输入区域 */}
      <div className="quick-input">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="有什么想法就告诉我..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isGenerating}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              userInput.trim() && !isGenerating
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            发送
          </button>
        </div>
      </div>

      {/* 快捷建议 */}
      <div className="quick-suggestions mt-2">
        <div className="flex flex-wrap gap-1">
          {['更温馨', '添加细节', '梦幻一些', '色彩丰富'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setUserInput(suggestion)}
              disabled={isGenerating}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};