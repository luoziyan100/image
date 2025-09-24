'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { cn } from '@/utils/cn';
import type { Project } from '@/types';

interface ProjectGalleryProps {
  onClose: () => void;
  onProjectSelect: (project: Project) => void;
}

export function ProjectGallery({ onClose, onProjectSelect }: ProjectGalleryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'single_image' | 'processing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // 暂时使用模拟数据
      const mockProjects: Project[] = [
        {
          id: 'demo-project-1',
          title: '我的第一个创作',
          description: '在这里开始你的AI创作之旅',
          type: 'single_image',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnail: undefined
        }
      ];
      
      setProjects(mockProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadProjects();
  }, []);
  
  const handleNewProject = () => {
    const newProject: Project = {
      id: 'new-project-' + Date.now(),
      title: '新建项目',
      description: '',
      type: 'single_image',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProjects(prev => [newProject, ...prev]);
    onProjectSelect(newProject);
  };
  
  const filteredProjects = projects.filter(project => {
    if (filter !== 'all' && project.type !== filter && project.status !== filter) {
      return false;
    }
    
    if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  return (
    <div className="project-gallery fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[80vh] overflow-hidden">
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">我的作品</h3>
            
            {/* 过滤标签 */}
            <div className="flex gap-2">
              <FilterTab 
                active={filter === 'all'} 
                onClick={() => setFilter('all')}
              >
                🔥 最新
              </FilterTab>
              <FilterTab 
                active={filter === 'single_image'} 
                onClick={() => setFilter('single_image')}
              >
                🖼️ 单图
              </FilterTab>
              <FilterTab 
                active={filter === 'processing'} 
                onClick={() => setFilter('processing')}
              >
                ⏳ 生成中
              </FilterTab>
            </div>
          </div>
          
          {/* 搜索和操作 */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="搜索作品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
            />
            <Button variant="primary" onClick={handleNewProject}>
              ➕ 新建作品
            </Button>
            <Button variant="outline" onClick={onClose}>
              ✕ 关闭
            </Button>
          </div>
        </div>
        
        {/* 项目网格 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">加载中...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* 新建项目卡片 */}
              <NewProjectCard onClick={handleNewProject} />
              
              {/* 项目卡片 */}
              {filteredProjects.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onClick={() => onProjectSelect(project)}
                />
              ))}
            </div>
          )}
          
          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">暂无作品</h3>
              <p className="text-gray-500 mb-4">开始创建你的第一个AI作品吧</p>
              <Button variant="primary" onClick={handleNewProject}>
                🚀 开始创作
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterTabProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function FilterTab({ children, active, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const getStatusIndicator = (status: string) => {
    const indicators: { [key: string]: string } = {
      draft: '📝',
      processing: '⏳',
      completed: '✅',
      failed: '❌'
    };
    return indicators[status] || '❓';
  };
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 60000) return '刚刚';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`;
    return `${Math.floor(diffMs / 86400000)}天前`;
  };
  
  return (
    <div className="project-card group cursor-pointer" onClick={onClick}>
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
              🖼️
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
          <Button size="sm" variant="outline" className="bg-white text-gray-800 hover:bg-gray-100">
            打开
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <div className="new-project-card cursor-pointer" onClick={onClick}>
      <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center">
        <div className="text-4xl mb-2">➕</div>
        <div className="text-sm font-medium text-gray-600">新建项目</div>
      </div>
    </div>
  );
}
