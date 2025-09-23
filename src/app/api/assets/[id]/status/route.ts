// Asset status endpoint for polling queue results

import { NextRequest, NextResponse } from 'next/server';
import { getAssetStatus } from '@/lib/asset-service';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const res = await getAssetStatus(id);
    if (!res.success) {
      return NextResponse.json(res, { status: 404 });
    }
    return NextResponse.json(res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message }, { status: 500 });
  }
}
