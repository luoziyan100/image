import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('id');

    if (!assetId) {
      return NextResponse.json(
        { error: '资产ID不能为空' },
        { status: 400 }
      );
    }

    const result = await withDatabase(async (pg) => {
      const assetQuery = await pg.query(`
        SELECT 
          a.id, a.project_id, a.source_sketch_id, a.storage_url,
          a.status, a.error_message, a.error_code, a.position_in_project,
          a.ai_model_version, a.generation_seed, a.processing_time_ms,
          a.created_at, a.updated_at
        FROM assets a
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1
      `, [assetId]);

      if (assetQuery.rows.length === 0) {
        return null;
      }

      const asset = assetQuery.rows[0];
      
      return {
        id: asset.id,
        projectId: asset.project_id,
        sourceSketchId: asset.source_sketch_id,
        storageUrl: asset.storage_url,
        status: asset.status,
        errorMessage: asset.error_message,
        errorCode: asset.error_code,
        positionInProject: asset.position_in_project,
        aiModelVersion: asset.ai_model_version,
        generationSeed: asset.generation_seed,
        processingTimeMs: asset.processing_time_ms,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: '资产不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get asset status error:', error);
    return NextResponse.json(
      { error: '获取资产状态失败' },
      { status: 500 }
    );
  }
}