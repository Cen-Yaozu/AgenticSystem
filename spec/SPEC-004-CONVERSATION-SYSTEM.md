# SPEC-004: 对话系统

> 版本: 4.0 | 状态: Draft | 日期: 2024-12-17

## 1. 概述

**目的**：定义对话系统的完整规格，包括对话管理、消息处理和流式响应。

**核心技术**：
- LLM 调用：AgentX 框架
- 角色激活：PromptX（promptx_action）
- 记忆系统：PromptX（promptx_remember/recall）
- 向量检索：Qdrant

**范围**：
- 包含：对话生命周期、消息发送接收、流式响应、RAG 检索集成
- 不包含：角色创建（见 SPEC-002）、文档处理（见 SPEC-003）

**相关文档**：
- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [SPEC-002 助手管理](./SPEC-002-ASSISTANT-MANAGEMENT.md)
- [SPEC-003 文档处理](./SPEC-003-DOCUMENT-PROCESSING.md)
- [SPEC-005 PromptX 集成](./SPEC-005-ROLE-MEMORY.md)

## 2. 用户故事

作为用户，我希望与助手进行智能对话，以便快速获取基于文档的专业回答。

**核心场景**：
1. 创建新对话
2. 发送消息并获得流式回复
3. 查看对话历史
4. 回复中包含文档引用

## 3. 功能需求

### P0 - 必须实现
- FR-001: 创建对话
- FR-002: 发送用户消息
- FR-003: 流式响应（SSE）
- FR-004: RAG 检索相关文档
- FR-005: 回复中标注来源引用
- FR-006: 对话历史查询

### P1 - 重要
- FR-007: 对话标题自动生成
- FR-008: 中断生成
- FR-009: 多轮对话上下文保持

## 4. 业务规则

| 规则 | 描述 |
|------|------|
| BR-001 | 消息内容不能为空，最大 10000 字符 |
| BR-002 | 每个对话最多保存 1000 条消息 |
| BR-003 | 对话标题自动从第一条消息生成 |
| BR-004 | 流式响应超时时间为 60 秒 |
| BR-005 | 用户可以中断正在生成的回复 |
| BR-006 | 删除对话时级联删除所有消息 |

## 5. 对话处理流程

### 5.1 核心流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           对话处理流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户消息                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 激活助手角色（PromptX）                                          │   │
│  │     promptx_action({ role: '{assistantId}-assistant' })             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. 检索记忆（PromptX）                                              │   │
│  │     promptx_recall({ role: '{assistantId}-assistant', query: null }) │   │
│  │     → 获取用户偏好、历史交互模式                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. 向量检索（Qdrant）                                               │   │
│  │     • 将用户问题向量化                                               │   │
│  │     • 在助手的 collection 中检索相关文档                             │   │
│  │     • 返回 top-k 相关片段                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. 构建提示词                                                       │   │
│  │     • 系统提示（角色定义）                                           │   │
│  │     • 记忆上下文（用户偏好）                                         │   │
│  │     • 检索结果（相关文档）                                           │   │
│  │     • 对话历史（最近 N 条）                                          │   │
│  │     • 用户问题                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  5. LLM 调用（AgentX）                                               │   │
│  │     • 通过 AgentX 调用 Claude API                                    │   │
│  │     • 流式返回响应                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  6. 保存记忆（PromptX）                                              │   │
│  │     promptx_remember({                                               │   │
│  │       role: '{assistantId}-assistant',                              │   │
│  │       engrams: [{ content: '对话要点', schema: '关键词', ... }]      │   │
│  │     })                                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  流式响应（SSE/WebSocket）                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 AgentX 集成

AgentX 负责 LLM 调用和 WebSocket 通信：

```typescript
import { createAgentX, defineAgent } from "agentxjs";

// 定义 Agent
const AssistantAgent = defineAgent({
  name: "AssistantAgent",
  systemPrompt: "你是一个专业的 AI 助手...",
  mcpServers: {
    promptx: {
      command: "npx",
      args: ["promptx-mcp"],
    },
  },
});

// 创建 AgentX 实例
const agentx = await createAgentX({
  llm: {
    apiKey: process.env.CLAUDE_API_KEY,
    baseUrl: "https://api.anthropic.com",
  },
  agentxDir: `./workspaces/${assistantId}`,
  defaultAgent: AssistantAgent,
});
```

### 5.3 PromptX 调用示例

```typescript
// 1. 激活助手角色
await mcpClient.call('promptx_action', {
  role: `${assistantId}-assistant`
});

// 2. 检索记忆（DMN 模式）
const memories = await mcpClient.call('promptx_recall', {
  role: `${assistantId}-assistant`,
  query: null,  // DMN 模式，查看全景
  mode: 'balanced'
});

// 3. 检索记忆（关键词模式）
const relevantMemories = await mcpClient.call('promptx_recall', {
  role: `${assistantId}-assistant`,
  query: '用户 偏好 回答风格',
  mode: 'focused'
});

// 4. 保存记忆
await mcpClient.call('promptx_remember', {
  role: `${assistantId}-assistant`,
  engrams: [{
    content: '用户询问了合同违约条款，偏好详细的法律解释',
    schema: '合同 违约 法律 详细',
    strength: 0.7,
    type: 'LINK'
  }]
});
```

### 5.4 向量检索

```typescript
// 向量检索
async function searchDocuments(assistantId: string, query: string, topK: number = 5) {
  // 1. 将查询向量化
  const queryVector = await embedText(query);

  // 2. 在 Qdrant 中检索
  const results = await qdrantClient.search(`assistant_${assistantId}`, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });

  // 3. 返回相关文档片段
  return results.map(r => ({
    documentId: r.payload.documentId,
    documentName: r.payload.documentName,
    content: r.payload.content,
    relevanceScore: r.score,
  }));
}
```

## 6. 流式响应

### 6.1 SSE 事件格式

```typescript
// 事件类型
type StreamEvent =
  | { type: 'message_start'; messageId: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'source_reference'; source: SourceReference }
  | { type: 'message_complete'; usage: TokenUsage }
  | { type: 'error'; error: string };

// SSE 格式
// event: message_start
// data: {"messageId":"msg_xxx"}

// event: content_delta
// data: {"delta":"这是"}

// event: content_delta
// data: {"delta":"回答内容"}

// event: source_reference
// data: {"documentId":"doc_xxx","documentName":"合同.pdf","content":"...","relevanceScore":0.85}

// event: message_complete
// data: {"usage":{"inputTokens":100,"outputTokens":200}}
```

### 6.2 WebSocket 通信

AgentX 提供 WebSocket 支持：

```typescript
// 客户端连接
const ws = new WebSocket('ws://localhost:5200/ws');

// 发送消息
ws.send(JSON.stringify({
  type: 'message',
  conversationId: 'conv_xxx',
  content: '这份合同的风险点是什么？'
}));

// 接收流式响应
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'content_delta':
      appendToMessage(data.delta);
      break;
    case 'source_reference':
      addSourceReference(data.source);
      break;
    case 'message_complete':
      finishMessage();
      break;
  }
};
```

---

## 7. 数据结构

```typescript
interface Conversation {
  id: string;                    // 格式: conv_xxxxxxxx
  assistantId: string;
  title: string;
  status: 'active' | 'archived';
  messageCount: number;
  startedAt: Date;
  lastMessageAt: Date;
}

interface Message {
  id: string;                    // 格式: msg_xxxxxxxx
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    sources?: SourceReference[];
    tokensUsed?: TokenUsage;
  };
  createdAt: Date;
}

interface SourceReference {
  documentId: string;
  documentName: string;
  content: string;
  relevanceScore: number;
}
```

## 8. 流式响应事件

| 事件类型 | 描述 |
|----------|------|
| message_start | 消息开始 |
| content_delta | 内容增量 |
| source_reference | 来源引用 |
| message_complete | 消息完成 |
| error | 错误 |

## 9. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| CONVERSATION_NOT_FOUND | 404 | 对话不存在 |
| MESSAGE_NOT_FOUND | 404 | 消息不存在 |
| MESSAGE_CONTENT_REQUIRED | 400 | 消息内容不能为空 |
| MESSAGE_TOO_LONG | 400 | 消息内容过长 |
| GENERATION_TIMEOUT | 504 | 生成超时 |
| GENERATION_ABORTED | 499 | 生成被中断 |
| LLM_SERVICE_ERROR | 502 | LLM 服务错误 |

## 10. 验收标准

详见 Gherkin 特性文件：
- [创建对话](./features/conversation/004-create-conversation.feature)
- [发送消息](./features/conversation/004-send-message.feature)
- [流式响应](./features/conversation/004-stream-response.feature)

## 11. 非功能需求

| 需求 | 指标 |
|------|------|
| 首字节响应时间 | < 3s |
| 完整响应时间 | < 30s |
| 流式传输稳定性 | > 99% |
| 上下文窗口 | 最近 10 条消息 |

## 12. 实现路线图

### Phase 1: 基础对话（MVP）
- [ ] 对话 CRUD API
- [ ] 消息发送和存储
- [ ] AgentX 集成（LLM 调用）
- [ ] 基础 RAG 检索（Qdrant）
- [ ] SSE 流式响应
- [ ] 来源引用

### Phase 2: PromptX 集成
- [ ] 助手角色激活（promptx_action）
- [ ] 记忆检索（promptx_recall）
- [ ] 记忆保存（promptx_remember）
- [ ] 对话上下文优化

### Phase 3: 高级功能
- [ ] 多轮对话上下文优化
- [ ] 对话标题自动生成
- [ ] 中断生成功能
- [ ] WebSocket 支持

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2024-12-16 | 初始版本 |
| 2.0 | 2024-12-16 | 精简格式 |
| 3.0 | 2024-12-17 | 添加 Agentic 对话流程 |
| 3.1 | 2024-12-17 | 更新术语：主角色→助手，子角色→子代理，添加多实例说明 |
| 4.0 | 2024-12-17 | 简化流程，明确 AgentX/PromptX/Qdrant 职责分工 |
