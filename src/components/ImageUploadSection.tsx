'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

interface ImageUploadSectionProps {
  onImageUpload: (file: File) => void;
  onImagesChange?: (images: UploadedImage[]) => void;
  onLoadToCanvas?: (imageUrl: string) => void;
  maxImages?: number;
  className?: string;
}

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  onImageUpload,
  onImagesChange,
  onLoadToCanvas,
  maxImages = 5,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // 触发文件选择
  const triggerFileUpload = useCallback(() => {
    if (uploadedImages.length >= maxImages) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const remainingSlots = maxImages - uploadedImages.length;
      const filesToUpload = files.slice(0, remainingSlots);
      filesToUpload.forEach(file => handleFileUpload(file));
    };
    input.click();
  }, [uploadedImages.length, maxImages]);

  // 处理文件上传
  const handleFileUpload = useCallback((file: File) => {
    if (uploadedImages.length >= maxImages) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const imageData: UploadedImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        url: result,
        name: file.name,
        size: file.size
      };
      
      setUploadedImages(prev => {
        const newImages = [...prev, imageData];
        onImagesChange?.(newImages); // 通知父组件图片列表变化
        return newImages;
      });
      onImageUpload(file);
    };
    reader.readAsDataURL(file);
  }, [uploadedImages.length, maxImages, onImageUpload, onImagesChange]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadedImages.length < maxImages) {
      setIsDragOver(true);
    }
  }, [uploadedImages.length, maxImages]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (uploadedImages.length >= maxImages) return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const remainingSlots = maxImages - uploadedImages.length;
    const filesToUpload = imageFiles.slice(0, remainingSlots);
    
    filesToUpload.forEach(file => handleFileUpload(file));
  }, [handleFileUpload, uploadedImages.length, maxImages]);

  // 删除图片
  const handleDeleteImage = useCallback((imageId: string) => {
    setUploadedImages(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      onImagesChange?.(newImages); // 通知父组件图片列表变化
      return newImages;
    });
  }, [onImagesChange]);

  // 上移/下移
  const moveImage = useCallback((imageId: string, direction: 'up' | 'down') => {
    setUploadedImages(prev => {
      const idx = prev.findIndex(i => i.id === imageId);
      if (idx === -1) return prev;
      const newArr = [...prev];
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= newArr.length) return prev;
      [newArr[idx], newArr[swapWith]] = [newArr[swapWith], newArr[idx]];
      onImagesChange?.(newArr);
      return newArr;
    });
  }, [onImagesChange]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  const canUpload = uploadedImages.length < maxImages;

  return (
    <div className={cn('image-upload-section', className)}>
      
      {/* 上传区域 */}
      <div
        className={cn(
          'upload-area border-2 border-dashed rounded-lg p-4 text-center transition-all',
          isDragOver && canUpload
            ? 'border-blue-400 bg-blue-50'
            : canUpload
            ? 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'
            : 'border-gray-200 bg-gray-100 opacity-60'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={canUpload ? triggerFileUpload : undefined}
      >
        {canUpload ? (
          <div>
            <div className="text-2xl mb-2">📁</div>
            <div className="text-sm text-gray-600 mb-1">
              {isDragOver ? '放开来上传图片' : '点击或拖拽上传图片'}
            </div>
            <div className="text-xs text-gray-500">
              支持 JPG、PNG、GIF ({uploadedImages.length}/{maxImages})
            </div>
          </div>
        ) : (
          <div>
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm text-gray-500">
              已达到上传上限 ({maxImages}张)
            </div>
          </div>
        )}
      </div>

      {/* 已上传图片列表 */}
      {uploadedImages.length > 0 && (
        <div className="uploaded-images mt-3">
          <div className="text-xs font-medium text-gray-700 mb-2">
            已上传 {uploadedImages.length} 张图片
          </div>
          
          <div className="images-list space-y-2 max-h-40 overflow-y-auto">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="image-item flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                {/* 缩略图 */}
                <div className="image-thumbnail w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* 文件信息 */}
                <div className="image-info flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {image.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(image.size)}
                  </div>
                </div>
                
                {/* 编辑画布按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadToCanvas?.(image.url);
                  }}
                  className="edit-btn w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center text-xs transition-colors"
                  title="在画布上编辑"
                >
                  ✏️
                </button>

                {/* 上下移动 */}
                <button
                  onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'up'); }}
                  className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-xs"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'down'); }}
                  className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-xs"
                  title="下移"
                >
                  ↓
                </button>
                
                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image.id);
                  }}
                  className="delete-btn w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-xs transition-colors"
                  title="删除图片"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {uploadedImages.length === 0 && (
        <div className="upload-tips mt-3 text-xs text-gray-500">
          💡 <strong>提示：</strong>上传的图片会作为创作参考，与你的手绘草图一起生成最终作品
        </div>
      )}
    </div>
  );
};
