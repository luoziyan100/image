// API Key管理器
// 处理用户API密钥的客户端加密存储和管理

import { UserApiKeyConfig, ApiKeyValidationResult } from '../core/types';
import { PROVIDER_CONFIGS } from '../core/capability-mapper';

// 简单的客户端加密（生产环境应使用更安全的方案）
class SimpleEncryption {
  private static readonly KEY = 'user-ai-keys-2024';

  static encrypt(text: string): string {
    try {
      // 使用Base64编码（生产环境应使用AES等真正的加密）
      return btoa(unescape(encodeURIComponent(text + '::' + this.KEY)));
    } catch (error) {
      console.error('Encryption failed:', error);
      return text;
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      const decoded = decodeURIComponent(escape(atob(encryptedText)));
      const [text, key] = decoded.split('::');
      if (key !== this.KEY) {
        throw new Error('Invalid encryption key');
      }
      return text;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}

// API Key管理器
export class ApiKeyManager {
  private static readonly STORAGE_KEY = 'ai_provider_api_keys';
  private static instance: ApiKeyManager;

  private constructor() {}

  static getInstance(): ApiKeyManager {
    if (!this.instance) {
      this.instance = new ApiKeyManager();
    }
    return this.instance;
  }

  // 存储API Key
  async storeApiKey(
    provider: string, 
    apiKey: string, 
    keyName: string
  ): Promise<UserApiKeyConfig> {
    const config: UserApiKeyConfig = {
      id: this.generateKeyId(provider, keyName),
      provider,
      keyName,
      encryptedKey: SimpleEncryption.encrypt(apiKey),
      capabilities: await this.detectCapabilities(provider, apiKey),
      isActive: true,
      addedAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
      isValid: true
    };

    const existingKeys = this.getStoredKeys();
    
    // 删除同名的旧密钥
    const filteredKeys = existingKeys.filter(
      key => !(key.provider === provider && key.keyName === keyName)
    );
    
    filteredKeys.push(config);
    this.saveKeys(filteredKeys);

    return config;
  }

  // 获取指定提供商的API Key
  getApiKey(provider: string, keyName?: string): string | null {
    // 首先检查加密存储的密钥
    const keys = this.getStoredKeys();
    
    let targetKey: UserApiKeyConfig | undefined;
    
    if (keyName) {
      // 查找指定名称的密钥
      targetKey = keys.find(key => 
        key.provider === provider && 
        key.keyName === keyName && 
        key.isActive
      );
    } else {
      // 查找该提供商的第一个活跃密钥
      targetKey = keys.find(key => 
        key.provider === provider && 
        key.isActive
      );
    }

    if (targetKey) {
      return SimpleEncryption.decrypt(targetKey.encryptedKey);
    }

    // 如果没有找到加密存储的密钥，检查简单存储（兼容性）
    return this.getSimpleStoredKey(provider);
  }

  // 兼容简单存储的API密钥
  private getSimpleStoredKey(provider: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // 映射提供商名称到localStorage key
      const keyMapping: Record<string, string> = {
        'openai': 'openai_api_key',
        'gemini-tuzi': 'gemini_api_key'
      };

      const storageKey = keyMapping[provider];
      if (!storageKey) {
        return null;
      }

      return localStorage.getItem(storageKey);
    } catch (error) {
      console.error('Failed to read simple stored key:', error);
      return null;
    }
  }

  // 获取所有存储的密钥配置
  getAllApiKeys(): UserApiKeyConfig[] {
    return this.getStoredKeys();
  }

  // 获取指定提供商的所有密钥
  getApiKeysForProvider(provider: string): UserApiKeyConfig[] {
    return this.getStoredKeys().filter(key => key.provider === provider);
  }

  // 删除API Key
  removeApiKey(keyId: string): boolean {
    const keys = this.getStoredKeys();
    const filteredKeys = keys.filter(key => key.id !== keyId);
    
    if (filteredKeys.length === keys.length) {
      return false; // 没有找到要删除的密钥
    }

    this.saveKeys(filteredKeys);
    return true;
  }

  // 更新API Key状态
  updateApiKeyStatus(keyId: string, isActive: boolean): boolean {
    const keys = this.getStoredKeys();
    const keyIndex = keys.findIndex(key => key.id === keyId);
    
    if (keyIndex === -1) {
      return false;
    }

    keys[keyIndex] = {
      ...keys[keyIndex],
      isActive,
      lastValidated: new Date().toISOString()
    };

    this.saveKeys(keys);
    return true;
  }

  // 验证API Key
  async validateApiKey(provider: string, keyName: string): Promise<ApiKeyValidationResult> {
    const apiKey = this.getApiKey(provider, keyName);
    
    if (!apiKey) {
      return {
        isValid: false,
        error: 'API Key not found'
      };
    }

    try {
      // 根据提供商类型进行验证
      const result = await this.validateProviderKey(provider, apiKey);
      
      // 更新验证状态
      this.updateValidationResult(provider, keyName, result.isValid);
      
      return result;
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  // 获取可用的提供商列表（用户已配置API Key）
  getAvailableProviders(): string[] {
    const keys = this.getStoredKeys();
    const providers = new Set<string>();
    
    // 检查加密存储的密钥
    keys.forEach(key => {
      if (key.isActive && key.isValid !== false) {
        providers.add(key.provider);
      }
    });
    
    // 检查简单存储的密钥
    if (typeof window !== 'undefined') {
      const simpleKeys = ['openai_api_key', 'gemini_api_key'];
      const providerMapping: Record<string, string> = {
        'openai_api_key': 'openai',
        'gemini_api_key': 'gemini-tuzi'
      };

      simpleKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          providers.add(providerMapping[key]);
        }
      });
    }
    
    return Array.from(providers);
  }

  // 检查提供商是否可用
  isProviderAvailable(provider: string): boolean {
    return this.getAvailableProviders().includes(provider);
  }

  // 获取提供商的可用功能
  getProviderCapabilities(provider: string): string[] {
    const keys = this.getApiKeysForProvider(provider);
    const activeKey = keys.find(key => key.isActive && key.isValid !== false);
    
    return activeKey?.capabilities || [];
  }

  // 清除所有API Key（用于登出或重置）
  clearAllApiKeys(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.constructor.name + '_' + ApiKeyManager.STORAGE_KEY);
    }
  }

  // 导出配置（用于备份）
  exportConfig(): string {
    const keys = this.getStoredKeys();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      keys: keys.map(key => ({
        ...key,
        encryptedKey: '***REDACTED***' // 不导出实际密钥
      }))
    }, null, 2);
  }

  // 私有方法

  private getStoredKeys(): UserApiKeyConfig[] {
    if (typeof window === 'undefined') {
      return []; // SSR环境下返回空数组
    }

    try {
      const stored = localStorage.getItem(this.constructor.name + '_' + ApiKeyManager.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load API keys from storage:', error);
      return [];
    }
  }

  private saveKeys(keys: UserApiKeyConfig[]): void {
    if (typeof window === 'undefined') {
      return; // SSR环境下不执行
    }

    try {
      localStorage.setItem(
        this.constructor.name + '_' + ApiKeyManager.STORAGE_KEY,
        JSON.stringify(keys)
      );
    } catch (error) {
      console.error('Failed to save API keys to storage:', error);
    }
  }

  private generateKeyId(provider: string, keyName: string): string {
    return `${provider}_${keyName}_${Date.now()}`;
  }

  private async detectCapabilities(provider: string, apiKey: string): Promise<string[]> {
    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      return [];
    }

    const capabilities: string[] = [];
    const providerCaps = config.capabilities;

    if (providerCaps.textToImage) capabilities.push('text-to-image');
    if (providerCaps.imageToImage) capabilities.push('image-to-image');
    if (providerCaps.textToVideo) capabilities.push('text-to-video');
    if (providerCaps.imageToVideo) capabilities.push('image-to-video');

    return capabilities;
  }

  private async validateProviderKey(provider: string, apiKey: string): Promise<ApiKeyValidationResult> {
    // 模拟验证过程，实际实现应该调用各提供商的验证API
    
    const validationEndpoints: Record<string, string> = {
      openai: 'https://api.openai.com/v1/models',
      'gemini-tuzi': 'https://api.tu-zi.com/v1/models',
      stability: 'https://api.stability.ai/v1/user/account',
      google: 'https://generativelanguage.googleapis.com/v1beta/models',
      runwayml: 'https://api.runwayml.com/v1/tasks',
      anthropic: 'https://api.anthropic.com/v1/messages'
    };

    const endpoint = validationEndpoints[provider];
    if (!endpoint) {
      return {
        isValid: false,
        error: 'Unsupported provider'
      };
    }

    try {
      // 简单的验证请求
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        return {
          isValid: false,
          error: 'Invalid API key'
        };
      }

      if (response.ok) {
        return {
          isValid: true,
          capabilities: await this.detectCapabilities(provider, apiKey)
        };
      }

      return {
        isValid: false,
        error: `Validation failed with status ${response.status}`
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  private updateValidationResult(provider: string, keyName: string, isValid: boolean): void {
    const keys = this.getStoredKeys();
    const keyIndex = keys.findIndex(key => 
      key.provider === provider && key.keyName === keyName
    );

    if (keyIndex !== -1) {
      keys[keyIndex] = {
        ...keys[keyIndex],
        isValid,
        lastValidated: new Date().toISOString()
      };
      this.saveKeys(keys);
    }
  }
}

// 单例导出
export const apiKeyManager = ApiKeyManager.getInstance();