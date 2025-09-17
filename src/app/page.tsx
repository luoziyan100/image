'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { TopToolbar } from '@/components/TopToolbar';
import { CreationWorkspace } from '@/components/CreationWorkspace';
import { ProjectGallery } from '@/components/ProjectGallery';
import { GenerationProgress } from '@/components/GenerationProgress';
import { useAppStore } from '@/stores/app-store';
import type { Project } from '@/types';

export default function CreationPage() {
  const { 
    currentProject, 
    canvasState, 
    generationState,
    actions 
  } = useAppStore();

  const [showProjectGallery, setShowProjectGallery] = useState(false);

  // 自动创建一个默认项目
  useEffect(() => {
    if (!currentProject) {
      const defaultProject = {
        id: 'default-project-' + Date.now(),
        title: '我的创意故事',
        description: '✨ 每个人都能成为故事创作者，让我们开始这段魔法之旅吧！',
        type: 'single_image' as const,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      actions.setCurrentProject(defaultProject);
      actions.setProjectsList([defaultProject]);
    }
  }, [currentProject, actions]);

  // 处理项目选择
  const handleProjectSelect = (project: Project) => {
    actions.setCurrentProject(project);
    setShowProjectGallery(false);
  };

  return (
    <AppLayout>
      <div className="creation-page flex flex-col min-h-screen">
        {/* 顶部工具栏 */}
        <TopToolbar 
          activeMode={currentProject?.type === 'single_image' ? 'single' : currentProject?.type === 'comic_strip' ? 'comic' : 'single'}
          activeTool={canvasState.activeTool}
          brushColor={canvasState.brushColor}
          brushSize={canvasState.brushSize}
          onModeChange={(mode) => {
            // 模式切换逻辑
            const currentMode = currentProject?.type === 'single_image' ? 'single' : currentProject?.type === 'comic_strip' ? 'comic' : 'single';
            if (currentProject && currentMode !== mode) {
              actions.showNotification({
                type: 'info',
                message: `切换到${mode === 'single' ? '单图' : '连环画'}模式`,
                autoHide: true
              });
            }
          }}
          onToolChange={actions.setActiveTool}
          onColorChange={actions.setBrushColor}
          onSizeChange={actions.setBrushSize}
          onUndo={() => console.log('Undo')}
          onRedo={() => console.log('Redo')}
          onClear={() => console.log('Clear')}
          canUndo={false}
          canRedo={false}
        />

        {/* 主内容区域 - 使用新的三区块布局 */}
        <div className="flex-1">
          <CreationWorkspace />
        </div>
        
        {/* 项目画廊 */}
        {showProjectGallery && (
          <ProjectGallery 
            onClose={() => setShowProjectGallery(false)}
            onProjectSelect={handleProjectSelect}
          />
        )}
        
        {/* 生成进度覆盖层 */}
        {generationState.isGenerating && generationState.currentAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <GenerationProgress 
                assetId={generationState.currentAsset}
                onCancel={() => actions.setGenerating(false)}
                onComplete={() => {
                  actions.setGenerating(false);
                  actions.showNotification({
                    type: 'success',
                    message: 'AI图片生成完成！',
                    autoHide: true
                  });
                }}
                onError={() => {
                  actions.setGenerating(false);
                  actions.showNotification({
                    type: 'error',
                    message: '生成失败，请重试',
                    autoHide: true
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

