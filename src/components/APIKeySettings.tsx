'use client';

import React, { useState, useEffect } from 'react';
import { configureProvider, aiService, type ProviderConfig } from '@/lib/ai';
import { Button } from './ui/Button';
import { cn } from '@/utils/cn';

interface ProviderKeyState {
  key: string;
  keyName: string;
  isValidating: boolean;
  isValid?: boolean;
  error?: string;
  capabilities?: string[];
}

interface StatusMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export const APIKeySettings: React.FC = () => {
  // 状态管理
  const [providerKeys, setProviderKeys] = useState<Record<string, ProviderKeyState>>({
    openai: { key: '', keyName: '默认密钥', isValidating: false },
    'gemini-tuzi': { key: '', keyName: '默认密钥', isValidating: false }
  });
  
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // 获取所有提供商配置
  const [allProviders, setAllProviders] = useState<ProviderConfig[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 获取所有提供商配置
      const providers = await aiService.getAllProviderConfigs();
      setAllProviders(providers);

      // 获取当前可用的提供商
      const available = await aiService.getAvailableProviders();
      setAvailableProviders(available);

      // 初始化已配置的密钥状态
      const initialKeys: Record<string, ProviderKeyState> = {};
      providers.forEach(provider => {
        if (['openai', 'gemini-tuzi'].includes(provider.id)) {
          initialKeys[provider.id] = {
            key: '',
            keyName: '默认密钥',
            isValidating: false,
            isValid: available.includes(provider.id)
          };
        }
      });
      
      setProviderKeys(initialKeys);
    } catch (error) {
      setStatus({
        type: 'error',
        message: '加载配置失败: ' + (error instanceof Error ? error.message : '未知错误')
      });
    }
  };

  // 更新提供商密钥
  const updateProviderKey = <K extends keyof ProviderKeyState>(
    providerId: string,
    field: K,
    value: ProviderKeyState[K]
  ) => {
    setProviderKeys(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value
      }
    }));
  };

  // 验证单个提供商的API密钥
  const validateProviderKey = async (providerId: string) => {
    const providerState = providerKeys[providerId];
    if (!providerState.key.trim()) return;

    updateProviderKey(providerId, 'isValidating', true);
    updateProviderKey(providerId, 'error', undefined);

    try {
      const result = await configureProvider(
        providerId, 
        providerState.key.trim(), 
        providerState.keyName
      );

      if (result.success) {
        updateProviderKey(providerId, 'isValid', true);
        updateProviderKey(providerId, 'capabilities', result.config?.capabilities || []);
        
        // 更新可用提供商列表
        const updated = await aiService.getAvailableProviders();
        setAvailableProviders(updated);
        
        setStatus({
          type: 'success',
          message: `${getProviderName(providerId)} API密钥验证成功！`
        });
      } else {
        updateProviderKey(providerId, 'isValid', false);
        updateProviderKey(providerId, 'error', result.error);
        
        setStatus({
          type: 'error',
          message: `${getProviderName(providerId)} 验证失败: ${result.error}`
        });
      }
    } catch (error) {
      updateProviderKey(providerId, 'isValid', false);
      updateProviderKey(providerId, 'error', error instanceof Error ? error.message : '验证失败');
      
      setStatus({
        type: 'error',
        message: `验证失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      updateProviderKey(providerId, 'isValidating', false);
    }
  };

  // 保存所有配置
  const handleSaveAll = async () => {
    setIsLoading(true);
    setStatus(null);

    try {
      const validationPromises = Object.entries(providerKeys)
        .filter(([, state]) => state.key.trim())
        .map(([providerId]) => validateProviderKey(providerId));

      await Promise.all(validationPromises);

      setStatus({
        type: 'success',
        message: '所有API密钥配置完成！'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: '配置过程中出现错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清除状态消息
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // 获取提供商显示名称
  const getProviderName = (providerId: string): string => {
    const provider = allProviders.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  // 获取提供商描述
  const getProviderDescription = (providerId: string): string => {
    const provider = allProviders.find(p => p.id === providerId);
    return provider?.description || '';
  };

  // 获取API密钥获取链接
  const getApiKeyUrl = (providerId: string): string => {
    const provider = allProviders.find(p => p.id === providerId);
    return provider?.apiKeyUrl || '#';
  };

  // 渲染提供商配置卡片
  const renderProviderCard = (providerId: string) => {
    const state = providerKeys[providerId];
    if (!state) return null;

    return (
      <div key={providerId} className="provider-card bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {getProviderName(providerId)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {getProviderDescription(providerId)}
            </p>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center ml-4">
            {state.isValidating ? (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm">验证中...</span>
              </div>
            ) : state.isValid === true ? (
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">已配置</span>
              </div>
            ) : state.isValid === false ? (
              <div className="flex items-center text-red-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm">配置失败</span>
              </div>
            ) : availableProviders.includes(providerId) ? (
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">已配置</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* API密钥输入 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密钥名称
            </label>
            <input
              type="text"
              value={state.keyName}
              onChange={(e) => updateProviderKey(providerId, 'keyName', e.target.value)}
              placeholder="为此密钥命名，例如：工作用密钥"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API密钥
            </label>
            <input
              type="password"
              value={state.key}
              onChange={(e) => updateProviderKey(providerId, 'key', e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              获取地址: <a 
                href={getApiKeyUrl(providerId)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                {providerId === 'openai' ? 'OpenAI Platform' : '兔子Wiki'}
              </a>
            </p>
          </div>

          {/* 错误信息 */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {/* 功能展示 */}
          {state.capabilities && state.capabilities.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700 font-medium mb-1">支持的功能:</p>
              <div className="flex flex-wrap gap-1">
                {state.capabilities.map(cap => (
                  <span 
                    key={cap}
                    className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                  >
                    {cap === 'text-to-image' ? '文生图' : 
                     cap === 'image-to-image' ? '图生图' :
                     cap === 'text-to-video' ? '文生视频' : 
                     cap === 'image-to-video' ? '图生视频' : cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={() => validateProviderKey(providerId)}
              disabled={!state.key.trim() || state.isValidating}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {state.isValidating ? '验证中...' : '验证密钥'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="api-key-settings max-w-4xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI提供商配置</h1>
        <p className="text-gray-600">
          配置您的AI提供商API密钥，支持OpenAI和Gemini等多个平台。密钥将安全地存储在您的浏览器本地。
        </p>
      </div>

      {/* 状态消息 */}
      {status && (
        <div className={cn(
          'mb-6 p-4 rounded-lg border',
          status.type === 'success' && 'bg-green-50 border-green-200 text-green-800',
          status.type === 'error' && 'bg-red-50 border-red-200 text-red-800',
          status.type === 'warning' && 'bg-yellow-50 border-yellow-200 text-yellow-800',
          status.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800'
        )}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {status.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {status.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.464 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        </div>
      )}

      {/* 提供商配置卡片 */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderProviderCard('openai')}
        {renderProviderCard('gemini-tuzi')}
      </div>

      {/* 统计信息 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">配置统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{allProviders.length}</div>
            <div className="text-sm text-gray-600">总提供商</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{availableProviders.length}</div>
            <div className="text-sm text-gray-600">已配置</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {allProviders.reduce((sum, p) => sum + (p.capabilities.textToImage ? 1 : 0), 0)}
            </div>
            <div className="text-sm text-gray-600">支持文生图</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {allProviders.reduce((sum, p) => sum + (p.capabilities.imageToImage ? 1 : 0), 0)}
            </div>
            <div className="text-sm text-gray-600">支持图生图</div>
          </div>
        </div>
      </div>

      {/* 帮助信息 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🔒 安全提示</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• API密钥只在您的浏览器本地存储，不会发送到我们的服务器</li>
          <li>• 请从官方渠道获取API密钥，确保账户安全</li>
          <li>• 定期检查API密钥的使用情况和余额</li>
          <li>• 如需删除密钥，请清除浏览器存储数据</li>
        </ul>
      </div>
    </div>
  );
};
