# Change: 集成 @agentxjs/ui 包

**Status: 🔄 In Progress (恢复自归档)**

> 注意：此变更从 `archive/2025-12-31-integrate-agentx-ui` 恢复，因为出现问题需要重新处理。

## Why

当前聊天页面存在以下问题：
1. **缺少 Markdown 渲染** - AI 响应的代码块、列表、链接等无法正确显示
2. **缺少代码高亮** - 代码块显示为纯文本，无语法高亮和复制功能
3. **状态管理简单** - 只有 streaming/completed 两种状态，缺少 thinking、processing 等中间状态
4. **不支持工具调用展示** - 无法显示 AI 调用工具的过程和结果

AgentX 项目已有成熟的 UI 组件库 `@agentxjs/ui`，提供：
- Markdown 渲染（react-markdown + remark-gfm）
- 代码高亮和复制功能
- Conversation-first, Block-based 设计
- 完整的状态管理（5 种状态）
- 工具调用展示（ToolBlock）

## What Changes

### Phase 1: 基础设施
- 安装 `@agentxjs/ui` 依赖（workspace 引用或 git submodule）
- 配置 Tailwind CSS 兼容 @agentxjs/ui 样式
- 创建数据转换工具（Message → ConversationData）

### Phase 2: 组件替换
- 使用 @agentxjs/ui 底层组件（MessagePane、UserEntry、AssistantEntry）
- 替换现有 MessageBubble 和 ChatWindow 组件
- 保持现有 MessageInput 组件不变

### Phase 3: 状态展示增强
- 增强 WebSocket hook 状态管理（现有事件格式已兼容，无需适配层）
- 实现流式状态展示（streaming 动画）
- 支持消息中断功能

### Phase 4: 增强功能（可选）
- 支持工具调用展示
- 支持图片消息

## Impact

- **新增依赖**: `@agentxjs/ui@1.5.8`
- **新增文件**:
  - `apps/web/src/client/types/agentx.ts` - AgentX 类型定义
  - `apps/web/src/client/utils/conversationAdapter.ts` - 数据转换工具
  - `apps/web/src/client/components/organisms/AgentXMessageList.tsx` - 消息列表组件
- **修改文件**:
  - `apps/web/package.json` - 添加依赖
  - `apps/web/src/client/pages/ChatPage.tsx` - 使用 AgentXMessageList 组件
  - `apps/web/src/client/hooks/useAgentXWebSocket.ts` - 增强状态管理，兼容 AgentX 事件格式
  - `apps/web/tailwind.config.ts` - 添加 @agentxjs/ui 样式配置
  - `apps/web/src/client/index.css` - 添加 CSS 变量
  - `apps/web/src/client/App.tsx` - 调整 ChatPage 路由布局
- **保留文件** (未删除，可能其他页面使用):
  - `apps/web/src/client/components/molecules/MessageBubble.tsx`
  - `apps/web/src/client/components/organisms/ChatWindow.tsx`

## Implementation Notes

### 之前修复的问题
1. **JSON 格式消息内容解析** - 添加 `parseMessageContent` 函数解析 JSON 格式的消息内容
2. **ChatPage 输入框消失问题** - 将 ChatPage 移出 Layout 包装，修复 flex 布局
3. **对话功能不工作问题** - 兼容 AgentX 的 `text_delta`/`conversation_start`/`conversation_end`/`message_stop` 事件格式

### 之前的验证结果
- ✅ Markdown 渲染正常
- ✅ 代码高亮正常
- ✅ 复制按钮正常
- ✅ WebSocket 连接正常
- ✅ 流式响应正确展示
- ✅ 状态指示器正确显示
- ✅ 消息发送和接收正常

## 恢复原因

待确认具体问题...
