# Spec: AgentX UI 集成

## ADDED Requirements

### Requirement: Markdown 渲染

系统 SHALL 使用 @agentxjs/ui 组件库渲染 AI 响应中的 Markdown 内容，包括标题、列表、链接、代码块等格式。

#### Scenario: 渲染 Markdown 标题和列表
- **GIVEN** AI 响应包含 Markdown 格式的标题和列表
- **WHEN** 消息在聊天界面中显示
- **THEN** 标题应正确渲染为对应级别的 HTML 标题元素
- **AND** 列表应正确渲染为有序或无序列表

#### Scenario: 渲染 Markdown 链接
- **GIVEN** AI 响应包含 Markdown 格式的链接
- **WHEN** 消息在聊天界面中显示
- **THEN** 链接应渲染为可点击的超链接
- **AND** 链接应在新标签页中打开

### Requirement: 代码高亮

系统 SHALL 对 AI 响应中的代码块提供语法高亮显示，并提供代码复制功能。

#### Scenario: 代码块语法高亮
- **GIVEN** AI 响应包含带语言标识的代码块（如 ```typescript）
- **WHEN** 消息在聊天界面中显示
- **THEN** 代码块应根据指定语言进行语法高亮
- **AND** 代码块应有明显的视觉边界

#### Scenario: 代码复制功能
- **GIVEN** 聊天界面显示包含代码块的消息
- **WHEN** 用户点击代码块的复制按钮
- **THEN** 代码内容应复制到剪贴板
- **AND** 应显示复制成功的反馈

### Requirement: 消息状态展示

系统 SHALL 支持多种消息状态的可视化展示，包括 queued（排队中）、processing（处理中）、thinking（思考中）、streaming（流式输出中）、completed（已完成）。

#### Scenario: 流式响应状态展示
- **GIVEN** AI 正在生成响应
- **WHEN** 响应处于流式输出状态
- **THEN** 界面应显示 streaming 状态指示器
- **AND** 文本应逐步显示

#### Scenario: 思考状态展示
- **GIVEN** AI 正在处理用户请求
- **WHEN** 响应处于思考状态
- **THEN** 界面应显示 thinking 状态指示器
- **AND** 用户应能看到 AI 正在处理的视觉反馈

#### Scenario: 完成状态展示
- **GIVEN** AI 响应生成完成
- **WHEN** 响应处于完成状态
- **THEN** 状态指示器应消失或变为完成状态
- **AND** 消息应完整显示

### Requirement: 数据模型转换

系统 SHALL 提供数据转换层，将现有的 Message 模型转换为 @agentxjs/ui 所需的 ConversationData 模型。

#### Scenario: 用户消息转换
- **GIVEN** 存在一条 role 为 'user' 的 Message
- **WHEN** 调用 messageToConversation 函数
- **THEN** 应返回 type 为 'user' 的 UserConversationData
- **AND** content 字段应正确映射

#### Scenario: 助手消息转换
- **GIVEN** 存在一条 role 为 'assistant' 的 Message
- **WHEN** 调用 messageToConversation 函数
- **THEN** 应返回 type 为 'assistant' 的 AssistantConversationData
- **AND** 应包含一个 TextBlock
- **AND** status 应根据 isStreaming 字段正确设置

#### Scenario: 批量消息转换
- **GIVEN** 存在多条 Message 的数组
- **WHEN** 调用 messagesToConversations 函数
- **THEN** 应返回对应数量的 ConversationData 数组
- **AND** 消息顺序应保持不变

### Requirement: WebSocket 事件处理

系统 SHALL 直接处理现有的 WebSocket 事件，将其映射到 UI 组件状态，无需额外的事件适配层。

#### Scenario: message_start 事件处理
- **GIVEN** 收到 type 为 'message_start' 的 WebSocket 事件
- **WHEN** useAgentXWebSocket hook 处理该事件
- **THEN** 应创建一个新的 ChatMessage 对象
- **AND** 该消息的 isStreaming 应为 true
- **AND** 该消息应添加到 messages 列表末尾

#### Scenario: content_delta 事件处理
- **GIVEN** 收到 type 为 'content_delta' 的 WebSocket 事件
- **WHEN** useAgentXWebSocket hook 处理该事件
- **THEN** 应将 delta 内容追加到当前 streaming 消息的 content 字段
- **AND** UI 应实时更新显示新内容

#### Scenario: message_complete 事件处理
- **GIVEN** 收到 type 为 'message_complete' 的 WebSocket 事件
- **WHEN** useAgentXWebSocket hook 处理该事件
- **THEN** 应将当前消息的 isStreaming 设置为 false
- **AND** 消息状态应变为 completed

#### Scenario: error 事件处理
- **GIVEN** 收到 type 为 'error' 的 WebSocket 事件
- **WHEN** useAgentXWebSocket hook 处理该事件
- **THEN** 应调用 onError 回调
- **AND** 错误信息应传递给 UI 显示

### Requirement: 样式兼容性

系统 SHALL 确保 @agentxjs/ui 组件的样式与现有 UI 风格一致，使用相同的 CSS 变量和 Tailwind CSS 配置。

#### Scenario: Tailwind CSS 配置
- **GIVEN** 项目使用 Tailwind CSS
- **WHEN** 集成 @agentxjs/ui 组件
- **THEN** tailwind.config.ts 应包含 @agentxjs/ui 的内容路径
- **AND** 组件样式应正确应用

#### Scenario: CSS 变量兼容
- **GIVEN** 项目使用 shadcn/ui 风格的 CSS 变量
- **WHEN** @agentxjs/ui 组件渲染
- **THEN** 组件应使用相同的 CSS 变量（如 --background, --foreground）
- **AND** 主题切换应正常工作

### Requirement: 组件集成

系统 SHALL 使用 @agentxjs/ui 的底层组件（MessagePane、UserEntry、AssistantEntry、ErrorEntry）替换现有的消息展示组件。

#### Scenario: 消息列表渲染
- **GIVEN** 存在多条聊天消息
- **WHEN** ChatPage 渲染消息列表
- **THEN** 应使用 MessagePane 组件作为容器
- **AND** 用户消息应使用 UserEntry 组件渲染
- **AND** 助手消息应使用 AssistantEntry 组件渲染

#### Scenario: 错误消息渲染
- **GIVEN** 发生错误
- **WHEN** 需要显示错误信息
- **THEN** 应使用 ErrorEntry 组件渲染错误消息
- **AND** 错误信息应清晰可见

#### Scenario: 加载状态渲染
- **GIVEN** 正在等待 AI 响应
- **WHEN** isLoading 为 true
- **THEN** 应显示 thinking 状态的 AssistantEntry
- **AND** 用户应能看到加载指示器
