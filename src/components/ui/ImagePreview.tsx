'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface ImagePreviewProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt,
  isOpen,
  onClose,
  className
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4',
        className
      )}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
    >
      <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="关闭预览"
        >
          <div className="flex items-center gap-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
            <span className="text-lg">✕</span>
            <span className="text-sm">ESC 关闭</span>
          </div>
        </button>

        {/* 图片容器 */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[80vh] object-contain"
            draggable={false}
          />
          
          {/* 图片信息栏 */}
          <div className="px-4 py-3 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <h3 
                id="image-preview-title"
                className="text-sm font-medium text-gray-900 truncate"
              >
                {alt}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = src;
                    link.download = `generated-image-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  💾 下载
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 操作提示 */}
        <div className="text-center text-white text-sm mt-4 opacity-75">
          <p>点击背景或按 ESC 关闭预览</p>
        </div>
      </div>
    </div>
  );
};

// 快捷钩子，方便使用
export const useImagePreview = () => {
  const [previewState, setPreviewState] = React.useState<{
    isOpen: boolean;
    src: string;
    alt: string;
  }>({
    isOpen: false,
    src: '',
    alt: ''
  });

  const openPreview = React.useCallback((src: string, alt: string = '预览图片') => {
    setPreviewState({
      isOpen: true,
      src,
      alt
    });
  }, []);

  const closePreview = React.useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    previewState,
    openPreview,
    closePreview
  };
};