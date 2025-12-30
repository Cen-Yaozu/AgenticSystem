# Capability: conversation-system

对话系统能力，支持用户与领域进行智能对话。

**设计模式**: 混合模式 + Agentic 架构
- 我们管理：对话业务元数据（标题、状态、领域关联）
- AgentX 管理：对话内容（Session、Message）
- AI 自主决定：子代理委派、文档检索、记忆操作

## ADDED Requirements

### Requirement: CONV-001 创建对话

系统 SHALL 允许用户在指定领域下创建新对话。

**业务规则**:
- 对话 MUST 关联到一个领域
- 创建对话时 MUST 同时创建 AgentX Session
- 系统 MUST 保存 sessionId 到 conversations 表

#### Scenario: 成功创建对话

```gherkin
Given 存在领域 "法律顾问"
When 用户请求创建对话
Then 系统创建 AgentX Session
And 系统在 conversations 表保存对话记录
And 返回对话信息包含 id, domainId, sessionId, title, status
```

#### Scenario: 领域不存在时创建失败

```gherkin
Given 领域 "不存在的领域" 不存在
When 用户请求在该领域下创建对话
Then 返回 404 错误 "DOMAIN_NOT_FOUND"
```

---

### Requirement: CONV-002 查询对话列表

系统 SHALL 允许用户查询指定领域下的所有对话。

**业务规则**:
- 系统 MUST 只返回业务元数据（从 conversations 表）
- 系统 MUST 支持分页
- 结果 MUST 按更新时间倒序排列

#### Scenario: 成功查询对话列表

```gherkin
Given 领域 "法律顾问" 下有 3 个对话
When 用户查询该领域的对话列表
Then 返回 3 个对话的业务元数据
And 每个对话包含 id, title, status, createdAt, updatedAt
```

---

### Requirement: CONV-003 查询对话详情

系统 SHALL 允许用户查询对话的详细信息，包括消息历史。

**业务规则**:
- 业务元数据 MUST 从 conversations 表获取
- 消息历史 MUST 从 AgentX SessionRepository 获取

#### Scenario: 成功查询对话详情

```gherkin
Given 存在对话 "合同咨询"
When 用户查询该对话详情
Then 返回对话业务元数据
And 返回从 AgentX 获取的消息历史
```

#### Scenario: 对话不存在时查询失败

```gherkin
Given 对话 "不存在的对话" 不存在
When 用户查询该对话详情
Then 返回 404 错误 "CONVERSATION_NOT_FOUND"
```

---

### Requirement: CONV-004 删除对话

系统 SHALL 允许用户删除对话。

**业务规则**:
- 系统 MUST 删除 conversations 表记录
- 系统 MUST 同时删除 AgentX Session（级联删除 Message）

#### Scenario: 成功删除对话

```gherkin
Given 存在对话 "合同咨询"
When 用户删除该对话
Then 系统删除 conversations 表记录
And 系统删除 AgentX Session
And 返回成功
```

---

### Requirement: CONV-005 发送消息

系统 SHALL 允许用户在对话中发送消息。

**业务规则**:
- 消息内容 MUST NOT 为空，最大 10000 字符
- 系统 MUST 通过 AgentX Agent.receive() 发送消息
- 消息 MUST 自动存储在 AgentX Session 中

#### Scenario: 成功发送消息

```gherkin
Given 存在对话 "合同咨询"
When 用户发送消息 "这份合同有什么风险？"
Then 系统从 AgentX 恢复 Agent
And 系统调用 Agent.receive() 发送消息
And 返回流式响应
```

#### Scenario: 消息内容为空时发送失败

```gherkin
Given 存在对话 "合同咨询"
When 用户发送空消息
Then 返回 400 错误 "MESSAGE_CONTENT_REQUIRED"
```

#### Scenario: 消息内容过长时发送失败

```gherkin
Given 存在对话 "合同咨询"
When 用户发送超过 10000 字符的消息
Then 返回 400 错误 "MESSAGE_TOO_LONG"
```

---

### Requirement: CONV-006 流式响应

系统 SHALL 支持流式返回 AI 回复。

**业务规则**:
- 系统 MUST 使用 SSE 或 WebSocket 传输
- 系统 MUST 转发 AgentX 的流式事件
- 系统 MUST 支持事件类型：message_start, text_delta, message_complete, error

#### Scenario: 接收流式响应

```gherkin
Given 用户发送消息
When AI 开始生成回复
Then 客户端收到 message_start 事件
And 客户端持续收到 text_delta 事件
And 最后收到 message_complete 事件
```

---

### Requirement: CONV-007 主角色配置

系统 SHALL 为每个领域配置主角色。

**业务规则**:
- 系统 MUST 配置 primaryRoleId 指向 PromptX 角色
- systemPrompt MAY 包含领域基础描述
- systemPrompt MUST 引导 AI 激活 PromptX 角色
- 意图识别和 AI 行为由 PromptX 角色定义（不是我们的职责）

#### Scenario: 配置主角色

```gherkin
Given 存在领域 "法律顾问"
When 创建对话时
Then 系统使用领域配置的 primaryRoleId
And systemPrompt 引导 AI 激活 PromptX 角色
And AI 行为由 PromptX 角色定义
```

---

### Requirement: CONV-008 MCP Server 配置

系统 SHALL 为 AgentX Session 配置 MCP Server，支持用户自定义配置。

**业务规则**:
- 系统 MUST 自动配置 PromptX MCP Server（系统级，不可覆盖）
- 系统 MUST 自动配置检索工具（如果领域有文档）
- 用户 MAY 配置自定义 MCP Server
- 系统 MUST 合并系统级和用户自定义 MCP 配置
- AI SHALL 能够自主调用所有配置的 MCP 工具

#### Scenario: 配置系统级 MCP Server

```gherkin
Given 创建新对话
When 系统创建 AgentX Session
Then Session 配置包含 PromptX MCP Server（系统级）
And PromptX MCP 的 PROMPTX_PROJECT_DIR 设置为领域工作区路径
And AI 可以调用 promptx_action, promptx_recall, promptx_remember
```

#### Scenario: 配置检索工具 MCP

```gherkin
Given 领域有已处理的文档
When 系统创建 AgentX Session
Then Session 配置包含检索工具 MCP
And 检索工具配置包含领域的 retrievalTopK 和 retrievalThreshold
And AI 可以调用 search_documents 工具
```

#### Scenario: 配置用户自定义 MCP

```gherkin
Given 领域配置了自定义 MCP "web-search"
When 系统创建 AgentX Session
Then Session 配置包含用户自定义的 "web-search" MCP
And AI 可以调用该 MCP 提供的工具
```

---

### Requirement: CONV-008.1 MCP 配置管理

系统 SHALL 允许用户管理领域的 MCP Server 配置。

**业务规则**:
- MCP 配置 MUST 存储在 domain.settings.mcpServers 中
- 用户 MUST NOT 能覆盖系统级 MCP（promptx）
- 系统 MUST 验证 MCP 配置格式
- 系统 SHOULD 提供 MCP 命令白名单验证

#### Scenario: 添加自定义 MCP 配置

```gherkin
Given 存在领域 "法律顾问"
When 用户更新领域配置，添加 MCP Server "web-search"
  | 字段 | 值 |
  | command | npx |
  | args | ["@anthropic/mcp-server-web-search"] |
  | env.SEARCH_API_KEY | xxx |
Then 领域配置更新成功
And settings.mcpServers 包含 "web-search" 配置
```

#### Scenario: 无法覆盖系统级 MCP

```gherkin
Given 存在领域 "法律顾问"
When 用户尝试配置名为 "promptx" 的 MCP Server
Then 返回 400 错误 "MCP_NAME_RESERVED"
And 系统级 MCP 配置不变
```

#### Scenario: 查看合并后的 MCP 配置

```gherkin
Given 领域配置了自定义 MCP "web-search"
When 用户查询领域详情
Then 返回的 mcpServers 包含：
  | 名称 | 来源 |
  | promptx | 系统级（只读） |
  | retriever | 内置（只读） |
  | web-search | 用户自定义 |
```

---

### Requirement: CONV-009 AI 自主检索（Agentic）

AI MAY 通过 MCP 工具自主检索文档。

**业务规则**:
- 系统 MUST 配置 search_documents MCP 工具
- AI MAY 自主决定是否调用检索工具
- 检索行为由 PromptX 角色定义，我们只负责配置 MCP

#### Scenario: AI 通过 MCP 工具检索文档

```gherkin
Given 领域 "法律顾问" 有文档 "合同模板.pdf"
And 系统已配置 search_documents MCP 工具
When 用户问 "合同违约条款是什么？"
Then AI 通过 MCP 工具检索相关文档
And AI 基于文档内容回答
```

---

### Requirement: CONV-010 AI 自主记忆操作（Agentic）

AI MAY 通过 PromptX MCP 自主操作记忆。

**业务规则**:
- 系统 MUST 配置 PromptX MCP（promptx_recall/remember）
- AI MAY 自主决定何时检索和保存记忆
- 记忆行为由 PromptX 角色定义，我们只负责配置 MCP

#### Scenario: AI 通过 MCP 操作记忆

```gherkin
Given 系统已配置 PromptX MCP
When 用户发送消息
Then AI MAY 调用 promptx_recall 检索记忆
And AI MAY 调用 promptx_remember 保存记忆
```

---

### Requirement: CONV-011 Agentic 能力扩展

AI MAY 通过 MCP 工具执行各种自主操作。

**业务规则**:
- 系统 MUST 支持配置多种 MCP 工具
- AI 的具体行为由 PromptX 角色定义
- 我们只负责 MCP 配置和工具注册

**说明**: 子代理委派、意图识别等高级 AI 行为完全由 PromptX 角色文件定义，
我们的系统只需要正确配置 MCP Server，让 AI 能够访问所需工具即可。

#### Scenario: 系统配置 MCP 工具

```gherkin
Given 领域需要文档检索能力
When 管理员配置 MCP 工具
Then 系统注册 search_documents 工具
And AI 可以通过 MCP 访问该工具
```

---

### Requirement: CONV-012 对话标题自动生成

系统 SHALL 自动生成对话标题。

**业务规则**:
- 系统 MUST 基于首条用户消息生成标题
- 标题长度 MUST NOT 超过 50 字符

#### Scenario: 自动生成标题

```gherkin
Given 新创建的对话没有标题
When 用户发送首条消息 "请帮我分析这份合同的风险点"
Then 系统自动生成标题 "合同风险分析"
And 更新对话标题
```

---

### Requirement: CONV-013 中断生成

系统 SHALL 允许用户中断正在生成的回复。

**业务规则**:
- 发送中断请求后 MUST 停止生成
- 已生成的内容 MUST 保留

#### Scenario: 中断生成

```gherkin
Given AI 正在生成回复
When 用户发送中断请求
Then 系统停止生成
And 返回 GENERATION_ABORTED 状态
And 已生成的内容保留
```

---

### Requirement: CONV-014 WebSocket 连接

客户端 SHALL 直接连接 AgentX WebSocket 接收流式响应。

**业务规则**:
- WebSocket 端点为 `/ws`（由 AgentX 提供）
- sessionId 作为访问凭证（随机生成，不可猜测）
- 客户端订阅特定 sessionId 接收事件
- HTTP API 处理认证和权限验证

#### Scenario: WebSocket 连接

```gherkin
Given 用户已通过 HTTP API 认证
When 用户连接 AgentX WebSocket
Then 用户发送订阅消息，包含 sessionId
And 客户端接收该 sessionId 的流式事件
```

---

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/domains/:id/conversations | 创建对话 |
| GET | /api/domains/:id/conversations | 查询对话列表 |
| GET | /api/conversations/:id | 查询对话详情 |
| DELETE | /api/conversations/:id | 删除对话 |
| POST | /api/conversations/:id/messages | 发送消息 |
| POST | /api/conversations/:id/abort | 中断生成 |
| WS | /ws | WebSocket 连接 |

## 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| CONVERSATION_NOT_FOUND | 404 | 对话不存在 |
| DOMAIN_NOT_FOUND | 404 | 领域不存在 |
| MESSAGE_CONTENT_REQUIRED | 400 | 消息内容不能为空 |
| MESSAGE_TOO_LONG | 400 | 消息内容过长 |
| GENERATION_TIMEOUT | 504 | 生成超时 |
| GENERATION_ABORTED | 499 | 生成被中断 |
| AGENTX_ERROR | 502 | AgentX 服务错误 |
| MCP_NAME_RESERVED | 400 | MCP 名称被保留（系统级） |
| MCP_CONFIG_INVALID | 400 | MCP 配置格式无效 |
| MCP_COMMAND_NOT_ALLOWED | 400 | MCP 命令不在白名单中 |
