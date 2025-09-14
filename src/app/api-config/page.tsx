'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function APIConfigPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    setStatus('保存中...');
    
    try {
      // 这里使用简单的localStorage存储作为演示
      if (openaiKey) {
        localStorage.setItem('openai_api_key', openaiKey);
      }
      if (geminiKey) {
        localStorage.setItem('gemini_api_key', geminiKey);
      }
      
      setStatus('✅ API密钥已保存到本地存储！');
      
      // 3秒后清除状态
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('❌ 保存失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔑 API密钥配置</h1>
        <p className="text-gray-600 mb-8">配置您的AI提供商API密钥</p>

        {/* OpenAI配置 */}
        <div className="mb-6 p-6 border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">OpenAI DALL-E</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                获取地址: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-500 underline">OpenAI Platform</a>
              </p>
            </div>
          </div>
        </div>

        {/* Gemini配置 */}
        <div className="mb-6 p-6 border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Gemini 2.5 Flash (兔子API)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                获取地址: <a href="https://wiki.tu-zi.com/zh/Code/gemini-2-5-flash-image" target="_blank" className="text-blue-500 underline">兔子Wiki</a>
              </p>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          💾 保存API密钥
        </button>

        {/* 状态消息 */}
        {status && (
          <div className="mt-4 p-3 rounded-md bg-gray-100 text-center">
            {status}
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📝 使用说明</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>获取API密钥：点击上方链接访问对应平台</li>
            <li>粘贴密钥：将获取的API密钥粘贴到对应输入框</li>
            <li>保存配置：点击&quot;保存API密钥&quot;按钮</li>
            <li>开始使用：返回主页开始使用AI生成功能</li>
          </ol>
        </div>

        {/* 返回主页链接 */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            ← 返回主页
          </Link>
        </div>
      </div>
    </div>
  );
}