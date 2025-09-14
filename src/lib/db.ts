// 数据库连接管理
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { Redis } from 'ioredis';

// PostgreSQL 连接池（模块作用域缓存）
let pgPool: Pool | undefined;

export function getPgPool(): Pool {
  if (!pgPool) {
    console.log('Creating new PostgreSQL connection pool...');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Serverless 优化配置
      max: 1,                     // 每个实例最多1个连接
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,   // 30秒空闲超时
      allowExitOnIdle: true       // 允许进程退出时关闭连接
    });
    
    pgPool.on('error', (err: Error) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  
  return pgPool;
}

// MongoDB 连接（模块作用域缓存）
let mongoClient: MongoClient | undefined;

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    console.log('Creating new MongoDB connection...');
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
let redisClient: Redis | undefined;

export function getRedisClient(): Redis {
  if (!redisClient) {
    console.log('Creating new Redis connection...');
    redisClient = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
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

// 优雅关闭连接
export async function closeConnections() {
  try {
    if (pgPool) {
      await pgPool.end();
      pgPool = undefined;
    }
    
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = undefined;
    }
    
    if (redisClient) {
      redisClient.disconnect();
      redisClient = undefined;
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}