# Change: 添加对话系统（混合模式）

## Why

用户需要与领域进行智能对话，以便快速获取基于文档的专业回答。对话系统是 Agentic RAG 的核心功能。

## 核心设计理念：Agentic 架构

本项目采用 **Agentic RAG** 架构，与传统 RAG 的关键区别：

| 传统 RAG | Agentic RAG（我们的设计） |
|----------|--------------------------|
| 代码直接调用向量检索 | **主角色通过提示词决定是否检索** |
| 固定流水线 | **AI 智能判断，委派子代理** |
| 每次都检索 | **按需检索，由 AI 决定** |

**子代理委派机制**：
- 子代理（如检索子代理、领域专家子代理）在**创建主角色时定义**
- 主角色的提示词包含意图识别逻辑
- AI 根据用户问题**自主决定**是否调用子代理
- 我们的代码**不直接调用 Qdrant**，而是让 AI 通过子代理来检索

## 设计决策：混合模式

经过对 AgentX 源码的分析，发现 AgentX 已经提供完整的对话管理能力（Session/Image/Message）。因此采用**混合模式**：

| 我们管理 | AgentX 管理 |
|---------|------------|
| 对话业务元数据（标题、状态） | Container（对应领域） |
| 领域-对话关联关系 | Image（领域的 MetaImage） |
| 用户权限控制 | Session（对话会话） |
| 文档关联 | Agent（运行时） |

**关键关联**：
- 创建领域时 → 创建 AgentX Container
- 创建对话时 → 创建 AgentX Session，保存 `sessionId` 到我们的 conversations 表
- 发送消息时 → 通过 AgentX Agent.receive() 发送
- 查询历史时 → 从 AgentX SessionRepository.getMessages() 获取

## What Changes

### Phase 1: AgentX 集成（MVP）
- 简化 conversations 表结构（添加 sessionId，删除 messages 表）
- 创建领域时创建 AgentX Container
- 创建对话时创建 AgentX Session
- 消息发送通过 AgentX Agent
- 对话历史从 AgentX 查询
- 客户端直接连接 AgentX WebSocket（ws://localhost:3000/ws）

### Phase 2: PromptX 集成
- 领域角色激活（promptx_action）
- 记忆检索（promptx_recall）
- 记忆保存（promptx_remember）
- **注意**：子代理委派（包括检索）由主角色提示词控制，不在此处实现

### Phase 3: 高级功能
- 对话标题自动生成
- 中断生成功能

## Impact

- **新增 capability**: conversation-system
- **依赖 capability**: domain-management, document-processing
- **依赖外部系统**: AgentX（核心依赖）
- **受影响的代码**:
  - 修改: `apps/web/src/server/database/index.ts`（简化 conversations 表，删除 messages 表）
  - 新增: `apps/web/src/server/services/agentx.service.ts`（AgentX 集成服务）
  - 新增: `apps/web/src/server/services/conversation.service.ts`（对话业务逻辑）
  - 新增: `apps/web/src/server/services/chat.service.ts`（聊天处理，RAG 增强）
  - 新增: `apps/web/src/server/routes/conversations.ts`（对话 API）
  - 新增: `apps/web/src/server/routes/websocket.ts`（WebSocket 代理）
  - 修改: `apps/web/src/server/index.ts`（注册路由）
  - 修改: `packages/shared/src/types/index.ts`（更新类型定义）

## Technical Decisions

详见 [design.md](./design.md)

## 已解决的问题

1. **AgentX 部署方式**: ✅ **已确认** - AgentX 作为 npm 包嵌入到我们的服务中
   - 使用 `import { createAgentX } from "agentxjs"`
   - 不需要独立部署，直接集成到 Node.js 服务器

2. **WebSocket 处理**: ✅ **已确认** - AgentX 自动处理 WebSocket
   - 通过 `createAgentX({ server })` 自动挂载到 HTTP 服务器
   - 提供 `/ws` 端点，无需额外代理

3. **MCP 配置方式**: ✅ **已确认** - MCP 在 `defineAgent` 时静态配置
   - 每个领域需要独立的 Definition
   - MCP 配置从领域 settings 获取，在创建 Definition 时构建

## 待确认问题

1. ~~**数据迁移**: 现有的 messages 表是否有数据需要迁移？~~ ✅ 已解决
2. ~~**检索工具 MCP**: 需要实现自定义的检索工具 MCP Server~~ ✅ 已实现
3. ~~**AgentX 依赖**: 需要在 package.json 中添加 `agentxjs` 依赖~~ ✅ 已完成
