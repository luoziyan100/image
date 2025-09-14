import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await withDatabase(async (pg) => {
      const projectQuery = await pg.query(`
        SELECT id, title, description, project_type as type, status, created_at, updated_at
        FROM projects 
        WHERE id = $1
      `, [id]);

      if (projectQuery.rows.length === 0) {
        return null;
      }

      const project = projectQuery.rows[0];
      return {
        id: project.id,
        title: project.title,
        description: project.description,
        type: project.type,
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at
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
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: '获取项目失败' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const updates = await req.json();

    const allowedFields = ['title', 'description', 'status'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: '没有有效的更新字段' },
        { status: 400 }
      );
    }

    const result = await withDatabase(async (pg) => {
      // 构建动态更新查询
      const setClause = updateFields.map((field, index) => {
        const dbField = field === 'type' ? 'project_type' : field;
        return `${dbField} = $${index + 2}`;
      }).join(', ');

      const values = [id, ...updateFields.map(field => updates[field])];

      const projectQuery = await pg.query(`
        UPDATE projects 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, description, project_type as type, status, created_at, updated_at
      `, values);

      if (projectQuery.rows.length === 0) {
        return null;
      }

      const project = projectQuery.rows[0];
      return {
        id: project.id,
        title: project.title,
        description: project.description,
        type: project.type,
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at
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
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await withDatabase(async (pg, mongo) => {
      const client = await pg.connect();
      
      try {
        await client.query('BEGIN');

        // 1. 检查项目是否存在
        const projectQuery = await client.query(
          'SELECT id FROM projects WHERE id = $1',
          [id]
        );

        if (projectQuery.rows.length === 0) {
          await client.query('ROLLBACK');
          return false;
        }

        // 2. 删除PostgreSQL中的项目（级联删除assets）
        await client.query('DELETE FROM projects WHERE id = $1', [id]);

        // 3. 删除MongoDB中的草图数据
        const sketchesCollection = mongo.db().collection('sketches');
        await sketchesCollection.deleteMany({ project_id: id });

        await client.query('COMMIT');
        return true;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    if (!result) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '项目已删除'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: '删除项目失败' },
      { status: 500 }
    );
  }
}