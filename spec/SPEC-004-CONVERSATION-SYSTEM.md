# SPEC-004: 对话系统

> 版本: 2.0 | 状态: Draft | 日期: 2024-12-16

## 1. 概述

**目的**：定义对话系统的完整规格，包括对话管理、消息处理和流式响应。

**范围**：
- 包含：对话生命周期、消息发送接收、流式响应、RAG 检索集成
- 不包含：角色切换逻辑（见 SPEC-005）

**相关文档**：
- [SPEC-002 助手管理](./SPEC-002-ASSISTANT-MANAGEMENT.md)
- [SPEC-003 文档处理](./SPEC-003-DOCUMENT-PROCESSING.md)
- [SPEC-005 角色与记忆](./SPEC-005-ROLE-MEMORY.md)

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

```
用户消息 → 意图分析 → 角色选择 → 知识检索 → 记忆回忆
    │                                              │
    │                                              ▼
    │                                        提示构建
    │                                              │
    │                                              ▼
    │                                        LLM 调用
    │                                              │
    │                                              ▼
    └──────────────────────────────────────── 流式输出
                                                   │
                                                   ▼
                                              记忆保存
```

## 6. 数据结构

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

## 7. 流式响应事件

| 事件类型 | 描述 |
|----------|------|
| message_start | 消息开始 |
| content_delta | 内容增量 |
| source_reference | 来源引用 |
| message_complete | 消息完成 |
| error | 错误 |

## 8. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| CONVERSATION_NOT_FOUND | 404 | 对话不存在 |
| MESSAGE_NOT_FOUND | 404 | 消息不存在 |
| MESSAGE_CONTENT_REQUIRED | 400 | 消息内容不能为空 |
| MESSAGE_TOO_LONG | 400 | 消息内容过长 |
| GENERATION_TIMEOUT | 504 | 生成超时 |
| GENERATION_ABORTED | 499 | 生成被中断 |
| LLM_SERVICE_ERROR | 502 | LLM 服务错误 |

## 9. 验收标准

详见 Gherkin 特性文件：
- [创建对话](./features/conversation/004-create-conversation.feature)
- [发送消息](./features/conversation/004-send-message.feature)
- [流式响应](./features/conversation/004-stream-response.feature)

## 10. 非功能需求

| 需求 | 指标 |
|------|------|
| 首字节响应时间 | < 3s |
| 完整响应时间 | < 30s |
| 流式传输稳定性 | > 99% |
| 上下文窗口 | 最近 10 条消息 |