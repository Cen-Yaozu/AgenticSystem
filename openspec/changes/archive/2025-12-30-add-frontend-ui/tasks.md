# Tasks: 添加前端 UI

## 1. Phase 1: 基础设施

- [x] 1.1 配置 Vite 代理
  - 文件: `apps/web/vite.config.ts`
  - 修改 API 代理目标为 `http://localhost:3001`

- [x] 1.2 创建 API 客户端
  - 文件: `apps/web/src/client/utils/api.ts`
  - 实现基础 fetch 封装
  - 实现错误处理

- [x] 1.3 安装 React Query
  - 运行: `pnpm add @tanstack/react-query`
  - 配置 QueryClientProvider

- [x] 1.4 创建类型定义
  - 文件: `apps/web/src/client/types/index.ts`
  - 从 `@agentic-rag/shared` 导入共享类型

## 2. Phase 2: 领域管理 UI

- [x] 2.1 创建领域相关 hooks
  - 文件: `apps/web/src/client/hooks/useDomains.ts`
  - 实现 `useDomains()` - 获取领域列表
  - 实现 `useDomain(id)` - 获取领域详情
  - 实现 `useCreateDomain()` - 创建领域
  - 实现 `useUpdateDomain()` - 更新领域
  - 实现 `useDeleteDomain()` - 删除领域

- [x] 2.2 创建基础组件
  - 文件: `apps/web/src/client/components/atoms/Button.tsx`
  - 文件: `apps/web/src/client/components/atoms/Input.tsx`
  - 文件: `apps/web/src/client/components/atoms/Card.tsx`
  - 文件: `apps/web/src/client/components/atoms/Loading.tsx`

- [x] 2.3 创建领域列表页面
  - 文件: `apps/web/src/client/pages/DomainsPage.tsx`
  - 展示领域卡片列表
  - 支持创建新领域按钮
  - 支持删除领域

- [x] 2.4 创建领域创建页面
  - 文件: `apps/web/src/client/pages/DomainCreatePage.tsx`
  - 表单：名称、描述、专业领域
  - 表单验证
  - 创建成功后跳转

- [x] 2.5 创建领域详情页面
  - 文件: `apps/web/src/client/pages/DomainDetailPage.tsx`
  - 展示领域信息
  - 支持编辑领域
  - 导航到对话和文档

- [x] 2.6 更新路由配置
  - 文件: `apps/web/src/client/App.tsx`
  - 添加领域相关路由

## 3. Phase 3: 对话聊天 UI

- [x] 3.1 创建 WebSocket hook
  - 文件: `apps/web/src/client/hooks/useAgentXWebSocket.ts`
  - 实现 WebSocket 连接管理
  - 实现事件订阅
  - 实现重连逻辑

- [x] 3.2 创建对话相关 hooks
  - 文件: `apps/web/src/client/hooks/useConversations.ts`
  - 实现 `useConversations(domainId)` - 获取对话列表
  - 实现 `useConversation(id)` - 获取对话详情
  - 实现 `useCreateConversation()` - 创建对话
  - 实现 `useSendMessage()` - 发送消息

- [x] 3.3 创建聊天组件
  - 文件: `apps/web/src/client/components/molecules/MessageBubble.tsx`
  - 文件: `apps/web/src/client/components/organisms/ChatWindow.tsx`
  - 文件: `apps/web/src/client/components/organisms/MessageInput.tsx`

- [x] 3.4 创建对话列表页面
  - 文件: `apps/web/src/client/pages/ConversationsPage.tsx`
  - 展示对话列表
  - 支持创建新对话
  - 支持删除对话

- [x] 3.5 创建聊天页面
  - 文件: `apps/web/src/client/pages/ChatPage.tsx`
  - 展示消息历史
  - 支持发送消息
  - 支持流式响应展示
  - 支持中断生成

- [x] 3.6 更新路由配置
  - 文件: `apps/web/src/client/App.tsx`
  - 添加对话相关路由

## 4. Phase 4: 文档管理 UI

- [x] 4.1 创建文档相关 hooks
  - 文件: `apps/web/src/client/hooks/useDocuments.ts`
  - 实现 `useDocuments(domainId)` - 获取文档列表
  - 实现 `useUploadDocument()` - 上传文档
  - 实现 `useDeleteDocument()` - 删除文档
  - 实现 `useReprocessDocument()` - 重新处理文档
  - 实现 `useDownloadDocument()` - 下载文档

- [x] 4.2 创建文档列表页面
  - 文件: `apps/web/src/client/pages/DocumentsPage.tsx`
  - 展示文档列表
  - 支持状态筛选
  - 支持分页
  - 展示统计信息

- [x] 4.3 创建文档上传组件
  - 文件: `apps/web/src/client/components/organisms/DocumentUpload.tsx`
  - 支持拖拽上传
  - 支持文件类型验证
  - 支持上传进度显示

- [x] 4.4 更新路由配置
  - 文件: `apps/web/src/client/App.tsx`
  - 添加文档管理路由

## 验收标准

### Phase 1 验收
- [x] Vite 代理正确转发 API 请求
- [x] React Query 正确配置
- [x] API 客户端可以调用后端接口

### Phase 2 验收
- [x] 可以查看领域列表
- [x] 可以创建新领域
- [x] 可以查看领域详情
- [x] 可以编辑领域信息
- [x] 可以删除领域

### Phase 3 验收
- [x] 可以查看对话列表
- [x] 可以创建新对话
- [x] 可以发送消息
- [x] 可以接收流式响应
- [x] 可以中断生成
- [x] WebSocket 断线可以重连

### Phase 4 验收
- [x] 可以查看文档列表
- [x] 可以上传文档
- [x] 可以查看文档处理状态
- [x] 可以下载文档
- [x] 可以删除文档
- [x] 可以重新处理文档
