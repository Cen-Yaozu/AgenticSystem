/**
 * 文档服务单元测试
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 测试常量
const TEST_USER_ID = 'test-user-001';
const TEST_DOMAIN_ID = 'dom_test-domain-001';

// 测试数据库实例
let testDb: Database.Database;

// 测试文档目录
const TEST_DOCUMENTS_DIR = path.join(process.cwd(), 'data', 'documents', 'test');

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

describe('Document Service', () => {
  beforeAll(() => {
    // 创建内存数据库
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);

    // 创建测试文档目录
    if (!fs.existsSync(TEST_DOCUMENTS_DIR)) {
      fs.mkdirSync(TEST_DOCUMENTS_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // 关闭数据库
    testDb.close();

    // 清理测试文档目录
    if (fs.existsSync(TEST_DOCUMENTS_DIR)) {
      fs.rmSync(TEST_DOCUMENTS_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // 清空文档表
    testDb.exec('DELETE FROM documents');
    vi.clearAllMocks();
  });

  describe('Document Repository', () => {
    it('should create a document', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const doc = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/test.pdf',
      });

      expect(doc).toBeDefined();
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.filename).toBe('test.pdf');
      expect(doc.fileType).toBe('pdf');
      expect(doc.fileSize).toBe(1024);
      expect(doc.status).toBe('queued');
    });

    it('should find document by id', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const created = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'find-test.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        filePath: '/path/to/find-test.pdf',
      });

      const found = documentRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.filename).toBe('find-test.pdf');
    });

    it('should find documents by domain id', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      // 创建多个文档
      documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'doc1.pdf',
        fileType: 'pdf',
        fileSize: 1000,
        filePath: '/path/to/doc1.pdf',
      });

      documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'doc2.docx',
        fileType: 'docx',
        fileSize: 2000,
        filePath: '/path/to/doc2.docx',
      });

      const result = documentRepository.findByDomainId({
        domainId: TEST_DOMAIN_ID,
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should update document status', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const doc = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'status-test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/status-test.pdf',
      });

      const updated = documentRepository.updateStatus(doc.id, 'processing');

      expect(updated?.status).toBe('processing');
    });

    it('should mark document as completed', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const doc = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'complete-test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/complete-test.pdf',
      });

      const completed = documentRepository.markAsCompleted(doc.id, 10);

      expect(completed?.status).toBe('completed');
      expect(completed?.chunkCount).toBe(10);
      expect(completed?.progress).toBe(100);
      expect(completed?.processedAt).toBeDefined();
    });

    it('should mark document as failed', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const doc = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'fail-test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/fail-test.pdf',
      });

      const failed = documentRepository.markAsFailed(doc.id, 'Processing error');

      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Processing error');
      expect(failed?.retryCount).toBe(1);
    });

    it('should delete document', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      const doc = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'delete-test.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/delete-test.pdf',
      });

      const deleted = documentRepository.delete(doc.id);
      expect(deleted).toBe(true);

      const found = documentRepository.findById(doc.id);
      expect(found).toBeNull();
    });

    it('should find pending documents', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      // 创建待处理文档
      documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'pending1.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/pending1.pdf',
      });

      documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'pending2.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/pending2.pdf',
      });

      const pending = documentRepository.findPendingDocuments(10);

      expect(pending.length).toBe(2);
      expect(pending.every((d) => d.status === 'queued')).toBe(true);
    });

    it('should filter documents by status', async () => {
      const { documentRepository } = await import('../repositories/document.repository');

      // 创建不同状态的文档
      documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'queued.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/queued.pdf',
      });

      const doc2 = documentRepository.create({
        domainId: TEST_DOMAIN_ID,
        filename: 'completed.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        filePath: '/path/to/completed.pdf',
      });

      documentRepository.markAsCompleted(doc2.id, 5);

      // 查询已完成的文档
      const result = documentRepository.findByDomainId({
        domainId: TEST_DOMAIN_ID,
        status: 'completed',
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]?.filename).toBe('completed.pdf');
    });
  });

  describe('Document Validator', () => {
    it('should validate list documents query', async () => {
      const { listDocumentsSchema } = await import('../validators/document.validator');

      // Query string 参数都是字符串类型
      const validQuery = {
        page: '1',
        pageSize: '20',
        status: 'completed',
      };

      const result = listDocumentsSchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', async () => {
      const { listDocumentsSchema } = await import('../validators/document.validator');

      // Query string 参数都是字符串类型
      const invalidQuery = {
        page: '1',
        pageSize: '20',
        status: 'invalid-status',
      };

      const result = listDocumentsSchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should use default values for pagination', async () => {
      const { listDocumentsSchema } = await import('../validators/document.validator');

      const emptyQuery = {};

      const result = listDocumentsSchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });
  });
});
