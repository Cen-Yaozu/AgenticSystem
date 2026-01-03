## MODIFIED Requirements

### Requirement: CONV-001 创建对话

系统 SHALL 允许用户在指定领域下创建新对话。

**业务规则**:
- 对话 MUST 关联到一个领域
- 对话 MUST 对应一个 AgentX **Agent**（运行时实例）
- 系统 MUST 保存 `agentId` 到 conversations 表作为对话主标识
- 系统 MUST 保存 `imageId`（指向领域模板）和 `sessionId`
- 系统 MUST NOT 为每个对话创建新的 Image

#### Scenario: 成功创建对话（Agent-First）

```gherkin
Given 存在领域 "法律顾问"
And 该领域存在 templateImageId
When 用户请求创建对话
Then 系统调用 image_run_request(templateImageId, sessionId)
And 系统从响应中提取 agentId
And 系统在 conversations 表保存对话记录，包含 id, domainId, agentId, imageId, sessionId
And 返回对话信息包含 id, domainId, agentId, title, status
```

---

### Requirement: CONV-003 查询对话详情

系统 SHALL 允许用户查询对话的详细信息，包括消息历史。

**业务规则**:
- 业务元数据 MUST 从 conversations 表获取
- 消息历史 MUST 通过 AgentX `session_messages_request(sessionId)` 获取
- 系统 MUST NOT 使用 `image_messages_request(imageId)`（该 API 返回 Image 默认 session 的消息）

#### Scenario: 成功查询对话详情（按 sessionId 获取消息）

```gherkin
Given 存在对话 "合同咨询" 且包含 sessionId
When 用户查询该对话详情
Then 返回对话业务元数据
And 返回从 AgentX 获取的消息历史（session_messages_request）
```

---

### Requirement: CONV-005 发送消息

系统 SHALL 允许用户在对话中发送消息。

**业务规则**:
- 系统 MUST 使用 `message_send_request` 并传入 `agentId`（而非 imageId）
- 返回值 MUST 包含 `messageId` 和 `agentId`

#### Scenario: 成功发送消息（按 agentId）

```gherkin
Given 存在对话 "合同咨询" 且包含 agentId
When 用户发送消息 "这份合同有什么风险？"
Then 系统调用 message_send_request(agentId, content)
And 返回 messageId 与 agentId
```

---

### Requirement: CONV-006 流式响应

系统 SHALL 支持流式返回 AI 回复。

**业务规则**:
- 系统 MUST 提供应用层的流式通道（WebSocket 或 SSE）
- 流式通道 MUST 进行认证与授权，并按 conversation(agentId) 隔离事件
- 系统 MUST NOT 将 AgentX 原生 `/ws` 广播端点暴露给最终用户
- 系统 MUST 按 `agentId` 过滤事件，而非 `imageId`
- 系统 MUST 转发 AgentX 的事件类型：`message_start`, `text_delta`, `conversation_end`/`message_stop`, `system_error`

#### Scenario: 已认证用户接收流式响应（按 agentId 隔离）

```gherkin
Given 用户已通过 HTTP API 认证
And 用户拥有对话 "合同咨询"
When 用户连接该对话的流式通道 /api/v1/conversations/:id/stream
And 用户发送消息
Then 客户端仅收到该对话（agentId）的流式事件
And 不会收到其他对话的事件（即使共享同一 template image）
```

---

### Requirement: CONV-013 中断生成

系统 SHALL 允许用户中断正在生成的回复。

**业务规则**:
- 系统 MUST 通过 `agent_interrupt_request(agentId)` 中断生成

#### Scenario: 中断生成（按 agentId）

```gherkin
Given AI 正在为对话 "合同咨询"（agentId）生成回复
When 用户发送中断请求
Then 系统调用 agent_interrupt_request(agentId)
And AI 停止生成
```

---

## MODIFIED API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/domains/:id/conversations | 创建对话（返回 agentId） |
| GET | /api/domains/:id/conversations | 查询对话列表 |
| GET | /api/conversations/:id | 查询对话详情（按 sessionId 拉消息） |
| DELETE | /api/conversations/:id | 删除对话 |
| POST | /api/conversations/:id/messages | 发送消息（按 agentId） |
| POST | /api/conversations/:id/abort | 中断生成（按 agentId） |
| WS | /api/conversations/:id/stream | 对话流式通道（应用层，需认证，按 agentId 过滤） |
