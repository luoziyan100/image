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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PG error';
    results.postgres = { ok: false, error: message };
  }

  // MongoDB
  try {
    const t0 = Date.now();
    const mongo = await getMongoClient();
    await mongo.db().command({ ping: 1 });
    results.mongodb = { ok: true, latencyMs: Date.now() - t0 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Mongo error';
    results.mongodb = { ok: false, error: message };
  }

  // Redis
  try {
    const t0 = Date.now();
    const redis = getRedisClient();
    const pong = await redis.ping();
    results.redis = { ok: pong === 'PONG', latencyMs: Date.now() - t0 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Redis error';
    results.redis = { ok: false, error: message };
  }

  const ok = Object.values(results).every(r => r.ok);
  const body = {
    ok,
    totalLatencyMs: Date.now() - started,
    services: results
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
