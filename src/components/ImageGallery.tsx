'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from './ui/Button';

interface ImageGalleryProps {
  images: Array<{
    id: string;
    file: File;
    url: string;
    name: string;
    size: number;
  }>;
  onImageDelete?: (id: string) => void;
  onImageSelect?: (image: { id: string; file: File; url: string }) => void;
  onUploadNew?: () => void;
  className?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageDelete,
  onImageSelect,
  onUploadNew,
  className
}) => {
  console.log('ImageGallery 渲染, images长度:', images.length);
  console.log('ImageGallery images:', images);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('image-gallery', className)}>
      <div className="gallery-header flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          上传的图片 ({images.length})
        </h3>
        <Button
          onClick={onUploadNew}
          size="sm"
          className="flex items-center gap-2"
        >
          <span>📁</span>
          上传图片
        </Button>
      </div>

      {images.length === 0 ? (
        <div className="empty-state bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-gray-500 mb-4">暂无上传的图片</p>
          <Button
            onClick={onUploadNew}
            variant="outline"
            size="sm"
          >
            点击上传图片
          </Button>
        </div>
      ) : (
        <div className="gallery-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="image-item bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="image-preview aspect-square bg-gray-100 relative">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onImageSelect?.(image)}
                />
                {onImageDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(image.id);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    title="删除图片"
                  >
                    ×
                  </button>
                )}
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

      {images.length > 0 && (
        <div className="gallery-footer mt-4 text-center">
          <p className="text-sm text-gray-500">
            点击图片添加到画布，点击 × 删除图片
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;