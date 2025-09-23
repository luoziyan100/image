'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectGallery } from '@/components/ProjectGallery';
import { useAppStore } from '@/stores/app-store';

export default function ProjectsPage() {
  const router = useRouter();
  const { actions } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectGallery
        onClose={() => router.push('/')}
        onProjectSelect={(project) => {
          actions.setCurrentProject(project);
          router.push('/');
        }}
      />
    </div>
  );
}

