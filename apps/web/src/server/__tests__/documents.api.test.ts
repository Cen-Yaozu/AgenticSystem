/**
 * 文档 API 集成测试
 */

import Database from 'better-sqlite3';
import { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/error.js';

// 测试常量
const TEST_USER_ID = 'test-user-001';
const TEST_DOMAIN_ID = 'dom_test-domain-001';
const TEST_API_KEY = 'test-api-key';

// 测试数据库实例
let testDb: Database.Database;

/**
 * 创建测试数据库 Schema
 */
function createTestSchema(db: Database.Database): void {
  db.exec(`
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
      workspace_path TEXT,
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
      file_path TEXT,
      status TEXT DEFAULT 'queued' CHECK (status IN ('uploading', 'queued', 'processing', 'completed', 'failed')),
      progress INTEGER DEFAULT 0,
      error_message TEXT,
      chunk_count INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_domain_id ON documents(domain_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

    -- 插入测试用户
    INSERT INTO users (id, name, email, status, created_at, updated_at)
    VALUES (
      '${TEST_USER_ID}',
      'Test User',
      'test@example.com',
      'active',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    -- 插入测试领域
    INSERT INTO domains (id, user_id, name, description, status, created_at, updated_at)
    VALUES (
      '${TEST_DOMAIN_ID}',
      '${TEST_USER_ID}',
      'Test Domain',
      'A test domain',
      'ready',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `);
}

// Mock 数据库模块
vi.mock('../database/index.js', () => ({
  getDatabase: () => testDb,
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock 认证中间件
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: () => async (c: any, next: () => Promise<void>) => {
    c.set('user', { userId: TEST_USER_ID });
    await next();
  },
  getCurrentUser: () => ({ userId: TEST_USER_ID }),
}));

// Mock Qdrant 服务
vi.mock('../services/qdrant.service.js', () => ({
  qdrantService: {
    deletePointsByDocument: vi.fn().mockResolvedValue(undefined),
    upsertPoints: vi.fn().mockResolvedValue(undefined),
    searchSimilar: vi.fn().mockResolvedValue([]),
  },
  deletePointsByDocument: vi.fn().mockResolvedValue(undefined),
  upsertPoints: vi.fn().mockResolvedValue(undefined),
}));

// Mock 文档处理器
vi.mock('../services/document-processor.service.js', () => ({
  processDocument: vi.fn().mockResolvedValue(undefined),
}));

describe('Documents API', () => {
  let app: Hono;

  beforeAll(async () => {
    // 创建内存数据库
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);

    // 设置环境变量
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = TEST_API_KEY;
  });

  afterAll(() => {
    testDb.close();
  });

  beforeEach(async () => {
    // 清空文档表
    testDb.exec('DELETE FROM documents');
    vi.clearAllMocks();

    // 创建测试应用
    app = new Hono();

    // 注册错误处理中间件
    app.onError(errorHandler);

    // 导入路由
    const documentsRoutes = (await import('../routes/documents.js')).default;

    // 挂载路由
    app.route('/api/v1/domains/:domainId/documents', documentsRoutes);
  });

  describe('GET /api/v1/domains/:domainId/documents', () => {
    it('should return empty list when no documents', async () => {
      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });

    it('should return documents list with pagination', async () => {
      // 插入测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, status)
        VALUES
          ('doc_001', '${TEST_DOMAIN_ID}', 'test1.pdf', 'pdf', 1024, 'completed'),
          ('doc_002', '${TEST_DOMAIN_ID}', 'test2.docx', 'docx', 2048, 'queued')
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents?page=1&pageSize=10`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBe(2);
    });

    it('should filter documents by status', async () => {
      // 插入测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, status)
        VALUES
          ('doc_003', '${TEST_DOMAIN_ID}', 'completed.pdf', 'pdf', 1024, 'completed'),
          ('doc_004', '${TEST_DOMAIN_ID}', 'queued.pdf', 'pdf', 2048, 'queued')
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents?status=completed`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].filename).toBe('completed.pdf');
    });
  });

  describe('GET /api/v1/domains/:domainId/documents/:documentId', () => {
    it('should return document details', async () => {
      // 插入测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, status, chunk_count)
        VALUES ('doc_005', '${TEST_DOMAIN_ID}', 'detail.pdf', 'pdf', 1024, 'completed', 10)
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/doc_005`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('doc_005');
      expect(body.data.filename).toBe('detail.pdf');
      expect(body.data.chunkCount).toBe(10);
    });

    it('should return 404 for non-existent document', async () => {
      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/non-existent`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/domains/:domainId/documents/:documentId', () => {
    it('should delete document', async () => {
      // 插入测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, status)
        VALUES ('doc_006', '${TEST_DOMAIN_ID}', 'delete.pdf', 'pdf', 1024, 'completed')
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/doc_006`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(204);

      // 验证文档已删除
      const row = testDb.prepare('SELECT * FROM documents WHERE id = ?').get('doc_006');
      expect(row).toBeUndefined();
    });

    it('should return 404 when deleting non-existent document', async () => {
      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/non-existent`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/domains/:domainId/documents/stats', () => {
    it('should return document statistics', async () => {
      // 插入测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, status, chunk_count)
        VALUES
          ('doc_007', '${TEST_DOMAIN_ID}', 'stat1.pdf', 'pdf', 1000, 'completed', 5),
          ('doc_008', '${TEST_DOMAIN_ID}', 'stat2.pdf', 'pdf', 2000, 'completed', 10),
          ('doc_009', '${TEST_DOMAIN_ID}', 'stat3.pdf', 'pdf', 3000, 'queued', 0)
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/stats`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBe(3);
      expect(body.data.byStatus.completed).toBe(2);
      expect(body.data.byStatus.queued).toBe(1);
      expect(body.data.totalSize).toBe(6000);
      expect(body.data.totalChunks).toBe(15);
    });
  });

  describe('POST /api/v1/domains/:domainId/documents/:documentId/reprocess', () => {
    it('should reprocess failed document', async () => {
      // 插入失败的测试文档
      testDb.exec(`
        INSERT INTO documents (id, domain_id, filename, file_type, file_size, file_path, status, error_message)
        VALUES ('doc_010', '${TEST_DOMAIN_ID}', 'reprocess.pdf', 'pdf', 1024, '/tmp/reprocess.pdf', 'failed', 'Previous error')
      `);

      // 创建临时文件
      const fs = await import('fs');
      const path = await import('path');
      const tmpDir = path.join(process.cwd(), 'data', 'documents', TEST_DOMAIN_ID);
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'doc_010.pdf'), 'test content');

      // 更新文件路径
      testDb.exec(`
        UPDATE documents SET file_path = '${path.join(tmpDir, 'doc_010.pdf')}' WHERE id = 'doc_010'
      `);

      const res = await app.request(
        `/api/v1/domains/${TEST_DOMAIN_ID}/documents/doc_010/reprocess`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('queued');

      // 清理
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
