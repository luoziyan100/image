'use client';

import React from 'react';
import { APIKeySettings } from '@/components/APIKeySettings';
import { AppLayout } from '@/components/AppLayout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="settings-page min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <APIKeySettings />
        </div>
      </div>
    </AppLayout>
  );
}