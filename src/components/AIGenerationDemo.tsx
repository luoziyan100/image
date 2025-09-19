'use client';

import React, { useState } from 'react';
import { generateImage, transformImage, aiService, type GenerationResult } from '@/lib/ai';
import { Button } from './ui/Button';
import { ImagePreview, useImagePreview } from './ui/ImagePreview';
import { CanvasDebugger } from './CanvasDebugger';

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

interface AIGenerationDemoProps {
  canvasImageData?: string | null;
  hasCanvasContent?: boolean;
  uploadedImages?: UploadedImage[];
  getPoseImage?: () => string | null;
  getMaskImage?: () => string | null;
}

export const AIGenerationDemo: React.FC<AIGenerationDemoProps> = ({
  canvasImageData,
  hasCanvasContent = false,
  uploadedImages = [],
  getPoseImage,
  getMaskImage
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [includePose, setIncludePose] = useState<boolean>(false);
  const [includeMask, setIncludeMask] = useState<boolean>(false);
  
  // 图片预览功能
  const { previewState, openPreview, closePreview } = useImagePreview();

  // 检查可用提供商
  React.useEffect(() => {
    const checkProviders = async () => {
      try {
        const providers = await aiService.getAvailableProviders();
        setAvailableProviders(providers);
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
        }
      } catch (error) {
        console.error('Failed to get providers:', error);
      }
    };
    
    checkProviders();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入生成提示词');
      return;
    }

    if (availableProviders.length === 0) {
      setError('请先配置AI提供商API密钥');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      let generationResult;
      let inputImage: string | null = null;
      let inputImages: string[] = [];

      // 优先级：画布内容 > 上传图片 > 文生图
      console.log('🤖 AI生成 - 检查输入源:', {
        hasCanvasContent,
        canvasImageDataExists: !!canvasImageData,
        canvasImageDataLength: canvasImageData?.length || 0,
        uploadedImagesCount: uploadedImages.length,
        canvasDataPreview: canvasImageData?.substring(0, 100) || 'null'
      });
      
      if (uploadedImages.length > 0) {
        inputImages = uploadedImages.map(u => u.url);
      }
      // 画布永远排最后
      if (canvasImageData && canvasImageData.length > 0) {
        // 可选添加姿态/遮罩（在画布之前）
        if (includePose && typeof getPoseImage === 'function') {
          try {
            const pose = getPoseImage();
            if (pose) inputImages.push(pose);
          } catch (e) { console.warn('getPoseImage failed', e); }
        }
        if (includeMask && typeof getMaskImage === 'function') {
          try {
            const mask = getMaskImage();
            if (mask) inputImages.push(mask);
          } catch (e) { console.warn('getMaskImage failed', e); }
        }
        // 最后再加画布快照
        inputImages.push(canvasImageData);
      }

      if (inputImages.length === 0) {
        console.log('⚠️  没有找到图像输入，将使用文生图模式');
      }

      if (inputImages.length > 0) {
        inputImage = inputImages[0]; // 兼容旧字段
        generationResult = await transformImage(inputImage, prompt, {
          provider: selectedProvider || undefined,
          style: 'realistic',
          quality: 'standard',
          sourceImages: inputImages
        });
      } else {
        console.log('使用文生图模式');
        generationResult = await generateImage(prompt, {
          provider: selectedProvider || undefined,
          style: 'realistic',
          quality: 'standard'
        });
      }

      if (generationResult.status === 'completed') {
        setResult(generationResult);
      } else if (generationResult.status === 'failed') {
        setError(generationResult.error?.message || '生成失败');
      }
    } catch (error) {
      console.error('AI生成错误:', error);
      
      // 根据错误类型提供友好的错误消息
      let userFriendlyMessage = '生成过程中出现错误';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          userFriendlyMessage = '⏰ 生成超时，请尝试：\n• 简化提示词\n• 稍后重试\n• 检查网络连接';
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          userFriendlyMessage = '🔑 API密钥无效，请检查设置页面的配置';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          userFriendlyMessage = '🚫 请求过于频繁，请稍后再试';
        } else if (error.message.includes('400') || error.message.includes('invalid')) {
          userFriendlyMessage = '📝 请求参数有误，请检查输入内容';
        } else {
          userFriendlyMessage = `❌ ${error.message}`;
        }
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getProviderDisplayName = (providerId: string) => {
    const names: Record<string, string> = {
      'openai': 'OpenAI DALL-E',
      'gemini-tuzi': 'Gemini 2.5 Flash',
      'stability': 'Stability AI',
      'google': 'Google AI',
      'runwayml': 'RunwayML'
    };
    return names[providerId] || providerId;
  };

  return (
    <div className="ai-generation-demo bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-base font-semibold text-gray-900">AI生成测试</h3>
        <div className="flex items-center gap-2">
          {availableProviders.length > 0 ? (
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              title="选择AI提供商"
            >
              {availableProviders.map(providerId => (
                <option key={providerId} value={providerId}>
                  {getProviderDisplayName(providerId)}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded">未配置提供商</span>
          )}
          <div className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {(canvasImageData && canvasImageData.length > 0) || uploadedImages.length > 0 ? '图生图' : '文生图'}
          </div>
        </div>
      </div>

      {/* 导出选项 */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={includePose} onChange={(e) => setIncludePose(e.target.checked)} />
          附加姿态图（从画布线条导出，透明PNG）
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={includeMask} onChange={(e) => setIncludeMask(e.target.checked)} />
          附加遮罩图（线条变白，背景黑）
        </label>
      </div>

      {/* 输入图像状态 */}
      {((canvasImageData && canvasImageData.length > 0) || uploadedImages.length > 0) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            {canvasImageData && canvasImageData.length > 0 ? (
              <>🎨 将基于画布内容生成</>
            ) : uploadedImages.length > 0 ? (
              <>📷 将基于上传图片 &quot;{uploadedImages[0].name}&quot; 生成</>
            ) : null}
            {uploadedImages.length > 1 && (
              <span className="text-blue-600"> (共{uploadedImages.length}张图片，使用第1张)</span>
            )}
          </p>
        </div>
      )}

      {/* 提示词输入 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          生成提示词
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述您想要生成的图片，例如：一只可爱的橙色小猫在阳光下玩耍"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 placeholder:font-normal text-gray-900"
          rows={3}
        />
      </div>

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || availableProviders.length === 0}
        className="w-full mb-4"
      >
        {isGenerating ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            生成中...
          </div>
        ) : (
          '生成图片'
        )}
      </Button>

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || availableProviders.length === 0}
              className="text-xs"
            >
              🔄 重试
            </Button>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 生成结果 */}
      {result && (
        <div className="generation-result">
          <h4 className="text-md font-medium text-gray-900 mb-3">生成结果</h4>
          
          {/* 图片显示 */}
          {(result.result?.url || result.result?.base64) && (
            <div className="mb-4">
              <div className="relative group">
                <img
                  src={result.result?.url || result.result?.base64 || ''}
                  alt="AI生成的图片"
                  className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                  onClick={() => openPreview(
                    result.result?.url || result.result?.base64 || '',
                    `AI生成图片 - ${result.result?.metadata?.provider || '未知提供商'}`
                  )}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setError('图片加载失败');
                  }}
                />
                {/* 放大提示 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <div className="bg-white bg-opacity-90 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 flex items-center gap-2">
                    <span>🔍</span>
                    <span>点击放大查看</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 元数据信息 */}
          {result.result?.metadata && (
            <div className="bg-gray-50 rounded-md p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">生成信息</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <div>提供商: {result.result.metadata.provider}</div>
                <div>模型: {result.result.metadata.model}</div>
                <div>尺寸: {result.result.metadata.dimensions.width}×{result.result.metadata.dimensions.height}</div>
                <div>格式: {result.result.metadata.format}</div>
                {result.processingTimeMs && (
                  <div>耗时: {(result.processingTimeMs / 1000).toFixed(2)}秒</div>
                )}
              </div>
            </div>
          )}

          {/* 下载按钮 */}
          {(result.result?.url || result.result?.base64) && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = result.result?.url || result.result?.base64 || '';
                  link.download = `generated-image-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                下载图片
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      {/* 画布调试器（下移到提示词与按钮之后） */}
      <CanvasDebugger 
        canvasImageData={canvasImageData}
        hasCanvasContent={hasCanvasContent}
        uploadedImages={uploadedImages}
      />

      {/* 使用说明 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">💡 使用提示</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 画布绘制 → 上传图片 → 纯文本：系统会自动选择最佳输入方式</li>
          <li>• 图生图模式：提示词用于指导图片的变换和优化</li>
          <li>• 文生图模式：尽量使用详细、具体的描述词</li>
          <li>• 可以加入风格词如&quot;写实的&quot;、&quot;卡通的&quot;、&quot;水彩画风格&quot;等</li>
          <li>• 不同提供商可能产生不同风格的结果</li>
        </ul>
      </div>

      {/* 图片预览模态框 */}
      <ImagePreview
        src={previewState.src}
        alt={previewState.alt}
        isOpen={previewState.isOpen}
        onClose={closePreview}
      />
    </div>
  );
};
