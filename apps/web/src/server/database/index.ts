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

    -- 助手表
    CREATE TABLE IF NOT EXISTS assistants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      domain TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'initializing' CHECK (status IN ('initializing', 'ready', 'processing', 'error')),
      document_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assistants_user_name ON assistants(user_id, name);

    -- 文档表
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      assistant_id TEXT NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_documents_assistant_id ON documents(assistant_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

    -- 对话表
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      assistant_id TEXT NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      message_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_message_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_assistant_id ON conversations(assistant_id);

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
      assistant_id TEXT NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_roles_assistant_id ON roles(assistant_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_assistant_name ON roles(assistant_id, name);

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
 * 为 assistants 表添加 workspace_path 字段
 */
function getWorkspacePathMigration(): string {
  return `
    -- 添加工作区路径字段到 assistants 表
    ALTER TABLE assistants ADD COLUMN workspace_path TEXT;
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

export { db };
