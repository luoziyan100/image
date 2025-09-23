'use client';

import React, { useState, useCallback, useRef } from 'react';
import { MainCanvasArea } from './MainCanvasArea';
import { RightSidebar } from './RightSidebar';
import { AIGenerationDemo } from './AIGenerationDemo';
import { GenerationStatusPanel } from './GenerationStatusPanel';
import { StickerStudio } from './StickerStudio';
import { useAppStore } from '@/stores/app-store';

export const CreationWorkspace: React.FC = () => {
  const {
    currentProject,
    canvasState,
    generationState,
    uiState,
    actions
  } = useAppStore();
  const isStickerWorkspace = uiState.activeWorkspace === 'sticker';

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
  const [lastAssetId, setLastAssetId] = useState<string | null>(null);

  // Canvas引用，用于调用canvas方法（始终定义，避免 hook 顺序差异）
  const canvasRef = useRef<{
    loadImage: (imageUrl: string) => void;
    exportPoseImage: () => string | null;
    exportMaskImage: () => string | null;
  }>(null);

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

  // 处理加载图片到画布
  const handleLoadImageToCanvas = useCallback((imageUrl: string) => {
    canvasRef.current?.loadImage(imageUrl);
    // 显示通知
    actions.showNotification({
      type: 'info',
      message: '图片已加载到画布，您现在可以开始编辑了！',
      autoHide: true,
    });
  }, [actions]);

  // 提供给子组件的导出工具
  const getPoseImage = useCallback(() => {
    return canvasRef.current?.exportPoseImage() || null;
  }, []);
  const getMaskImage = useCallback(() => {
    return canvasRef.current?.exportMaskImage() || null;
  }, []);

  // 开始生成 - 情感化的创作体验
  const handleStartGeneration = useCallback(async () => {
    // 画布是唯一的数据源 - 如果为空，用温暖的话语引导
    if (!canvasImageData) {
      actions.showNotification({
        type: 'info',
        message: '画布还是空白的呢 🎨 请先画点什么或者加载一张图片，让我们开始创作吧！',
        autoHide: true
      });
      return;
    }

    if (!currentProject) {
      actions.showNotification({
        type: 'info',
        message: '请先选择或创建一个项目，再开始创作哦！',
        autoHide: true
      });
      return;
    }

    actions.setGenerating(true);
    
    // 情感化的等待体验 - 3个阶段
    const emotionalMessages = [
      '😊 我正在理解你的创意...',
      '✨ 让我为你添加一些魔法...',
      '🎨 快要变成现实了，再等一下下...'
    ];
    
    let messageIndex = 0;
    setCreationMessage(emotionalMessages[0]);
    
    // 模拟情感化的进度体验
    const progressInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % emotionalMessages.length;
      setCreationMessage(emotionalMessages[messageIndex]);
    }, 8000); // 每8秒换一个温暖的提示

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          imageData: canvasImageData, 
          prompt: '将这个充满创意的作品转换为精美的艺术画作，保持原有的魅力和构图',
          // 传递用户的创作风格偏好
          metadata: {
            userExperience: 'emotional_first', // 情感体验优先
            expectation: 'magical_surprise',   // 期待魔法般的惊喜
            creationType: 'story_art'          // 故事艺术而非技术展示
          }
        })
      });

      const result = await response.json();
      clearInterval(progressInterval);

      if (result.success) {
        // 保存服务端队列的标识，供状态面板轮询
        setLastAssetId(result?.data?.assetId || null);
        // 成功的仪式感
        setCreationMessage('🎉 完成！看看这个神奇的变化！');
        actions.showNotification({
          type: 'success',
          message: '🌟 恭喜！你创作了一个新世界！分享给朋友们看看吧',
          autoHide: true
        });

        // 给用户足够时间欣赏成果
        setTimeout(() => {
          actions.setGenerating(false);
          setCreationMessage('');
        }, 3000);
        
      } else {
        throw new Error(result.message || '生成遇到了小问题');
      }

    } catch (error) {
      clearInterval(progressInterval);
      console.error('生成请求失败:', error);
      
      // 失败时的惊喜和安慰
      const encouragements = [
        '这次有点小意外，但我学到了新东西！🌱',
        '让我们换个角度试试，可能会有意想不到的效果 ✨',
        '创作路上总有惊喜，再试一次吧 🎨'
      ];
      
      const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
      
      actions.showNotification({
        type: 'info',
        message: randomEncouragement,
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
  if (isStickerWorkspace) {
    return <StickerStudio />;
  }

  if (!currentProject) {
    return null;
  }

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
        
        {/* 合并侧边栏布局：主画布 + 统一侧栏 */}
        <div className="workspace-grid grid grid-cols-12 gap-3 min-h-[600px]">
          
          {/* 主画布区域 (50% 宽度) */}
          <div className="canvas-area col-span-7">
            <MainCanvasArea
              ref={canvasRef}
              activeTool={canvasState.activeTool}
              brushColor={canvasState.brushColor}
              brushSize={canvasState.brushSize}
              onCanvasChange={handleCanvasChange}
              onImageUpload={handleImageUpload}
              isGenerating={generationState.isGenerating}
            />
          </div>

          {/* 统一侧栏 (50% 宽度)：先显示素材上传，再显示AI生成测试 */}
          <div className="sidebar-area col-span-5 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
            <RightSidebar
              hasCanvasContent={hasCanvasContent}
              isGenerating={generationState.isGenerating}
              creationMessage={creationMessage}
              onImageUpload={handleImageUpload}
              onUploadedImagesChange={handleUploadedImagesChange}
              onLoadImageToCanvas={handleLoadImageToCanvas}
              onStartGeneration={handleStartGeneration}
              onStopGeneration={handleStopGeneration}
              hideGenerateButton
            />
            <AIGenerationDemo 
              canvasImageData={canvasImageData}
              hasCanvasContent={hasCanvasContent}
              uploadedImages={uploadedImages}
              getPoseImage={getPoseImage}
              getMaskImage={getMaskImage}
            />
            <GenerationStatusPanel assetId={lastAssetId} />
          </div>
        </div>
      </div>
    </div>
  );
};
