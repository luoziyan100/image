// Asset status endpoint for polling queue results

import { NextRequest, NextResponse } from 'next/server';
import { getAssetStatus } from '@/lib/asset-service';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await getAssetStatus(params.id);
    if (!res.success) {
      return NextResponse.json(res, { status: 404 });
    }
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: e?.message || 'Failed' }, { status: 500 });
  }
}

