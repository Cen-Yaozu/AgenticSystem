## ADDED Requirements

### Requirement: FE-001 领域列表页面

系统 SHALL 提供领域列表页面，展示用户的所有领域。

#### Scenario: 查看领域列表
- **WHEN** 用户访问 `/domains` 页面
- **THEN** 系统展示用户的所有领域
- **AND** 每个领域显示名称、描述、状态、文档数量
- **AND** 提供创建新领域的入口

#### Scenario: 领域列表为空
- **WHEN** 用户没有任何领域
- **THEN** 系统展示空状态提示
- **AND** 提供创建第一个领域的引导

#### Scenario: 删除领域
- **WHEN** 用户点击领域的删除按钮
- **THEN** 系统显示确认对话框
- **AND** 确认后删除领域并刷新列表

---

### Requirement: FE-002 领域创建页面

系统 SHALL 提供领域创建页面，允许用户创建新领域。

#### Scenario: 成功创建领域
- **WHEN** 用户访问 `/domains/new` 页面
- **AND** 用户填写名称（必填）、描述、专业领域
- **AND** 用户点击创建按钮
- **THEN** 系统创建领域
- **AND** 跳转到领域详情页面

#### Scenario: 表单验证失败
- **WHEN** 用户提交空名称
- **THEN** 系统显示验证错误
- **AND** 不提交表单

#### Scenario: 创建失败
- **WHEN** 后端返回错误（如名称重复）
- **THEN** 系统显示错误提示
- **AND** 保留用户输入

---

### Requirement: FE-003 领域详情页面

系统 SHALL 提供领域详情页面，展示和编辑领域信息。

#### Scenario: 查看领域详情
- **WHEN** 用户访问 `/domains/:id` 页面
- **THEN** 系统展示领域的完整信息
- **AND** 提供编辑、对话、文档的入口

#### Scenario: 编辑领域信息
- **WHEN** 用户点击编辑按钮
- **THEN** 系统显示编辑表单
- **AND** 用户可以修改名称、描述、专业领域、设置
- **AND** 保存后更新显示

#### Scenario: 领域不存在
- **WHEN** 用户访问不存在的领域
- **THEN** 系统显示 404 页面

---

### Requirement: FE-004 对话列表页面

系统 SHALL 提供对话列表页面，展示领域下的所有对话。

#### Scenario: 查看对话列表
- **WHEN** 用户访问 `/domains/:id/chat` 页面
- **THEN** 系统展示该领域下的所有对话
- **AND** 每个对话显示标题、创建时间、最后更新时间
- **AND** 提供创建新对话的入口

#### Scenario: 创建新对话
- **WHEN** 用户点击创建对话按钮
- **THEN** 系统创建新对话
- **AND** 跳转到聊天页面

#### Scenario: 删除对话
- **WHEN** 用户点击对话的删除按钮
- **THEN** 系统显示确认对话框
- **AND** 确认后删除对话并刷新列表

---

### Requirement: FE-005 聊天页面

系统 SHALL 提供聊天页面，支持与 AI 进行对话。

#### Scenario: 查看消息历史
- **WHEN** 用户访问 `/domains/:id/chat/:convId` 页面
- **THEN** 系统展示对话的消息历史
- **AND** 消息按时间顺序排列
- **AND** 区分用户消息和 AI 消息

#### Scenario: 发送消息
- **WHEN** 用户在输入框输入消息
- **AND** 用户点击发送按钮或按 Enter
- **THEN** 系统发送消息到后端
- **AND** 显示用户消息
- **AND** 显示 AI 正在输入状态

#### Scenario: 接收流式响应
- **WHEN** AI 开始生成回复
- **THEN** 系统通过 WebSocket 接收流式事件
- **AND** 实时显示 AI 回复内容
- **AND** 完成后显示完整消息

#### Scenario: 中断生成
- **WHEN** AI 正在生成回复
- **AND** 用户点击中断按钮
- **THEN** 系统发送中断请求
- **AND** 停止显示新内容
- **AND** 保留已生成的内容

---

### Requirement: FE-006 WebSocket 连接

系统 SHALL 通过 WebSocket 接收 AgentX 的流式事件。

#### Scenario: 建立 WebSocket 连接
- **WHEN** 用户进入聊天页面
- **THEN** 系统建立 WebSocket 连接到 `/ws`
- **AND** 订阅当前对话的 sessionId

#### Scenario: 接收流式事件
- **WHEN** WebSocket 收到事件
- **THEN** 系统根据事件类型处理：
  - `message_start`: 开始新消息
  - `text_delta`: 追加文本内容
  - `message_complete`: 完成消息
  - `error`: 显示错误

#### Scenario: 连接断开重连
- **WHEN** WebSocket 连接断开
- **THEN** 系统显示连接状态
- **AND** 自动尝试重连（指数退避）
- **AND** 重连成功后恢复订阅

---

### Requirement: FE-007 响应式设计

系统 SHALL 支持响应式设计，适配不同屏幕尺寸。

#### Scenario: 桌面端布局
- **WHEN** 屏幕宽度 >= 1024px
- **THEN** 使用桌面端布局
- **AND** 侧边栏固定显示

#### Scenario: 移动端布局
- **WHEN** 屏幕宽度 < 768px
- **THEN** 使用移动端布局
- **AND** 侧边栏可折叠
- **AND** 聊天输入框固定在底部

---

### Requirement: FE-008 错误处理

系统 SHALL 提供友好的错误处理和提示。

#### Scenario: API 请求失败
- **WHEN** API 请求返回错误
- **THEN** 系统显示错误提示
- **AND** 提供重试选项（如适用）

#### Scenario: 网络错误
- **WHEN** 网络连接失败
- **THEN** 系统显示网络错误提示
- **AND** 提供重试选项

#### Scenario: 加载状态
- **WHEN** 数据正在加载
- **THEN** 系统显示加载指示器
- **AND** 禁用相关操作按钮

---

### Requirement: FE-009 路由配置

系统 SHALL 配置以下路由结构。

#### Scenario: 路由映射
- **THEN** 系统支持以下路由：
  - `/` - 首页
  - `/domains` - 领域列表
  - `/domains/new` - 创建领域
  - `/domains/:id` - 领域详情
  - `/domains/:id/chat` - 对话列表
  - `/domains/:id/chat/:convId` - 聊天页面
  - `*` - 404 页面

#### Scenario: 路由守卫
- **WHEN** 用户访问需要认证的页面
- **THEN** 系统检查用户认证状态
- **AND** 未认证时重定向到登录页（MVP 阶段使用模拟用户）
