// 数据库初始化API
// 仅用于开发环境快速搭建

import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/lib/database-config';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  try {
    // 仅在开发环境允许
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_SETUP_DISABLED',
        message: '数据库初始化仅在开发环境可用'
      }, { status: 403 });
    }
    
    console.log('🗄️ 开始初始化数据库...');
    
    // 读取SQL初始化脚本
    const sqlScript = readFileSync(
      join(process.cwd(), 'db/init/01-init-database.sql'), 
      'utf-8'
    );
    
    const result = await withDatabase(async (pg, mongo) => {
      // 执行PostgreSQL初始化
      console.log('📊 初始化PostgreSQL表结构...');
      await pg.query(sqlScript);
      
      // 初始化MongoDB集合和索引
      console.log('🍃 初始化MongoDB集合...');
      const db = mongo.db();
      
      // 创建sketches集合
      const sketchesCollection = db.collection('sketches');
      
      // 创建索引
      await sketchesCollection.createIndexes([
        { key: { user_id: 1 } },
        { key: { project_id: 1 } },
        { key: { created_at: -1 } },
        { key: { user_id: 1, project_id: 1 } }
      ]);
      
      console.log('✅ 数据库初始化完成');
      
      return {
        postgresql: '✅ 表结构创建完成',
        mongodb: '✅ 集合和索引创建完成'
      };
    });
    
    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      data: result
    });
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    
    return NextResponse.json({
      success: false,
      error: 'DATABASE_INIT_FAILED',
      message: error instanceof Error ? error.message : '数据库初始化失败'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 检查数据库连接状态
    const status = await withDatabase(async (pg, mongo, redis) => {
      // 检查PostgreSQL
      const pgResult = await pg.query('SELECT NOW() as current_time');
      const pgConnected = !!pgResult.rows[0];
      
      // 检查MongoDB
      const mongoConnected = await mongo.db().admin().ping();
      
      // 检查Redis
      const redisConnected = await redis.ping() === 'PONG';
      
      return {
        postgresql: pgConnected ? '✅ 已连接' : '❌ 连接失败',
        mongodb: mongoConnected ? '✅ 已连接' : '❌ 连接失败',
        redis: redisConnected ? '✅ 已连接' : '❌ 连接失败'
      };
    });
    
    return NextResponse.json({
      success: true,
      message: '数据库状态检查完成',
      data: status
    });
    
  } catch (error) {
    console.error('❌ 数据库状态检查失败:', error);
    
    return NextResponse.json({
      success: false,
      error: 'DATABASE_CHECK_FAILED',
      message: error instanceof Error ? error.message : '数据库连接检查失败'
    }, { status: 500 });
  }
}