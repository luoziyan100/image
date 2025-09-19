// 应用全局状态管理 (Zustand)
import { create } from 'zustand';
import type { 
  Project, 
  CanvasState, 
  GenerationState, 
  Notification, 
  BudgetInfo 
} from '@/types';

interface AppState {
  // 项目状态
  currentProject: Project | null;
  projectsList: Project[];
  
  // 画布状态
  canvasState: CanvasState;
  
  // 生成状态
  generationState: GenerationState;
  
  // UI状态
  uiState: {
    sidebarCollapsed: boolean;
    showProjectGallery: boolean;
    notifications: Notification[];
    loading: boolean;
    activeWorkspace: 'canvas' | 'sticker';
  };
  
  // 预算状态
  budgetInfo: BudgetInfo | null;
  
  // 动作方法
  actions: {
    // 项目操作
    setCurrentProject: (project: Project | null) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    setProjectsList: (projects: Project[]) => void;
    
    // 画布操作
    setActiveTool: (tool: CanvasState['activeTool']) => void;
    setBrushColor: (color: string) => void;
    setBrushSize: (size: number) => void;
    markCanvasChanged: () => void;
    markCanvasSaved: () => void;
    
    // 生成操作
    setGenerating: (generating: boolean) => void;
    setCurrentAsset: (assetId: string | undefined) => void;
    updateGenerationProgress: (progress: GenerationState['progress']) => void;
    
    // 通知管理
    showNotification: (notification: Notification) => void;
    hideNotification: (id: string) => void;
    
    // UI操作
    toggleSidebar: () => void;
    toggleProjectGallery: () => void;
    setLoading: (loading: boolean) => void;
    setActiveWorkspace: (workspace: 'canvas' | 'sticker') => void;
    
    // 预算操作
    setBudgetInfo: (info: BudgetInfo) => void;
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  currentProject: {
    id: 'default-project',
    name: '默认项目',
    type: 'single-image',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: '默认创作项目'
  },
  projectsList: [],
  
  canvasState: {
    activeTool: 'draw',
    brushColor: '#000000',
    brushSize: 5,
    hasUnsavedChanges: false,
    lastSavedAt: undefined
  },
  
  generationState: {
    isGenerating: false,
    currentAsset: undefined,
    progress: [],
    queue: []
  },
  
  uiState: {
    sidebarCollapsed: false,
    showProjectGallery: true,
    notifications: [],
    loading: false,
    activeWorkspace: 'canvas'
  },
  
  budgetInfo: null,
  
  actions: {
    // 项目操作
    setCurrentProject: (project) => set({ currentProject: project }),
    updateProject: (id, updates) => set((state) => ({
      projectsList: state.projectsList.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject: state.currentProject?.id === id 
        ? { ...state.currentProject, ...updates }
        : state.currentProject
    })),
    setProjectsList: (projects) => set({ projectsList: projects }),
    
    // 画布操作
    setActiveTool: (tool) => set((state) => ({
      canvasState: { ...state.canvasState, activeTool: tool }
    })),
    setBrushColor: (color) => set((state) => ({
      canvasState: { ...state.canvasState, brushColor: color }
    })),
    setBrushSize: (size) => set((state) => ({
      canvasState: { ...state.canvasState, brushSize: size }
    })),
    markCanvasChanged: () => set((state) => ({
      canvasState: { 
        ...state.canvasState, 
        hasUnsavedChanges: true 
      }
    })),
    markCanvasSaved: () => set((state) => ({
      canvasState: { 
        ...state.canvasState, 
        hasUnsavedChanges: false,
        lastSavedAt: new Date()
      }
    })),
    
    // 生成操作
    setGenerating: (generating) => set((state) => ({
      generationState: { 
        ...state.generationState, 
        isGenerating: generating 
      }
    })),
    setCurrentAsset: (assetId) => set((state) => ({
      generationState: { 
        ...state.generationState, 
        currentAsset: assetId 
      }
    })),
    updateGenerationProgress: (progress) => set((state) => ({
      generationState: { 
        ...state.generationState, 
        progress 
      }
    })),
    
    // 通知管理
    showNotification: (notification) => {
      const id = notification.id || `notif_${Date.now()}`;
      const newNotification = { ...notification, id };
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          notifications: [...state.uiState.notifications, newNotification]
        }
      }));
      
      // 自动隐藏
      if (notification.autoHide !== false) {
        setTimeout(() => {
          get().actions.hideNotification(id);
        }, notification.duration || 3000);
      }
    },
    
    hideNotification: (id) => set((state) => ({
      uiState: {
        ...state.uiState,
        notifications: state.uiState.notifications.filter(n => n.id !== id)
      }
    })),
    
    // UI操作
    toggleSidebar: () => set((state) => ({
      uiState: {
        ...state.uiState,
        sidebarCollapsed: !state.uiState.sidebarCollapsed
      }
    })),
    toggleProjectGallery: () => set((state) => ({
      uiState: {
        ...state.uiState,
        showProjectGallery: !state.uiState.showProjectGallery
      }
    })),
    setLoading: (loading) => set((state) => ({
      uiState: { ...state.uiState, loading }
    })),
    setActiveWorkspace: (workspace) => set((state) => ({
      uiState: { ...state.uiState, activeWorkspace: workspace }
    })),
    
    // 预算操作
    setBudgetInfo: (info) => set({ budgetInfo: info }),
  }
}));
