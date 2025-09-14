'use client';

import React, { useState, useCallback } from 'react';
import { MainCanvasArea } from './MainCanvasArea';
import { RightSidebar } from './RightSidebar';
import { AIGenerationDemo } from './AIGenerationDemo';
import { useAppStore } from '@/stores/app-store';

export const CreationWorkspace: React.FC = () => {
  const {
    currentProject,
    canvasState,
    generationState,
    actions
  } = useAppStore();

  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const [creationMessage, setCreationMessage] = useState('');
  const [canvasImageData, setCanvasImageData] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string;
    file: File;
    url: string;
    name: string;
    size: number;
  }>>([]);

  // 处理画布变化 - 使用ref避免闭包问题
  const handleCanvasChange = useCallback((hasChanges: boolean, imageData?: string) => {
    console.log('🏠 工作区 - Canvas变化:', {
      hasChanges,
      imageDataExists: !!imageData,
      imageDataLength: imageData?.length || 0
    });
    
    // 简化逻辑：直接根据参数决定行为
    setHasCanvasContent(hasChanges);
    
    if (hasChanges) {
      actions.markCanvasChanged();
      
      // 如果有图片数据就使用，没有则保持当前状态
      if (imageData && imageData.length > 0) {
        console.log('✅ 工作区 - 设置画布图片数据，长度:', imageData.length);
        setCanvasImageData(imageData);
      } else {
        console.log('⚠️ 工作区 - 有变化但无imageData，保持现状');
      }
    } else {
      // 画布为空，清空数据
      console.log('❌ 工作区 - 画布为空，清空数据');
      setCanvasImageData(null);
    }
  }, [actions]);

  // 处理图片上传
  const handleImageUpload = useCallback((file: File) => {
    actions.showNotification({
      type: 'success',
      message: `已上传图片: ${file.name}`,
      autoHide: true
    });
  }, [actions]);

  // 处理上传图片列表变化
  const handleUploadedImagesChange = useCallback((images: Array<{
    id: string;
    file: File;
    url: string;
    name: string;
    size: number;
  }>) => {
    console.log('工作区 - 上传图片列表变化:', images.length);
    // 使用 setTimeout 来避免在渲染期间更新状态
    setTimeout(() => {
      setUploadedImages(images);
    }, 0);
  }, []);

  // 开始生成 - 实际调用API
  const handleStartGeneration = useCallback(async () => {
    if (!canvasImageData) {
      actions.showNotification({
        type: 'error',
        message: '请先在画布上绘制内容',
        autoHide: true
      });
      return;
    }

    actions.setGenerating(true);
    setCreationMessage('✨ 正在准备发送到AI...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          imageData: canvasImageData, // 按照文档要求使用imageData
          prompt: '将这个手绘草图转换为精美的专业艺术作品，保持原有构图'
        })
      });

      const result = await response.json();

      if (result.success) {
        setCreationMessage('🎉 生成任务已提交！');
        actions.showNotification({
          type: 'success',
          message: `任务已启动，预计${Math.round(result.data.estimatedTimeMs / 1000)}秒完成`,
          autoHide: true
        });

        // TODO: 实现轮询检查任务状态
        setTimeout(() => {
          actions.setGenerating(false);
          setCreationMessage('');
        }, result.data.estimatedTimeMs || 30000);
        
      } else {
        throw new Error(result.message || '生成失败');
      }

    } catch (error) {
      console.error('生成请求失败:', error);
      actions.showNotification({
        type: 'error',
        message: `生成失败: ${error.message}`,
        autoHide: true
      });
      actions.setGenerating(false);
      setCreationMessage('');
    }
  }, [canvasImageData, currentProject, actions]);

  // 停止生成
  const handleStopGeneration = useCallback(() => {
    actions.setGenerating(false);
    setCreationMessage('');
    actions.showNotification({
      type: 'info',
      message: '创作已暂停，随时可以重新开始',
      autoHide: true
    });
  }, [actions]);

  // 现在应该总是有默认项目，但保留安全检查
  if (!currentProject) {
    return (
      <div className="creation-workspace bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500">初始化项目中...</div>
      </div>
    );
  }

  return (
    <div className="creation-workspace bg-gray-50 min-h-screen">
      <div className="workspace-container max-w-7xl mx-auto px-4 py-2">
        
        {/* 新布局：主画布 + 右侧边栏 + AI演示 */}
        <div className="workspace-grid grid grid-cols-12 gap-3 min-h-[600px]">
          
          {/* 主画布区域 (50% 宽度) */}
          <div className="canvas-area col-span-6">
            <MainCanvasArea
              projectId={currentProject.id}
              activeTool={canvasState.activeTool}
              brushColor={canvasState.brushColor}
              brushSize={canvasState.brushSize}
              onCanvasChange={handleCanvasChange}
              onImageUpload={handleImageUpload}
              isGenerating={generationState.isGenerating}
            />
          </div>

          {/* AI生成演示区域 (25% 宽度) */}
          <div className="ai-demo-area col-span-3">
            <AIGenerationDemo 
              canvasImageData={canvasImageData}
              hasCanvasContent={hasCanvasContent}
              uploadedImages={uploadedImages}
            />
          </div>

          {/* 右侧边栏 (25% 宽度) */}
          <div className="sidebar-area col-span-3">
            <RightSidebar
              projectId={currentProject.id}
              hasCanvasContent={hasCanvasContent}
              isGenerating={generationState.isGenerating}
              creationMessage={creationMessage}
              onImageUpload={handleImageUpload}
              onUploadedImagesChange={handleUploadedImagesChange}
              onStartGeneration={handleStartGeneration}
              onStopGeneration={handleStopGeneration}
            />
          </div>
        </div>
      </div>
    </div>
  );
};