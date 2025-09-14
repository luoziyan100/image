import { NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db';

export async function GET() {
  try {
    const result = await withDatabase(async (pg, mongo, redis) => {
      // 测试PostgreSQL连接
      const pgResult = await pg.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
      const currentTime = pgResult.rows[0].current_time;
      const userCount = pgResult.rows[0].user_count;

      // 测试MongoDB连接
      const sketchesCollection = mongo.db().collection('sketches');
      const sketchCount = await sketchesCollection.countDocuments();

      // 测试Redis连接
      await redis.set('test_key', 'test_value', 'EX', 10);
      const redisTest = await redis.get('test_key');

      return {
        postgresql: {
          connected: true,
          currentTime,
          userCount: parseInt(userCount)
        },
        mongodb: {
          connected: true,
          sketchCount
        },
        redis: {
          connected: redisTest === 'test_value',
          testValue: redisTest
        },
        timestamp: new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }, { status: 500 });
  }
}