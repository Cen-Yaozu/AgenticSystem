# 架构设计文档

> **版本**: 3.0.0
> **状态**: Draft
> **最后更新**: 2024-12-19

---

## 1. 概述

本文档定义 AgentX Agentic RAG 系统的整体架构设计，包括技术选型、项目结构、数据库设计和 API 设计。

> **重要**: 本系统采用 **Agentic 多角色架构**，详细设计请参阅 [AGENTIC-ARCHITECTURE.md](./AGENTIC-ARCHITECTURE.md)。

### 1.1 设计目标

| 目标 | 描述 |
|------|------|
| **简单** | MVP 阶段保持简单，避免过度设计 |
| **可扩展** | 架构支持后续扩展（多租户、分布式） |
| **可维护** | 清晰的分层，易于理解和修改 |
| **高性能** | 流式响应，异步处理 |
| **智能** | Agentic 多角色协作，越用越智能 |

### 1.2 参考项目

本设计参考了 [Agent 项目](../../Agent/) 的架构，主要借鉴：
- Hono 作为 Web 框架
- SQLite 作为 MVP 数据库
- 前后端一体的项目结构
- JWT 认证方案

### 1.3 架构文档体系

| 文档 | 描述 |
|------|------|
| **本文档** | 整体架构设计（技术选型、项目结构、数据库、API） |
| [AGENTIC-ARCHITECTURE.md](./AGENTIC-ARCHITECTURE.md) | **Agentic 多角色架构**（核心设计） |
| [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md) | 技术架构（分层、部署、性能） |
| [DATA-MODEL.md](./DATA-MODEL.md) | 数据模型设计 |
| [API-REFERENCE.md](./API-REFERENCE.md) | API 参考文档 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AgentX Agentic RAG System                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         前端层 (Client)                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   React 18  │  │   Vite 6    │  │  Tailwind   │  │  Zustand   │  │   │
│  │  │             │  │             │  │   CSS 4     │  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                          HTTP / SSE │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         后端层 (Server)                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │    Hono     │  │    JWT      │  │    Pino     │  │   Zod      │  │   │
│  │  │  (Web框架)  │  │   (认证)    │  │   (日志)    │  │  (验证)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       服务层 (Services)                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │   Domain    │  │  Document   │  │Conversation │  │    RAG     │  │   │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      数据处理层 (Processing)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Extractor  │  │   Chunker   │  │  Embedder   │  │  Retriever │  │   │
│  │  │ (文本提取)  │  │  (智能分块) │  │  (向量化)   │  │  (检索)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         存储层 (Storage)                             │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │   │
│  │  │        SQLite           │  │           Qdrant                │   │   │
│  │  │   (关系数据 + 文件)     │  │        (向量数据)               │   │   │
│  │  │  - users                │  │  - document_vectors             │   │   │
│  │  │  - domains              │  │    - chunkId                    │   │   │
│  │  │  - documents            │  │    - documentId                 │   │   │
│  │  │  - conversations        │  │    - domainId                   │   │   │
│  │  │  - messages             │  │    - content                    │   │   │
│  │  └─────────────────────────┘  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        外部服务 (External)                           │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │   │
│  │  │      Claude API         │  │      OpenAI Embeddings          │   │   │
│  │  │      (对话生成)         │  │        (文本向量化)             │   │   │
│  │  └─────────────────────────┘  └─────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术选型

### 3.1 后端技术栈

| 组件 | 技术 | 版本 | 选择理由 |
|------|------|------|----------|
| 运行时 | Node.js | 20.x LTS | 稳定、生态丰富 |
| 语言 | TypeScript | 5.x | 类型安全、开发体验好 |
| Web 框架 | **Hono** | 4.x | 轻量（14KB）、TypeScript 原生、支持多运行时 |
| 数据库 | **SQLite** | - | MVP 简单、无需额外服务、better-sqlite3 高性能 |
| 向量库 | **Qdrant** | 1.x | 专业向量数据库、支持过滤、REST API |
| 认证 | **jose** | 5.x | JWT 标准库、安全 |
| 密码 | **bcrypt** | 5.x | 行业标准、安全 |
| 日志 | **Pino** | 8.x | 高性能、结构化日志 |
| 验证 | **Zod** | 3.x | TypeScript 原生、运行时验证 |
| 文档解析 | pdf-parse, mammoth | - | 成熟的解析库 |
| 嵌入 | OpenAI Embeddings | - | 高质量向量、text-embedding-3-small |
| LLM | Claude API | - | 强大的对话能力 |

### 3.2 前端技术栈

| 组件 | 技术 | 版本 | 选择理由 |
|------|------|------|----------|
| 框架 | **React** | 18.x | 生态成熟、组件化 |
| 构建 | **Vite** | 6.x | 快速开发体验、HMR |
| 样式 | **Tailwind CSS** | 4.x | 原子化 CSS、快速开发 |
| 状态 | **Zustand** | 4.x | 简单、轻量、TypeScript 友好 |
| 路由 | **React Router** | 7.x | 标准路由方案 |
| 请求 | **TanStack Query** | 5.x | 服务端状态管理、缓存 |
| 图标 | **Lucide React** | - | 轻量、美观 |

### 3.3 技术选型对比

#### Hono vs Express vs Fastify

| 特性 | Hono | Express | Fastify |
|------|------|---------|---------|
| 大小 | 14KB | 200KB+ | 100KB+ |
| TypeScript | 原生 | 需要 @types | 原生 |
| 性能 | 极高 | 中等 | 高 |
| 多运行时 | ✅ | ❌ | ❌ |
| 学习曲线 | 低 | 低 | 中 |

**选择 Hono 的理由**：轻量、TypeScript 原生、与 Agent 项目一致。

#### SQLite vs PostgreSQL

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 部署复杂度 | 零（文件） | 需要服务 |
| 性能 | 单机高 | 分布式高 |
| 并发 | 有限 | 高 |
| 适用场景 | MVP、单机 | 生产、多实例 |

**选择 SQLite 的理由**：MVP 阶段简单，后期可迁移到 PostgreSQL。

---

## 4. 项目结构

```
agentic-rag/
├── apps/
│   └── web/                          # 主应用（前后端一体）
│       ├── src/
│       │   ├── client/               # 前端代码
│       │   │   ├── components/       # UI 组件
│       │   │   │   ├── element/      # 原子组件 (Button, Input, Badge)
│       │   │   │   ├── entry/        # 条目组件 (MessageEntry, DocumentEntry)
│       │   │   │   ├── container/    # 容器组件 (Chat, DocumentList)
│       │   │   │   ├── pane/         # 面板组件 (InputPane, MessagePane)
│       │   │   │   ├── layout/       # 布局组件 (Sidebar, Header)
│       │   │   │   └── page/         # 页面组件 (DomainPage, ChatPage)
│       │   │   ├── hooks/            # 自定义 Hooks
│       │   │   │   ├── useAuth.ts
│       │   │   │   ├── useDomain.ts
│       │   │   │   └── useChat.ts
│       │   │   ├── stores/           # Zustand 状态
│       │   │   │   ├── authStore.ts
│       │   │   │   └── chatStore.ts
│       │   │   ├── services/         # API 服务
│       │   │   │   └── api.ts
│       │   │   ├── App.tsx           # 应用入口
│       │   │   └── main.tsx          # 渲染入口
│       │   │
│       │   └── server/               # 后端代码
│       │       ├── api/              # API 路由
│       │       │   ├── auth.ts       # 认证路由
│       │       │   ├── domains.ts    # 领域路由
│       │       │   ├── documents.ts  # 文档路由
│       │       │   └── conversations.ts # 对话路由
│       │       ├── services/         # 业务服务
│       │       │   ├── AuthService.ts
│       │       │   ├── DomainService.ts
│       │       │   ├── DocumentService.ts
│       │       │   ├── ConversationService.ts
│       │       │   └── RAGService.ts
│       │       ├── database/         # 数据库
│       │       │   ├── schema.ts     # 表结构定义
│       │       │   ├── index.ts      # 数据库初始化
│       │       │   └── repositories/ # 数据访问层
│       │       │       ├── UserRepository.ts
│       │       │       ├── DomainRepository.ts
│       │       │       ├── DocumentRepository.ts
│       │       │       └── ConversationRepository.ts
│       │       ├── processing/       # 文档处理
│       │       │   ├── extractors/   # 文本提取
│       │       │   │   ├── PDFExtractor.ts
│       │       │   │   ├── WordExtractor.ts
│       │       │   │   └── TextExtractor.ts
│       │       │   ├── chunkers/     # 文本分块
│       │       │   │   └── SemanticChunker.ts
│       │       │   └── embedders/    # 向量嵌入
│       │       │       └── OpenAIEmbedder.ts
│       │       ├── retrieval/        # 向量检索
│       │       │   └── QdrantRetriever.ts
│       │       ├── middleware/       # 中间件
│       │       │   ├── auth.ts       # 认证中间件
│       │       │   └── logger.ts     # 日志中间件
│       │       ├── utils/            # 工具函数
│       │       │   ├── id.ts         # ID 生成
│       │       │   └── errors.ts     # 错误处理
│       │       ├── types/            # 类型定义
│       │       │   └── index.ts
│       │       └── index.ts          # 服务器入口
│       │
│       ├── public/                   # 静态文件
│       ├── index.html                # HTML 模板
│       ├── vite.config.ts            # Vite 配置
│       ├── tailwind.config.ts        # Tailwind 配置
│       ├── tsconfig.json             # TypeScript 配置
│       └── package.json
│
├── packages/                         # 共享包（可选，后期提取）
│   └── shared/                       # 共享类型和工具
│       ├── src/
│       │   └── types/                # 共享类型定义
│       └── package.json
│
├── spec/                             # 规格文档
│   ├── SPEC-*.md                     # 需求规格
│   ├── design/                       # 设计文档
│   └── features/                     # Gherkin 特性文件
│
├── data/                             # 数据目录（gitignore）
│   ├── agentic-rag.db                # SQLite 数据库
│   ├── uploads/                      # 上传文件
│   └── logs/                         # 日志文件
│
├── docker-compose.yml                # Docker 编排
├── .env.example                      # 环境变量示例
├── .gitignore
├── package.json                      # 根 package.json
├── pnpm-workspace.yaml               # pnpm 工作区配置
└── README.md
```

---

## 5. 数据库设计

### 5.1 SQLite Schema

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

-- ============================================
-- 角色表（P1 功能）
-- ============================================
CREATE TABLE roles (
  id TEXT PRIMARY KEY,                    -- 格式: role_xxxxxxxx
  domain_id TEXT NOT NULL,                -- 所属领域
  name TEXT NOT NULL,                     -- 角色名称
  description TEXT,                       -- 描述
  prompt_template TEXT NOT NULL,          -- 提示词模板
  capabilities TEXT DEFAULT '[]',         -- 能力标签 (JSON array)
  personality TEXT DEFAULT '{}',          -- 人格设置 (JSON)
  is_active INTEGER DEFAULT 1,            -- 是否激活
  is_default INTEGER DEFAULT 0,           -- 是否默认角色
  usage_count INTEGER DEFAULT 0,          -- 使用次数
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE(domain_id, name)
);

CREATE INDEX idx_roles_domain_id ON roles(domain_id);

-- ============================================
-- 记忆表（P1 功能）
-- ============================================
CREATE TABLE memories (
  id TEXT PRIMARY KEY,                    -- 格式: mem_xxxxxxxx
  role_id TEXT NOT NULL,                  -- 所属角色
  type TEXT NOT NULL,                     -- 类型: preference|habit|insight|fact
  content TEXT NOT NULL,                  -- 记忆内容
  schema TEXT NOT NULL,                   -- 关键词序列
  strength REAL DEFAULT 0.5,              -- 强度 (0-1)
  access_count INTEGER DEFAULT 0,         -- 访问次数
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER,

  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_memories_role_id ON memories(role_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_strength ON memories(strength);
```

### 5.2 Qdrant 向量集合

```typescript
// 集合配置
const documentVectorsCollection = {
  name: 'document_vectors',
  vectors: {
    size: 1536,             // OpenAI text-embedding-3-small
    distance: 'Cosine'
  },
  optimizers_config: {
    indexing_threshold: 10000
  }
};

// Point 结构
interface DocumentVectorPoint {
  id: string;               // UUID
  vector: number[];         // 1536 维向量
  payload: {
    chunkId: string;        // 分块 ID
    documentId: string;     // 文档 ID
    domainId: string;       // 领域 ID
    userId: string;         // 用户 ID
    content: string;        // 文本内容
    chunkIndex: number;     // 分块索引
    filename: string;       // 文件名
    fileType: string;       // 文件类型
    pageNumber?: number;    // 页码（PDF）
    section?: string;       // 章节
  };
}
```

---

## 6. API 设计

### 6.1 API 端点总览

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/health` | GET | 健康检查 | ❌ |
| `/api/auth/register` | POST | 用户注册 | ❌ |
| `/api/auth/login` | POST | 用户登录 | ❌ |
| `/api/auth/verify` | GET | 验证 Token | ✅ |
| `/api/auth/logout` | POST | 用户登出 | ✅ |
| `/api/domains` | GET | 领域列表 | ✅ |
| `/api/domains` | POST | 创建领域 | ✅ |
| `/api/domains/:id` | GET | 领域详情 | ✅ |
| `/api/domains/:id` | PUT | 更新领域 | ✅ |
| `/api/domains/:id` | DELETE | 删除领域 | ✅ |
| `/api/domains/:id/documents` | GET | 文档列表 | ✅ |
| `/api/domains/:id/documents` | POST | 上传文档 | ✅ |
| `/api/documents/:id` | GET | 文档详情 | ✅ |
| `/api/documents/:id` | DELETE | 删除文档 | ✅ |
| `/api/domains/:id/conversations` | GET | 对话列表 | ✅ |
| `/api/domains/:id/conversations` | POST | 创建对话 | ✅ |
| `/api/conversations/:id` | GET | 对话详情 | ✅ |
| `/api/conversations/:id` | DELETE | 删除对话 | ✅ |
| `/api/conversations/:id/messages` | GET | 消息列表 | ✅ |
| `/api/conversations/:id/messages` | POST | 发送消息 | ✅ |
| `/api/conversations/:id/stream` | GET | 流式响应 (SSE) | ✅ |

### 6.2 认证 API

#### POST /api/auth/register

```typescript
// Request
{
  username: string;       // 3-50 字符
  password: string;       // 6-100 字符
  email?: string;         // 可选
  displayName?: string;   // 可选
}

// Response 201
{
  token: string;
  user: {
    id: string;
    username: string;
    email?: string;
    displayName?: string;
  };
  expiresIn: string;      // "7d"
}
```

#### POST /api/auth/login

```typescript
// Request
{
  usernameOrEmail: string;
  password: string;
}

// Response 200
{
  token: string;
  user: { ... };
  expiresIn: string;
}
```

### 6.3 领域 API

#### POST /api/domains

```typescript
// Request
{
  name: string;           // 1-100 字符
  description?: string;   // 最多 500 字符
  expertise?: string;     // 专业领域标签
  settings?: {
    responseStyle?: 'detailed' | 'concise';
    tone?: 'formal' | 'friendly';
    language?: string;
  };
}

// Response 201
{
  id: string;
  name: string;
  description?: string;
  expertise?: string;
  settings: { ... };
  status: 'ready';
  documentCount: 0;
  conversationCount: 0;
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 文档 API

#### POST /api/domains/:id/documents

```typescript
// Request (multipart/form-data)
file: File;               // 文件

// Response 201
{
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'queued';
  progress: 0;
  uploadedAt: string;
}
```

### 6.5 对话 API

#### POST /api/conversations/:id/messages

```typescript
// Request
{
  content: string;        // 1-10000 字符
}

// Response 201
{
  id: string;
  role: 'user';
  content: string;
  createdAt: string;
}
```

#### GET /api/conversations/:id/stream (SSE)

```typescript
// SSE Events
event: message_start
data: { messageId: string }

event: content_delta
data: { text: string }

event: source_reference
data: { documentId: string, documentName: string, content: string, score: number }

event: message_complete
data: { messageId: string, tokensUsed: { input: number, output: number } }

event: error
data: { code: string, message: string }
```

---

## 7. 数据流

### 7.1 用户提问流程

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌─────────┐
│  用户   │────►│  API    │────►│ Conversation│────►│   RAG   │
│  输入   │     │  路由   │     │   Service   │     │ Service │
└─────────┘     └─────────┘     └─────────────┘     └────┬────┘
                                                         │
                    ┌────────────────────────────────────┘
                    │
                    ▼
              ┌───────────┐     ┌───────────┐     ┌───────────┐
              │  Qdrant   │────►│  Context  │────►│  Claude   │
              │  检索     │     │   组装    │     │   API     │
              └───────────┘     └───────────┘     └─────┬─────┘
                                                        │
                    ┌───────────────────────────────────┘
                    │
                    ▼
              ┌───────────┐
              │   SSE     │────► 用户
              │  流式响应  │
              └───────────┘
```

### 7.2 文档处理流程

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  上传   │────►│  验证   │────►│  提取   │────►│  分块   │
│  文件   │     │  格式   │     │  文本   │     │  处理   │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
                    ┌────────────────────────────────┘
                    │
                    ▼
              ┌───────────┐     ┌───────────┐     ┌───────────┐
              │  OpenAI   │────►│  Qdrant   │────►│  更新    │
              │  Embedding│     │   存储    │     │  状态    │
              └───────────┘     └───────────┘     └───────────┘
```

---

## 8. 部署架构

### 8.1 开发环境

```yaml
# docker-compose.yml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
```

### 8.2 生产环境

```
┌─────────────────────────────────────────────────────────────┐
│                      Production Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   Nginx      │  ← SSL 终止、静态文件、反向代理            │
│  │   (Proxy)    │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │   Node.js    │  ← Hono 服务器                            │
│  │   (App)      │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│    ┌────┴────┐                                              │
│    │         │                                              │
│    ▼         ▼                                              │
│  ┌─────┐  ┌──────┐                                          │
│  │SQLite│  │Qdrant│  ← 数据存储                             │
│  └─────┘  └──────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 环境变量

```bash
# .env.example

# 服务器配置
PORT=3000
NODE_ENV=development

# 数据目录
DATA_DIR=./data

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production

# LLM 配置
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-sonnet-4-20250514

# Embedding 配置
OPENAI_API_KEY=sk-xxx
EMBEDDING_MODEL=text-embedding-3-small

# Qdrant 配置
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=document_vectors

# 日志配置
LOG_LEVEL=info
```

---

## 9. 安全设计

### 9.1 认证授权

| 机制 | 实现 |
|------|------|
| 认证 | JWT Token (7 天有效期) |
| 密码 | bcrypt (10 轮加盐) |
| 传输 | HTTPS (生产环境) |

### 9.2 数据安全

| 措施 | 说明 |
|------|------|
| 用户隔离 | 所有查询都带 userId 过滤 |
| 文件隔离 | 上传文件按用户/领域目录存储 |
| 向量隔离 | Qdrant 查询带 domainId 过滤 |

### 9.3 输入验证

```typescript
// 使用 Zod 进行请求验证
const createDomainSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  expertise: z.string().max(50).optional(),
  settings: z.object({
    responseStyle: z.enum(['detailed', 'concise']).optional(),
    tone: z.enum(['formal', 'friendly']).optional(),
    language: z.string().optional(),
  }).optional(),
});
```

---

## 10. 性能优化

### 10.1 性能指标

| 指标 | 目标值 |
|------|--------|
| API 响应时间 | < 200ms (P95) |
| 对话首字节时间 | < 2s |
| 文档处理速度 | < 30s/MB |
| 向量检索时间 | < 100ms |

### 10.2 优化策略

| 策略 | 实现 |
|------|------|
| 连接池 | SQLite WAL 模式 |
| 异步处理 | 文档处理使用队列 |
| 流式响应 | SSE 实时输出 |
| 缓存 | 热点数据内存缓存 |

---

## 11. 与现有设计文档的关系

本文档是对现有设计文档的补充和更新：

| 文档 | 关系 |
|------|------|
| [AGENTIC-ARCHITECTURE.md](./AGENTIC-ARCHITECTURE.md) | **核心** - Agentic 多角色架构设计 |
| [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md) | 技术架构（已更新与本文档对齐） |
| [DATA-MODEL.md](./DATA-MODEL.md) | 本文档的数据库设计与其一致，但使用 SQLite |
| [API-REFERENCE.md](./API-REFERENCE.md) | 本文档的 API 设计与其一致 |
| [PROJECT-SETUP.md](./PROJECT-SETUP.md) | 项目初始化指南 |
| [DEV-ENVIRONMENT.md](./DEV-ENVIRONMENT.md) | 开发环境配置 |
| [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) | 实现路线图 |

---

## 12. 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-17 | 初始版本，基于 Agent 项目架构设计 |
| 2.0.0 | 2024-12-17 | 添加 Agentic 架构引用，更新文档体系 |
| 3.0.0 | 2024-12-19 | 术语重构：助手(Assistant) → 领域(Domain) |
