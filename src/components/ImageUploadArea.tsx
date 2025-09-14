'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';

interface ImageUploadAreaProps {
  onImageUpload: (file: File) => void;
  onImagesChange?: (images: Array<{id: string; file: File; url: string; name: string; size: number;}>) => void;
  className?: string;
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  onImageUpload,
  onImagesChange,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string;
    file: File;
    url: string;
    name: string;
    size: number;
  }>>([]);

  // 触发文件选择
  const triggerFileUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // 允许多选
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      files.forEach(file => handleFileUpload(file));
    };
    input.click();
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback((file: File) => {
    console.log('ImageUploadArea: 开始处理文件上传:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('ImageUploadArea: 文件读取完成, URL长度:', result.length);
      
      const imageData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        url: result,
        name: file.name,
        size: file.size
      };
      
      setUploadedImages(prev => {
        const newImages = [...prev, imageData];
        console.log('ImageUploadArea: 当前图片列表长度:', newImages.length);
        onImagesChange?.(newImages); // 通知父组件图片列表变化
        return newImages;
      });

      onImageUpload(file);
    };
    
    reader.onerror = (error) => {
      console.error('ImageUploadArea: 文件读取错误:', error);
    };
    
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => handleFileUpload(file));
  }, [handleFileUpload]);

  // 删除图片
  const handleDeleteImage = useCallback((imageId: string) => {
    setUploadedImages(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      onImagesChange?.(newImages); // 通知父组件图片列表变化
      return newImages;
    });
  }, [onImagesChange]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('image-upload-area flex flex-col h-full', className)}>
      
      {/* 上传区域 */}
      <div
        className={cn(
          'upload-dropzone border-2 border-dashed rounded-lg p-6 text-center transition-all mb-4',
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-600 mb-3">
            拖拽图片到此处或点击上传
          </p>
          <Button
            onClick={triggerFileUpload}
            size="sm"
            className="mb-2"
          >
            选择图片
          </Button>
          <p className="text-xs text-gray-500">
            支持 JPG、PNG、GIF 格式
          </p>
        </div>
      </div>

      {/* 图片列表 */}
      <div className="uploaded-images flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            已上传图片 ({uploadedImages.length})
          </h4>
        </div>

        {uploadedImages.length === 0 ? (
          <div className="empty-state text-center py-8">
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-sm text-gray-500">暂无上传的图片</p>
          </div>
        ) : (
          <div className="images-grid grid grid-cols-2 gap-3">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="image-item bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div className="image-preview aspect-square bg-gray-100 relative">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    title="删除图片"
                  >
                    ×
                  </button>
                </div>
                
                <div className="image-info p-2">
                  <p className="text-xs text-gray-600 truncate" title={image.name}>
                    {image.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(image.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};