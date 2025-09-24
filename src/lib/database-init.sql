-- 基于技术架构文档的数据库初始化脚本（移除用户认证）
-- PostgreSQL 表结构定义

-- 1. projects 表 (项目/作品信息) - 移除用户关联
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL CHECK (project_type = 'single_image'),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 2. assets 表 (生成的图片资源)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_sketch_id VARCHAR(255) NOT NULL, -- MongoDB中对应草图的_id
    storage_url TEXT, -- S3 URL，生成成功后填充
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'auditing_input', 'generating', 
        'auditing_output', 'uploading', 'completed', 'failed'
    )),
    error_message TEXT,
    error_code VARCHAR(100), -- 结构化错误码
    position_in_project INT DEFAULT 0, -- 序列中的位置（预留）
    ai_model_version VARCHAR(100), -- 记录使用的AI模型版本
    generation_seed BIGINT, -- AI生成使用的种子值
    processing_time_ms INT, -- 生成耗时(毫秒)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- 3. usage_stats 表 (成本统计) - 简化为全局统计
CREATE TABLE IF NOT EXISTS usage_stats (
    id SERIAL PRIMARY KEY,
    month_year VARCHAR(7) UNIQUE NOT NULL, -- "2025-08"
    total_cost_cents INT NOT NULL DEFAULT 0,
    total_api_calls INT NOT NULL DEFAULT 0,
    total_images_generated INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入初始的usage_stats记录
INSERT INTO usage_stats (month_year, total_cost_cents, total_api_calls, total_images_generated)
VALUES (
    TO_CHAR(NOW(), 'YYYY-MM'),
    0,
    0, 
    0
) ON CONFLICT (month_year) DO NOTHING;
