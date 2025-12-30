# Design: PromptX 集成

## Context

当前系统已完成对话系统基础功能，但缺少专业角色和记忆能力。PromptX 是一个完整的 AI Agent 上下文平台，通过 MCP 协议提供角色、记忆、工具等能力。

### 约束条件
- AgentX 已支持 MCP 协议
- PromptX 作为 MCP 服务器运行
- 不需要自己实现角色和记忆系统

### 利益相关者
- 用户：希望获得专业、有记忆的 AI 服务
- 开发者：希望简化集成，复用 PromptX 能力

## Goals / Non-Goals

### Goals
- 通过 MCP 配置启用 PromptX 能力
- AI 能够自主使用角色、记忆、工具
- 领域能够拥有专属角色

### Non-Goals
- 不自己实现角色系统
- 不自己实现记忆系统
- 不修改 PromptX 源码

## Decisions

### Decision 1: MCP 配置方式

**选择**: 在 AgentX Image 创建时静态配置 PromptX MCP

**原因**:
- AgentX 的 MCP 配置在 `defineAgent` 时确定
- 每个领域需要独立的 Image 配置
- 简单直接，无需额外抽象

**配置示例**:
```typescript
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

### Decision 2: AI 自主调用 vs 业务层显式调用

**选择**: AI 自主调用（通过 systemPrompt 引导）

**原因**:
- 更符合 Agentic 架构理念
- 减少业务层复杂度
- AI 可以根据上下文智能决策

**替代方案**: 业务层显式调用
- 优点：更精确控制
- 缺点：增加代码复杂度，可能与 AI 决策冲突

### Decision 3: 角色创建时机

**选择**: 创建领域时通过女娲创建专属角色

**原因**:
- 每个领域应有独特的专业身份
- 女娲是 PromptX 的角色创建专家
- 角色 ID 保存到领域配置，便于后续激活

**流程**:
1. 用户创建领域，指定专业领域（如"法律"）
2. 系统调用女娲创建角色
3. 保存角色 ID 到领域配置
4. 对话时自动激活该角色

## Architecture

### 集成架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agentic RAG 系统                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Domain    │    │   AgentX    │    │  PromptX    │         │
│  │   Service   │───▶│   Service   │───▶│  MCP Server │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         │                  │                  ▼                 │
│         │                  │           ┌─────────────┐         │
│         │                  │           │   角色系统   │         │
│         │                  │           │   记忆系统   │         │
│         │                  │           │   工具系统   │         │
│         │                  │           └─────────────┘         │
│         │                  │                                    │
│         ▼                  ▼                                    │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │   SQLite    │    │   Claude    │                            │
│  │  (领域配置)  │    │   (LLM)     │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
创建领域:
  用户 → DomainService → AgentX(创建Container/Image) → PromptX(创建角色)
                                                              ↓
                                                        保存角色ID

对话:
  用户 → ChatService → AgentX(发送消息) → Claude(LLM)
                                              ↓
                                        PromptX MCP Tools
                                        (action/recall/remember)
```

## PromptX MCP 工具参考

### action - 激活角色
```typescript
// 参数
{ role: string }  // 角色 ID

// 示例
action({ role: 'legal-expert' })
```

### recall - 检索记忆
```typescript
// 参数
{
  role: string,           // 角色 ID
  query?: string | null,  // 关键词（null 为 DMN 模式）
  mode?: 'creative' | 'balanced' | 'focused'
}

// 示例
recall({ role: 'legal-expert', query: null })  // DMN 全景
recall({ role: 'legal-expert', query: '合同纠纷' })  // 关键词检索
```

### remember - 保存记忆
```typescript
// 参数
{
  role: string,
  engrams: Array<{
    content: string,      // 记忆内容
    schema: string,       // 关键词（空格分隔）
    strength: number,     // 强度 0-1
    type: 'ATOMIC' | 'LINK' | 'PATTERN'
  }>
}

// 示例
remember({
  role: 'legal-expert',
  engrams: [{
    content: '用户关注合同违约责任',
    schema: '合同 违约 责任',
    strength: 0.8,
    type: 'ATOMIC'
  }]
})
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| PromptX MCP 服务器不可用 | 高 | 添加健康检查，降级处理 |
| AI 不按预期调用工具 | 中 | 优化 systemPrompt，添加示例 |
| 角色创建失败 | 中 | 使用默认角色，记录错误 |
| 记忆数据丢失 | 低 | PromptX 自己管理持久化 |

## Migration Plan

### Phase 1: MCP 配置
1. 修改 AgentX Image 创建逻辑
2. 增强 systemPrompt
3. 测试 AI 工具调用

### Phase 2: 角色创建
1. 添加角色相关类型
2. 修改领域创建流程
3. 测试角色创建和激活

### Rollback
- Phase 1: 移除 MCP 配置即可回滚
- Phase 2: 角色 ID 字段可选，不影响现有功能

## Open Questions

1. ~~PromptX MCP 服务器如何部署？~~
   - 答：使用 `npx -y @promptx/mcp-server` 按需启动

2. ~~角色创建需要什么参数？~~
   - 答：通过女娲自然语言创建，无需复杂参数

3. 记忆数据存储在哪里？
   - 答：PromptX 自己管理，存储在 `~/.promptx/` 目录
