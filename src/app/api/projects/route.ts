import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db';

export async function GET() {
  try {
    const result = await withDatabase(async (pg) => {
      const projectsQuery = await pg.query(`
        SELECT 
          p.id, p.title, p.description, p.project_type as type, 
          p.status, p.created_at, p.updated_at,
          COUNT(a.id) as asset_count,
          MAX(a.updated_at) as last_asset_update
        FROM projects p
        LEFT JOIN assets a ON p.id = a.project_id
        GROUP BY p.id, p.title, p.description, p.project_type, p.status, p.created_at, p.updated_at
        ORDER BY p.updated_at DESC
        LIMIT 50
      `);

      return projectsQuery.rows.map((row: { id: string; title: string; description: string; type: string; status: string; asset_count: string; created_at: Date; updated_at: Date }) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        status: row.status,
        assetCount: parseInt(row.asset_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, type, description } = await req.json();

    if (!title || !type) {
      return NextResponse.json(
        { error: '项目标题和类型不能为空' },
        { status: 400 }
      );
    }

    if (type !== 'single_image') {
      return NextResponse.json(
        { error: '项目类型必须是 single_image' },
        { status: 400 }
      );
    }

    const result = await withDatabase(async (pg, mongo) => {
      // 使用事务确保数据一致性
      const client = await pg.connect();
      
      try {
        await client.query('BEGIN');

        // 1. 在PostgreSQL中创建项目（不再需要user_id）
        const projectQuery = await client.query(`
          INSERT INTO projects (title, description, project_type, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, title, description, project_type as type, status, created_at, updated_at
        `, [title, description || null, type, 'draft']);

        const project = projectQuery.rows[0];

        // 2. 在MongoDB中创建初始草图记录
        const sketchesCollection = mongo.db().collection('sketches');
        await sketchesCollection.insertOne({
          project_id: project.id,
          fabric_json: {
            version: '6.0.0',
            objects: [],
            background: '#ffffff'
          },
          metadata: {
            canvas_size: { width: 1024, height: 1024 },
            brush_strokes_count: 0,
            total_objects: 0
          },
          created_at: new Date(),
          updated_at: new Date()
        });

        await client.query('COMMIT');

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          type: project.type,
          status: project.status,
          createdAt: project.created_at,
          updatedAt: project.updated_at
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    );
  }
}
