# 数据模型设计

> **版本**: 3.0.0
> **状态**: Draft
> **最后更新**: 2024-12-19

---

## 1. 概述

本文档定义系统的完整数据模型，包括数据库 Schema、实体关系、索引策略和数据约束。

> **重要说明**：
> - 本项目使用 **SQLite** 作为 MVP 阶段的数据库
> - **角色和记忆由 PromptX 提供**，不在本项目数据库中存储
> - 向量数据存储在 **Qdrant** 向量数据库中

### 相关 SPEC

| 文档 | 描述 |
|------|------|
| [SPEC-002](../SPEC-002-DOMAIN-MANAGEMENT.md) | 领域管理需求 |
| [SPEC-003](../SPEC-003-DOCUMENT-PROCESSING.md) | 文档处理需求 |
| [SPEC-004](../SPEC-004-CONVERSATION-SYSTEM.md) | 对话系统需求 |
| [SPEC-005](../SPEC-005-ROLE-MEMORY.md) | PromptX 角色与记忆集成 |

---

## 2. 数据存储分工

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据存储分工                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         SQLite (业务数据)                            │   │
│  │                                                                       │   │
│  │  • users - 用户信息                                                   │   │
│  │  • domains - 领域信息                                                 │   │
│  │  • documents - 文档元数据                                             │   │
│  │  • conversations - 对话信息                                           │   │
│  │  • messages - 消息记录                                                │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Qdrant (向量数据)                            │   │
│  │                                                                       │   │
│  │  • document_vectors - 文档向量                                        │   │
│  │    - 原始内容向量                                                     │   │
│  │    - AI 摘要向量                                                      │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PromptX (角色与记忆)                          │   │
│  │                                                                       │   │
│  │  • 角色资源 (Role Resources)                                          │   │
│  │  • 记忆系统 (Engrams)                                                 │   │
│  │  • 通过 MCP 协议访问                                                  │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 实体关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              实体关系图 (ERD)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌──────────┐                                                             │
│    │   User   │                                                             │
│    │──────────│                                                             │
│    │ id       │                                                             │
│    │ name     │                                                             │
│    │ email    │                                                             │
│    └────┬─────┘                                                             │
│         │ 1:N                                                               │
│         ▼                                                                   │
│    ┌──────────────┐                                                         │
│    │    Domain    │                                                         │
│    │──────────────│                                                         │
│    │ id           │                                                         │
│    │ user_id      │                                                         │
│    │ name         │                                                         │
│    │ settings     │                                                         │
│    └──────┬───────┘                                                         │
│           │                                                                 │
│     ┌─────┴─────────────────┐                                               │
│     │                       │                                               │
│     │ 1:N               1:N │                                               │
│     ▼                       ▼                                               │
│  ┌────────────┐      ┌──────────────┐                                       │
│  │  Document  │      │ Conversation │                                       │
│  │────────────│      │──────────────│                                       │
│  │ id         │      │ id           │                                       │
│  │ domain_id  │      │ domain_id    │                                       │
│  │ filename   │      │ title        │                                       │
│  │ status     │      │ status       │                                       │
│  └────────────┘      └──────┬───────┘                                       │
│                             │                                               │
│                         1:N │                                               │
│                             ▼                                               │
│                       ┌───────────┐                                         │
│                       │  Message  │                                         │
│                       │───────────│                                         │
│                       │ id        │                                         │
│                       │ conv_id   │                                         │
│                       │ role      │                                         │
│                       │ content   │                                         │
│                       └───────────┘                                         │
│                                                                             │
│  注意：角色(Role)和记忆(Memory)由 PromptX 管理，不在本数据库中                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. SQLite Schema

```sql
-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- 格式: usr_xxxxxxxx
  username TEXT UNIQUE NOT NULL,          -- 用户名
  email TEXT UNIQUE,                      -- 邮箱（可选）
  password_hash TEXT NOT NULL,            -- 密码哈希 (bcrypt)
  display_name TEXT,                      -- 显示名称
  avatar TEXT,                            -- 头像 URL
  is_active INTEGER DEFAULT 1,            -- 是否激活
  created_at INTEGER NOT NULL,            -- 创建时间 (Unix timestamp)
  updated_at INTEGER NOT NULL             -- 更新时间 (Unix timestamp)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 领域表
-- ============================================
CREATE TABLE domains (
  id TEXT PRIMARY KEY,                    -- 格式: dom_xxxxxxxx
  user_id TEXT NOT NULL,                  -- 所属用户
  name TEXT NOT NULL,                     -- 领域名称
  description TEXT,                       -- 描述
  expertise TEXT,                         -- 专业领域标签
  settings TEXT DEFAULT '{}',             -- 设置 (JSON)
  status TEXT DEFAULT 'ready',            -- 状态: initializing|ready|processing|error
  document_count INTEGER DEFAULT 0,       -- 文档数量
  conversation_count INTEGER DEFAULT 0,   -- 对话数量
  promptx_role_id TEXT,                   -- 对应的 PromptX 角色 ID
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_status ON domains(status);

-- ============================================
-- 文档表
-- ============================================
CREATE TABLE documents (
  id TEXT PRIMARY KEY,                    -- 格式: doc_xxxxxxxx
  domain_id TEXT NOT NULL,                -- 所属领域
  filename TEXT NOT NULL,                 -- 文件名
  file_type TEXT NOT NULL,                -- 文件类型: pdf|docx|txt|md|xlsx
  file_path TEXT NOT NULL,                -- 文件路径
  file_size INTEGER NOT NULL,             -- 文件大小 (bytes)
  status TEXT DEFAULT 'uploading',        -- 状态: uploading|queued|processing|completed|failed
  progress INTEGER DEFAULT 0,             -- 处理进度 (0-100)
  error_message TEXT,                     -- 错误信息
  chunk_count INTEGER DEFAULT 0,          -- 分块数量
  metadata TEXT DEFAULT '{}',             -- 元数据 (JSON)
  uploaded_at INTEGER NOT NULL,
  processed_at INTEGER,

  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_domain_id ON documents(domain_id);
CREATE INDEX idx_documents_status ON documents(status);

-- ============================================
-- 对话表
-- ============================================
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,                    -- 格式: conv_xxxxxxxx
  domain_id TEXT NOT NULL,                -- 所属领域
  title TEXT,                             -- 对话标题
  status TEXT DEFAULT 'active',           -- 状态: active|archived
  message_count INTEGER DEFAULT 0,        -- 消息数量
  started_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,

  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_domain_id ON conversations(domain_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);

-- ============================================
-- 消息表
-- ============================================
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                    -- 格式: msg_xxxxxxxx
  conversation_id TEXT NOT NULL,          -- 所属对话
  role TEXT NOT NULL,                     -- 角色: user|assistant|system
  content TEXT NOT NULL,                  -- 消息内容
  metadata TEXT DEFAULT '{}',             -- 元数据 (JSON): sources, tokens
  created_at INTEGER NOT NULL,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

---

## 5. 向量数据库结构（Qdrant）

### 5.1 集合配置

```typescript
const documentVectorsCollection = {
  name: 'document_vectors',
  vectors: {
    size: 1536,             // OpenAI text-embedding-3-small
    distance: 'Cosine'
  },
  optimizers_config: {
    indexing_threshold: 10000
  },
  replication_factor: 1
};
```

### 5.2 Point 结构

```typescript
interface DocumentVectorPoint {
  id: string;               // UUID 格式
  vector: number[];         // 1536 维向量
  payload: {
    chunkId: string;
    documentId: string;
    domainId: string;
    userId: string;
    content: string;
    chunkIndex: number;
    filename: string;
    fileType: string;
    pageNumber?: number;
    section?: string;
  };
}
```

### 5.3 索引策略

| 字段 | 索引类型 | 用途 |
|------|----------|------|
| domainId | Keyword | 按领域过滤 |
| documentId | Keyword | 按文档过滤 |
| fileType | Keyword | 按类型过滤 |

---

## 6. PromptX 数据（不在本数据库）

以下数据由 PromptX 管理，通过 MCP 协议访问：

### 6.1 角色数据

```typescript
// 通过 promptx_action 激活角色
await mcpClient.call('promptx_action', {
  role: 'legal-assistant'  // 角色 ID
});
```

### 6.2 记忆数据

```typescript
// 通过 promptx_remember 保存记忆
await mcpClient.call('promptx_remember', {
  role: 'legal-assistant',
  engrams: [{
    content: '用户偏好简洁的回答风格',
    schema: '用户 偏好 简洁 回答',
    strength: 0.8,
    type: 'ATOMIC'
  }]
});

// 通过 promptx_recall 检索记忆
await mcpClient.call('promptx_recall', {
  role: 'legal-assistant',
  query: '用户 偏好',
  mode: 'focused'
});
```

---

## 7. 数据约束

### 7.1 字段约束

| 实体 | 字段 | 约束 |
|------|------|------|
| Domain | name | 1-100 字符，同用户下唯一 |
| Domain | description | 最多 500 字符 |
| Document | fileSize | 最大 10MB |
| Message | content | 1-10000 字符 |

### 7.2 数量限制（MVP）

| 实体 | 限制 | 说明 |
|------|------|------|
| 每用户领域数 | 10 | MVP 阶段限制 |
| 每领域文档数 | 100 | MVP 阶段限制 |
| 每对话消息数 | 1000 | MVP 阶段限制 |

---

## 8. 数据库管理

### 8.1 数据库初始化

数据库在应用启动时自动初始化：

```typescript
// apps/web/src/server/database/index.ts
import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_PATH || './data/agentic-rag.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (...);
  CREATE TABLE IF NOT EXISTS domains (...);
  CREATE TABLE IF NOT EXISTS documents (...);
  CREATE TABLE IF NOT EXISTS conversations (...);
  CREATE TABLE IF NOT EXISTS messages (...);
`);
```

### 8.2 数据库操作

```bash
# 查看数据库（需要安装 sqlite3）
sqlite3 data/agentic-rag.db

# 常用命令
.tables          # 列出所有表
.schema users    # 查看表结构
SELECT * FROM domains;  # 查询数据
.quit            # 退出
```

### 8.3 重置数据库

```bash
# 删除数据库文件（会在下次启动时重新创建）
rm data/agentic-rag.db*
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 初始版本（Prisma/PostgreSQL） |
| 2.0.0 | 2024-12-17 | 改为 SQLite，移除角色/记忆表（由 PromptX 提供） |
| 3.0.0 | 2024-12-19 | 术语重构：助手(Assistant) → 领域(Domain) |
