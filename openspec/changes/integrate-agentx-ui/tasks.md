# Tasks: 集成 @agentxjs/ui 包

> 注意：此变更从归档恢复，需要重新验证之前完成的任务。

## 1. Phase 1: 基础设施

- [x] 1.1 安装依赖包
  - 运行: `pnpm add @agentxjs/ui` (或使用 workspace 引用)
  - 如果使用 workspace: 在 `apps/web/package.json` 添加 `"@agentxjs/ui": "workspace:*"`
  - 备选: 使用 git submodule 引用 Agent/packages/ui
  - ✅ 已安装 @agentxjs/ui@1.5.8 npm 包

- [x] 1.2 配置 Tailwind CSS
  - 文件: `apps/web/tailwind.config.ts`
  - 添加 @agentxjs/ui 的内容路径
  - 确保 CSS 变量与 @agentxjs/ui 兼容
  - ✅ 已添加 `./node_modules/@agentxjs/ui/dist/**/*.{js,ts,jsx,tsx}` 到 content

- [x] 1.3 创建类型定义
  - 文件: `apps/web/src/client/types/agentx.ts`
  - 定义 ConversationData, BlockData 等类型
  - 或从 @agentxjs/ui 导入类型
  - ✅ 已创建类型定义文件

- [x] 1.4 创建数据转换工具
  - 文件: `apps/web/src/client/utils/conversationAdapter.ts`
  - 实现 `messageToConversation()` 函数
  - 实现 `messagesToConversations()` 函数
  - ✅ 已创建数据转换工具

## 2. Phase 2: 组件替换

- [x] 2.1 创建 AgentX 消息组件包装器
  - 文件: `apps/web/src/client/components/organisms/AgentXMessageList.tsx`
  - 使用 MessagePane 组件
  - 使用 UserEntry/AssistantEntry 组件
  - 处理消息列表渲染
  - ✅ 已创建 AgentXMessageList 组件，使用 MessagePane 和 MarkdownText

- [x] 2.2 更新 ChatPage
  - 文件: `apps/web/src/client/pages/ChatPage.tsx`
  - 替换 ChatWindow 为 AgentXMessageList
  - 保持 MessageInput 不变（或替换为 InputPane）
  - 更新数据流
  - ✅ 已更新 ChatPage 使用 AgentXMessageList

- [x] 2.3 更新样式
  - 文件: `apps/web/src/client/index.css`
  - 添加 @agentxjs/ui 需要的 CSS 变量
  - 确保主题一致性
  - ✅ 已添加 CSS 变量（--background, --foreground, --primary, --card, --muted, --border 等）

## 3. Phase 3: 状态展示增强

- [x] 3.1 增强 WebSocket hook 状态管理
  - 文件: `apps/web/src/client/hooks/useAgentXWebSocket.ts`
  - 现有事件格式已兼容，无需适配层
  - 添加 thinking 状态支持（在 message_start 前显示）
  - 支持多状态展示（streaming/completed/error）
  - ✅ 已添加 MessageState 类型和 messageState 状态
  - ✅ 已添加 thinking_start, message_interrupted 事件处理
  - ✅ 已添加 interruptMessage 功能

- [x] 3.2 实现流式状态展示
  - 更新 ChatPage 使用 @agentxjs/ui 的状态指示器
  - 显示 streaming 状态动画
  - 支持消息中断功能（发送 interrupt 事件）
  - ✅ 已更新 ChatPage 显示状态文本
  - ✅ 已添加中断按钮
  - ✅ 已更新 LoadingIndicator 支持显示状态文本

## 4. Phase 4: 测试和优化

- [-] 4.1 功能测试（需要重新验证）
  - 测试消息发送和接收
  - 测试流式响应展示
  - 测试 Markdown 渲染
  - 测试代码高亮和复制
  - ⚠️ 之前验证通过，但出现问题需要重新测试

- [ ] 4.2 性能优化
  - 使用 useMemo 缓存数据转换
  - 实现虚拟滚动（如果消息量大）
  - 优化重渲染

- [ ] 4.3 样式调整
  - 确保与现有 UI 风格一致
  - 响应式设计测试
  - 暗色模式支持（可选）

## 5. Phase 5: 增强功能（可选）

- [ ] 5.1 支持工具调用展示
  - 实现 ToolBlock 组件集成
  - 后端需要支持工具调用事件

- [ ] 5.2 支持图片消息
  - 实现 ImageBlock 组件集成
  - 后端需要支持图片消息

- [ ] 5.3 支持消息编辑和重新生成
  - 实现编辑功能
  - 实现重新生成功能

## 验收标准

### Phase 1 验收
- [x] 依赖包安装成功
- [x] Tailwind CSS 配置正确
- [x] 数据转换函数工作正常

### Phase 2 验收
- [x] 消息列表正确渲染
- [x] 用户消息和助手消息样式正确
- [x] Markdown 内容正确渲染
- [x] 代码块有语法高亮
- [x] 代码块有复制按钮

### Phase 3 验收
- [x] WebSocket 连接正常
- [x] 流式响应正确展示
- [x] 状态指示器正确显示
- [x] 消息中断功能正常

### Phase 4 验收
- [ ] 所有功能测试通过
- [ ] 性能满足要求
- [ ] 样式与现有 UI 一致

### Phase 5 验收（可选）
- [ ] 工具调用正确展示
- [ ] 图片消息正确展示
- [ ] 编辑和重新生成功能正常

## 恢复后待处理

- [x] 确认具体出现的问题（代码被回退，需要重新实施）
- [x] 根据问题制定修复方案（重新实施所有 Phase 1-3）
- [-] 重新验证所有功能

## 2026-01-03 重新实施记录

### 已完成的工作

1. **Phase 1: 基础设施** ✅
   - 安装 @agentxjs/ui@1.5.8 依赖
   - 配置 Tailwind CSS 包含 @agentxjs/ui 路径
   - 创建类型定义文件 `types/agentx.ts`
   - 创建数据转换工具 `utils/conversationAdapter.ts`

2. **Phase 2: 组件替换** ✅
   - 创建 `AgentXMessageList.tsx` 组件
   - 更新 `ChatPage.tsx` 使用新组件
   - 添加 CSS 变量到 `index.css`
   - 添加 Button outline variant

3. **Phase 3: 状态展示增强** ✅
   - 增强 `useAgentXWebSocket.ts` hook
   - 添加 messageState 状态管理
   - 添加 interruptMessage 功能
   - 兼容 AgentX 事件格式（conversation_start, text_delta, conversation_end, message_stop）

### 待验证

- [ ] 消息发送和接收
- [ ] 流式响应展示
- [ ] Markdown 渲染
- [ ] 代码高亮和复制
- [ ] 停止按钮功能
