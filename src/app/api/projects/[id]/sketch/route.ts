import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await withDatabase(async (pg, mongo) => {
      // 1. 验证项目存在
      const projectQuery = await pg.query(
        'SELECT id FROM projects WHERE id = $1',
        [id]
      );

      if (projectQuery.rows.length === 0) {
        return null;
      }

      // 2. 获取草图数据
      const sketchesCollection = mongo.db().collection('sketches');
      const sketch = await sketchesCollection.findOne(
        { project_id: id },
        { sort: { updated_at: -1 } }
      );

      return {
        sketchData: sketch ? sketch.fabric_json : null,
        lastModified: sketch ? sketch.updated_at : null
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get project sketch error:', error);
    return NextResponse.json(
      { error: '获取草图数据失败' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { sketchData } = await req.json();

    if (!sketchData) {
      return NextResponse.json(
        { error: '草图数据不能为空' },
        { status: 400 }
      );
    }

    const result = await withDatabase(async (pg, mongo) => {
      // 1. 验证项目存在
      const projectQuery = await pg.query(
        'SELECT id FROM projects WHERE id = $1',
        [id]
      );

      if (projectQuery.rows.length === 0) {
        return null;
      }

      // 2. 更新草图数据
      const sketchesCollection = mongo.db().collection('sketches');
      
      const updateResult = await sketchesCollection.updateOne(
        { project_id: id },
        {
          $set: {
            fabric_json: sketchData,
            metadata: {
              canvas_size: { width: 1024, height: 1024 },
              brush_strokes_count: sketchData.objects?.filter((obj: { type: string }) => obj.type === 'path').length || 0,
              total_objects: sketchData.objects?.length || 0
            },
            updated_at: new Date()
          }
        },
        { upsert: true }
      );

      // 3. 更新项目的updated_at
      await pg.query(
        'UPDATE projects SET updated_at = NOW() WHERE id = $1',
        [id]
      );

      return {
        updated: updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0,
        lastModified: new Date().toISOString()
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Update project sketch error:', error);
    return NextResponse.json(
      { error: '保存草图失败' },
      { status: 500 }
    );
  }
}