# SPEC-005: PromptX 集成

> 版本: 8.0 | 状态: Draft | 日期: 2024-12-30

## 1. 概述

### 1.1 目的

本文档定义如何将 PromptX MCP 服务器集成到 Agentic RAG 系统中。

### 1.2 核心理念

> **我们不需要自己实现角色和记忆系统，PromptX 已经全部提供了。**

PromptX 是一个完整的 AI Agent 上下文平台，提供：
- 🎭 **角色系统** - 通过 `action` 激活角色，通过 `nuwa` 创建角色
- 🧠 **记忆系统** - 通过 `recall` 检索记忆，通过 `remember` 保存记忆
- 🔧 **工具系统** - 通过 `toolx` 调用各种工具（PDF、Excel、Word 等）
- 📁 **项目管理** - 通过 `project` 绑定项目目录
- 🔍 **资源发现** - 通过 `discover` 发现可用角色和工具

**我们的工作**：通过 MCP 协议调用 PromptX 的工具，将其能力集成到对话系统中。

### 1.3 背景

当前系统已完成：
- ✅ AgentX 集成（对话系统基础，已支持 MCP）
- ✅ 领域管理（CRUD）
- ✅ 文档处理（上传、解析、向量化）
- ✅ 对话系统（消息发送、流式响应）

**缺失的能力**（PromptX 提供）：
- ❌ 角色激活（领域没有专业身份）
- ❌ 记忆系统（对话无法积累经验）
- ❌ 工具调用（无法使用 PromptX 工具）

### 1.4 相关文档

- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [SPEC-004 对话系统](./SPEC-004-CONVERSATION-SYSTEM.md)
- [PromptX 官方文档](https://github.com/Deepractice/PromptX)

---

## 2. PromptX 能力概览

### 2.1 MCP 工具列表

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `discover` | 发现可用角色和工具 | `focus?: 'all' \| 'roles' \| 'tools'` |
| `action` | 激活指定角色 | `role: string` |
| `project` | 绑定项目目录 | `workingDirectory?: string` |
| `recall` | 检索记忆 | `role: string, query?: string \| null, mode?: string` |
| `remember` | 保存记忆 | `role: string, engrams: Engram[]` |
| `toolx` | 调用工具 | `yaml: string` |

### 2.2 内置角色

| 角色 ID | 名称 | 用途 |
|---------|------|------|
| `nuwa` | 女娲 | AI 角色创造专家 |
| `luban` | 鲁班 | 工具开发大师 |
| `writer` | Writer | 专业文案写手 |
| `sean` | Sean | 产品决策专家 |

### 2.3 内置工具

| 工具 URI | 用途 |
|----------|------|
| `tool://filesystem` | 文件系统操作 |
| `tool://pdf-reader` | PDF 文档读取 |
| `tool://excel-tool` | Excel 文件处理 |
| `tool://word-tool` | Word 文档处理 |
| `tool://role-creator` | 创建角色（女娲专用） |
| `tool://tool-creator` | 创建工具（鲁班专用） |

### 2.4 记忆类型（Engram）

```typescript
interface Engram {
  content: string;      // 记忆内容
  schema: string;       // 关键词（空格分隔）
  strength: number;     // 强度 0-1
  type: 'ATOMIC' | 'LINK' | 'PATTERN';
}

// 类型说明
// ATOMIC: 原子概念（名词、实体、具体信息）
// LINK: 关系连接（动词、介词、关系词）
// PATTERN: 模式结构（流程、方法论、框架）
```

---

## 3. 集成方案

### 3.1 MCP 配置

AgentX 已支持 MCP 协议，只需在领域的 Image 配置中添加 PromptX MCP 服务器：

```typescript
// 创建 Image 时配置 MCP
const image = await agentx.request('image_create_request', {
  containerId,
  config: {
    systemPrompt: '...',
    mcpServers: {
      promptx: {
        command: 'npx',
        args: ['-y', '@promptx/mcp-server']
      }
    }
  }
});
```

### 3.2 集成流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PromptX 集成流程                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【创建领域时】                                                              │
│  1. 创建 AgentX Container                                                   │
│  2. 创建 Image，配置 PromptX MCP                                            │
│  3. （可选）通过女娲创建领域专属角色                                         │
│                                                                             │
│  【对话时】                                                                  │
│  1. 激活角色: action({ role: 'assistant' })                                 │
│  2. 检索记忆: recall({ role: 'assistant', query: null })                    │
│  3. 发送消息（AgentX 处理）                                                  │
│  4. 保存记忆: remember({ role: 'assistant', engrams: [...] })               │
│                                                                             │
│  【关键点】                                                                  │
│  • PromptX 工具通过 AgentX 的 MCP 集成自动可用                              │
│  • AI 在对话中可以自主调用 PromptX 工具                                      │
│  • 我们只需要在 Image 配置中启用 PromptX MCP                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 实现方式

**方式一：AI 自主调用（推荐）**

配置好 MCP 后，AI 在对话中可以自主决定何时调用 PromptX 工具：
- 用户问专业问题 → AI 自动激活相关角色
- 对话结束 → AI 自动保存记忆
- 需要读取文档 → AI 自动调用 toolx

**方式二：业务层显式调用**

在特定场景下，业务层可以显式调用 PromptX：
- 创建领域时 → 调用女娲创建角色
- 对话开始时 → 强制激活领域角色
- 对话结束时 → 强制保存记忆

---

## 4. 用户故事

### US-001: 领域角色激活

```
作为用户，
我希望领域在对话时能够以专业角色身份回答，
以便获得更专业、更有针对性的服务。
```

**实现方式**：
- 在 Image 的 systemPrompt 中指定角色
- 或在对话开始时调用 `action({ role: 'xxx' })`

### US-002: 记忆持久化

```
作为用户，
我希望领域能够记住我的偏好和历史交互，
以便下次对话时获得更个性化的服务。
```

**实现方式**：
- AI 在对话中自主调用 `recall` 和 `remember`
- 或业务层在对话前后显式调用

### US-003: 工具调用

```
作为用户，
我希望领域能够使用各种工具来增强能力，
以便处理更复杂的任务。
```

**实现方式**：
- AI 在对话中自主调用 `toolx`
- 例如：读取 PDF、处理 Excel 等

---

## 5. 功能需求

### 5.1 P0 - 必须实现

| 编号 | 功能 | 描述 | 实现方式 |
|------|------|------|----------|
| FR-001 | MCP 配置 | 在 Image 中配置 PromptX MCP | 修改 Image 创建逻辑 |
| FR-002 | 角色激活 | 对话时激活角色 | AI 自主调用 action |
| FR-003 | 记忆检索 | 对话前检索记忆 | AI 自主调用 recall |
| FR-004 | 记忆保存 | 对话后保存记忆 | AI 自主调用 remember |

### 5.2 P1 - 重要

| 编号 | 功能 | 描述 | 实现方式 |
|------|------|------|----------|
| FR-005 | 角色创建 | 创建领域时创建专属角色 | 调用女娲 + role-creator |
| FR-006 | 工具调用 | 支持调用 PromptX 工具 | AI 自主调用 toolx |
| FR-007 | 资源发现 | 发现可用角色和工具 | 调用 discover |

### 5.3 P2 - 可选

| 编号 | 功能 | 描述 | 实现方式 |
|------|------|------|----------|
| FR-008 | 项目绑定 | 绑定工作区目录 | 调用 project |
| FR-009 | 自定义工具 | 创建领域专属工具 | 调用鲁班 + tool-creator |

---

## 6. 技术实现

### 6.1 修改 Image 创建

```typescript
// apps/web/src/server/services/agentx.service.ts

async createImage(containerId: string, domainConfig: DomainConfig) {
  return await this.agentx.request('image_create_request', {
    requestId: nanoid(),
    containerId,
    config: {
      systemPrompt: this.buildSystemPrompt(domainConfig),
      // 添加 PromptX MCP 配置
      mcpServers: {
        promptx: {
          command: 'npx',
          args: ['-y', '@promptx/mcp-server']
        }
      }
    }
  });
}
```

### 6.2 增强 System Prompt

```typescript
// 在 systemPrompt 中引导 AI 使用 PromptX

const systemPrompt = `
你是一个专业的 ${domain.expertise} 领域助手。

## 认知循环

在回答问题时，请遵循以下认知循环：

1. **激活角色** - 使用 action 工具激活合适的角色
2. **检索记忆** - 使用 recall 工具检索相关记忆
3. **回答问题** - 结合记忆和知识回答
4. **保存记忆** - 使用 remember 工具保存重要信息

## 可用工具

- action: 激活角色
- recall: 检索记忆
- remember: 保存记忆
- toolx: 调用其他工具（如 pdf-reader、excel-tool 等）
- discover: 发现可用角色和工具

## 记忆保存指南

每次对话结束时，请保存关键信息：
- 用户偏好
- 重要决策
- 学到的新知识
`;
```

### 6.3 可选：业务层显式调用

如果需要更精确的控制，可以在业务层显式调用 PromptX：

```typescript
// apps/web/src/server/services/chat.service.ts

async sendMessage(conversationId: string, content: string) {
  const conversation = await this.getConversation(conversationId);
  const domain = await this.getDomain(conversation.domainId);

  // 1. 激活角色（可选，AI 也会自动做）
  await this.agentx.request('message_send_request', {
    imageId: domain.imageId,
    content: `请先激活角色：action({ role: '${domain.roleId || 'assistant'}' })`
  });

  // 2. 发送用户消息
  const response = await this.agentx.request('message_send_request', {
    imageId: domain.imageId,
    content
  });

  return response;
}
```

---

## 7. 验收标准

### 7.1 P0 验收标准

- [ ] Image 创建时包含 PromptX MCP 配置
- [ ] AI 能够调用 action 激活角色
- [ ] AI 能够调用 recall 检索记忆
- [ ] AI 能够调用 remember 保存记忆

### 7.2 P1 验收标准

- [ ] 能够通过女娲创建领域专属角色
- [ ] AI 能够调用 toolx 使用工具
- [ ] 能够调用 discover 发现资源

### 7.3 P2 验收标准

- [ ] 能够绑定项目目录
- [ ] 能够创建自定义工具

---

## 8. 实现路线图

### Phase 1: 基础集成（MVP）

**目标**：让 AI 能够使用 PromptX 工具

| 任务 | 描述 | 工作量 |
|------|------|--------|
| 1.1 | 修改 Image 创建，添加 PromptX MCP 配置 | 0.5 天 |
| 1.2 | 增强 systemPrompt，引导 AI 使用认知循环 | 0.5 天 |
| 1.3 | 测试 AI 自主调用 PromptX 工具 | 1 天 |

### Phase 2: 角色创建

**目标**：支持创建领域专属角色

| 任务 | 描述 | 工作量 |
|------|------|--------|
| 2.1 | 实现通过女娲创建角色的流程 | 1 天 |
| 2.2 | 在领域创建时自动创建角色 | 0.5 天 |
| 2.3 | 测试角色创建和激活 | 0.5 天 |

### Phase 3: 高级功能

**目标**：项目绑定和自定义工具

| 任务 | 描述 | 工作量 |
|------|------|--------|
| 3.1 | 实现项目绑定 | 0.5 天 |
| 3.2 | 实现自定义工具创建 | 1 天 |

---

## 9. 术语表

| 术语 | 说明 |
|------|------|
| PromptX | AI Agent 上下文平台，提供角色、记忆、工具 |
| MCP | Model Context Protocol，模型上下文协议 |
| AgentX | AI Agent 开发框架，负责 LLM 调用和 MCP 集成 |
| Engram | PromptX 中的记忆单元 |
| DMN | Default Mode Network，默认模式网络，用于全景记忆检索 |
| 女娲（nuwa） | PromptX 系统角色，用于创建新角色 |
| 鲁班（luban） | PromptX 系统角色，用于创建新工具 |

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2024-12-16 | 初始版本 |
| 2.0 | 2024-12-16 | 精简格式 |
| 3.0 | 2024-12-17 | 添加 Agentic 角色体系和协作流程 |
| 4.0 | 2024-12-17 | 重构：明确角色和记忆由 PromptX 提供 |
| 5.0 | 2024-12-17 | 添加 AgentX/工作区概念 |
| 6.0 | 2024-12-19 | 术语重构：助手 → 领域 |
| 7.0 | 2024-12-30 | 重构为完整的 PromptX 集成规格 |
| 8.0 | 2024-12-30 | 简化方案：强调 PromptX 已提供全部能力，我们只需配置 MCP |
