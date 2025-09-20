// 数据库配置和连接管理
// 基于技术架构文档的实现

import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';

interface FabricJson {
  version: string;
  objects: unknown[];
  background: string;
}

interface ProjectCreationData {
  title: string;
  description?: string;
  type: string;
  initialSketch?: FabricJson | null;
}

// PostgreSQL 连接池（模块作用域缓存）
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Serverless 优化配置
      max: 1,                     // 每个实例最多1个连接
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,   // 30秒空闲超时
      allowExitOnIdle: true       // 允许进程退出时关闭连接
    });
    
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  
  return pgPool;
}

// MongoDB 连接（模块作用域缓存）
let mongoClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URL!, {
      maxPoolSize: 1,           // 每个实例最多1个连接
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await mongoClient.connect();
  }
  
  return mongoClient;
}

// Redis 连接（模块作用域缓存）
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL!, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  
  return redisClient;
}

// 数据库操作封装
export async function withDatabase<T>(
  operation: (pg: Pool, mongo: MongoClient, redis: Redis) => Promise<T>
): Promise<T> {
  const pg = getPgPool();
  const mongo = await getMongoClient();
  const redis = getRedisClient();
  
  try {
    return await operation(pg, mongo, redis);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

// Saga模式事务实现
export async function createProjectSaga(projectData: ProjectCreationData, userId: string) {
  let projectId: string | null = null;
  let sketchId: string | null = null;
  
  try {
    // Step 1: PostgreSQL 事务
    const project = await createProjectInPg(projectData, userId);
    projectId = project.id;
    
    // Step 2: MongoDB 事务
    const sketch = await createSketchInMongo(projectData.initialSketch, userId, projectId);
    sketchId = sketch._id;
    
    // Step 3: 状态标记为active（两个数据库都成功）
    await updateProjectStatus(projectId, 'draft');
    
    return { success: true, project, sketchId };
    
  } catch (error) {
    // 补偿事务
    if (sketchId) {
      await deleteSketchInMongo(sketchId);
    }
    if (projectId) {
      await deleteProjectInPg(projectId);
    }
    
    throw new Error('Project creation failed');
  }
}

// 辅助函数（占位符实现）
async function createProjectInPg(projectData: ProjectCreationData, userId: string) {
  const pg = getPgPool();
  const result = await pg.query(
    'INSERT INTO projects (user_id, title, description, project_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, projectData.title, projectData.description, projectData.type, 'draft']
  );
  return result.rows[0];
}

async function createSketchInMongo(
  sketchData: FabricJson | null | undefined,
  userId: string,
  projectId: string
) {
  const mongo = await getMongoClient();
  const sketches = mongo.db().collection('sketches');
  
  const sketch = {
    userId,
    projectId,
    fabricJson: sketchData || { version: '5.3.0', objects: [], background: '#ffffff' },
    metadata: {
      canvasSize: { width: 1024, height: 1024 },
      brushStrokesCount: 0,
      totalObjects: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const result = await sketches.insertOne(sketch);
  return { ...sketch, _id: result.insertedId };
}

async function updateProjectStatus(projectId: string, status: string) {
  const pg = getPgPool();
  await pg.query('UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2', [status, projectId]);
}

async function deleteProjectInPg(projectId: string) {
  const pg = getPgPool();
  await pg.query('DELETE FROM projects WHERE id = $1', [projectId]);
}

async function deleteSketchInMongo(sketchId: string) {
  const mongo = await getMongoClient();
  const sketches = mongo.db().collection('sketches');
  await sketches.deleteOne({ _id: sketchId });
}
