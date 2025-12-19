# SPEC-005: PromptX 集成

> 版本: 6.0 | 状态: Draft | 日期: 2024-12-19

## 1. 概述

**目的**：说明如何使用 PromptX 的角色、记忆和工具功能。

**核心架构**：
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           技术栈分工                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AgentX                                                              │   │
│  │  • LLM 调用（Claude API）                                            │   │
│  │  • WebSocket 通信                                                    │   │
│  │  • MCP 协议集成                                                      │   │
│  │  • 工作区管理                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ MCP 协议                               │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PromptX                                                             │   │
│  │  • 角色系统（promptx_action）                                        │   │
│  │  • 记忆系统（promptx_remember/recall）                               │   │
│  │  • 工具系统（toolx）                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**重要说明**：
- 角色（Role）和记忆（Engrams）都是 **PromptX 内置功能**
- 本项目不需要自己实现角色或记忆系统
- 通过 MCP 协议调用 PromptX 的接口

**术语说明**：
| 术语 | 说明 |
|------|------|
| AgentX | AI Agent 开发框架，负责 LLM 调用和 WebSocket |
| PromptX | MCP 服务器，提供角色、记忆、工具 |
| 工作区（Workspace） | AgentX 概念，一个领域 = 一个工作区 |
| 角色（Role） | PromptX 中的角色资源 |
| 记忆（Engrams） | PromptX 中的记忆单元 |

**相关文档**：
- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [SPEC-004 对话系统](./SPEC-004-CONVERSATION-SYSTEM.md)

## 2. PromptX 提供的功能

### 2.1 角色系统

PromptX 提供角色资源，通过 MCP 调用来激活角色：

```typescript
// 激活领域角色
await mcpClient.call('promptx_action', {
  role: `${domainId}-domain`  // 领域角色（创建领域时通过女娲创建）
});
```

**角色创建**：使用女娲（nuwa）角色创建新角色：

```typescript
// 1. 激活女娲
await mcpClient.call('promptx_action', { role: 'nuwa' });

// 2. 使用 role-creator 工具创建角色
await mcpClient.call('toolx', {
  yaml: `tool: tool://role-creator
mode: execute
parameters:
  name: ${domainId}-domain
  expertise: ${expertise}
  description: ${description}`
});
```

### 2.2 记忆系统

PromptX 提供记忆系统（Engrams），我们通过 MCP 调用来保存和检索记忆：

```typescript
// 保存记忆
await mcpClient.call('promptx_remember', {
  role: 'legal-domain',
  engrams: [{
    content: '用户偏好简洁的回答风格',
    schema: '用户 偏好 简洁 回答',
    strength: 0.8,
    type: 'ATOMIC'
  }]
});

// 检索记忆 - DMN 模式（查看全景）
await mcpClient.call('promptx_recall', {
  role: 'legal-domain',
  query: null,
  mode: 'balanced'
});

// 检索记忆 - 关键词模式
await mcpClient.call('promptx_recall', {
  role: 'legal-domain',
  query: '用户 偏好',
  mode: 'focused'
});
```

### 2.3 工具系统

PromptX 提供工具资源，通过 toolx 调用：

```typescript
// 读取 PDF
await mcpClient.call('toolx', {
  yaml: `tool: tool://pdf-reader
mode: execute
parameters:
  path: /path/to/document.pdf
  action: extract`
});

// 读取 Word
await mcpClient.call('toolx', {
  yaml: `tool: tool://word-tool
mode: execute
parameters:
  path: /path/to/document.docx
  action: read`
});

// 读取 Excel
await mcpClient.call('toolx', {
  yaml: `tool: tool://excel-tool
mode: execute
parameters:
  path: /path/to/document.xlsx
  action: read`
});
```

**可用工具**：
| 工具 | 用途 |
|------|------|
| pdf-reader | 读取 PDF 文件 |
| word-tool | 读取 Word 文件 |
| excel-tool | 读取 Excel 文件 |
| filesystem | 文件系统操作 |
| role-creator | 创建角色（女娲专用） |
| tool-creator | 创建工具（鲁班专用） |

## 3. 业务层职责

业务层（本项目）的职责是：

| 职责 | 说明 |
|------|------|
| 领域管理 | 创建、更新、删除领域（业务实体） |
| 工作区管理 | 创建 AgentX 工作区 |
| 角色创建 | 通过女娲创建 PromptX 角色 |
| MCP 调用 | 在对话过程中调用 PromptX 的角色和记忆接口 |
| 向量检索 | 使用 Qdrant 进行文档检索 |

**不需要实现**：
- 角色定义和管理（PromptX 提供）
- 记忆存储和检索（PromptX 提供）
- 记忆强度衰减（PromptX 提供）
- 文档读取（PromptX 工具提供）
- LLM 调用（AgentX 提供）

## 4. 工作区与角色

### 4.1 一个领域 = 一个工作区

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           工作区结构                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  workspaces/                                                                │
│  └── {domainId}/                        # AgentX 工作区                      │
│      ├── .promptx/                      # PromptX 资源目录                   │
│      │   └── resource/                                                      │
│      │       └── role/                                                      │
│      │           └── {domainId}-domain.role.md  # 领域角色定义               │
│      ├── mcp.json                       # MCP 配置                           │
│      └── documents/                     # 文档存储                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 角色命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 领域角色 | `{domainId}-domain` | `dom_xxx-domain` |
| 系统角色 | PromptX 内置 | `nuwa`, `luban`, `writer` |

### 4.3 PromptX 系统角色

| 角色 ID | 用途 |
|---------|------|
| nuwa | 创建新角色 |
| luban | 创建新工具 |
| writer | 文案写作 |
| assistant | 通用助手 |

## 5. 集成流程

### 5.1 创建领域流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           创建领域流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 创建业务实体                                                            │
│     INSERT INTO domains (id, name, expertise, ...)                          │
│                                                                             │
│  2. 创建 AgentX 工作区                                                      │
│     mkdir workspaces/{domainId}                                             │
│                                                                             │
│  3. 激活女娲角色                                                            │
│     promptx_action({ role: 'nuwa' })                                       │
│                                                                             │
│  4. 创建领域角色                                                            │
│     toolx({ tool: 'tool://role-creator', ... })                            │
│                                                                             │
│  5. 保存角色 ID                                                             │
│     UPDATE domains SET promptxRoleId = '{domainId}-domain'                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 对话流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           对话流程                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户消息                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│  1. 激活领域角色                                                            │
│     promptx_action({ role: '{domainId}-domain' })                           │
│      │                                                                      │
│      ▼                                                                      │
│  2. 检索记忆                                                                │
│     promptx_recall({ role: '{domainId}-domain', query: null })              │
│      │                                                                      │
│      ▼                                                                      │
│  3. 向量检索（Qdrant）                                                      │
│     qdrant.search('domain_{domainId}', query)                               │
│      │                                                                      │
│      ▼                                                                      │
│  4. LLM 调用（AgentX）                                                      │
│     agentx.chat(prompt)                                                    │
│      │                                                                      │
│      ▼                                                                      │
│  5. 保存记忆                                                                │
│     promptx_remember({ role: '{domainId}-domain', engrams: [...] })         │
│      │                                                                      │
│      ▼                                                                      │
│  流式响应                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6. 验收标准

- [ ] 能够通过 MCP 连接 PromptX
- [ ] 能够激活领域角色（promptx_action）
- [ ] 能够保存记忆（promptx_remember）
- [ ] 能够检索记忆（promptx_recall）
- [ ] 能够调用工具（toolx）
- [ ] 能够通过女娲创建新角色

## 7. 实现路线图

### Phase 1: 基础集成（MVP）
- [ ] PromptX MCP 连接
- [ ] 领域角色激活
- [ ] 基础记忆调用

### Phase 2: 完整集成
- [ ] 女娲角色创建流程
- [ ] 工具调用（pdf-reader, word-tool, excel-tool）
- [ ] 记忆网络（recall/remember）

### Phase 3: 高级功能
- [ ] 自定义工具创建（鲁班）
- [ ] 记忆优化策略

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2024-12-16 | 初始版本 |
| 2.0 | 2024-12-16 | 精简格式 |
| 3.0 | 2024-12-17 | 添加 Agentic 角色体系和协作流程 |
| 3.1 | 2024-12-17 | 更新术语：主角色→助手，子角色→子代理 |
| 4.0 | 2024-12-17 | 重构：明确角色和记忆由 PromptX 提供，业务层只需调用 |
| 4.1 | 2024-12-17 | 补充子代理的核心价值：领域细分，提升检索精准度 |
| 5.0 | 2024-12-17 | 添加 AgentX/工作区概念，添加工具系统说明，简化角色体系 |
| 6.0 | 2024-12-19 | 术语重构：助手(Assistant) → 领域(Domain) |
