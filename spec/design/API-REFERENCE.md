# API 参考文档

> **版本**: 1.0.0  
> **状态**: Draft  
> **最后更新**: 2024-12-16

---

## 1. 概述

### 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:3000/api/v1` |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |

### 相关 SPEC

| 文档 | 描述 |
|------|------|
| [SPEC-002](../SPEC-002-ASSISTANT-MANAGEMENT.md) | 助手管理需求 |
| [SPEC-003](../SPEC-003-DOCUMENT-PROCESSING.md) | 文档处理需求 |
| [SPEC-004](../SPEC-004-CONVERSATION-SYSTEM.md) | 对话系统需求 |

---

## 2. 通用规范

### 2.1 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

**分页响应**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": { "name": "名称不能为空" }
  },
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

### 2.2 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

### 2.3 错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未提供认证信息 |
| FORBIDDEN | 403 | 无权访问该资源 |
| NOT_FOUND | 404 | 资源不存在 |
| DUPLICATE_RESOURCE | 409 | 资源已存在 |
| QUOTA_EXCEEDED | 422 | 超出配额限制 |
| RATE_LIMITED | 429 | 请求过于频繁 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 2.4 认证方式

所有 API 请求需要在 Header 中携带认证信息：

```http
Authorization: Bearer <access_token>
```

**认证方式**:

| 方式 | 适用场景 | 说明 |
|------|----------|------|
| API Key | 服务端调用 | 长期有效的密钥，用于后端服务集成 |
| JWT Token | 前端调用 | 短期有效的令牌，用于用户会话 |

**获取 Token**:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

**刷新 Token**:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**MVP 阶段简化方案**:
- 使用固定的 API Key 进行认证
- 在 `.env` 中配置 `API_KEY=your-api-key`
- 请求时携带 `Authorization: Bearer your-api-key`

### 2.5 错误码命名规范

错误码采用统一的命名格式：`{ENTITY}_{ERROR_TYPE}`

**实体前缀**:

| 前缀 | 实体 |
|------|------|
| ASSISTANT_ | 助手相关 |
| DOCUMENT_ | 文档相关 |
| CONVERSATION_ | 对话相关 |
| MESSAGE_ | 消息相关 |
| ROLE_ | 角色相关 |
| MEMORY_ | 记忆相关 |
| AUTH_ | 认证相关 |

**错误类型后缀**:

| 后缀 | 错误类型 | 示例 |
|------|----------|------|
| _NOT_FOUND | 资源不存在 | ASSISTANT_NOT_FOUND |
| _REQUIRED | 必填字段缺失 | ASSISTANT_NAME_REQUIRED |
| _TOO_LONG | 字段过长 | ASSISTANT_NAME_TOO_LONG |
| _DUPLICATE | 资源重复 | ASSISTANT_NAME_DUPLICATE |
| _LIMIT_EXCEEDED | 超过限制 | ASSISTANT_LIMIT_EXCEEDED |
| _CANNOT_DELETE | 无法删除 | ASSISTANT_CANNOT_DELETE |
| _INVALID | 格式无效 | DOCUMENT_TYPE_INVALID |
| _PROCESSING | 正在处理中 | DOCUMENT_ALREADY_PROCESSING |

---

## 3. 助手管理 API

### 3.1 创建助手

```http
POST /assistants
```

**请求体**:
```json
{
  "name": "法律助手",
  "description": "专业的法律文档分析助手",
  "domain": "legal",
  "settings": {
    "responseStyle": "detailed",
    "tone": "formal"
  }
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "id": "ast_clx1234567890",
    "name": "法律助手",
    "status": "initializing",
    "createdAt": "2024-12-16T10:00:00.000Z"
  }
}
```

### 3.2 获取助手列表

```http
GET /assistants?page=1&limit=10&domain=legal
```

### 3.3 获取助手详情

```http
GET /assistants/:assistantId
```

### 3.4 更新助手

```http
PUT /assistants/:assistantId
```

### 3.5 删除助手

```http
DELETE /assistants/:assistantId
```

**响应**: 204 No Content

---

## 4. 文档管理 API

### 4.1 上传文档

```http
POST /assistants/:assistantId/documents
Content-Type: multipart/form-data
```

**表单字段**:
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| file | File | 是 | 文档文件 |
| description | string | 否 | 文档描述 |
| tags | string | 否 | 标签，逗号分隔 |

**支持的文件类型**:
| 类型 | MIME Type | 最大大小 |
|------|-----------|----------|
| PDF | application/pdf | 10MB |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 10MB |
| Text | text/plain | 5MB |
| Markdown | text/markdown | 5MB |

### 4.2 获取文档列表

```http
GET /assistants/:assistantId/documents?status=completed&page=1&limit=10
```

### 4.3 获取文档处理状态

```http
GET /documents/:documentId/status
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 65,
    "currentStage": "embedding",
    "message": "正在生成向量嵌入..."
  }
}
```

### 4.4 删除文档

```http
DELETE /documents/:documentId
```

### 4.5 重新处理文档

```http
POST /documents/:documentId/reprocess
```

---

## 5. 对话管理 API

### 5.1 创建对话

```http
POST /assistants/:assistantId/conversations
```

**请求体**:
```json
{
  "title": "合同风险分析咨询"
}
```

### 5.2 获取对话列表

```http
GET /assistants/:assistantId/conversations?page=1&limit=10
```

### 5.3 发送消息

```http
POST /conversations/:conversationId/messages
```

**请求体**:
```json
{
  "content": "请帮我分析这份合同的主要风险点",
  "metadata": {
    "attachments": ["doc_123"]
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userMessageId": "msg_user123",
    "assistantMessageId": "msg_asst456",
    "streamUrl": "/messages/msg_asst456/stream"
  }
}
```

### 5.4 获取流式响应

```http
GET /messages/:messageId/stream
Accept: text/event-stream
```

**SSE 事件格式**:
```
event: message_start
data: {"messageId": "msg_123", "role": "assistant"}

event: content_delta
data: {"delta": "根据您提供的", "index": 0}

event: source_reference
data: {"sources": [{"documentId": "doc_789", "content": "..."}]}

event: message_complete
data: {"messageId": "msg_123", "content": "完整内容..."}
```

### 5.5 中断生成

```http
POST /messages/:messageId/abort
```

### 5.6 获取对话历史

```http
GET /conversations/:conversationId/messages?page=1&limit=50
```

### 5.7 删除对话

```http
DELETE /conversations/:conversationId
```

---

## 6. 角色管理 API

### 6.1 获取角色列表

```http
GET /assistants/:assistantId/roles
```

### 6.2 创建角色

```http
POST /assistants/:assistantId/roles
```

**请求体**:
```json
{
  "name": "合同风险分析师",
  "description": "专门分析合同中的法律风险",
  "promptTemplate": "你是一位专业的合同风险分析师...",
  "capabilities": ["风险识别", "条款分析"]
}
```

### 6.3 激活/停用角色

```http
PATCH /roles/:roleId/status
```

**请求体**:
```json
{
  "isActive": true
}
```

---

## 7. 记忆管理 API

### 7.1 获取角色记忆

```http
GET /roles/:roleId/memories?type=preference&limit=20
```

### 7.2 创建记忆

```http
POST /roles/:roleId/memories
```

**请求体**:
```json
{
  "type": "preference",
  "content": "用户偏好详细的风险分析报告",
  "schema": "用户 偏好 详细 风险分析 报告",
  "strength": 0.8
}
```

### 7.3 检索记忆

```http
POST /roles/:roleId/memories/recall
```

**请求体**:
```json
{
  "query": "风险分析 报告",
  "mode": "balanced",
  "limit": 10
}
```

---

## 8. WebSocket 事件

### 8.1 连接

```
ws://localhost:3000/ws?token=<auth_token>
```

### 8.2 事件类型

#### 文档处理事件

| 事件 | 方向 | 描述 |
|------|------|------|
| document.processing.progress | Server→Client | 文档处理进度 |
| document.processing.completed | Server→Client | 文档处理完成 |
| document.processing.failed | Server→Client | 文档处理失败 |

**事件数据格式**:
```json
{
  "event": "document.processing.progress",
  "data": {
    "documentId": "doc_123",
    "progress": 65,
    "stage": "embedding",
    "message": "正在生成向量嵌入..."
  }
}
```

#### 对话事件

| 事件 | 方向 | 描述 |
|------|------|------|
| conversation.message.start | Server→Client | 消息开始生成 |
| conversation.message.delta | Server→Client | 消息内容增量 |
| conversation.message.source | Server→Client | 来源引用 |
| conversation.message.complete | Server→Client | 消息生成完成 |
| conversation.message.error | Server→Client | 消息生成错误 |
| conversation.message.abort | Client→Server | 中断消息生成 |

**事件数据格式**:
```json
{
  "event": "conversation.message.delta",
  "data": {
    "messageId": "msg_456",
    "delta": "根据您提供的合同文档，",
    "index": 0
  }
}
```

#### 系统事件

| 事件 | 方向 | 描述 |
|------|------|------|
| connection.established | Server→Client | 连接建立成功 |
| connection.error | Server→Client | 连接错误 |
| heartbeat | 双向 | 心跳检测 |

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 从 SPEC-007 提取，独立为设计文档 |