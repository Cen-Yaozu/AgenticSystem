/**
 * 助手 API 集成测试
 */

import Database from 'better-sqlite3';
import { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 测试常量
const TEST_USER_ID = 'test-user-001';
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

// Mock 数据库模块 - 必须在导入路由之前
vi.mock('../database/index.js', () => ({
  getDatabase: vi.fn(() => testDb),
}));

// Mock 认证中间件
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: () => async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
    }
    const token = authHeader.substring(7);
    if (token !== TEST_API_KEY) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
    }
    c.set('user', { userId: TEST_USER_ID, email: 'test@example.com' });
    await next();
  },
  getCurrentUser: (c: any) => {
    const user = c.get('user');
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user;
  },
}));

// 动态导入路由和错误处理（在 mock 之后）
const { default: assistantsRoutes } = await import('../routes/assistants.js');
const { errorHandler } = await import('../middleware/error.js');

describe('Assistants API', () => {
  let app: Hono;

  beforeAll(() => {
    // 创建内存数据库
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);

    // 创建 Hono 应用
    app = new Hono();

    // 注册错误处理中间件
    app.onError(errorHandler);

    app.route('/api/v1/assistants', assistantsRoutes);
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  beforeEach(() => {
    // 清空助手表数据
    testDb.exec('DELETE FROM assistants');
  });

  const makeRequest = async (
    method: string,
    path: string,
    body?: object,
    headers: Record<string, string> = {}
  ) => {
    const req = new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return app.fetch(req);
  };

  describe('POST /api/v1/assistants', () => {
    it('应该创建助手并返回 201', async () => {
      const res = await makeRequest('POST', '/api/v1/assistants', {
        name: '测试助手',
        description: '测试描述',
        domain: 'test',
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('测试助手');
      expect(json.data.id).toMatch(/^ast_/);
    });

    it('应该在缺少名称时返回 400', async () => {
      const res = await makeRequest('POST', '/api/v1/assistants', {
        description: '没有名称',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('应该在名称过长时返回 400', async () => {
      const res = await makeRequest('POST', '/api/v1/assistants', {
        name: 'a'.repeat(101),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('应该在名称重复时返回 409', async () => {
      await makeRequest('POST', '/api/v1/assistants', { name: '重复名称' });
      const res = await makeRequest('POST', '/api/v1/assistants', { name: '重复名称' });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ASSISTANT_NAME_DUPLICATE');
    });

    it('应该在未认证时返回 401', async () => {
      const req = new Request('http://localhost/api/v1/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '测试' }),
      });
      const res = await app.fetch(req);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/assistants', () => {
    beforeEach(async () => {
      await makeRequest('POST', '/api/v1/assistants', { name: '助手A', domain: 'legal' });
      await makeRequest('POST', '/api/v1/assistants', { name: '助手B', domain: 'medical' });
      await makeRequest('POST', '/api/v1/assistants', { name: '助手C', domain: 'legal' });
    });

    it('应该返回助手列表', async () => {
      const res = await makeRequest('GET', '/api/v1/assistants');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(3);
      expect(json.meta.total).toBe(3);
    });

    it('应该支持分页', async () => {
      const res = await makeRequest('GET', '/api/v1/assistants?page=1&pageSize=2');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(2);
    });

    it('应该支持按 domain 筛选', async () => {
      const res = await makeRequest('GET', '/api/v1/assistants?domain=legal');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/assistants/:id', () => {
    it('应该返回助手详情', async () => {
      const createRes = await makeRequest('POST', '/api/v1/assistants', { name: '详情测试' });
      const created = await createRes.json();

      const res = await makeRequest('GET', `/api/v1/assistants/${created.data.id}`);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('详情测试');
    });

    it('应该在助手不存在时返回 404', async () => {
      const res = await makeRequest('GET', '/api/v1/assistants/ast_nonexistent');

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ASSISTANT_NOT_FOUND');
    });
  });

  describe('PUT /api/v1/assistants/:id', () => {
    it('应该更新助手', async () => {
      const createRes = await makeRequest('POST', '/api/v1/assistants', {
        name: '原始名称',
        description: '原始描述',
      });
      const created = await createRes.json();

      const res = await makeRequest('PUT', `/api/v1/assistants/${created.data.id}`, {
        name: '新名称',
        description: '新描述',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('新名称');
      expect(json.data.description).toBe('新描述');
    });

    it('应该在助手不存在时返回 404', async () => {
      const res = await makeRequest('PUT', '/api/v1/assistants/ast_nonexistent', {
        name: '新名称',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/assistants/:id', () => {
    it('应该删除助手并返回 204', async () => {
      const createRes = await makeRequest('POST', '/api/v1/assistants', { name: '要删除的' });
      const created = await createRes.json();

      const res = await makeRequest('DELETE', `/api/v1/assistants/${created.data.id}`);

      expect(res.status).toBe(204);

      // 验证已删除
      const getRes = await makeRequest('GET', `/api/v1/assistants/${created.data.id}`);
      expect(getRes.status).toBe(404);
    });

    it('应该在助手不存在时返回 404', async () => {
      const res = await makeRequest('DELETE', '/api/v1/assistants/ast_nonexistent');

      expect(res.status).toBe(404);
    });

    it('应该在 processing 状态时返回 409', async () => {
      const createRes = await makeRequest('POST', '/api/v1/assistants', { name: '处理中' });
      const created = await createRes.json();

      // 手动更新状态
      testDb.prepare('UPDATE assistants SET status = ? WHERE id = ?').run('processing', created.data.id);

      const res = await makeRequest('DELETE', `/api/v1/assistants/${created.data.id}`);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('ASSISTANT_CANNOT_DELETE');
    });
  });
});
