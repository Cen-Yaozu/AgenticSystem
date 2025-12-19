# Tasks: 对话系统实现任务（Agentic 架构）

## Phase 1: AgentX 集成（MVP）

### 1.1 AgentX 依赖和初始化
- [ ] 在 apps/web/package.json 添加 agentxjs 依赖
- [ ] 创建 agentx.service.ts（AgentX 实例管理）
- [ ] 在服务器启动时初始化 AgentX 实例
- [ ] 配置 AgentX 数据目录和 WebSocket

### 1.2 数据库结构调整
- [ ] 简化 conversations 表（添加 session_id 字段，删除 image_id）
- [ ] 删除 messages 表（消息由 AgentX 管理）
- [ ] 更新类型定义（Conversation 类型）

### 1.3 领域-Definition 关联
- [ ] 修改领域创建流程，动态注册 AgentX Definition
- [ ] 实现 buildSystemPrompt 函数（从领域配置构建）
- [ ] 实现 buildMCPServers 函数（合并系统级和用户自定义 MCP）
- [ ] 修改领域删除流程，注销 AgentX Definition

### 1.4 检索工具 MCP Server 实现
- [ ] 创建 mcp-servers/retriever.js（自定义 MCP Server）
- [ ] 实现 search_documents 工具（连接 Qdrant）
- [ ] 支持环境变量配置（DOMAIN_ID, QDRANT_COLLECTION 等）
- [ ] 测试 MCP Server 独立运行

### 1.5 对话 API
- [ ] 创建 conversation.service.ts（对话业务逻辑）
- [ ] 创建 conversations.ts 路由
- [ ] 实现 POST /api/domains/:id/conversations（创建对话，使用 MetaImage）
- [ ] 实现 GET /api/domains/:id/conversations（查询对话列表）
- [ ] 实现 GET /api/conversations/:id（查询对话详情，从 AgentX Session 获取消息）
- [ ] 实现 DELETE /api/conversations/:id（删除对话）

### 1.6 消息发送
- [ ] 创建 chat.service.ts（聊天处理）
- [ ] 实现 POST /api/conversations/:id/messages（发送消息）
- [ ] 实现 Session 恢复和 Agent 创建（session.resume()）
- [ ] 实现流式响应处理（agent.react() 事件监听）
- [ ] 实现 WebSocket 事件转发

### 1.7 WebSocket 集成
- [ ] AgentX 自动提供 WebSocket（无需额外代理）
- [ ] 实现客户端 WebSocket 连接
- [ ] 添加权限验证中间件

### 1.8 测试
- [ ] 编写 agentx.service 单元测试
- [ ] 编写 conversation.service 单元测试
- [ ] 编写检索工具 MCP Server 测试
- [ ] 编写 API 集成测试

## Phase 2: 角色驱动配置（Agentic 架构核心）

### 2.1 领域配置扩展
- [ ] 扩展 DomainSettings 类型，添加 primaryRoleId, subRoleIds, mcpServers 字段
- [ ] 更新领域 API，支持 MCP 配置的 CRUD
- [ ] 实现 MCP 配置验证（格式、命令白名单）
- [ ] 实现系统级 MCP 保护（不允许覆盖 promptx）

### 2.2 角色创建（通过女娲）
- [ ] 创建领域时，调用女娲创建角色定义文件
- [ ] 角色定义文件存储在 `workspacePath/.promptx/resource/role/`
- [ ] 角色定义包含：专业领域、意图识别逻辑、子代理委派规则
- [ ] 角色定义由 PromptX 管理，我们不需要硬编码 systemPrompt

### 2.3 最小引导 systemPrompt
- [ ] 实现 buildSystemPrompt 函数（只提供最小引导）
- [ ] 引导 AI 在对话开始时激活角色
- [ ] 列出可用的 MCP 工具
- [ ] 角色激活后，PromptX 自动注入完整的角色能力

### 2.4 MCP Server 配置
- [ ] 实现 buildMCPServers 函数（合并系统级、内置、用户自定义 MCP）
- [ ] 配置 PromptX MCP Server（系统级，自动注入 PROMPTX_PROJECT_DIR）
- [ ] 配置检索工具 MCP（内置，从领域配置获取 retrievalTopK/Threshold）
- [ ] 支持用户自定义 MCP（从 domain.settings.mcpServers 获取）
- [ ] 在 AgentX Definition 创建时注入合并后的 MCP 配置

**注意**：
- 我们的系统是一个"架子"，核心能力来自 PromptX 角色系统
- 角色定义由 PromptX 管理，通过女娲创建
- 子代理委派由 AI 自主决定，不是代码硬编码
- PromptX 调用由 AI 在对话过程中自主触发
- 我们只负责配置 MCP，不负责调用

## Phase 3: 高级功能

### 3.1 对话标题自动生成
- [ ] 实现基于首条消息的标题生成
- [ ] 更新对话标题

### 3.2 中断生成
- [ ] 实现 POST /api/conversations/:id/abort
- [ ] 中断正在进行的生成

## 验收标准

### Phase 1 验收
- [ ] 创建对话成功，同时创建 AgentX Image
- [ ] 发送消息成功，通过 AgentX Agent 处理
- [ ] 查询对话历史成功，从 AgentX 获取消息
- [ ] WebSocket 连接成功，能接收流式响应
- [ ] 删除对话成功，同时删除 AgentX Image

### Phase 2 验收
- [ ] 主角色能正确识别用户意图
- [ ] AI 能自主决定是否委派检索子代理
- [ ] AI 能通过 PromptX MCP 调用角色和记忆功能
- [ ] 回答能基于文档内容（通过检索子代理）

### Phase 3 验收
- [ ] 对话标题自动生成
- [ ] 中断生成功能正常
