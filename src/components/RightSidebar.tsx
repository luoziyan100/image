'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ImageUploadSection } from './ImageUploadSection';
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
  onLoadImageToCanvas?: (imageUrl: string) => void;
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  className?: string;
  hideGenerateButton?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  projectId,
  hasCanvasContent,
  isGenerating,
  creationMessage,
  onImageUpload,
  onUploadedImagesChange,
  onLoadImageToCanvas,
  onStartGeneration,
  onStopGeneration,
  className,
  hideGenerateButton = false
}) => {
  const [prompt, setPrompt] = useState('将这个手绘草图转换为精美的专业艺术作品');
  const [folded, setFolded] = useState<boolean>(true);
  
  return (
    <div className={cn(
      'right-sidebar bg-white border border-gray-200 rounded-lg flex flex-col',
      'w-full',
      className
    )}>
      
      {/* 顶部：温暖的欢迎 */}
      <div className="sidebar-header p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800 mb-1">✨ 创作伙伴</h2>
        <p className="text-sm text-gray-600">让我们一起创造美好的故事</p>
      </div>

      {/* 主要内容区域 - 极简设计 */}
      <div className="sidebar-content flex-1 overflow-y-auto">
        
        {/* 1. 图片素材区域 */}
        <div className="section p-4 border-b border-gray-200 bg-white">
          <h3 className="section-title text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
            🖼️ 添加素材
          </h3>
          <p className="text-xs text-gray-500 mb-3">上传图片到画布上进行创作</p>
          <ImageUploadSection 
            onImageUpload={onImageUpload}
            onImagesChange={onUploadedImagesChange}
            onLoadToCanvas={onLoadImageToCanvas}
            maxImages={3}
          />
        </div>

        {/* 2.（移除风格模块） */}

        {/* 3. 创作灵感（默认折叠） */}
        <div className="section p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="section-title text-sm font-medium text-gray-800 flex items-center gap-2">
              💭 创作灵感
            </h3>
            <button
              onClick={() => setFolded(prev => !prev)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              {folded ? '展开' : '收起'}
            </button>
          </div>
          {folded ? (
            <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              准备好了吗？画点什么，让魔法开始吧！
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  {isGenerating 
                    ? creationMessage || '正在为你创作...'
                    : '准备好了吗？画点什么，让魔法开始吧！'
                  }
                </p>
              </div>
              {!isGenerating && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 小贴士：</p>
                  <p>• 简单的线条也能创造奇迹</p>
                  <p>• 上传照片可以在上面涂鸦</p>
                  <p>• 每次生成都是独特的惊喜</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部：生成控制（可隐藏） */}
      {!hideGenerateButton && (
        <div className="sidebar-footer p-4 bg-white border-t border-gray-200">
          <GenerateButton
            hasCanvasContent={hasCanvasContent}
            isGenerating={isGenerating}
            creationMessage={creationMessage}
            onStartGeneration={onStartGeneration}
            onStopGeneration={onStopGeneration}
          />
        </div>
      )}
    </div>
  );
};
