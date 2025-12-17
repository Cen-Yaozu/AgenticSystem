# 📊 数据模型与API设计

## 🗄️ 数据库Schema设计

### 表结构定义

#### users 表
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### assistants 表
```sql
CREATE TABLE assistants (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(100),
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);
```

#### documents 表
```sql
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    assistant_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status ENUM('uploading', 'processing', 'completed', 'failed') DEFAULT 'uploading',
    metadata JSON,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE,
    INDEX idx_assistant_id (assistant_id),
    INDEX idx_status (status)
);
```

#### document_chunks 表
```sql
CREATE TABLE document_chunks (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    embedding JSON,
    metadata JSON,
    chunk_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_document_id (document_id),
    INDEX idx_chunk_index (chunk_index)
);
```

#### roles 表
```sql
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    assistant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    capabilities JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE,
    INDEX idx_assistant_id (assistant_id),
    INDEX idx_is_active (is_active)
);
```

#### conversations 表
```sql
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    assistant_id VARCHAR(36) NOT NULL,
    title VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE,
    INDEX idx_assistant_id (assistant_id),
    INDEX idx_last_message_at (last_message_at)
);
```

#### messages 表
```sql
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at)
);
```

#### memories 表
```sql
CREATE TABLE memories (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36) NOT NULL,
    type ENUM('preference', 'habit', 'insight') NOT NULL,
    content TEXT NOT NULL,
    context JSON,
    strength DECIMAL(3,2) DEFAULT 0.50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_role_id (role_id),
    INDEX idx_type (type),
    INDEX idx_strength (strength)
);
```

---

## 🔌 API接口设计

### 基础响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 1. 助手管理 API

#### 创建助手
```http
POST /api/assistants
Content-Type: application/json

{
  "name": "法律助手",
  "description": "专业的法律文档分析助手",
  "domain": "legal",
  "settings": {
    "responseStyle": "detailed",
    "tone": "formal",
    "language": "zh-CN",
    "maxTokens": 4000
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "ast_123456",
    "name": "法律助手",
    "description": "专业的法律文档分析助手",
    "domain": "legal",
    "settings": { ... },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 获取助手列表
```http
GET /api/assistants?page=1&limit=10&domain=legal
```

#### 获取助手详情
```http
GET /api/assistants/{assistantId}
```

#### 更新助手
```http
PUT /api/assistants/{assistantId}
Content-Type: application/json

{
  "name": "高级法律助手",
  "settings": {
    "responseStyle": "concise"
  }
}
```

#### 删除助手
```http
DELETE /api/assistants/{assistantId}
```

### 2. 文档管理 API

#### 上传文档
```http
POST /api/assistants/{assistantId}/documents
Content-Type: multipart/form-data

file: [binary data]
metadata: {
  "description": "合同模板文档",
  "tags": ["合同", "模板"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "doc_123456",
    "filename": "contract_template.pdf",
    "fileType": "pdf",
    "status": "uploading",
    "uploadedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 获取文档列表
```http
GET /api/assistants/{assistantId}/documents?status=completed&page=1&limit=10
```

#### 获取文档详情
```http
GET /api/documents/{documentId}
```

#### 删除文档
```http
DELETE /api/documents/{documentId}
```

#### 获取文档处理状态
```http
GET /api/documents/{documentId}/status
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 65,
    "message": "正在提取文本内容...",
    "chunksProcessed": 13,
    "totalChunks": 20
  }
}
```

### 3. 对话管理 API

#### 创建对话
```http
POST /api/assistants/{assistantId}/conversations
Content-Type: application/json

{
  "title": "合同风险分析咨询"
}
```

#### 发送消息
```http
POST /api/conversations/{conversationId}/messages
Content-Type: application/json

{
  "content": "请帮我分析这份合同的主要风险点",
  "metadata": {
    "attachments": ["doc_123456"]
  }
}
```

**响应** (流式):
```json
{
  "success": true,
  "data": {
    "messageId": "msg_123456",
    "streamUrl": "/api/messages/msg_123456/stream"
  }
}
```

#### 获取对话历史
```http
GET /api/conversations/{conversationId}/messages?page=1&limit=50
```

#### 获取对话列表
```http
GET /api/assistants/{assistantId}/conversations?page=1&limit=10
```

### 4. 流式响应 API

#### 消息流
```http
GET /api/messages/{messageId}/stream
Accept: text/event-stream
```

**事件格式**:
```
event: message_start
data: {"messageId": "msg_123456", "role": "assistant"}

event: content_delta
data: {"delta": "根据您提供的合同文档，我发现以下几个主要风险点：\n\n"}

event: content_delta
data: {"delta": "1. **违约责任条款不明确**\n"}

event: tool_use
data: {"toolName": "document_search", "query": "违约责任"}

event: tool_result
data: {"toolName": "document_search", "result": "找到3个相关条款"}

event: content_delta
data: {"delta": "根据第15条违约责任条款..."}

event: message_complete
data: {"messageId": "msg_123456", "usage": {"inputTokens": 1200, "outputTokens": 800}}
```

### 5. 角色管理 API

#### 获取助手角色
```http
GET /api/assistants/{assistantId}/roles
```

#### 创建角色
```http
POST /api/assistants/{assistantId}/roles
Content-Type: application/json

{
  "name": "合同风险分析师",
  "description": "专门分析合同中的法律风险",
  "promptTemplate": "你是一位专业的合同风险分析师...",
  "capabilities": ["风险识别", "条款分析", "合规检查"]
}
```

#### 更新角色
```http
PUT /api/roles/{roleId}
```

#### 激活/停用角色
```http
PATCH /api/roles/{roleId}/status
Content-Type: application/json

{
  "isActive": false
}
```

### 6. 记忆管理 API

#### 获取角色记忆
```http
GET /api/roles/{roleId}/memories?type=preference&page=1&limit=20
```

#### 创建记忆
```http
POST /api/roles/{roleId}/memories
Content-Type: application/json

{
  "type": "preference",
  "content": "用户偏好详细的风险分析报告",
  "context": {
    "conversationId": "conv_123456",
    "keywords": ["风险分析", "详细报告"]
  },
  "strength": 0.8
}
```

---

## 🔄 事件系统设计

### AgentX 事件集成

#### 文档处理事件
```typescript
interface DocumentProcessingEvent {
  type: 'document.processing.started' | 'document.processing.progress' | 'document.processing.completed' | 'document.processing.failed';
  payload: {
    documentId: string;
    assistantId: string;
    progress?: number;
    error?: string;
    chunks?: number;
  };
  timestamp: string;
}
```

#### 对话事件
```typescript
interface ConversationEvent {
  type: 'conversation.message.received' | 'conversation.response.started' | 'conversation.response.completed';
  payload: {
    conversationId: string;
    messageId: string;
    content?: string;
    role?: string;
    metadata?: any;
  };
  timestamp: string;
}
```

#### 角色切换事件
```typescript
interface RoleSwitchEvent {
  type: 'role.activated' | 'role.deactivated';
  payload: {
    roleId: string;
    assistantId: string;
    reason: string;
  };
  timestamp: string;
}
```

### WebSocket 事件推送

#### 连接管理
```typescript
// 客户端连接
ws://localhost:3000/ws?assistantId=ast_123456&token=jwt_token

// 事件订阅
{
  "action": "subscribe",
  "events": ["document.processing.*", "conversation.*"]
}
```

#### 事件推送格式
```json
{
  "event": "document.processing.progress",
  "data": {
    "documentId": "doc_123456",
    "progress": 75,
    "message": "正在生成向量嵌入..."
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 🛡️ 错误处理

### 错误代码定义

```typescript
enum ErrorCode {
  // 通用错误
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // 助手相关
  ASSISTANT_NOT_FOUND = 'ASSISTANT_NOT_FOUND',
  ASSISTANT_LIMIT_EXCEEDED = 'ASSISTANT_LIMIT_EXCEEDED',
  
  // 文档相关
  DOCUMENT_TOO_LARGE = 'DOCUMENT_TOO_LARGE',
  DOCUMENT_TYPE_NOT_SUPPORTED = 'DOCUMENT_TYPE_NOT_SUPPORTED',
  DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',
  
  // 对话相关
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_TOO_LARGE",
    "message": "文档大小超过限制",
    "details": {
      "maxSize": "10MB",
      "actualSize": "15MB",
      "filename": "large_document.pdf"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 📈 性能优化考虑

### 数据库优化
- 合适的索引策略
- 分页查询优化
- 连接池配置
- 读写分离（如需要）

### 缓存策略
- Redis 缓存热点数据
- 文档嵌入向量缓存
- 角色配置缓存
- 对话上下文缓存

### 文件存储
- 对象存储（S3/MinIO）
- CDN 加速
- 文件压缩和优化
- 分块上传支持

### 向量检索优化
- Qdrant 集群配置
- 索引优化策略
- 批量检索优化
- 结果缓存机制

这个设计为系统的具体实现提供了详细的技术规范。