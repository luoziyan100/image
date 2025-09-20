// API客户端封装
import type { ApiResponse, Project, Asset, BudgetInfo } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || '') {
    this.baseUrl = baseUrl;
    
    // 从localStorage加载token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // 设置认证token
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // 认证API
  async login(email: string, password: string): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<ApiResponse> {
    const result = await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
    return result;
  }

  // 项目API
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request('/api/projects');
  }

  async createProject(data: { title: string; type: Project['type']; description?: string }): Promise<ApiResponse<Project>> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse> {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // 草图API
  async updateProjectSketch(projectId: string, sketchData: Record<string, unknown>): Promise<ApiResponse> {
    return this.request(`/api/projects/${projectId}/sketch`, {
      method: 'PUT',
      body: JSON.stringify({ sketchData }),
    });
  }

  async getProjectSketch(projectId: string): Promise<ApiResponse<{ sketchData: Record<string, unknown> }>> {
    return this.request(`/api/projects/${projectId}/sketch`);
  }

  // 生成API
  async generateImage(projectId: string, imageData: string): Promise<ApiResponse<{ assetId: string }>> {
    return this.request('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId, imageData }),
    });
  }

  async getAssetStatus(assetId: string): Promise<ApiResponse<Asset>> {
    return this.request(`/api/assets/status?id=${assetId}`);
  }

  async cancelGeneration(assetId: string): Promise<ApiResponse> {
    return this.request(`/api/assets/${assetId}/cancel`, {
      method: 'POST',
    });
  }

  // 预算API
  async getBudgetInfo(): Promise<ApiResponse<BudgetInfo>> {
    return this.request('/api/budget');
  }

  // 文件上传API
  async uploadFile(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置Content-Type for FormData
    });
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
