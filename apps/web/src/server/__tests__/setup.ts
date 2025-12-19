/**
 * Vitest 测试设置文件
 * 在所有测试运行前执行
 *
 * 使用内存数据库进行测试，避免文件系统权限问题
 */

import Database from 'better-sqlite3';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// 使用内存数据库
let testDb: Database.Database | null = null;

// 测试常量
export const TEST_USER_ID = 'test-user-001';
export const TEST_API_KEY = 'test-api-key';

/**
 * 获取测试数据库实例
 */
export function getTestDatabase(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }
  return testDb;
}

/**
 * 创建数据库 Schema
 */
function createSchema(db: Database.Database): void {
  db.exec(`
    -- 迁移记录表
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    -- 插入测试用户
    INSERT INTO users (id, name, email, status, created_at, updated_at)
    VALUES (
      'test-user-001',
      'Test User',
      'test@example.com',
      'active',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `);
}

/**
 * 初始化测试数据库（内存数据库）
 */
export function initTestDatabase(): Database.Database {
  // 创建内存数据库
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');

  // 创建 Schema
  createSchema(testDb);

  return testDb;
}

/**
 * 清理测试数据库
 */
export function cleanupTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * 清空测试数据（保留表结构和测试用户）
 */
export function clearTestData(): void {
  if (testDb) {
    testDb.exec('DELETE FROM assistants');
  }
}

// 全局测试钩子
beforeAll(() => {
  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.API_KEY = TEST_API_KEY;
});

afterAll(() => {
  cleanupTestDatabase();
});

afterEach(() => {
  vi.clearAllMocks();
});
