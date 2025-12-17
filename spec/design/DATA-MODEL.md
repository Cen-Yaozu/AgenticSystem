# 数据模型设计

> **版本**: 1.0.0  
> **状态**: Draft  
> **最后更新**: 2024-12-16

---

## 1. 概述

本文档定义系统的完整数据模型，包括数据库 Schema、实体关系、索引策略和数据约束。

### 相关 SPEC

| 文档 | 描述 |
|------|------|
| [SPEC-002](../SPEC-002-ASSISTANT-MANAGEMENT.md) | 助手管理需求 |
| [SPEC-003](../SPEC-003-DOCUMENT-PROCESSING.md) | 文档处理需求 |
| [SPEC-004](../SPEC-004-CONVERSATION-SYSTEM.md) | 对话系统需求 |
| [SPEC-005](../SPEC-005-ROLE-MEMORY.md) | 角色记忆需求 |

---

## 2. 实体关系图

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
│    │  Assistant   │                                                         │
│    │──────────────│                                                         │
│    │ id           │                                                         │
│    │ user_id      │◄─────────────────────────────────────────┐              │
│    │ name         │                                          │              │
│    │ settings     │                                          │              │
│    └──────┬───────┘                                          │              │
│           │                                                  │              │
│     ┌─────┼─────────────────┬─────────────────┐              │              │
│     │     │                 │                 │              │              │
│     │ 1:N │             1:N │             1:N │              │              │
│     ▼     ▼                 ▼                 ▼              │              │
│  ┌────────────┐      ┌──────────────┐   ┌─────────┐         │              │
│  │  Document  │      │ Conversation │   │  Role   │         │              │
│  │────────────│      │──────────────│   │─────────│         │              │
│  │ id         │      │ id           │   │ id      │         │              │
│  │ assistant_id│     │ assistant_id │   │ assistant_id      │              │
│  │ filename   │      │ title        │   │ name    │         │              │
│  │ status     │      │ status       │   │ prompt  │         │              │
│  └─────┬──────┘      └──────┬───────┘   └────┬────┘         │              │
│        │                    │                │              │              │
│    1:N │                1:N │            1:N │              │              │
│        ▼                    ▼                ▼              │              │
│  ┌──────────────┐    ┌───────────┐    ┌──────────┐         │              │
│  │DocumentChunk │    │  Message  │    │  Memory  │         │              │
│  │──────────────│    │───────────│    │──────────│         │              │
│  │ id           │    │ id        │    │ id       │         │              │
│  │ document_id  │    │ conv_id   │    │ role_id  │         │              │
│  │ content      │    │ role      │    │ content  │         │              │
│  │ embedding    │    │ content   │    │ strength │         │              │
│  └──────────────┘    └───────────┘    └──────────┘         │              │
│                                                             │              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 用户表
// ============================================
model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String?   @map("password_hash")   // 密码哈希（可选，支持 API Key 认证）
  apiKey       String?   @unique @map("api_key") // API Key（用于服务端认证）
  apiKeyHash   String?   @map("api_key_hash")    // API Key 哈希（安全存储）
  status       String    @default("active")      // active | suspended | deleted
  lastLoginAt  DateTime? @map("last_login_at")   // 最后登录时间
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  assistants   Assistant[]
  refreshTokens RefreshToken[]

  @@index([status])
  @@map("users")
}

// ============================================
// 刷新令牌表
// ============================================
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  revokedAt DateTime? @map("revoked_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ============================================
// 助手表
// ============================================
model Assistant {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  name        String
  description String?
  domain      String?
  settings    Json     @default("{}")
  status      String   @default("initializing")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents     Document[]
  conversations Conversation[]
  roles         Role[]

  @@unique([userId, name])
  @@index([userId])
  @@index([status])
  @@map("assistants")
}

// ============================================
// 文档表
// ============================================
model Document {
  id          String    @id @default(cuid())
  assistantId String    @map("assistant_id")
  filename    String
  fileType    String    @map("file_type")
  filePath    String    @map("file_path")
  fileSize    Int       @map("file_size")
  status      String    @default("uploading")
  progress    Int       @default(0)
  errorMessage String?  @map("error_message")
  metadata    Json      @default("{}")
  chunkCount  Int       @default(0) @map("chunk_count")
  uploadedAt  DateTime  @default(now()) @map("uploaded_at")
  processedAt DateTime? @map("processed_at")

  assistant Assistant       @relation(fields: [assistantId], references: [id], onDelete: Cascade)
  chunks    DocumentChunk[]

  @@index([assistantId])
  @@index([status])
  @@index([uploadedAt])
  @@map("documents")
}

// ============================================
// 文档块表
// ============================================
model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String   @map("document_id")
  content    String
  chunkIndex Int      @map("chunk_index")
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@index([chunkIndex])
  @@map("document_chunks")
}

// ============================================
// 角色表
// ============================================
model Role {
  id             String   @id @default(cuid())
  assistantId    String   @map("assistant_id")
  name           String
  description    String?
  promptTemplate String   @map("prompt_template")
  capabilities   Json     @default("[]")
  personality    Json     @default("{}")
  isActive       Boolean  @default(true) @map("is_active")
  isDefault      Boolean  @default(false) @map("is_default")
  usageCount     Int      @default(0) @map("usage_count")
  lastUsedAt     DateTime? @map("last_used_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  assistant Assistant @relation(fields: [assistantId], references: [id], onDelete: Cascade)
  memories  Memory[]

  @@unique([assistantId, name])
  @@index([assistantId])
  @@index([isActive])
  @@map("roles")
}

// ============================================
// 对话表
// ============================================
model Conversation {
  id            String   @id @default(cuid())
  assistantId   String   @map("assistant_id")
  title         String?
  status        String   @default("active")
  messageCount  Int      @default(0) @map("message_count")
  startedAt     DateTime @default(now()) @map("started_at")
  lastMessageAt DateTime @default(now()) @map("last_message_at")

  assistant Assistant @relation(fields: [assistantId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@index([assistantId])
  @@index([status])
  @@index([lastMessageAt])
  @@map("conversations")
}

// ============================================
// 消息表
// ============================================
model Message {
  id             String   @id @default(cuid())
  conversationId String   @map("conversation_id")
  role           String   // 'user' | 'assistant' | 'system'
  content        String
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
  @@map("messages")
}

// ============================================
// 记忆表
// ============================================
model Memory {
  id             String    @id @default(cuid())
  roleId         String    @map("role_id")
  type           String    // 'preference' | 'habit' | 'insight' | 'fact'
  content        String
  schema         String    // 关键词序列
  context        Json      @default("{}")
  strength       Float     @default(0.5)
  accessCount    Int       @default(0) @map("access_count")
  createdAt      DateTime  @default(now()) @map("created_at")
  lastAccessedAt DateTime? @map("last_accessed_at")

  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@index([roleId])
  @@index([type])
  @@index([strength])
  @@index([lastAccessedAt])
  @@map("memories")
}
```

---

## 4. 向量数据库结构（Qdrant）

### 4.1 集合配置

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

### 4.2 Point 结构

```typescript
interface DocumentVectorPoint {
  id: string;               // UUID 格式
  vector: number[];         // 1536 维向量
  payload: {
    chunkId: string;
    documentId: string;
    assistantId: string;
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

### 4.3 索引策略

| 字段 | 索引类型 | 用途 |
|------|----------|------|
| assistantId | Keyword | 按助手过滤 |
| documentId | Keyword | 按文档过滤 |
| fileType | Keyword | 按类型过滤 |

---

## 5. 数据约束

### 5.1 字段约束

| 实体 | 字段 | 约束 |
|------|------|------|
| Assistant | name | 1-100 字符，同用户下唯一 |
| Assistant | description | 最多 500 字符 |
| Document | fileSize | 最大 10MB |
| Message | content | 1-10000 字符 |
| Memory | strength | 0.0-1.0 |

### 5.2 数量限制（MVP）

| 实体 | 限制 | 说明 |
|------|------|------|
| 每用户助手数 | 10 | MVP 阶段限制 |
| 每助手文档数 | 100 | MVP 阶段限制 |
| 每助手角色数 | 10 | MVP 阶段限制 |
| 每角色记忆数 | 1000 | MVP 阶段限制 |
| 每对话消息数 | 1000 | MVP 阶段限制 |

---

## 6. 数据迁移

### 6.1 迁移命令

```bash
# 生成迁移
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset
```

### 6.2 种子数据

```bash
npx prisma db seed
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 从 SPEC-006 提取，独立为设计文档 |