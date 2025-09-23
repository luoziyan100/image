// 简易 Gemini 代理路由
// 目的：绕过浏览器直连可能出现的 CORS/网络不稳定问题
// 将来自客户端的请求转发到上游（tu-zi API），保留 Authorization 头，支持 JSON 与 FormData

import { NextRequest } from 'next/server';

const UPSTREAM_BASE = 'https://api.tu-zi.com';
const DEFAULT_TIMEOUT_MS = 150_000; // 150s，略高于前端默认

export const runtime = 'nodejs';

function buildUpstreamUrl(path: string[] | undefined): string {
  const joined = (path || []).join('/');
  // 本地代理的路由结构：/api/ai/proxy/gemini/<...path>
  // 映射到上游： https://api.tu-zi.com/<...path>
  return `${UPSTREAM_BASE}/${joined}`;
}

async function forwardWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const targetUrl = buildUpstreamUrl(path);

  // 只保留必要头部：Authorization 与 Content-Type（FormData 由 fetch 自动设置）
  const auth = req.headers.get('authorization') || '';
  const requestContentType = req.headers.get('content-type') || '';

  try {
    const timeout = Number(process.env.AI_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    let upstreamRes: Response;

    if (requestContentType.startsWith('multipart/form-data')) {
      const formData = await req.formData();
      upstreamRes = await forwardWithTimeout(targetUrl, {
        method: 'POST',
        headers: auth ? { Authorization: auth } : undefined,
        body: formData
      }, timeout);
    } else {
      const bodyText = await req.text();
      upstreamRes = await forwardWithTimeout(targetUrl, {
        method: 'POST',
        headers: {
          ...(auth ? { Authorization: auth } : {}),
          'Content-Type': requestContentType || 'application/json; charset=utf-8'
        },
        body: bodyText
      }, timeout);
    }

    // 正常响应：直接透传（支持流）
    if (upstreamRes.ok) {
      const headers = new Headers(upstreamRes.headers);
      headers.set('x-upstream-status', String(upstreamRes.status));
      return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
    }

    // 异常响应：读取文本并包装，便于前端可读（不影响状态码）
    const upstreamContentType = upstreamRes.headers.get('content-type') || '';
    let bodyText = '';
    try {
      bodyText = await upstreamRes.text();
    } catch {}

    const detail = bodyText?.slice(0, 2000);
    const json = {
      error: 'UPSTREAM_ERROR',
      upstreamStatus: upstreamRes.status,
      contentType: upstreamContentType,
      detail
    };

    return new Response(JSON.stringify(json), {
      status: upstreamRes.status,
      headers: { 'Content-Type': 'application/json', 'x-upstream-status': String(upstreamRes.status) }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('aborted') || message.includes('timeout') ? 504 : 500;
    return new Response(JSON.stringify({ error: 'AI_PROXY_ERROR', message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const targetUrl = buildUpstreamUrl(path);
  const auth = req.headers.get('authorization') || '';

  try {
    const timeout = Number(process.env.AI_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const res = await forwardWithTimeout(targetUrl, {
      headers: auth ? { Authorization: auth } : undefined
    }, timeout);
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set('x-upstream-status', String(res.status));
      return new Response(res.body, { status: res.status, headers });
    }
    let bodyText = '';
    try { bodyText = await res.text(); } catch {}
    const json = { error: 'UPSTREAM_ERROR', upstreamStatus: res.status, detail: bodyText?.slice(0, 2000) };
    return new Response(JSON.stringify(json), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('aborted') || message.includes('timeout') ? 504 : 500;
    return new Response(JSON.stringify({ error: 'AI_PROXY_ERROR', message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
