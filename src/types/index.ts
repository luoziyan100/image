// 基于技术架构文档的完整类型定义（移除用户认证）

// 项目类型定义
export interface Project {
  id: string;
  title: string;
  description?: string;
  type: 'single_image';
  status: 'draft' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

// 资源类型定义  
export interface Asset {
  id: string;
  projectId: string;
  sourceSketchId: string; // MongoDB中对应草图的_id
  storageUrl?: string; // S3 URL
  status: 'pending' | 'auditing_input' | 'generating' | 'auditing_output' | 'uploading' | 'completed' | 'failed';
  errorMessage?: string;
  errorCode?: string;
  positionInProject: number; // 序列中的位置（预留）
  aiModelVersion?: string; // 记录使用的AI模型版本
  generationSeed?: number; // AI生成使用的种子值
  processingTimeMs?: number; // 生成耗时(毫秒)
  createdAt: string;
  updatedAt: string;
}

// 草图数据结构（MongoDB）
export interface SketchData {
  _id?: string;
  projectId: string;
  fabricJson: {
    version: string;
    objects: unknown[];
    background: string;
  };
  metadata: {
    canvasSize: { width: number; height: number };
    brushStrokesCount: number;
    totalObjects: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 画布状态
export interface CanvasState {
  activeTool: 'draw' | 'erase' | 'upload' | 'select';
  brushColor: string;
  brushSize: number;
  hasUnsavedChanges: boolean;
  lastSavedAt?: Date;
}

// 生成状态
export interface GenerationState {
  isGenerating: boolean;
  currentAsset?: string;
  progress: GenerationStep[];
  queue: AssetGenerationTask[];
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
  progress?: number;
}

export interface AssetGenerationTask {
  id: string;
  projectId: string;
  priority: number;
  createdAt: string;
}

// 通知类型
export interface Notification {
  id?: string;
  type: 'save' | 'generate' | 'success' | 'error' | 'cost' | 'info';
  message: string;
  details?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  autoHide?: boolean;
  duration?: number;
}

// 预算信息
export interface BudgetInfo {
  totalCents: number; // 月度总预算（分）
  usedCents: number; // 已使用（分）
  remaining: number; // 剩余预算（分）
  usagePercent: number; // 使用百分比
  monthYear: string; // 月份 "2025-08"
}

// 使用统计
export interface UsageStats {
  id: number;
  monthYear: string;
  totalCostCents: number;
  totalApiCalls: number;
  totalImagesGenerated: number;
  updatedAt: string;
}

// 计费事件（简化）
export interface BillingEvent {
  assetId: string;
  costCents: number;
  apiCalls: number;
  status: 'pending' | 'processed';
  createdAt: string;
}

// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 生成任务参数
export interface GenerationJobData {
  assetId: string;
  sketchData: {
    imageBuffer: Buffer;
    prompt: string;
  };
  userId: string;
  options?: {
    quality?: 'standard' | 'high';
    seed?: number;
  };
}
