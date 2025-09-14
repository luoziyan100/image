'use client';

import { useAppStore } from '@/stores/app-store';
import { Button } from './ui/Button';
import { Navigation } from './Navigation';
import type { Notification } from '@/types';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { uiState, actions } = useAppStore();

  return (
    <div className="app-layout min-h-screen bg-gray-50">
      {/* 新的导航栏 */}
      <Navigation />
      
      {/* 主要内容区域 */}
      <main className="main-content">
        {children}
      </main>
      
      {/* 通知系统 */}
      <NotificationContainer 
        notifications={uiState.notifications}
        onHide={actions.hideNotification}
      />
    </div>
  );
}

function Header() {
  const { canvasState } = useAppStore();

  return (
    <header className="header bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm">登录</Button>
            <Button variant="primary" size="sm">注册</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function BudgetIndicator() {
  const { budgetInfo } = useAppStore();

  if (!budgetInfo) {
    return (
      <div className="budget-indicator flex items-center gap-2">
        <span className="text-sm text-gray-600">预算:</span>
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    );
  }

  const getIndicatorColor = (percent: number) => {
    if (percent >= 95) return 'text-red-600';
    if (percent >= 80) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="budget-indicator flex items-center gap-2">
      <span className="text-sm text-gray-600">预算:</span>
      <span className={`font-medium ${getIndicatorColor(budgetInfo.usagePercent)}`}>
        💰 ¥{(budgetInfo.remaining / 100).toFixed(2)}
      </span>
      
      {/* 预算进度条 */}
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden" title={`本月已使用 ${budgetInfo.usagePercent.toFixed(1)}%`}>
        <div 
          className={`h-full transition-all duration-300 ${
            budgetInfo.usagePercent >= 95 ? 'bg-red-500' :
            budgetInfo.usagePercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(budgetInfo.usagePercent, 100)}%` }}
        />
      </div>
    </div>
  );
}


interface NotificationContainerProps {
  notifications: Notification[];
  onHide: (id: string) => void;
}

function NotificationContainer({ 
  notifications, 
  onHide 
}: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container fixed top-20 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'save' ? '💾' : '📝'}
            </span>
            
            <div className="flex-1">
              <p className="font-medium text-sm">{notification.message}</p>
              {notification.details && (
                <p className="text-xs text-gray-500 mt-1">{notification.details}</p>
              )}
            </div>
            
            <button 
              onClick={() => notification.id && onHide(notification.id)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) return '刚刚';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`;
  return `${Math.floor(diffMs / 86400000)}天前`;
}