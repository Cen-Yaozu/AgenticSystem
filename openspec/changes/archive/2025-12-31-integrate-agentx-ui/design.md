# Design: 集成 @agentxjs/ui 包

**Status: ✅ Completed (2025-12-31)**

## Context

当前项目的聊天 UI 使用自定义组件，缺少 Markdown 渲染、代码高亮等功能。AgentX 项目提供了成熟的 UI 组件库 `@agentxjs/ui`，采用 Conversation-first, Block-based 设计。

### 约束条件
- 需要保持与现有后端 API 的兼容性
- 需要适配现有的 WebSocket 事件格式
- 需要与现有的领域管理、文档管理 UI 风格一致

### 利益相关者
- 用户：需要更好的消息展示体验（Markdown、代码高亮）
- 开发者：需要可维护的组件库，便于后续升级

## Goals / Non-Goals

### Goals
- 集成 @agentxjs/ui 组件库
- 支持 Markdown 渲染和代码高亮
- 支持流式响应的多状态展示
- 支持工具调用展示
- 保持与现有后端 API 兼容

### Non-Goals
- 不修改后端 API 接口
- 不修改数据库模型
- 不实现 AgentX 的完整功能（如 Agent 管理、Image 管理）

## Decisions

### Decision 1: 组件集成方式

**选择**: 使用 @agentxjs/ui 的底层组件，而非顶层 Studio 组件

**原因**:
- Studio 组件包含 AgentList、Image 管理等功能，与现有架构不兼容
- 底层组件（MessagePane、InputPane、UserEntry、AssistantEntry）更灵活
- 可以保持现有的领域管理、对话列表等页面不变

**使用的组件**:
```typescript
// 从 @agentxjs/ui 导入
import {
  MessagePane,
  InputPane,
  UserEntry,
  AssistantEntry,
  ErrorEntry,
  MarkdownText,
  MessageContent,
} from "@agentxjs/ui";
```

### Decision 2: 数据模型适配

**选择**: 在前端进行数据转换，保持后端不变

**原因**:
- 后端 API 已稳定，修改成本高
- 前端转换更灵活，可以逐步迁移
- 保持向后兼容

**转换逻辑**:
```typescript
// 将 Message 转换为 ConversationData
function messageToConversation(message: Message): ConversationData {
  if (message.role === 'user') {
    return {
      type: 'user',
      id: message.id,
      content: message.content,
      timestamp: new Date(message.createdAt).getTime(),
      status: 'success',
    };
  }

  return {
    type: 'assistant',
    id: message.id,
    messageIds: [message.id],
    timestamp: new Date(message.createdAt).getTime(),
    status: message.isStreaming ? 'streaming' : 'completed',
    blocks: [{
      type: 'text',
      id: `text_${message.id}`,
      content: message.content,
      timestamp: new Date(message.createdAt).getTime(),
      status: message.isStreaming ? 'streaming' : 'completed',
    }],
  };
}
```

### Decision 3: WebSocket 事件格式

**选择**: 兼容两种事件格式（原有格式 + AgentX 格式）

**原因**:
- AgentX 后端实际发送的事件格式与原设计不同
- 需要同时支持 `content_delta` 和 `text_delta` 事件
- 需要同时支持 `message_start`/`message_complete` 和 `conversation_start`/`conversation_end`/`message_stop` 事件

**实际事件映射**:
| AgentX 事件 | 原有事件 | 用途 | UI 状态变化 |
|------------|---------|------|------------|
| conversation_start | message_start | 开始新消息 | 创建 streaming 状态的 AssistantEntry |
| text_delta | content_delta | 追加文本内容 | 更新 TextBlock 内容 |
| source_reference | source_reference | 添加来源引用 | 更新消息的 sources 字段 |
| conversation_end / message_stop | message_complete | 消息完成 | 将状态改为 completed |
| error | error | 错误发生 | 显示 ErrorEntry |

**实现代码**:
```typescript
// useAgentXWebSocket.ts 中的事件处理
case 'message_start':
case 'conversation_start': {
  // 兼容两种事件格式
  setMessageState('streaming');
  // ...
}

case 'content_delta':
case 'text_delta': {
  // 兼容 AgentX 的 text_delta 事件
  const eventData = data.data as { delta?: string; text?: string };
  const delta = eventData?.delta || eventData?.text || '';
  // ...
}

case 'message_complete':
case 'conversation_end':
case 'message_stop': {
  // 兼容 AgentX 事件格式
  setMessageState('completed');
  // ...
}
```

### Decision 4: 样式集成

**选择**: 使用 @agentxjs/ui 的 Tailwind 配置

**原因**:
- @agentxjs/ui 使用 Tailwind CSS
- 可以复用现有的 Tailwind 配置
- 样式变量（如 --background, --foreground）与 shadcn/ui 兼容

**配置**:
```typescript
// tailwind.config.ts
export default {
  content: [
    // 添加 @agentxjs/ui 的内容路径
    "./node_modules/@agentxjs/ui/dist/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
}
```

## Architecture

### 组件架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatPage                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ChatHeader                            │   │
│  │  (保持现有实现)                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MessagePane                           │   │
│  │  (来自 @agentxjs/ui)                                     │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ UserEntry / AssistantEntry / ErrorEntry             ││   │
│  │  │ (来自 @agentxjs/ui)                                 ││   │
│  │  │  ┌─────────────────────────────────────────────────┐││   │
│  │  │  │ TextBlock / ToolBlock                           │││   │
│  │  │  │ (来自 @agentxjs/ui)                             │││   │
│  │  │  │  ┌─────────────────────────────────────────────┐│││   │
│  │  │  │  │ MarkdownText                                ││││   │
│  │  │  │  │ (来自 @agentxjs/ui)                         ││││   │
│  │  │  │  └─────────────────────────────────────────────┘│││   │
│  │  │  └─────────────────────────────────────────────────┘││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    InputPane                             │   │
│  │  (来自 @agentxjs/ui 或保持现有实现)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
后端 API (Message[])
       │
       ▼
useMessages hook
       │
       ▼
messageToConversation() 转换
       │
       ▼
ConversationData[]
       │
       ▼
MessagePane + UserEntry/AssistantEntry
       │
       ▼
TextBlock + MarkdownText
```

### WebSocket 数据流

```
WebSocket 事件 (message_start/content_delta/message_complete/error)
       │
       ▼
useAgentXWebSocket hook
       │
       ├─── message_start ──→ 创建新的 streaming 消息
       │
       ├─── content_delta ──→ 追加文本到当前消息
       │
       ├─── message_complete ──→ 标记消息完成
       │
       └─── error ──→ 显示错误信息
       │
       ▼
messages 状态更新
       │
       ▼
MessagePane + UserEntry/AssistantEntry 重新渲染
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| @agentxjs/ui 版本更新可能破坏兼容性 | 中 | 锁定版本，定期评估升级 |
| 数据转换可能有性能开销 | 低 | 使用 useMemo 缓存转换结果 |
| 样式冲突 | 中 | 使用 CSS 变量，确保主题一致 |
| 包体积增加 | 低 | Tree-shaking，只导入需要的组件 |

## Migration Plan

### Phase 1: 基础集成（1-2 天）
1. 安装依赖包
2. 配置 Tailwind CSS
3. 创建数据转换工具函数
4. 替换 MessageBubble 为 UserEntry/AssistantEntry

### Phase 2: 功能完善（1-2 天）
1. 适配 WebSocket 事件
2. 实现流式状态展示
3. 添加消息中断功能
4. 测试和修复问题

### Phase 3: 增强功能（可选）
1. 支持工具调用展示
2. 支持图片消息
3. 优化性能

## Open Questions

1. ~~是否需要使用 @agentxjs/ui 的 InputPane？~~
   - 答：否，保持现有 MessageInput 组件

2. ~~是否需要支持工具调用展示？~~
   - 答：Phase 5 可选实现，当前后端不支持工具调用

3. ~~@agentxjs/ui 是否需要发布到 npm？~~
   - 答：已发布，使用 @agentxjs/ui@1.5.8 npm 包

## Lessons Learned

1. **事件格式兼容性**: AgentX 后端实际发送的事件格式与文档描述不同，需要在前端做兼容处理
2. **布局问题**: ChatPage 需要独立布局，不能嵌套在 Layout 组件中，否则 flex 布局会导致输入框消失
3. **消息内容格式**: 后端返回的消息内容可能是 JSON 字符串格式，需要解析后提取实际文本
