'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ImageUploadSection } from './ImageUploadSection';
import { StyleSelector } from './StyleSelector';
import { CreationChat } from './CreationChat';
import { GenerateButton } from './GenerateButton';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

interface RightSidebarProps {
  projectId: string;
  hasCanvasContent: boolean;
  isGenerating: boolean;
  creationMessage: string;
  onImageUpload: (file: File) => void;
  onUploadedImagesChange?: (images: UploadedImage[]) => void;
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  className?: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  projectId,
  hasCanvasContent,
  isGenerating,
  creationMessage,
  onImageUpload,
  onUploadedImagesChange,
  onStartGeneration,
  onStopGeneration,
  className
}) => {
  const [selectedStyle, setSelectedStyle] = useState<string>('dreamy');
  const [prompt, setPrompt] = useState('将这个手绘草图转换为精美的专业艺术作品');
  
  return (
    <div className={cn(
      'right-sidebar bg-gray-50 border-l border-gray-200 flex flex-col',
      'w-full h-full',
      className
    )}>
      
      {/* 顶部：项目信息 */}
      <div className="sidebar-header p-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-1">创作助手</h2>
        <p className="text-sm text-gray-600">让我帮你实现创意想法</p>
      </div>

      {/* 主要内容区域 - 滚动 */}
      <div className="sidebar-content flex-1 overflow-y-auto">
        
        {/* 1. 图片上传区域 */}
        <div className="section p-4 border-b border-gray-200 bg-white">
          <h3 className="section-title text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
            📁 图片上传
          </h3>
          <ImageUploadSection 
            onImageUpload={onImageUpload}
            onImagesChange={onUploadedImagesChange}
            maxImages={5}
          />
        </div>

        {/* 2. 风格选择区域 */}
        <div className="section p-4 border-b border-gray-200 bg-white">
          <h3 className="section-title text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
            🎨 风格选择
          </h3>
          <StyleSelector
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
          />
        </div>

        {/* 3. AI对话区域 */}
        <div className="section p-4 border-b border-gray-200 bg-white">
          <h3 className="section-title text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
            💬 创作对话
          </h3>
          <CreationChat
            projectId={projectId}
            isGenerating={isGenerating}
            creationMessage={creationMessage}
            prompt={prompt}
            onPromptChange={setPrompt}
          />
        </div>
      </div>

      {/* 底部：生成控制 */}
      <div className="sidebar-footer p-4 bg-white border-t border-gray-200">
        <GenerateButton
          hasCanvasContent={hasCanvasContent}
          isGenerating={isGenerating}
          creationMessage={creationMessage}
          onStartGeneration={onStartGeneration}
          onStopGeneration={onStopGeneration}
        />
      </div>
    </div>
  );
};