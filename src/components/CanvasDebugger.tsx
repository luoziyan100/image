'use client';

import React, { useState, useCallback } from 'react';
import { Button } from './ui/Button';

interface CanvasDebuggerProps {
  canvasImageData?: string | null;
  hasCanvasContent?: boolean;
  uploadedImages?: any[];
}

export const CanvasDebugger: React.FC<CanvasDebuggerProps> = ({
  canvasImageData,
  hasCanvasContent = false,
  uploadedImages = []
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const runDebugCheck = useCallback(() => {
    const info = {
      timestamp: new Date().toISOString(),
      hasCanvasContent,
      canvasImageData: {
        exists: !!canvasImageData,
        type: canvasImageData?.startsWith('data:') ? 'base64' : 'other',
        length: canvasImageData?.length || 0,
        preview: canvasImageData?.substring(0, 100) || null,
        isValidBase64: canvasImageData?.includes('data:image/') || false
      },
      uploadedImages: {
        count: uploadedImages.length,
        details: uploadedImages.map((img, index) => ({
          index,
          id: img.id,
          name: img.name,
          size: img.size,
          hasUrl: !!img.url,
          urlLength: img.url?.length || 0
        }))
      },
      priority: hasCanvasContent && canvasImageData ? 'canvas' : 
               uploadedImages.length > 0 ? 'uploaded' : 'text-only'
    };

    setDebugInfo(info);
    console.log('🔍 画布调试器 - 完整诊断:', info);
  }, [canvasImageData, hasCanvasContent, uploadedImages]);

  const downloadCanvasImage = useCallback(() => {
    if (!canvasImageData) return;
    
    const link = document.createElement('a');
    link.href = canvasImageData;
    link.download = `canvas-debug-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [canvasImageData]);

  return (
    <div className="canvas-debugger bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-yellow-800">🔧 画布调试器</h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDebugCheck}
            className="text-xs bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200"
          >
            检查状态
          </Button>
          {canvasImageData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200"
            >
              {showPreview ? '隐藏预览' : '预览图片'}
            </Button>
          )}
          {canvasImageData && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCanvasImage}
              className="text-xs bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
            >
              下载图片
            </Button>
          )}
        </div>
      </div>

      {/* 快速状态 */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className={`px-2 py-1 rounded-full ${
          hasCanvasContent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          画布内容: {hasCanvasContent ? '有' : '无'}
        </span>
        <span className={`px-2 py-1 rounded-full ${
          canvasImageData ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          图片数据: {canvasImageData ? '有' : '无'}
        </span>
        <span className={`px-2 py-1 rounded-full ${
          uploadedImages.length > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
        }`}>
          上传图片: {uploadedImages.length}张
        </span>
      </div>

      {/* 预览图片 */}
      {showPreview && canvasImageData && (
        <div className="mb-3">
          <img 
            src={canvasImageData} 
            alt="画布预览" 
            className="max-w-full h-32 object-contain border border-gray-300 rounded"
          />
        </div>
      )}

      {/* 调试信息 */}
      {debugInfo && (
        <div className="bg-white rounded border p-3">
          <h5 className="text-xs font-medium text-gray-700 mb-2">调试信息:</h5>
          <pre className="text-xs text-gray-600 overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* 问题诊断 */}
      <div className="mt-3 text-xs text-yellow-700">
        <p><strong>期望行为:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>画布绘制后 → hasCanvasContent = true</li>
          <li>canvasImageData 应包含有效的 base64 图片数据</li>
          <li>AI生成应使用图生图模式而不是文生图</li>
        </ul>
      </div>
    </div>
  );
};