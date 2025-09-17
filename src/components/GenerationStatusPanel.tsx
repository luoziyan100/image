'use client';

import React from 'react';
import { aiService, type GenerationResult } from '@/lib/ai';

interface Props {
  assetId?: string | null; // server-queue path
  pollIntervalMs?: number;
}

// A small unified status panel that watches BYOK events and/or polls server asset status
export const GenerationStatusPanel: React.FC<Props> = ({ assetId, pollIntervalMs = 3000 }) => {
  const [byokStatus, setByokStatus] = React.useState<{
    requestId?: string;
    status?: string;
    provider?: string;
    error?: string;
    lastUpdated?: number;
  } | null>(null);

  const [serverStatus, setServerStatus] = React.useState<any>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Listen to BYOK events if available
  React.useEffect(() => {
    const listener = (evt: any) => {
      // Expect evt to have type/status/provider fields (best-effort)
      if (evt && (evt.type || evt.status)) {
        setByokStatus({
          requestId: evt.requestId || evt.id,
          status: evt.status,
          provider: evt.provider,
          error: evt.error?.message || evt.error,
          lastUpdated: Date.now()
        });
      }
    };
    aiService.addEventListener(listener);
    return () => aiService.removeEventListener(listener);
  }, []);

  // Poll server asset status if assetId provided
  React.useEffect(() => {
    if (!assetId) return;
    let stopped = false;
    let timer: any;
    const poll = async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}/status`);
        const data = await res.json();
        if (!stopped) {
          setServerStatus(data);
          setServerError(null);
        }
        const doneStatuses = ['completed', 'failed'];
        const status = data?.data?.status;
        if (!doneStatuses.includes(status)) {
          timer = setTimeout(poll, pollIntervalMs);
        }
      } catch (e: any) {
        if (!stopped) setServerError(e?.message || 'Poll failed');
        timer = setTimeout(poll, pollIntervalMs);
      }
    };
    poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [assetId, pollIntervalMs]);

  const hasAny = !!byokStatus || !!assetId;
  if (!hasAny) return null;

  return (
    <div className="generation-status-panel mt-3 p-3 border rounded-lg bg-white text-sm">
      <div className="font-medium text-gray-900 mb-2">生成状态</div>
      {/* BYOK block */}
      {byokStatus && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 mb-1">客户端通道（BYOK）</div>
          <div className="flex items-center justify-between">
            <div className="text-gray-800">{byokStatus.provider || 'Provider'}</div>
            <div className="text-gray-600">{byokStatus.status || 'active'}</div>
          </div>
          {byokStatus.error && (
            <div className="mt-1 text-red-600">{byokStatus.error}</div>
          )}
        </div>
      )}

      {/* Server queue block */}
      {assetId && (
        <div>
          <div className="text-xs text-gray-600 mb-1">服务端通道（队列）</div>
          {serverStatus?.success ? (
            <div className="flex items-center justify-between">
              <div className="text-gray-800">Asset: {assetId}</div>
              <div className="text-gray-600">{serverStatus.data?.status || 'unknown'}</div>
            </div>
          ) : (
            <div className="text-gray-600">查询中...</div>
          )}
          {serverError && <div className="mt-1 text-red-600">{serverError}</div>}
        </div>
      )}
    </div>
  );
};

export default GenerationStatusPanel;

