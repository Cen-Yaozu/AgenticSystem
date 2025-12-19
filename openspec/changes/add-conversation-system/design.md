# Design: 对话系统技术设计（混合模式）

## Context

对话系统是 Agentic RAG 的核心功能，需要整合多个外部系统：
- **AgentX**: AI Agent 框架，负责 LLM 调用、Session/Message 管理、WebSocket 通信
- **PromptX**: 角色和记忆管理，通过 MCP 协议调用

### 核心概念：领域 = 工作区

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           领域（工作区）与对话的关系                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         领域（工作区）                                │   │
│  │                         "法律顾问"                                    │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  主角色（PromptX Role）                                      │     │   │
│  │  │  • 专业领域定义                                              │     │   │
│  │  │  • 意图识别逻辑                                              │     │   │
│  │  │  • 子代理委派规则（检索子代理、领域专家等）                  │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  文档知识库（Qdrant Collection）                             │     │   │
│  │  │  • 合同模板.pdf                                              │     │   │
│  │  │  • 法律条款.docx                                             │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  对话列表                                                    │     │   │
│  │  │  • 对话 1: "合同审查咨询"                                    │     │   │
│  │  │  • 对话 2: "违约条款解读"                                    │     │   │
│  │  │  • 对话 3: ...                                               │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**关键点**：
- 每个领域是一个独立的工作区，有自己的文档知识库
- 对话在领域的上下文中进行，可以访问该领域的文档
- 主角色的提示词定义了如何检索文档、何时委派子代理
- **子代理委派由 AI 自主决定**，不是代码硬编码

### 关键发现：AgentX 已有完整的对话管理能力

经过对 AgentX 源码的分析，发现 AgentX 已经提供：

| AgentX 概念 | 说明 | 对应我们的概念 |
|------------|------|---------------|
| **Image** | 对话的持久化实体 | Conversation |
| **Session** | 消息收集器（内部实现） | 无需关心 |
| **Agent** | 运行时实例（临时的） | 无需关心 |
| **Container** | 用户隔离边界 | Domain |

### 约束条件
- 必须支持流式响应（SSE/WebSocket），首字节响应时间 < 3s
- 需要与现有的 domain-management 和 document-processing 集成
- **采用混合模式**：AgentX 管理对话内容，我们管理业务元数据

## Goals / Non-Goals

### Goals
- 集成 AgentX 的对话管理能力（Image/Session/Agent）
- 管理业务元数据（对话标题、状态、助手关联）
- 集成 RAG 检索，回答基于文档内容
- 支持流式响应（复用 AgentX WebSocket）
- 集成 PromptX 角色和记忆系统
- 提供来源引用功能

### Non-Goals
- 不重复实现消息存储（使用 AgentX）
- 不实现多模态（图片、语音）
- 不实现对话分享功能
- 不实现对话导出功能

## Decisions

### Decision 0: 配置来源（从领域获取）

对话系统的配置大部分从领域（工作区）获取，避免重复配置：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           配置来源映射                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  领域配置（SQLite domains 表 settings JSON 字段）                            │
│  ├── settings.primaryRoleId ────────► 主角色 ID（对话开始时激活）            │
│  ├── settings.subRoleIds ───────────► 子代理列表（在 systemPrompt 中定义）   │
│  ├── settings.retrievalTopK ────────► 检索数量（传给检索工具）               │
│  ├── settings.retrievalThreshold ───► 检索阈值（传给检索工具）               │
│  ├── settings.maxTokens ────────────► LLM 最大 token（传给 AgentX）          │
│  ├── settings.temperature ──────────► LLM 温度（传给 AgentX）                │
│  ├── settings.responseStyle ────────► 回复风格（写入 systemPrompt）          │
│  ├── settings.tone ─────────────────► 语气（写入 systemPrompt）              │
│  ├── settings.language ─────────────► 语言（写入 systemPrompt）              │
│  │                                                                          │
│  │  🆕 MCP 配置（用户可配置）                                                │
│  ├── settings.mcpServers ───────────► MCP Servers 配置（用户自定义）         │
│  │   ├── [name].command ────────────► 启动命令                               │
│  │   ├── [name].args ───────────────► 命令参数                               │
│  │   └── [name].env ────────────────► 环境变量                               │
│  │                                                                          │
│  └── workspacePath ─────────────────► 工作区路径                             │
│                                       ├── .promptx/resource/role/ ─► 角色定义│
│                                       └── documents/ ──────────────► 文档存储│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**配置来源表**：

| 配置项 | 来源 | 说明 |
|--------|------|------|
| 主角色 ID | `domain.settings.primaryRoleId` | 对话开始时调用 `promptx_action({ role })` |
| 子代理列表 | `domain.settings.subRoleIds` | 在 systemPrompt 中定义委派规则 |
| 角色定义文件 | `domain.workspacePath/.promptx/resource/role/` | PromptX 自动从项目目录读取 |
| 检索参数 | `domain.settings.retrievalTopK/Threshold` | 传给检索工具 |
| LLM 参数 | `domain.settings.maxTokens/temperature` | 传给 AgentX |
| 回复风格 | `domain.settings.responseStyle/tone/language` | 写入 systemPrompt |
| **MCP Servers** | `domain.settings.mcpServers` | **用户可配置**，传给 AgentX |
| PromptX 项目目录 | `domain.workspacePath` | 自动注入到 PromptX MCP 的环境变量 |

**关键点**：
- **MCP 配置由用户管理**：存储在 `domain.settings.mcpServers` 中
- **系统自动注入 PromptX MCP**：确保 PromptX 始终可用
- **工作区路径自动注入**：`PROMPTX_PROJECT_DIR` 环境变量自动设置

### Decision 0.1: MCP 配置管理

用户可以通过领域设置配置 MCP Servers，系统会自动合并系统级 MCP 和用户自定义 MCP。

**MCP 配置数据结构**：

```typescript
// 扩展 DomainSettings
interface DomainSettings {
  // 现有字段...
  responseStyle: 'detailed' | 'concise';
  tone: 'formal' | 'friendly';
  language: string;
  maxTokens: number;
  temperature: number;
  retrievalTopK: number;
  retrievalThreshold: number;

  // 🆕 新增字段
  primaryRoleId?: string;           // 主角色 ID
  subRoleIds?: string[];            // 子代理 ID 列表
  mcpServers?: MCPServersConfig;    // MCP Servers 配置
}

// MCP Server 配置
interface MCPServerConfig {
  command: string;                  // 启动命令，如 "npx", "node"
  args?: string[];                  // 命令参数
  env?: Record<string, string>;     // 环境变量
  enabled?: boolean;                // 是否启用，默认 true
}

// MCP Servers 配置（键值对）
type MCPServersConfig = Record<string, MCPServerConfig>;
```

**配置示例**：

```json
{
  "settings": {
    "responseStyle": "detailed",
    "tone": "formal",
    "language": "zh-CN",
    "maxTokens": 4000,
    "temperature": 0.7,
    "retrievalTopK": 5,
    "retrievalThreshold": 0.7,
    "primaryRoleId": "legal-advisor",
    "subRoleIds": ["contract-expert", "labor-law-expert"],
    "mcpServers": {
      "web-search": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-web-search"],
        "env": {
          "SEARCH_API_KEY": "xxx"
        }
      },
      "database": {
        "command": "node",
        "args": ["./mcp-servers/database.js"],
        "env": {
          "DB_CONNECTION": "postgresql://..."
        }
      }
    }
  }
}
```

**MCP 配置合并逻辑**：

```typescript
function buildMCPServers(domain: Domain): MCPServersConfig {
  // 1. 系统级 MCP（始终启用）
  const systemMCP: MCPServersConfig = {
    promptx: {
      command: "npx",
      args: ["promptx-mcp"],
      env: {
        PROMPTX_PROJECT_DIR: domain.workspacePath,
      },
    },
  };

  // 2. 内置检索 MCP（如果领域有文档）
  const retrieverMCP: MCPServersConfig = domain.documentCount > 0 ? {
    retriever: {
      command: "node",
      args: ["./mcp-servers/retriever.js"],
      env: {
        DOMAIN_ID: domain.id,
        QDRANT_COLLECTION: `domain_${domain.id}`,
        RETRIEVAL_TOP_K: String(domain.settings.retrievalTopK),
        RETRIEVAL_THRESHOLD: String(domain.settings.retrievalThreshold),
      },
    },
  } : {};

  // 3. 用户自定义 MCP
  const userMCP = domain.settings.mcpServers || {};

  // 4. 合并（用户配置不能覆盖系统级 MCP）
  return {
    ...userMCP,      // 用户自定义（优先级最低）
    ...retrieverMCP, // 内置检索（中等优先级）
    ...systemMCP,    // 系统级（最高优先级，不可覆盖）
  };
}
```

**API 设计**：

```typescript
// 更新领域 MCP 配置
PUT /api/domains/:id
{
  "settings": {
    "mcpServers": {
      "web-search": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-web-search"],
        "env": { "SEARCH_API_KEY": "xxx" }
      }
    }
  }
}

// 获取领域配置（包含合并后的 MCP）
GET /api/domains/:id
{
  "id": "dom_xxx",
  "settings": {
    "mcpServers": {
      "promptx": { ... },      // 系统级（只读）
      "retriever": { ... },    // 内置（只读）
      "web-search": { ... }    // 用户自定义
    }
  }
}
```

**安全考虑**：
- 用户不能覆盖系统级 MCP（promptx）
- 环境变量中的敏感信息（如 API Key）需要加密存储
- MCP 命令需要白名单验证，防止任意命令执行

### Decision 1: 混合模式架构

**我们管理**：
- 对话业务元数据（标题、状态、创建时间）
- 领域-对话关联关系
- 用户权限控制
- 文档关联

**AgentX 管理**：
- Container（对应领域）
- Image（对应对话内容）
- Session（消息存储）
- Agent（运行时）
- WebSocket 通信

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           混合模式架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    我们的业务层（SQLite）                             │   │
│  │                                                                       │   │
│  │  domains 表             conversations 表（简化）                      │   │
│  │  ├── id                 ├── id                                        │   │
│  │  ├── name               ├── domainId                                  │   │
│  │  ├── containerId ──────►├── imageId ─────────────────────┐            │   │
│  │  └── ...                ├── title                        │            │   │
│  │                         ├── status                       │            │   │
│  │                         └── createdAt                    │            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                              │              │
│                                                              ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AgentX 层（AgentX SQLite）                         │   │
│  │                                                                       │   │
│  │  containers 表          images 表              sessions 表            │   │
│  │  ├── containerId        ├── imageId            ├── sessionId          │   │
│  │  ├── name               ├── containerId        ├── imageId            │   │
│  │  └── ...                ├── sessionId          └── ...                │   │
│  │                         ├── name                                      │   │
│  │                         ├── systemPrompt       messages 表            │   │
│  │                         └── ...                ├── messageId          │   │
│  │                                                ├── sessionId          │   │
│  │                                                ├── role               │   │
│  │                                                ├── content            │   │
│  │                                                └── ...                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**理由**:
- 避免重复实现消息存储
- 复用 AgentX 的 WebSocket 和流式响应能力
- 保持业务逻辑的灵活性（标题、状态、权限）
- 两边通过 `containerId` 和 `imageId` 关联

### Decision 2: 数据库表结构简化

原有的 `conversations` 和 `messages` 表需要简化：

**保留 conversations 表（简化）**：
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  image_id TEXT NOT NULL,        -- AgentX Image ID
  title TEXT,                    -- 对话标题（业务元数据）
  status TEXT DEFAULT 'active',  -- 状态（业务元数据）
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**删除 messages 表**：消息存储完全由 AgentX 管理

**理由**: 避免数据冗余，消息只存一份在 AgentX 中。

### Decision 3: 对话处理流程（Agentic 架构）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           对话处理流程（Agentic 架构）                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户消息                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 查询业务元数据（我们的代码）                                      │   │
│  │     • 从 conversations 表获取 imageId                                │   │
│  │     • 验证用户权限                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. 恢复 Agent（AgentX）                                             │   │
│  │     const image = await agentx.images.get(imageId);                  │   │
│  │     const agent = await image.resume();                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. 发送消息（AgentX）                                               │   │
│  │     agent.on('text_delta', handler);                                 │   │
│  │     await agent.receive(userMessage);                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. 主角色处理（AI 自主决策，在 Agent 内部）                          │   │
│  │                                                                       │   │
│  │     主角色（通过 systemPrompt 定义）：                                │   │
│  │     • 分析用户意图                                                    │   │
│  │     • 决定是否需要检索文档 → 委派检索子代理                          │   │
│  │     • 决定是否需要领域专家 → 委派专家子代理                          │   │
│  │     • 整合子代理结果，生成回复                                        │   │
│  │                                                                       │   │
│  │     PromptX MCP 调用（由 AI 自主触发）：                              │   │
│  │     • promptx_action({ role }) - 激活/切换角色                       │   │
│  │     • promptx_recall({ role, query }) - 检索记忆                     │   │
│  │     • promptx_remember({ role, engrams }) - 保存记忆                 │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                      │
│      ▼                                                                      │
│  流式响应（通过 AgentX WebSocket）                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**关键点**：
- 我们的代码只负责：查询业务元数据、恢复 Agent、发送消息
- **AI 自主决策**：主角色通过 systemPrompt 定义的逻辑来决定如何处理
- **子代理委派**：由 AI 根据意图识别自主决定，不是代码硬编码
- **PromptX 调用**：由 AI 在对话过程中自主触发，不是我们预先调用

**理由**: 这是 Agentic 架构的核心 —— AI 自主决策，而不是代码控制流程。

### Decision 4: AgentX 集成方式（基于实际 API）

**关键发现**：
- AgentX 作为 **npm 包** 嵌入，不是独立服务
- 使用 Docker 风格架构：Definition → Image → Session → Agent
- MCP 配置在 `defineAgent` 时静态配置，不能运行时动态修改
- 每个领域需要独立的 Definition

**AgentX 初始化**（应用启动时）：
```typescript
// apps/web/src/server/index.ts
import { createAgentX } from "agentxjs";
import { createServer } from "http";

const server = createServer();

const agentx = await createAgentX({
  llm: {
    apiKey: process.env.CLAUDE_API_KEY,
    baseUrl: "https://api.anthropic.com",
  },
  agentxDir: "./data/agentx", // AgentX 数据目录
  server, // 挂载 WebSocket
  // 注意：不设置 defaultAgent，我们动态注册
});
```

**创建领域时**：动态注册 Definition
```typescript
// 创建领域时 - 为每个领域创建独立的 Definition
async function createDomain(domainData) {
  // 1. 创建领域记录
  const domain = await domainRepository.create(domainData);

  // 2. 为领域创建 AgentX Definition
  const domainDefinition = defineAgent({
    name: `domain_${domain.id}`,
    systemPrompt: buildSystemPrompt({
      primaryRoleId: domain.settings.primaryRoleId,
      subRoleIds: domain.settings.subRoleIds,
      responseStyle: domain.settings.responseStyle,
      tone: domain.settings.tone,
      language: domain.settings.language,
      expertise: domain.expertise,
    }),

    // MCP Servers 从领域配置构建
    mcpServers: buildMCPServers(domain),
  });

  // 3. 注册到 AgentX
  agentx.definitions.register(domainDefinition);

  return domain;
}
```

**创建对话时**：使用 MetaImage 创建 Session
```typescript
// 创建对话时
async function createConversation(domainId, title) {
  // 1. 获取领域的 MetaImage
  const image = await agentx.images.getMetaImage(`domain_${domainId}`);

  // 2. 创建 Session
  const session = await agentx.sessions.create(image.imageId, `user_${userId}`);

  // 3. 保存对话记录
  const conversation = await db.insert(conversations).values({
    id: generateId('conv'),
    domainId,
    sessionId: session.sessionId, // 保存 sessionId，不是 imageId
    title,
    status: 'active',
  });

  return conversation;
}
```

**发送消息时**：恢复 Agent 并发送
```typescript
// 发送消息时
async function sendMessage(conversationId, content) {
  // 1. 获取对话记录
  const conversation = await conversationRepository.findById(conversationId);

  // 2. 恢复 Session 和 Agent
  const session = await agentx.sessions.get(conversation.sessionId);
  const agent = await session.resume();

  // 3. 设置事件监听
  agent.react({
    onTextDelta: (e) => {
      // 转发到 WebSocket 客户端
      broadcastToClient(conversationId, {
        type: 'text_delta',
        data: { text: e.data.text }
      });
    },
    onAssistantMessage: (e) => {
      // 消息完成
      broadcastToClient(conversationId, {
        type: 'message_complete',
        data: e.data
      });
    }
  });

  // 4. 发送消息
  await agent.receive(content);
}
```

**buildMCPServers 函数**：
```typescript
function buildMCPServers(domain: Domain): MCPServersConfig {
  // 1. 系统级 MCP（始终启用，不可覆盖）
  const systemMCP: MCPServersConfig = {
    promptx: {
      command: "npx",
      args: ["promptx-mcp"],
      env: {
        PROMPTX_PROJECT_DIR: domain.workspacePath,
      },
    },
  };

  // 2. 内置检索 MCP（如果领域有文档）
  const retrieverMCP: MCPServersConfig = domain.documentCount > 0 ? {
    retriever: {
      command: "node",
      args: ["./mcp-servers/retriever.js"],
      env: {
        DOMAIN_ID: domain.id,
        QDRANT_COLLECTION: `domain_${domain.id}`,
        RETRIEVAL_TOP_K: String(domain.settings.retrievalTopK),
        RETRIEVAL_THRESHOLD: String(domain.settings.retrievalThreshold),
      },
    },
  } : {};

  // 3. 用户自定义 MCP
  const userMCP = domain.settings.mcpServers || {};

  // 4. 合并（系统级优先级最高）
  return {
    ...userMCP,      // 用户自定义（优先级最低）
    ...retrieverMCP, // 内置检索（中等优先级）
    ...systemMCP,    // 系统级（最高优先级，不可覆盖）
  };
}
```

### Decision 4.1: systemPrompt 来源（角色驱动）

**关键理解**：我们的系统是一个"架子"，核心能力来自 PromptX 角色系统。

**systemPrompt 不需要我们硬编码**！角色定义存储在工作区：
```
workspaces/{domainId}/
├── .promptx/
│   └── resource/
│       └── role/
│           └── {domainId}-domain.role.md  # 角色定义文件
```

**工作流程**：
1. 创建领域时，通过女娲（nuwa）创建角色定义文件
2. 角色定义文件包含完整的 systemPrompt、意图识别逻辑、子代理委派规则
3. 对话开始时，AI 调用 `promptx_action({ role: '{domainId}-domain' })`
4. PromptX 自动注入角色的 systemPrompt

**我们只需要提供一个最小的引导 systemPrompt**：
```typescript
function buildSystemPrompt(domain: Domain): string {
  return `你是一个 AI 助手。

对话开始时，请先调用 promptx_action 激活角色 "${domain.settings.primaryRoleId}"。
激活角色后，你将获得该角色的完整能力和指导。

可用的 MCP 工具：
- promptx_action: 激活/切换角色
- promptx_recall: 检索记忆
- promptx_remember: 保存记忆
${domain.documentCount > 0 ? '- search_documents: 检索文档' : ''}
`;
}
```

**理由**：
- 角色定义由 PromptX 管理，我们不需要重复实现
- 角色可以通过女娲动态创建和修改
- 保持系统的灵活性和可扩展性

### Decision 5: WebSocket 通信

复用 AgentX 的 WebSocket 服务：

```typescript
// 客户端连接 AgentX WebSocket
const ws = new WebSocket('ws://localhost:5200/ws');

// 或者我们代理 AgentX 的 WebSocket
// 在我们的服务器上添加 WebSocket 代理
```

**选项 A**：客户端直接连接 AgentX WebSocket
- 优点：简单，无需代理
- 缺点：需要暴露 AgentX 端口

**选项 B**：我们代理 AgentX WebSocket
- 优点：统一入口，可以添加权限控制
- 缺点：增加复杂度

**推荐选项 B**：统一入口，便于权限控制和监控。

### Decision 6: 查询对话历史

从 AgentX 查询消息：

```typescript
// 查询对话历史
async function getConversationHistory(conversationId: string) {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  // 从 AgentX 获取消息
  const image = await agentx.images.get(conversation.imageId);
  const session = await agentx.sessions.findByImageId(image.imageId);
  const messages = await agentx.sessions.getMessages(session.sessionId);

  return {
    ...conversation,
    messages,
  };
}
```

**理由**: 消息存储在 AgentX 中，我们只需要查询。

## Risks / Trade-offs

### Risk 1: 数据一致性
- **风险**: 我们的 conversations 表和 AgentX 的 images 表可能不一致
- **缓解**:
  - 创建对话时使用事务
  - 定期同步检查
  - 删除对话时同时删除 AgentX Image

### Risk 2: AgentX 依赖
- **风险**: 强依赖 AgentX，如果 AgentX 不可用则对话功能完全不可用
- **缓解**:
  - AgentX 作为核心依赖，确保其稳定性
  - 添加健康检查和重连机制

### Risk 3: 查询性能
- **风险**: 查询对话列表需要同时查询两个数据库
- **缓解**:
  - 对话列表只查询我们的 conversations 表
  - 消息详情才查询 AgentX

### Risk 4: 迁移复杂度
- **风险**: 现有的 messages 表数据需要迁移
- **缓解**:
  - 如果 messages 表为空，直接删除
  - 如果有数据，需要迁移脚本

## Migration Plan

### Phase 1: AgentX 集成（MVP）
1. 简化 conversations 表结构（添加 imageId，删除 messages 表）
2. 实现 AgentX Container 创建（创建领域时）
3. 实现 AgentX Image 创建（创建对话时）
4. 实现消息发送（通过 AgentX Agent）
5. 实现对话历史查询（从 AgentX 获取）
6. 实现 WebSocket 代理

### Phase 2: 主角色配置
1. 定义主角色的 systemPrompt 模板
2. 配置 PromptX MCP Server（让 AI 可以调用 promptx_action/recall/remember）
3. 定义子代理委派规则（在 systemPrompt 中）
4. 配置检索子代理（让 AI 可以访问 Qdrant）

### Phase 3: 高级功能
1. 对话标题自动生成
2. 中断生成功能

**注意**：
- RAG 检索不是我们代码直接调用，而是由 AI 通过检索子代理自主决定
- PromptX 调用也是由 AI 自主触发，不是我们预先调用
- 我们的代码只负责：业务元数据管理、AgentX 集成、WebSocket 代理

## Open Questions

### 已回答的问题

1. **主角色定义**: ✅ 已解决
   - 主角色 ID 从 `domain.settings.primaryRoleId` 获取
   - 角色定义文件在 `domain.workspacePath/.promptx/resource/role/` 目录
   - 子代理委派规则在 systemPrompt 中定义

2. **MCP 配置来源**: ✅ 已解决
   - MCP 配置在代码中传给 AgentX，不是从文件读取
   - PromptX 项目目录通过 `PROMPTX_PROJECT_DIR` 环境变量传入
   - 检索参数从 `domain.settings` 获取

### 待确认的问题

1. **AgentX 部署方式**: AgentX 是作为独立服务运行，还是嵌入到我们的服务中？
   - 选项 A: 独立服务（需要单独启动）
   - 选项 B: 嵌入到我们的服务中（作为库使用）

2. **WebSocket 代理**: 是否需要代理 AgentX 的 WebSocket？
   - 推荐选项 B: 代理 AgentX WebSocket，统一入口

3. **数据迁移**: 现有的 messages 表是否有数据需要迁移？
   - 如果为空，直接删除
   - 如果有数据，需要迁移脚本

4. **检索工具实现**: 检索工具是作为 MCP Server 还是内置工具？
   - 选项 A: 独立 MCP Server（更灵活）
   - 选项 B: 内置到 AgentX（更简单）
