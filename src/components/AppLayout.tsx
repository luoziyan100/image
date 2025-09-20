'use client';

import { useAppStore } from '@/stores/app-store';
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
