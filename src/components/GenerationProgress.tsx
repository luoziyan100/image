'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import type { GenerationStep, Asset } from '@/types';

interface GenerationProgressProps {
  assetId: string;
  onCancel: () => void;
  onComplete: (result: Asset) => void;
  onError: (error: string) => void;
}

export function GenerationProgress({ 
  assetId, 
  onCancel, 
  onComplete, 
  onError 
}: GenerationProgressProps) {
  const [steps, setSteps] = useState<GenerationStep[]>([
    { id: 'audit-input', label: '输入内容审核', status: 'pending' },
    { id: 'generating', label: 'AI图片生成', status: 'pending' },
    { id: 'audit-output', label: '输出内容审核', status: 'pending' },
    { id: 'uploading', label: '上传到云端', status: 'pending' }
  ]);
  
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [queuePosition, setQueuePosition] = useState(0);
  const [startTime] = useState(Date.now());
  
  // 状态轮询逻辑
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/assets/status?id=${assetId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const asset = result.data;
          updateStepsFromStatus(asset.status);
          
          // 更新预估时间
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = Math.max(0, 30 - elapsed);
          setEstimatedTime(Math.ceil(remaining));
          
          if (asset.status === 'completed') {
            clearInterval(pollInterval);
            onComplete(asset);
          } else if (asset.status === 'failed') {
            clearInterval(pollInterval);
            onError(asset.errorMessage || '生成失败');
          }
        }
      } catch (error) {
        console.error('轮询状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
    
    return () => clearInterval(pollInterval);
  }, [assetId, onComplete, onError, startTime]);
  
  const updateStepsFromStatus = (status: string) => {
    setSteps(currentSteps => {
      const newSteps = [...currentSteps];
      
      // 根据状态更新步骤进度
      const statusMap: Record<string, number> = {
        'pending': -1,
        'auditing_input': 0,
        'generating': 1,
        'auditing_output': 2,
        'uploading': 3,
        'completed': 4,
        'failed': -1
      };
      
      const currentStepIndex = statusMap[status] || -1;
      
      newSteps.forEach((step, index) => {
        if (index < currentStepIndex) {
          step.status = 'completed';
        } else if (index === currentStepIndex) {
          step.status = 'processing';
        } else {
          step.status = 'pending';
        }
      });
      
      return newSteps;
    });
  };
  
  const getStepIcon = (status: string, stepNumber: number) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return stepNumber.toString();
    }
  };
  
  const getStepIconStyle = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-500',
      processing: 'bg-yellow-100 text-yellow-700 animate-pulse',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };
  
  return (
    <div className="generation-progress max-w-2xl mx-auto p-6">
      {/* 进度标题 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🚀 AI正在生成你的作品
        </h2>
        <p className="text-gray-600">
          预计剩余时间: {estimatedTime}秒 | 队列位置: {queuePosition + 1}/12
        </p>
      </div>
      
      {/* 步骤进度条 */}
      <div className="steps-container mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center mb-4">
            {/* 步骤图标 */}
            <div className={`step-icon w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStepIconStyle(step.status)}`}>
              {getStepIcon(step.status, index + 1)}
            </div>
            
            {/* 步骤信息 */}
            <div className="flex-1 ml-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{step.label}</span>
                <span className="text-sm text-gray-500">
                  {step.duration ? `${step.duration}s` : ''}
                </span>
              </div>
              
              {/* 进度条（仅当前步骤显示） */}
              {step.status === 'processing' && step.progress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 预览区域 */}
      <div className="preview-section grid grid-cols-2 gap-6 mb-8">
        <div className="text-center">
          <h3 className="font-medium mb-3">原始草图</h3>
          <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-gray-400">🖼️ 草图预览</div>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="font-medium mb-3">AI生成结果</h3>
          <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 flex items-center justify-center">
            <div className="text-indigo-400">
              {steps.findIndex(s => s.status === 'processing') >= 2 ? '🎨 即将完成...' : '⏳ 等待生成...'}
            </div>
          </div>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="min-w-[120px]"
        >
          ❌ 取消生成
        </Button>
      </div>
    </div>
  );
}