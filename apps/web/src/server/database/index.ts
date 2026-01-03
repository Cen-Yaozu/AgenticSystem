import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 数据库路径
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../../../../data/agentic-rag.db');

let db: Database.Database | null = null;

/**
 * 获取数据库实例
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
  if (db) {
    logger.warn('Database already initialized');
    return;
  }

  // 确保数据目录存在
  const dbDir = dirname(DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  // 创建数据库连接
  db = new Database(DB_PATH);

  // 启用 WAL 模式以提高并发性能
  db.pragma('journal_mode = WAL');

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  logger.info(`Database initialized at: ${DB_PATH}`);

  // 运行迁移
  await runMigrations();
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * 运行数据库迁移
 */
async function runMigrations(): Promise<void> {
  if (!db) return;

  logger.info('Running database migrations...');

  // 创建迁移记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 获取已应用的迁移
  const applied = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const appliedSet = new Set(applied.map(m => m.name));

  // 定义迁移
  const migrations = [
    { name: '001_initial_schema', sql: getInitialSchema() },
    { name: '002_default_user', sql: getDefaultUserMigration() },
    { name: '003_add_workspace_path', sql: getWorkspacePathMigration() },
    { name: '004_add_document_fields', sql: getDocumentFieldsMigration() },
    { name: '005_rename_assistant_to_domain', sql: getRenameAssistantToDomainMigration() },
    { name: '006_conversation_agentx_integration', sql: getConversationAgentXIntegrationMigration() },
    { name: '007_rename_session_id_to_image_id', sql: getRenameSessionIdToImageIdMigration() },
  ];

  // 应用未执行的迁移
  for (const migration of migrations) {
    if (!appliedSet.has(migration.name)) {
      logger.info(`Applying migration: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
      logger.info(`Migration applied: ${migration.name}`);
    }
  }

  logger.info('Database migrations completed');
}

/**
 * 初始 Schema
 */
function getInitialSchema(): string {
  return `
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      api_key_hash TEXT UNIQUE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(api_key_hash);

    -- 领域表（原助手表）
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      expertise TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'initializing' CHECK (status IN ('initializing', 'ready', 'processing', 'error')),
      document_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_user_name ON domains(user_id, name);

    -- 文档表
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'queued', 'processing', 'completed', 'failed')),
      progress INTEGER DEFAULT 0,
      error_message TEXT,
      chunk_count INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_domain_id ON documents(domain_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

    -- 对话表
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      message_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_message_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_domain_id ON conversations(domain_id);

    -- 消息表
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

    -- 角色表
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      prompt_template TEXT,
      capabilities TEXT DEFAULT '[]',
      personality TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_roles_domain_id ON roles(domain_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_domain_name ON roles(domain_id, name);

    -- 记忆表
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('preference', 'habit', 'insight', 'fact')),
      content TEXT NOT NULL,
      schema TEXT,
      strength REAL DEFAULT 0.8,
      access_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_memories_role_id ON memories(role_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);

    -- 刷新令牌表
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
  `;
}

/**
 * 默认用户迁移
 * 创建一个默认用户用于 MVP 阶段的 API Key 认证
 */
function getDefaultUserMigration(): string {
  return `
    -- 插入默认用户（如果不存在）
    INSERT OR IGNORE INTO users (id, name, email, status, created_at, updated_at)
    VALUES (
      'default-user-001',
      'Default User',
      'default@agentic-rag.local',
      'active',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `;
}

/**
 * 工作区路径迁移
 * 为 domains 表添加 workspace_path 字段
 */
function getWorkspacePathMigration(): string {
  return `
    -- 添加工作区路径字段到 domains 表
    ALTER TABLE domains ADD COLUMN workspace_path TEXT;
  `;
}

/**
 * 文档字段迁移
 * 为 documents 表添加 file_path 和 retry_count 字段
 */
function getDocumentFieldsMigration(): string {
  return `
    -- 添加文件路径字段到 documents 表
    ALTER TABLE documents ADD COLUMN file_path TEXT;
    -- 添加重试次数字段到 documents 表
    ALTER TABLE documents ADD COLUMN retry_count INTEGER DEFAULT 0;
  `;
}

/**
 * 重命名 Assistant 到 Domain 迁移
 * 将 assistants 表重命名为 domains，更新相关外键
 */
function getRenameAssistantToDomainMigration(): string {
  return `
    -- 如果旧表存在，进行迁移
    -- 注意：SQLite 不支持直接重命名表的外键，需要重建表

    -- 1. 如果 assistants 表存在且 domains 表不存在，进行迁移
    CREATE TABLE IF NOT EXISTS domains AS SELECT
      id,
      user_id,
      name,
      description,
      domain as expertise,
      settings,
      status,
      document_count,
      conversation_count,
      workspace_path,
      created_at,
      updated_at
    FROM assistants WHERE 0=1;

    -- 2. 复制数据（如果 assistants 表有数据）
    INSERT OR IGNORE INTO domains (id, user_id, name, description, expertise, settings, status, document_count, conversation_count, workspace_path, created_at, updated_at)
    SELECT id, user_id, name, description, domain, settings, status, document_count, conversation_count, workspace_path, created_at, updated_at
    FROM assistants;

    -- 3. 更新 documents 表的外键列名（如果存在 assistant_id 列）
    -- SQLite 不支持直接重命名列，需要重建表
    -- 这里我们添加新列并复制数据
    ALTER TABLE documents ADD COLUMN domain_id TEXT;
    UPDATE documents SET domain_id = assistant_id WHERE domain_id IS NULL;

    -- 4. 更新 conversations 表的外键列名
    ALTER TABLE conversations ADD COLUMN domain_id TEXT;
    UPDATE conversations SET domain_id = assistant_id WHERE domain_id IS NULL;

    -- 5. 更新 roles 表的外键列名
    ALTER TABLE roles ADD COLUMN domain_id TEXT;
    UPDATE roles SET domain_id = assistant_id WHERE domain_id IS NULL;
  `;
}

/**
 * Conversation AgentX 集成迁移
 * 简化 conversations 表，添加 session_id 字段
 * 删除 messages 表（由 AgentX 管理）
 */
function getConversationAgentXIntegrationMigration(): string {
  return `
    -- 1. 修复 domains 表（确保有主键）
    DROP TABLE IF EXISTS domains_fixed;
    CREATE TABLE domains_fixed (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      expertise TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'initializing' CHECK (status IN ('initializing', 'ready', 'processing', 'error')),
      document_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      workspace_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 复制 domains 数据
    INSERT INTO domains_fixed SELECT * FROM domains;

    -- 删除旧表并重命名
    DROP TABLE domains;
    ALTER TABLE domains_fixed RENAME TO domains;

    -- 重建索引
    CREATE INDEX idx_domains_user_id ON domains(user_id);
    CREATE UNIQUE INDEX idx_domains_user_name ON domains(user_id, name);

    -- 2. 清理可能存在的临时表
    DROP TABLE IF EXISTS conversations_new;

    -- 3. 创建新的 conversations 表结构
    CREATE TABLE conversations_new (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. 复制现有数据（只复制有效的记录）
    INSERT OR IGNORE INTO conversations_new (id, domain_id, session_id, title, status, created_at, updated_at)
    SELECT
      c.id,
      c.domain_id,
      COALESCE(c.session_id, ''),
      c.title,
      c.status,
      COALESCE(c.started_at, CURRENT_TIMESTAMP),
      COALESCE(c.last_message_at, c.started_at, CURRENT_TIMESTAMP)
    FROM conversations c
    INNER JOIN domains d ON c.domain_id = d.id
    WHERE c.session_id IS NOT NULL AND c.session_id != '' AND c.domain_id IS NOT NULL;

    -- 5. 删除旧表
    DROP TABLE IF EXISTS conversations;

    -- 6. 重命名新表
    ALTER TABLE conversations_new RENAME TO conversations;

    -- 7. 重建索引
    CREATE INDEX idx_conversations_domain_id ON conversations(domain_id);
    CREATE INDEX idx_conversations_session_id ON conversations(session_id);

    -- 8. 删除 messages 表（消息由 AgentX 管理）
    DROP TABLE IF EXISTS messages;

    -- 9. 删除不再需要的 roles 和 memories 表（角色和记忆由 PromptX 管理）
    DROP TABLE IF EXISTS memories;
    DROP TABLE IF EXISTS roles;
  `;
}

/**
 * 重命名 session_id 为 image_id 迁移
 * 修正 AgentX 集成：1 Conversation = 1 Image
 */
function getRenameSessionIdToImageIdMigration(): string {
  return `
    -- 1. 创建新的 conversations 表结构（使用 image_id 替代 session_id）
    CREATE TABLE IF NOT EXISTS conversations_v2 (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      image_id TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. 复制现有数据（session_id -> image_id）
    INSERT OR IGNORE INTO conversations_v2 (id, domain_id, image_id, title, status, created_at, updated_at)
    SELECT id, domain_id, session_id, title, status, created_at, updated_at
    FROM conversations
    WHERE session_id IS NOT NULL AND session_id != '';

    -- 3. 删除旧表
    DROP TABLE IF EXISTS conversations;

    -- 4. 重命名新表
    ALTER TABLE conversations_v2 RENAME TO conversations;

    -- 5. 重建索引
    CREATE INDEX IF NOT EXISTS idx_conversations_domain_id ON conversations(domain_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_image_id ON conversations(image_id);
  `;
}

export { db };
