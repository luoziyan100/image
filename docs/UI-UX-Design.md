# image2video - UI/UX设计规范文档

**版本**: v1.0  
**最后更新**: 2025-08-31  
**设计理念**: 简洁直观，专注创作体验

---

## 目录

1. [设计原则](#设计原则)
2. [组件系统](#组件系统)
3. [页面布局设计](#页面布局设计)
4. [交互状态管理](#交互状态管理)
5. [React组件架构](#react组件架构)
6. [状态管理方案](#状态管理方案)
7. [响应式设计](#响应式设计)
8. [用户体验流程](#用户体验流程)
9. [错误处理界面](#错误处理界面)
10. [性能优化策略](#性能优化策略)

---

## 设计原则

### 核心理念
- **创作优先**: 界面为创作服务，减少认知负担
- **即时反馈**: 每个操作都有清晰的状态反馈
- **渐进式披露**: 复杂功能逐步展示，避免信息过载
- **一致性**: 统一的视觉语言和交互模式

### 视觉设计系统
```
色彩系统:
主色调: #6366F1 (Indigo-500) - 创意科技感
辅色调: #F59E0B (Amber-500) - 激活状态
成功色: #10B981 (Emerald-500) - 完成状态
警告色: #F59E0B (Amber-500) - 等待状态
危险色: #EF4444 (Red-500) - 错误状态
中性色: #6B7280 (Gray-500) - 辅助信息

字体系统:
标题: Inter 700 (28px/32px/24px)
正文: Inter 400 (16px/14px)
代码: JetBrains Mono 400 (14px)

间距系统:
xs: 4px   sm: 8px   md: 16px   lg: 24px   xl: 32px   2xl: 48px
```

---

## 组件系统

### 1. 工具栏组件 (Toolbar)

```typescript
interface ToolbarProps {
  activeMode: 'single' | 'comic';
  activeTool: 'draw' | 'erase' | 'upload';
  brushColor: string;
  brushSize: number;
  onModeChange: (mode: 'single' | 'comic') => void;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// 工具栏布局结构
function Toolbar({ ...props }: ToolbarProps) {
  return (
    <div className="toolbar-container bg-white border-b border-gray-200 p-4">
      {/* 模式切换区 */}
      <div className="mode-section">
        <ToggleGroup value={activeMode} onValueChange={onModeChange}>
          <ToggleItem value="single">🎯 单图</ToggleItem>
          <ToggleItem value="comic">📚 连环画</ToggleItem>
        </ToggleGroup>
      </div>
      
      <Separator orientation="vertical" />
      
      {/* 绘图工具区 */}
      <div className="tools-section">
        <ToolButton 
          icon="✏️" 
          label="绘制" 
          active={activeTool === 'draw'}
          onClick={() => onToolChange('draw')}
        />
        
        <ColorPicker 
          value={brushColor} 
          onChange={onColorChange}
          trigger={
            <ToolButton 
              icon="🎨" 
              label={brushColor}
              style={{ backgroundColor: brushColor }}
            />
          }
        />
        
        <BrushSizeSlider 
          value={brushSize} 
          onChange={onSizeChange}
          trigger={
            <ToolButton 
              icon="💧" 
              label={`${brushSize}px`}
            />
          }
        />
        
        <ToolButton 
          icon="🧽" 
          label="擦除"
          active={activeTool === 'erase'}
          onClick={() => onToolChange('erase')}
        />
        
        <ToolButton 
          icon="📷" 
          label="上传"
          onClick={() => onToolChange('upload')}
        />
      </div>
      
      <Separator orientation="vertical" />
      
      {/* 编辑操作区 */}
      <div className="edit-section">
        <ToolButton 
          icon="🔄" 
          label="撤销"
          disabled={!canUndo}
          onClick={onUndo}
        />
        
        <ToolButton 
          icon="↩️" 
          label="重做"
          disabled={!canRedo}
          onClick={onRedo}
        />
        
        <ToolButton 
          icon="🗑️" 
          label="清空"
          variant="danger"
          onClick={onClear}
        />
      </div>
    </div>
  );
}
```

### 2. 画布组件 (Canvas)

```typescript
interface CanvasProps {
  projectId?: string;
  width: number;
  height: number;
  activeTool: string;
  brushColor: string;
  brushSize: number;
  onCanvasChange: (hasChanges: boolean) => void;
  onImageUpload: (file: File) => void;
  isGenerating: boolean;
}

function Canvas({ ...props }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const autoSaveRef = useRef<AutoSaveManager | null>(null);
  
  // 画布初始化
  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: props.width,
        height: props.height,
        backgroundColor: '#ffffff',
        isDrawingMode: false
      });
      
      // 设置事件监听
      setupCanvasEvents();
      
      // 初始化自动保存
      if (props.projectId) {
        autoSaveRef.current = new AutoSaveManager(
          props.projectId,
          fabricRef.current,
          apiClient
        );
      }
    }
    
    return () => {
      autoSaveRef.current?.destroy();
    };
  }, []);
  
  // 工具切换逻辑
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    switch (props.activeTool) {
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = props.brushColor;
        canvas.freeDrawingBrush.width = props.brushSize;
        break;
        
      case 'erase':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
        canvas.freeDrawingBrush.width = props.brushSize;
        break;
        
      case 'upload':
        canvas.isDrawingMode = false;
        // 触发文件上传
        triggerFileUpload();
        break;
        
      default:
        canvas.isDrawingMode = false;
    }
  }, [props.activeTool, props.brushColor, props.brushSize]);
  
  return (
    <div className="canvas-container relative">
      {/* 画布区域 */}
      <div className="canvas-wrapper border-2 border-gray-200 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} />
        
        {/* 加载遮罩 */}
        {props.isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-lg font-medium">AI正在生成中...</p>
              <p className="text-sm text-gray-500">请勿关闭页面</p>
            </div>
          </div>
        )}
        
        {/* 空状态提示 */}
        {!hasContent && !props.isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-xl font-medium">开始你的创作</p>
              <p className="text-sm">在这里绘制或拖拽图片</p>
            </div>
          </div>
        )}
      </div>
      
      {/* 拖拽上传区域 */}
      <DropZone 
        onFilesDrop={handleFileDrop}
        className="absolute inset-0 pointer-events-none"
        activeClassName="pointer-events-auto bg-blue-50 border-blue-300"
      />
    </div>
  );
}
```

### 3. 状态通知组件 (StatusNotification)

```typescript
interface NotificationProps {
  type: 'save' | 'generate' | 'success' | 'error' | 'cost';
  message: string;
  details?: string;
  progress?: number;
  action?: { label: string; onClick: () => void };
  autoHide?: boolean;
  duration?: number;
}

function StatusNotification({ ...props }: NotificationProps) {
  const getNotificationStyle = (type: string) => {
    const styles = {
      save: 'bg-blue-50 border-blue-200 text-blue-800',
      generate: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      cost: 'bg-purple-50 border-purple-200 text-purple-800'
    };
    return styles[type] || styles.save;
  };
  
  const getIcon = (type: string) => {
    const icons = {
      save: '💾',
      generate: '⏳', 
      success: '✅',
      error: '❌',
      cost: '💰'
    };
    return icons[type] || '📝';
  };
  
  return (
    <div className={`notification border rounded-lg p-4 ${getNotificationStyle(props.type)}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{getIcon(props.type)}</span>
        
        <div className="flex-1">
          <p className="font-medium">{props.message}</p>
          
          {props.details && (
            <p className="text-sm opacity-75 mt-1">{props.details}</p>
          )}
          
          {props.progress !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>进度</span>
                <span>{props.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-current h-2 rounded-full transition-all duration-300"
                  style={{ width: `${props.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {props.action && (
            <button 
              onClick={props.action.onClick}
              className="mt-3 px-3 py-1 bg-white border border-current rounded text-sm hover:bg-gray-50"
            >
              {props.action.label}
            </button>
          )}
        </div>
        
        <button className="text-lg opacity-50 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}
```

### 4. 项目管理组件 (ProjectGallery)

```typescript
interface Project {
  id: string;
  title: string;
  type: 'single' | 'comic';
  thumbnail?: string;
  status: 'draft' | 'processing' | 'completed';
  createdAt: string;
  updatedAt: string;
}

function ProjectGallery() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'single' | 'comic' | 'processing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="project-gallery bg-gray-50 border-t border-gray-200">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">我的作品</h3>
          
          {/* 过滤标签 */}
          <div className="flex gap-2">
            <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
              🔥 最新
            </FilterTab>
            <FilterTab active={filter === 'single'} onClick={() => setFilter('single')}>
              🖼️ 单图
            </FilterTab>
            <FilterTab active={filter === 'comic'} onClick={() => setFilter('comic')}>
              📚 连环画
            </FilterTab>
            <FilterTab active={filter === 'processing'} onClick={() => setFilter('processing')}>
              ⏳ 生成中
            </FilterTab>
          </div>
        </div>
        
        {/* 搜索和操作 */}
        <div className="flex items-center gap-3">
          <SearchInput 
            placeholder="搜索作品..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Button variant="primary" onClick={handleNewProject}>
            ➕ 新建作品
          </Button>
        </div>
      </div>
      
      {/* 项目网格 */}
      <div className="p-4">
        <div className="grid grid-cols-6 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
          
          {/* 新建项目卡片 */}
          <NewProjectCard onClick={handleNewProject} />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const getStatusIndicator = (status: string) => {
    const indicators = {
      draft: '📝',
      processing: '⏳',
      completed: '✅'
    };
    return indicators[status] || '❓';
  };
  
  return (
    <div className="project-card group cursor-pointer">
      <div className="relative bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
        {/* 缩略图区域 */}
        <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden">
          {project.thumbnail ? (
            <img 
              src={project.thumbnail} 
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {project.type === 'comic' ? '📚' : '🖼️'}
            </div>
          )}
          
          {/* 状态覆盖层 */}
          <div className="absolute top-2 right-2">
            <span className="bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs">
              {getStatusIndicator(project.status)}
            </span>
          </div>
        </div>
        
        {/* 项目信息 */}
        <div className="p-3">
          <h4 className="font-medium text-sm truncate">{project.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {formatRelativeTime(project.updatedAt)}
          </p>
        </div>
        
        {/* 悬停操作 */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary">打开</Button>
          <Button size="sm" variant="secondary">复制</Button>
          <Button size="sm" variant="danger">删除</Button>
        </div>
      </div>
    </div>
  );
}
```

### 5. 生成进度组件 (GenerationProgress)

```typescript
interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: number;
  progress?: number;
}

interface GenerationProgressProps {
  assetId: string;
  steps: GenerationStep[];
  onCancel: () => void;
  onComplete: (result: any) => void;
}

function GenerationProgress({ assetId, steps, onCancel, onComplete }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [queuePosition, setQueuePosition] = useState(0);
  
  // 状态轮询逻辑
  useEffect(() => {
    const poller = new TaskStatusPoller(apiClient);
    
    poller.startPolling(assetId, (status) => {
      updateStepsFromStatus(status);
      
      if (status.status === 'completed') {
        onComplete(status);
      } else if (status.status === 'failed') {
        handleGenerationFailure(status);
      }
    });
    
    return () => poller.stopPolling(assetId);
  }, [assetId]);
  
  return (
    <div className="generation-progress max-w-2xl mx-auto p-6">
      {/* 进度标题 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🚀 AI正在生成你的作品
        </h2>
        <p className="text-gray-600">
          预计剩余时间: {estimatedTime}秒 | 队列位置: {queuePosition}/12
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
              {currentStep >= 2 ? '🎨 即将完成...' : '⏳ 等待生成...'}
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

function getStepIcon(status: string, stepNumber: number) {
  switch (status) {
    case 'completed': return '✅';
    case 'processing': return '⏳';
    case 'failed': return '❌';
    default: return stepNumber.toString();
  }
}

function getStepIconStyle(status: string) {
  const styles = {
    pending: 'bg-gray-100 text-gray-500',
    processing: 'bg-yellow-100 text-yellow-700 animate-pulse',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700'
  };
  return styles[status] || styles.pending;
}
```

---

## 交互状态管理

### 应用级状态管理

```typescript
// 使用 Zustand 进行状态管理
interface AppState {
  // 用户状态
  user: User | null;
  isAuthenticated: boolean;
  
  // 当前项目状态
  currentProject: Project | null;
  projectsList: Project[];
  
  // 画布状态
  canvasState: {
    activeTool: 'draw' | 'erase' | 'upload';
    brushColor: string;
    brushSize: number;
    hasUnsavedChanges: boolean;
    lastSavedAt: Date | null;
  };
  
  // 生成状态
  generationState: {
    isGenerating: boolean;
    currentAsset: string | null;
    progress: GenerationStep[];
    queue: AssetGenerationTask[];
  };
  
  // UI状态
  uiState: {
    sidebarCollapsed: boolean;
    showProjectGallery: boolean;
    notifications: Notification[];
    modals: Modal[];
  };
  
  // 动作方法
  actions: {
    // 用户操作
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    
    // 项目操作
    createProject: (data: CreateProjectData) => Promise<Project>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    loadProjects: () => Promise<void>;
    
    // 画布操作
    setActiveTool: (tool: string) => void;
    setBrushColor: (color: string) => void;
    setBrushSize: (size: number) => void;
    markCanvasChanged: () => void;
    markCanvasSaved: () => void;
    
    // 生成操作
    startGeneration: (projectId: string) => Promise<void>;
    cancelGeneration: (assetId: string) => Promise<void>;
    updateGenerationProgress: (assetId: string, progress: any) => void;
    
    // UI操作
    showNotification: (notification: Notification) => void;
    hideNotification: (id: string) => void;
    openModal: (modal: Modal) => void;
    closeModal: (id: string) => void;
  };
}

// Zustand store 实现
export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  user: null,
  isAuthenticated: false,
  currentProject: null,
  projectsList: [],
  
  canvasState: {
    activeTool: 'draw',
    brushColor: '#000000',
    brushSize: 5,
    hasUnsavedChanges: false,
    lastSavedAt: null
  },
  
  generationState: {
    isGenerating: false,
    currentAsset: null,
    progress: [],
    queue: []
  },
  
  uiState: {
    sidebarCollapsed: false,
    showProjectGallery: true,
    notifications: [],
    modals: []
  },
  
  actions: {
    // 画布操作实现
    setActiveTool: (tool) => {
      set((state) => ({
        canvasState: {
          ...state.canvasState,
          activeTool: tool
        }
      }));
    },
    
    setBrushColor: (color) => {
      set((state) => ({
        canvasState: {
          ...state.canvasState,
          brushColor: color
        }
      }));
    },
    
    setBrushSize: (size) => {
      set((state) => ({
        canvasState: {
          ...state.canvasState,
          brushSize: size
        }
      }));
    },
    
    markCanvasChanged: () => {
      set((state) => ({
        canvasState: {
          ...state.canvasState,
          hasUnsavedChanges: true
        }
      }));
    },
    
    markCanvasSaved: () => {
      set((state) => ({
        canvasState: {
          ...state.canvasState,
          hasUnsavedChanges: false,
          lastSavedAt: new Date()
        }
      }));
    },
    
    // 通知管理
    showNotification: (notification) => {
      const id = `notif_${Date.now()}`;
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
    
    hideNotification: (id) => {
      set((state) => ({
        uiState: {
          ...state.uiState,
          notifications: state.uiState.notifications.filter(n => n.id !== id)
        }
      }));
    }
  }
}));
```

---

## 页面布局设计

### 主应用布局组件

```typescript
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, uiState, actions } = useAppStore();
  
  return (
    <div className="app-layout min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <Header />
      
      {/* 主要内容区域 */}
      <main className="main-content">
        {children}
      </main>
      
      {/* 通知系统 */}
      <NotificationContainer 
        notifications={uiState.notifications}
        onHide={actions.hideNotification}
      />
      
      {/* 模态框系统 */}
      <ModalContainer 
        modals={uiState.modals}
        onClose={actions.closeModal}
      />
    </div>
  );
}

function Header() {
  const { user, isAuthenticated, canvasState } = useAppStore();
  
  return (
    <header className="header bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧Logo和项目信息 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">🎨 Image2Video</h1>
          </div>
          
          {/* 项目状态 */}
          {canvasState.hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              未保存的更改
            </div>
          )}
          
          {canvasState.lastSavedAt && (
            <div className="text-sm text-gray-500">
              💾 已保存 {formatRelativeTime(canvasState.lastSavedAt)}
            </div>
          )}
        </div>
        
        {/* 右侧用户菜单 */}
        <div className="flex items-center gap-4">
          {/* 预算显示 */}
          <BudgetIndicator />
          
          {/* 用户菜单 */}
          {isAuthenticated ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">登录</Button>
              <Button variant="primary" size="sm">注册</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BudgetIndicator() {
  const [budget, setBudget] = useState({ remaining: 0, total: 10000 });
  
  useEffect(() => {
    // 定期获取预算信息
    const fetchBudget = async () => {
      const response = await apiClient.getBudgetInfo();
      setBudget(response.data);
    };
    
    fetchBudget();
    const interval = setInterval(fetchBudget, 60000); // 每分钟更新
    
    return () => clearInterval(interval);
  }, []);
  
  const usagePercent = ((budget.total - budget.remaining) / budget.total) * 100;
  const getIndicatorColor = (percent: number) => {
    if (percent >= 95) return 'text-red-600';
    if (percent >= 80) return 'text-amber-600';
    return 'text-green-600';
  };
  
  return (
    <div className="budget-indicator flex items-center gap-2">
      <span className="text-sm text-gray-600">预算:</span>
      <span className={`font-medium ${getIndicatorColor(usagePercent)}`}>
        💰 ¥{(budget.remaining / 100).toFixed(2)}
      </span>
      
      {/* 预算悬浮提示 */}
      <Tooltip content={`本月已使用 ${usagePercent.toFixed(1)}%`}>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              usagePercent >= 95 ? 'bg-red-500' :
              usagePercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </Tooltip>
    </div>
  );
}
```

---

## 创作页面完整布局

### 主创作界面组件

```typescript
function CreationPage() {
  const { 
    currentProject, 
    canvasState, 
    generationState, 
    actions 
  } = useAppStore();
  
  const [showProjectGallery, setShowProjectGallery] = useState(true);
  
  return (
    <div className="creation-page flex flex-col h-[calc(100vh-73px)]">
      {/* 工具栏 */}
      <Toolbar 
        activeMode={currentProject?.type || 'single'}
        activeTool={canvasState.activeTool}
        brushColor={canvasState.brushColor}
        brushSize={canvasState.brushSize}
        onModeChange={(mode) => actions.setProjectMode(mode)}
        onToolChange={actions.setActiveTool}
        onColorChange={actions.setBrushColor}
        onSizeChange={actions.setBrushSize}
        onUndo={() => fabricCanvasRef.current?.undo()}
        onRedo={() => fabricCanvasRef.current?.redo()}
        onClear={() => handleClearCanvas()}
        canUndo={canUndoRef.current}
        canRedo={canRedoRef.current}
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 画布区域 */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Canvas 
              projectId={currentProject?.id}
              width={1024}
              height={1024}
              activeTool={canvasState.activeTool}
              brushColor={canvasState.brushColor}
              brushSize={canvasState.brushSize}
              onCanvasChange={actions.markCanvasChanged}
              onImageUpload={handleImageUpload}
              isGenerating={generationState.isGenerating}
            />
          </div>
        </div>
        
        {/* 操作按钮栏 */}
        <div className="action-bar bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={!canvasState.hasUnsavedChanges}
            >
              💾 保存草稿
            </Button>
            
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleGenerateImage}
              disabled={generationState.isGenerating || !hasCanvasContent}
              className="min-w-[160px]"
            >
              {generationState.isGenerating ? (
                <>⏳ 生成中...</>
              ) : (
                <>🚀 生成图片</>
              )}
            </Button>
            
            <Button variant="outline" onClick={handlePreview}>
              👁️ 预览
            </Button>
            
            <Button variant="outline" onClick={handleShare}>
              📤 分享
            </Button>
          </div>
        </div>
        
        {/* 项目画廊 */}
        {showProjectGallery && (
          <ProjectGallery 
            onClose={() => setShowProjectGallery(false)}
            onProjectSelect={handleProjectSelect}
          />
        )}
      </div>
      
      {/* 生成进度覆盖层 */}
      {generationState.isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <GenerationProgress 
              assetId={generationState.currentAsset}
              steps={generationState.progress}
              onCancel={handleCancelGeneration}
              onComplete={handleGenerationComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 连环画模式界面

### 多帧管理组件

```typescript
function ComicStripEditor() {
  const [frames, setFrames] = useState<ComicFrame[]>([]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  
  return (
    <div className="comic-editor h-full flex flex-col">
      {/* 帧导航栏 */}
      <div className="frames-nav bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">帧序列:</span>
          
          <div className="flex items-center gap-2">
            {frames.map((frame, index) => (
              <FrameTab 
                key={frame.id}
                frame={frame}
                index={index}
                active={activeFrame === index}
                onClick={() => setActiveFrame(index)}
                onDelete={() => handleDeleteFrame(index)}
                onDuplicate={() => handleDuplicateFrame(index)}
              />
            ))}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddFrame}
              className="border-dashed"
            >
              ➕ 添加帧
            </Button>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? '✏️ 编辑' : '👁️ 预览'}
            </Button>
            
            <Button variant="primary" size="sm">
              🎬 生成视频
            </Button>
          </div>
        </div>
      </div>
      
      {/* 主编辑区域 */}
      <div className="flex-1 flex">
        {/* 当前帧编辑 */}
        <div className="flex-1 p-6">
          {previewMode ? (
            <ComicPreview frames={frames} />
          ) : (
            <div className="max-w-3xl mx-auto">
              {frames[activeFrame] && (
                <FrameEditor 
                  frame={frames[activeFrame]}
                  onUpdate={(data) => handleUpdateFrame(activeFrame, data)}
                />
              )}
            </div>
          )}
        </div>
        
        {/* 右侧参考面板 */}
        {!previewMode && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <ReferencePanel 
              currentFrame={activeFrame}
              frames={frames}
              onApplyReference={handleApplyReference}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FrameTab({ frame, index, active, onClick, onDelete, onDuplicate }) {
  const getFrameStatus = (frame) => {
    if (frame.generatedImage) return '✅';
    if (frame.isGenerating) return '⏳';
    if (frame.hasContent) return '📝';
    return '⭕';
  };
  
  return (
    <div 
      className={`frame-tab relative group cursor-pointer border rounded-lg p-2 min-w-[80px] text-center transition-all ${
        active 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
      onClick={onClick}
    >
      {/* 帧缩略图 */}
      <div className="w-12 h-12 mx-auto mb-1 bg-gray-100 rounded border">
        {frame.thumbnail ? (
          <img src={frame.thumbnail} alt={`Frame ${index + 1}`} className="w-full h-full object-cover rounded" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            {index + 1}
          </div>
        )}
      </div>
      
      {/* 状态和标签 */}
      <div className="text-xs">
        <span className="inline-block">{getFrameStatus(frame)}</span>
        <span className="ml-1">帧{index + 1}</span>
      </div>
      
      {/* 悬浮操作菜单 */}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="w-6 h-6 p-0">
              ⋯
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onDuplicate}>
              📋 复制帧
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              🗑️ 删除帧
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

---

## 核心交互逻辑

### 画布交互状态机

```typescript
// 画布交互状态定义
type CanvasInteractionState = 
  | 'idle'           // 空闲状态
  | 'drawing'        // 正在绘制
  | 'erasing'        // 正在擦除  
  | 'selecting'      // 选择对象
  | 'moving'         // 移动对象
  | 'uploading'      // 上传文件
  | 'generating';    // AI生成中

class CanvasStateMachine {
  private state: CanvasInteractionState = 'idle';
  private canvas: fabric.Canvas;
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupCanvasEvents();
  }
  
  // 状态转换
  transition(newState: CanvasInteractionState) {
    const oldState = this.state;
    this.state = newState;
    
    // 状态进入处理
    this.onStateEnter(newState, oldState);
    
    // 触发状态变更事件
    this.emit('stateChange', { from: oldState, to: newState });
  }
  
  private onStateEnter(state: CanvasInteractionState, fromState: CanvasInteractionState) {
    switch (state) {
      case 'drawing':
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
        this.updateCursor('crosshair');
        break;
        
      case 'erasing':
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas);
        this.updateCursor('grab');
        break;
        
      case 'selecting':
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.updateCursor('default');
        break;
        
      case 'generating':
        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.disableAllInteractions();
        this.updateCursor('wait');
        break;
        
      case 'idle':
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.updateCursor('default');
        break;
    }
  }
  
  private setupCanvasEvents() {
    // 绘制事件
    this.canvas.on('path:created', (e) => {
      if (this.state === 'drawing') {
        this.emit('contentChanged', { type: 'draw', path: e.path });
      }
    });
    
    // 对象修改事件
    this.canvas.on('object:modified', (e) => {
      this.emit('contentChanged', { type: 'modify', object: e.target });
    });
    
    // 对象选择事件
    this.canvas.on('selection:created', (e) => {
      if (this.state === 'idle') {
        this.transition('selecting');
      }
    });
    
    this.canvas.on('selection:cleared', (e) => {
      if (this.state === 'selecting') {
        this.transition('idle');
      }
    });
  }
  
  // 事件发布订阅
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }
  
  private updateCursor(cursor: string) {
    this.canvas.defaultCursor = cursor;
    this.canvas.renderAll();
  }
  
  private disableAllInteractions() {
    this.canvas.selection = false;
    this.canvas.forEachObject(obj => {
      obj.selectable = false;
      obj.evented = false;
    });
  }
}
```

### 自动保存管理器

```typescript
class AutoSaveManager {
  private projectId: string;
  private canvas: fabric.Canvas;
  private apiClient: ApiClient;
  private localStorageManager: LocalStorageManager;
  
  // 保存配置
  private saveInterval = 30000;     // 30秒定时保存
  private changeThreshold = 5;      // 5次修改后强制保存
  private maxRetries = 3;           // 最大重试次数
  
  // 状态跟踪
  private unsavedChanges = 0;
  private lastSaveTime = Date.now();
  private saveTimer: NodeJS.Timeout | null = null;
  private isSaving = false;
  private saveQueue: Promise<void> = Promise.resolve();
  
  constructor(projectId: string, canvas: fabric.Canvas, apiClient: ApiClient) {
    this.projectId = projectId;
    this.canvas = canvas;
    this.apiClient = apiClient;
    this.localStorageManager = new LocalStorageManager();
    
    this.setupEventListeners();
    this.startAutoSaveTimer();
    this.loadInitialDraft();
  }
  
  private setupEventListeners() {
    // 监听画布变化
    const canvasEvents = ['path:created', 'object:added', 'object:modified', 'object:removed'];
    canvasEvents.forEach(event => {
      this.canvas.on(event, () => this.onCanvasChange());
    });
    
    // 监听网络状态
    window.addEventListener('online', () => this.onNetworkOnline());
    window.addEventListener('offline', () => this.onNetworkOffline());
    
    // 页面卸载保护
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges > 0) {
        this.saveToLocal();
        e.preventDefault();
        e.returnValue = '您有未保存的修改，确定要离开吗？';
      }
    });
  }
  
  private onCanvasChange() {
    this.unsavedChanges++;
    
    // 立即本地保存
    this.saveToLocal();
    
    // 触发状态更新
    useAppStore.getState().actions.markCanvasChanged();
    
    // 达到阈值时云端保存
    if (this.unsavedChanges >= this.changeThreshold) {
      this.saveToCloud();
    }
  }
  
  private saveToLocal() {
    try {
      const canvasData = this.canvas.toJSON(['id', 'selectable', 'evented']);
      const draftData = {
        projectId: this.projectId,
        canvasData,
        unsavedChanges: this.unsavedChanges,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      this.localStorageManager.saveDraft(this.projectId, draftData);
      
    } catch (error) {
      console.error('Local save failed:', error);
      this.showNotification('本地保存失败', 'error');
    }
  }
  
  private saveToCloud() {
    // 使用队列确保保存操作的顺序性
    this.saveQueue = this.saveQueue.then(() => this.performCloudSave());
  }
  
  private async performCloudSave(): Promise<void> {
    if (this.isSaving || !navigator.onLine) {
      return;
    }
    
    this.isSaving = true;
    
    try {
      const canvasData = this.canvas.toJSON(['id', 'selectable', 'evented']);
      
      await this.apiClient.updateProjectSketch(this.projectId, {
        sketchData: canvasData,
        lastModified: new Date().toISOString()
      });
      
      // 保存成功
      this.unsavedChanges = 0;
      this.lastSaveTime = Date.now();
      
      // 清除本地草稿
      this.localStorageManager.clearDraft(this.projectId);
      
      // 更新状态
      useAppStore.getState().actions.markCanvasSaved();
      
      // 显示保存成功提示
      this.showNotification('已保存', 'save', { autoHide: true, duration: 2000 });
      
    } catch (error) {
      console.error('Cloud save failed:', error);
      this.showNotification('保存失败，已保存到本地', 'error');
      
      // 保存失败时确保本地副本存在
      this.saveToLocal();
      
    } finally {
      this.isSaving = false;
    }
  }
  
  private showNotification(message: string, type: string, options?: any) {
    useAppStore.getState().actions.showNotification({
      type,
      message,
      ...options
    });
  }
  
  // 加载初始草稿
  private async loadInitialDraft() {
    try {
      // 先尝试从云端加载
      if (navigator.onLine) {
        const cloudData = await this.apiClient.getProjectSketch(this.projectId);
        if (cloudData?.sketchData) {
          this.canvas.loadFromJSON(cloudData.sketchData, () => {
            this.canvas.renderAll();
            this.showNotification('已加载云端数据', 'success');
          });
          return;
        }
      }
      
      // 云端没有数据，检查本地草稿
      const localDraft = this.localStorageManager.loadDraft(this.projectId);
      if (localDraft) {
        const shouldRestore = await this.confirmDraftRestore(localDraft);
        if (shouldRestore) {
          this.canvas.loadFromJSON(localDraft.canvasData, () => {
            this.canvas.renderAll();
            this.unsavedChanges = localDraft.unsavedChanges || 0;
            this.showNotification('已恢复本地草稿', 'success');
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to load initial draft:', error);
    }
  }
  
  private async confirmDraftRestore(draft: any): Promise<boolean> {
    const lastModified = new Date(draft.timestamp).toLocaleString();
    
    return new Promise((resolve) => {
      useAppStore.getState().actions.openModal({
        id: 'confirm-draft-restore',
        title: '发现本地草稿',
        content: `发现本地草稿（${lastModified}），是否恢复？`,
        actions: [
          { label: '恢复', onClick: () => resolve(true), variant: 'primary' },
          { label: '丢弃', onClick: () => resolve(false), variant: 'outline' }
        ]
      });
    });
  }
  
  destroy() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    // 执行最后一次保存
    if (this.unsavedChanges > 0) {
      this.saveToLocal();
    }
  }
}
```

---

## 用户体验流程

### 1. 新用户引导流程

```
┌─ 首次访问 ─┐
│            │
│  Welcome!  │ → 注册/登录 → 创建首个项目 → 引导绘制 → AI生成体验
│            │
└────────────┘

引导步骤设计:
Step 1: 欢迎模态框
┌─────────────────────────────────────┐
│ 🎨 欢迎来到 Image2Video AI          │
│                                     │
│ ✨ 将草图变成精美作品                │
│ 🚀 支持单图和连环画创作              │
│ 💡 完全免费开始使用                 │
│                                     │
│ [🎯 开始创作] [📖 了解更多]         │
└─────────────────────────────────────┘

Step 2: 交互引导气泡
┌─ 画布区域 ──────────────────────┐
│                               │ ← "💡 在这里开始绘制你的创意"
│     [空白画布]                  │
│                               │
└───────────────────────────────────┘
     ↑
"🎨 选择画笔工具开始绘制"

Step 3: 生成引导
绘制完成后 → "🚀 点击这里让AI生成精美作品"
```

### 2. 错误处理用户体验

```typescript
// 错误处理组件
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

function ErrorFallback({ error, resetErrorBoundary }) {
  const getErrorUIByType = (error: Error) => {
    // 根据错误类型返回不同的UI
    if (error.message.includes('BUDGET_EXCEEDED')) {
      return {
        icon: '💰',
        title: '预算不足',
        message: '本月AI生成额度已用完',
        action: { label: '升级账户', href: '/pricing' },
        color: 'amber'
      };
    }
    
    if (error.message.includes('RATE_LIMIT')) {
      return {
        icon: '⏱️',
        title: '请求过于频繁',
        message: '请稍后再试，或升级获得更高配额',
        action: { label: '了解配额', href: '/pricing' },
        color: 'blue'
      };
    }
    
    if (error.message.includes('INPUT_REJECTED')) {
      return {
        icon: '🚫',
        title: '内容不符合规范',
        message: '请修改您的草图内容后重试',
        action: { label: '了解规范', href: '/guidelines' },
        color: 'red'
      };
    }
    
    // 默认错误
    return {
      icon: '😔',
      title: '出现了技术问题',
      message: '我们正在努力修复，请稍后重试',
      action: { label: '重试', onClick: resetErrorBoundary },
      color: 'gray'
    };
  };
  
  const errorUI = getErrorUIByType(error);
  
  return (
    <div className="error-fallback min-h-[400px] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{errorUI.icon}</div>
        <h2 className="text-xl font-bold mb-2">{errorUI.title}</h2>
        <p className="text-gray-600 mb-6">{errorUI.message}</p>
        
        <div className="flex gap-3 justify-center">
          {errorUI.action.onClick && (
            <Button 
              variant="primary"
              onClick={errorUI.action.onClick}
            >
              {errorUI.action.label}
            </Button>
          )}
          
          {errorUI.action.href && (
            <Button 
              variant="primary"
              asChild
            >
              <a href={errorUI.action.href}>{errorUI.action.label}</a>
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            🔄 刷新页面
          </Button>
        </div>
        
        {/* 开发环境显示详细错误 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              技术详情 (开发模式)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
```

### 3. 生成结果展示

```typescript
function GenerationResult({ asset }: { asset: Asset }) {
  const [showComparison, setShowComparison] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  
  return (
    <div className="generation-result max-w-4xl mx-auto p-6">
      {/* 成功标题 */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          生成完成！
        </h2>
        <p className="text-gray-600">
          您的创意已被AI转化为精美作品
        </p>
      </div>
      
      {/* 结果对比展示 */}
      {showComparison ? (
        <div className="comparison-view grid grid-cols-2 gap-8 mb-8">
          {/* 原始草图 */}
          <div className="text-center">
            <h3 className="font-medium mb-4 text-gray-700">原始草图</h3>
            <div className="aspect-square bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
              <img 
                src={asset.originalSketch} 
                alt="原始草图"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          {/* AI生成结果 */}
          <div className="text-center">
            <h3 className="font-medium mb-4 text-gray-700">AI生成结果</h3>
            <div className="aspect-square bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 overflow-hidden">
              <img 
                src={asset.generatedImage} 
                alt="AI生成结果"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      ) : (
        /* 全屏展示模式 */
        <div className="fullscreen-view mb-8">
          <div className="aspect-square max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
            <img 
              src={asset.generatedImage} 
              alt="AI生成结果"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
      
      {/* 生成信息 */}
      <div className="generation-info bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">模型版本</div>
            <div className="font-medium">{asset.aiModelVersion}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">生成耗时</div>
            <div className="font-medium">{(asset.processingTimeMs / 1000).toFixed(1)}s</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">生成费用</div>
            <div className="font-medium">¥{(asset.costCents / 100).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">分辨率</div>
            <div className="font-medium">1024×1024</div>
          </div>
        </div>
      </div>
      
      {/* 操作按钮组 */}
      <div className="actions-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={() => setShowComparison(!showComparison)}
          className="flex items-center gap-2"
        >
          {showComparison ? '🔍 全屏查看' : '⚖️ 对比查看'}
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleContinueEditing}
          className="flex items-center gap-2"
        >
          ✏️ 继续编辑
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleRegenerate}
          className="flex items-center gap-2"
        >
          🔄 重新生成
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleSaveToGallery}
          className="flex items-center gap-2"
        >
          💾 保存到作品集
        </Button>
      </div>
      
      {/* 分享和下载 */}
      <div className="share-download-section border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium mb-2">分享你的作品</h4>
            <p className="text-sm text-gray-600">让更多人看到你的创意</p>
          </div>
          
          <div className="flex gap-3">
            <ShareButton 
              platform="weibo"
              url={asset.shareUrl}
              image={asset.generatedImage}
            >
              微博分享
            </ShareButton>
            
            <ShareButton 
              platform="wechat"
              url={asset.shareUrl}
              image={asset.generatedImage}
            >
              微信分享
            </ShareButton>
            
            <DownloadButton 
              url={asset.generatedImage}
              filename={`${asset.project.title || 'AI作品'}.jpg`}
            >
              ⬇️ 下载
            </DownloadButton>
          </div>
        </div>
      </div>
      
      {/* 推荐下一步 */}
      <div className="next-steps bg-blue-50 rounded-lg p-4 mt-6">
        <h4 className="font-medium mb-2">💡 接下来你可以：</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <button className="text-left p-3 bg-white rounded border hover:border-blue-300 transition-colors">
            <div className="font-medium">📚 创建连环画</div>
            <div className="text-gray-600">基于此图片继续创作故事</div>
          </button>
          
          <button className="text-left p-3 bg-white rounded border hover:border-blue-300 transition-colors">
            <div className="font-medium">🎬 制作视频</div>
            <div className="text-gray-600">将作品合成为动态视频</div>
          </button>
          
          <button className="text-left p-3 bg-white rounded border hover:border-blue-300 transition-colors">
            <div className="font-medium">🆕 新建项目</div>
            <div className="text-gray-600">开始下一个创意项目</div>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 响应式设计

### 断点系统

```typescript
// 响应式断点定义
const breakpoints = {
  sm: '640px',   // 手机
  md: '768px',   // 平板
  lg: '1024px',  // 小桌面
  xl: '1280px',  // 大桌面
  '2xl': '1536px' // 超大屏
};

// 移动端布局适配
function MobileLayout() {
  return (
    <div className="mobile-layout h-screen flex flex-col">
      {/* 顶部状态栏 */}
      <header className="mobile-header bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">☰</Button>
            <h1 className="font-bold">Image2Video</h1>
          </div>
          <div className="flex items-center gap-2">
            <BudgetIndicator compact />
            <Button variant="ghost" size="sm">👤</Button>
          </div>
        </div>
      </header>
      
      {/* 画布区域 - 占据主要空间 */}
      <div className="flex-1 relative">
        <Canvas 
          width={Math.min(window.innerWidth - 32, 512)}
          height={Math.min(window.innerWidth - 32, 512)}
          activeTool={canvasState.activeTool}
          // ... 其他props
        />
      </div>
      
      {/* 底部工具栏 */}
      <div className="mobile-toolbar bg-white border-t px-4 py-3">
        <div className="flex items-center justify-around">
          <ToolButton icon="✏️" label="绘制" compact />
          <ToolButton icon="🎨" label="颜色" compact />
          <ToolButton icon="🧽" label="擦除" compact />
          <ToolButton icon="📷" label="上传" compact />
          <ToolButton icon="🚀" label="生成" compact primary />
        </div>
      </div>
      
      {/* 移动端项目抽屉 */}
      <ProjectDrawer />
    </div>
  );
}

// 平板端布局
function TabletLayout() {
  return (
    <div className="tablet-layout h-screen flex">
      {/* 左侧工具面板 */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold">工具</h2>
        </div>
        
        <div className="flex-1 p-4">
          <VerticalToolbar />
        </div>
        
        <div className="p-4 border-t">
          <Button variant="primary" size="lg" className="w-full">
            🚀 生成图片
          </Button>
        </div>
      </aside>
      
      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <Canvas 
            width={700}
            height={700}
            // ... props
          />
        </div>
        
        <ProjectGallery compact />
      </main>
    </div>
  );
}
```

---

## 性能优化策略

### 画布性能优化

```typescript
class CanvasPerformanceOptimizer {
  private canvas: fabric.Canvas;
  private renderThrottleTimer: number | null = null;
  private objectCache: Map<string, fabric.Object> = new Map();
  
  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupOptimizations();
  }
  
  private setupOptimizations() {
    // 1. 渲染节流
    this.canvas.on('after:render', () => {
      if (this.renderThrottleTimer) {
        clearTimeout(this.renderThrottleTimer);
      }
      
      this.renderThrottleTimer = setTimeout(() => {
        this.optimizeCanvasObjects();
      }, 100);
    });
    
    // 2. 对象缓存
    this.canvas.on('object:added', (e) => {
      const obj = e.target;
      if (obj.id) {
        this.objectCache.set(obj.id, obj);
      }
    });
    
    // 3. 内存清理
    this.canvas.on('object:removed', (e) => {
      const obj = e.target;
      if (obj.id) {
        this.objectCache.delete(obj.id);
      }
    });
  }
  
  private optimizeCanvasObjects() {
    const objects = this.canvas.getObjects();
    
    // 对于大量对象，启用对象分组
    if (objects.length > 50) {
      this.enableObjectGrouping();
    }
    
    // 对于复杂路径，启用简化
    objects.forEach(obj => {
      if (obj.type === 'path' && obj.path && obj.path.length > 1000) {
        this.simplifyPath(obj);
      }
    });
  }
  
  private enableObjectGrouping() {
    // 将静态对象分组以减少渲染开销
    const staticObjects = this.canvas.getObjects().filter(obj => !obj.isMoving);
    
    if (staticObjects.length > 20) {
      const group = new fabric.Group(staticObjects);
      this.canvas.remove(...staticObjects);
      this.canvas.add(group);
    }
  }
  
  private simplifyPath(pathObj: fabric.Path) {
    // 使用道格拉斯-普克算法简化路径
    // 这里是简化实现，实际可以使用专门的库
    if (pathObj.path && pathObj.path.length > 500) {
      // 简化逻辑...
      pathObj.setCoords();
    }
  }
}

// 图片懒加载组件
function LazyImage({ src, alt, className, placeholder }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = imgRef.current;
          if (img && !isLoaded) {
            img.src = src;
            observer.disconnect();
          }
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src, isLoaded]);
  
  return (
    <div className={`lazy-image-container ${className}`}>
      <img
        ref={imgRef}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
      />
      
      {/* 加载占位符 */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          {placeholder || <div className="text-gray-400">🖼️</div>}
        </div>
      )}
      
      {/* 错误占位符 */}
      {isError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400">❌ 加载失败</div>
        </div>
      )}
    </div>
  );
}
```

---

## 开发组件清单

### 必需组件 (MVP)

```typescript
// 核心组件优先级
const COMPONENT_PRIORITY = {
  // P0 - 最高优先级（MVP必需）
  p0: [
    'AppLayout',          // 应用整体布局
    'Header',             // 顶部导航栏
    'Toolbar',            // 绘图工具栏
    'Canvas',             // 主画布组件
    'StatusNotification', // 状态通知
    'GenerationProgress', // 生成进度
    'GenerationResult',   // 结果展示
    'ProjectGallery',     // 项目画廊
    'ErrorBoundary'       // 错误边界
  ],
  
  // P1 - 重要功能
  p1: [
    'ComicStripEditor',   // 连环画编辑器
    'FrameTab',           // 帧标签
    'ReferencePanel',     // 参考面板
    'BudgetIndicator',    // 预算指示器
    'UserMenu',           // 用户菜单
    'ShareButton',        // 分享按钮
    'DownloadButton'      // 下载按钮
  ],
  
  // P2 - 体验增强
  p2: [
    'OnboardingFlow',     // 新手引导
    'SettingsPanel',      // 设置面板
    'ProjectDrawer',      // 移动端项目抽屉
    'KeyboardShortcuts',  // 快捷键支持
    'ThemeProvider',      // 主题切换
    'LazyImage',          // 图片懒加载
    'VirtualizedList'     // 虚拟化列表
  ]
};
```

---

**文档总结**: 基于方案二的现代Web应用设计，采用组件化架构，完整的状态管理，优秀的用户体验，支持响应式设计和性能优化。所有组件都有详细的TypeScript接口定义和实现方案。

**下一步**: 基于此设计文档开始前端组件开发，按P0→P1→P2优先级顺序实施。