// System health check endpoint
// Checks connectivity to Postgres, MongoDB, and Redis

import { NextResponse } from 'next/server';
import { getPgPool, getMongoClient, getRedisClient } from '@/lib/database-config';

export const runtime = 'nodejs';

export async function GET() {
  const results: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};
  const started = Date.now();

  // Postgres
  try {
    const t0 = Date.now();
    const pg = getPgPool();
    await pg.query('SELECT 1');
    results.postgres = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    results.postgres = { ok: false, error: e?.message || 'PG error' };
  }

  // MongoDB
  try {
    const t0 = Date.now();
    const mongo = await getMongoClient();
    await mongo.db().command({ ping: 1 });
    results.mongodb = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    results.mongodb = { ok: false, error: e?.message || 'Mongo error' };
  }

  // Redis
  try {
    const t0 = Date.now();
    const redis = getRedisClient();
    const pong = await redis.ping();
    results.redis = { ok: pong === 'PONG', latencyMs: Date.now() - t0 };
  } catch (e: any) {
    results.redis = { ok: false, error: e?.message || 'Redis error' };
  }

  const ok = Object.values(results).every(r => r.ok);
  const body = {
    ok,
    totalLatencyMs: Date.now() - started,
    services: results
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

