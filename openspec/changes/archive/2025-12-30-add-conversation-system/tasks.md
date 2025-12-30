# Tasks: 对话系统实现任务（Agentic 架构）

## Phase 1: AgentX 集成（MVP）✅ 已完成

### 1.1 AgentX 依赖和初始化 ✅
- [x] 在 apps/web/package.json 添加 agentxjs 依赖
- [x] 创建 agentx.service.ts（AgentX 实例管理）
- [x] 在服务器启动时初始化 AgentX 实例
- [x] 配置 AgentX 数据目录和 WebSocket

### 1.2 数据库结构调整 ✅
- [x] 简化 conversations 表（添加 session_id 字段，删除 image_id）
- [x] 删除 messages 表（消息由 AgentX 管理）
- [x] 更新类型定义（Conversation 类型）

### 1.3 领域-Definition 关联 ✅
- [x] 修改领域创建流程，动态注册 AgentX Definition
- [x] 实现 buildSystemPrompt 函数（从领域配置构建）
- [x] 实现 buildMCPServers 函数（合并系统级和用户自定义 MCP）
- [x] 修改领域删除流程，注销 AgentX Definition

### 1.4 检索工具 MCP Server 实现 ✅
- [x] 创建 mcp-servers/retriever.js（自定义 MCP Server）
- [x] 实现 search_documents 工具（连接 Qdrant）
- [x] 支持环境变量配置（DOMAIN_ID, QDRANT_COLLECTION 等）
- [x] 测试 MCP Server 独立运行

### 1.5 对话 API ✅
- [x] 创建 conversation.service.ts（对话业务逻辑）
- [x] 创建 conversations.ts 路由
- [x] 实现 POST /api/domains/:id/conversations（创建对话，使用 MetaImage）
- [x] 实现 GET /api/domains/:id/conversations（查询对话列表）
- [x] 实现 GET /api/conversations/:id（查询对话详情，从 AgentX Session 获取消息）
- [x] 实现 DELETE /api/conversations/:id（删除对话）

### 1.6 消息发送 ✅
- [x] 创建 chat.service.ts（聊天处理）
- [x] 实现 POST /api/conversations/:id/messages（发送消息）
- [x] 实现 Session 恢复和 Agent 创建（session.resume()）
- [x] 客户端直接连接 AgentX WebSocket 接收流式响应

### 1.7 WebSocket 集成 ✅
- [x] AgentX 自动提供 WebSocket（无需额外代理）
- [x] 客户端直接连接 ws://localhost:3000/ws
- [x] sessionId 作为访问凭证

### 1.8 测试 ✅
- [x] 编写 conversation.service 单元测试（16 tests）
- [x] 编写 chat.service 单元测试（11 tests）
- [x] 所有测试通过（27/27）

## Phase 2: 角色驱动配置（Agentic 架构核心）✅ 已完成

### 2.1 领域配置扩展 ✅
- [x] 扩展 DomainSettings 类型，添加 primaryRoleId, subRoleIds, mcpServers 字段
- [x] 更新领域 API，支持 MCP 配置的 CRUD（通过现有的 PUT /api/domains/:id）
- [x] 实现 MCP 配置验证（格式、命令白名单）
- [x] 实现系统级 MCP 保护（不允许覆盖 promptx, retriever）

### 2.2 角色创建 ✅
- [x] 创建 role.service.ts（角色服务）
- [x] 创建领域时，自动创建角色定义文件
- [x] 角色定义文件存储在 `workspacePath/.promptx/resource/role/{roleId}.role.md`
- [x] 自动生成默认角色 ID（{domainId}-domain）
- [x] 角色定义包含：描述、专业领域、回复风格、语气、子代理委派规则

### 2.3 最小引导 systemPrompt ✅
- [x] 实现 buildSystemPrompt 函数（只提供最小引导）
- [x] 引导 AI 在对话开始时激活角色（promptx_action）
- [x] 列出可用的 MCP 工具
- [x] 角色激活后，PromptX 自动注入完整的角色能力

### 2.4 MCP Server 配置 ✅
- [x] 实现 buildMCPServers 函数（合并系统级、内置、用户自定义 MCP）
- [x] 配置 PromptX MCP Server（系统级，自动注入 PROMPTX_PROJECT_DIR）
- [x] 配置检索工具 MCP（内置，从领域配置获取 retrievalTopK/Threshold）
- [x] 支持用户自定义 MCP（从 domain.settings.mcpServers 获取）
- [x] MCP 配置优先级：系统级 > 内置 > 用户自定义

**实现文件**：
- `packages/shared/src/types/index.ts` - MCPServerConfig, MCPServersConfig 类型定义
- `apps/web/src/server/validators/domain.validator.ts` - MCP 配置验证和系统保护
- `apps/web/src/server/services/role.service.ts` - 角色服务
- `apps/web/src/server/services/agentx.service.ts` - buildSystemPrompt, buildMCPServers 函数
- `apps/web/src/server/services/domain.service.ts` - 领域创建时自动创建角色

**注意**：
- 我们的系统是一个"架子"，核心能力来自 PromptX 角色系统
- 角色定义由 PromptX 管理，通过角色服务创建
- AI 行为由 PromptX 角色定义，我们只负责配置 MCP
- PromptX 调用由 AI 在对话过程中自主触发

## Phase 3: 高级功能 ✅ 已完成

### 3.1 对话标题自动生成 ✅
- [x] 实现基于首条消息的标题生成
- [x] 更新对话标题

### 3.2 中断生成 ✅
- [x] 实现 POST /api/conversations/:id/abort
- [x] 中断正在进行的生成

**实现文件**：
- `apps/web/src/server/services/chat.service.ts` - generateTitle 函数、sendMessage 自动生成标题、abortGeneration 方法
- `apps/web/src/server/routes/conversations.ts` - POST /api/v1/conversations/:id/abort 端点

**实现说明**：
- 标题生成：在 sendMessage 时检查对话是否已有标题，如果没有则基于首条消息内容自动生成
- 标题截取前 50 个字符，尝试在单词边界截断
- 中断生成：通过 AgentX 的 agent_abort_request 请求中断当前响应生成
- 返回结果包含 titleGenerated 字段，告知客户端是否生成了新标题

## 验收标准

### Phase 1 验收 ✅
- [x] 创建对话成功，同时创建 AgentX Image
- [x] 发送消息成功，通过 AgentX Agent 处理
- [x] 查询对话历史成功，从 AgentX 获取消息（使用 image_messages_request）
- [x] WebSocket 连接成功，能接收流式响应（日志显示 text_delta 事件正常传输）
- [x] 删除对话成功，同时删除 AgentX Image

### Phase 2 验收 ✅
- [x] DomainSettings 类型已扩展，支持 primaryRoleId, subRoleIds, mcpServers
- [x] MCP 配置验证已实现（命令白名单：npx, node, python, python3, deno, bun）
- [x] 系统级 MCP 保护已实现（promptx, retriever 不可覆盖）
- [x] 创建领域时自动创建角色定义文件
- [x] buildSystemPrompt 函数提供最小引导
- [x] buildMCPServers 函数正确合并三层 MCP 配置
- [x] 主角色能正确激活（AI 调用了 promptx_action 激活角色）
- [x] AI 能通过 PromptX MCP 调用角色和记忆功能（MCP 配置正确，AI 可调用）
- [x] AI 能通过检索 MCP 访问文档（MCP 配置正确，需要 Qdrant 服务运行）

### Phase 3 验收 ✅
- [x] 对话标题自动生成
- [x] 中断生成功能正常

## 集成测试记录（2025-12-30）

### 测试环境
- LLM API: 智谱 GLM-4.7 (https://open.bigmodel.cn/api/anthropic)
- 服务端口: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

### 测试结果
1. **GET /api/v1/domains** - 200 OK ✅
2. **POST /api/v1/domains/:domainId/conversations** - 201 Created ✅
3. **GET /api/v1/domains/:domainId/conversations** - 200 OK ✅
4. **GET /api/v1/conversations/:id** - 200 OK ✅（包含消息历史）
5. **POST /api/v1/conversations/:id/messages** - 201 Created ✅（修复了 message_send_request）
6. **PATCH /api/v1/conversations/:id/title** - 200 OK ✅
7. **POST /api/v1/conversations/:id/abort** - 200 OK ✅（修复了 agent_interrupt_request）
8. **DELETE /api/v1/conversations/:id** - 200 OK ✅

### 修复的问题
1. **命令名称错误**：
   - `agent_send_request` → `message_send_request`
   - `agent_abort_request` → `agent_interrupt_request`
   - `agent_list_request` → `image_messages_request`

2. **消息历史获取**：
   - 使用 `image_messages_request` 通过 imageId 获取消息
   - 修复了 conversation.service.ts 和 chat.service.ts 中的实现
