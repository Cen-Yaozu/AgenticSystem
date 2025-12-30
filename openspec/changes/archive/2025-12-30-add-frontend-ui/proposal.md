# Change: 添加前端 UI

## Why

当前系统后端 API 已完成（领域管理、文档处理、对话系统），但前端只有静态展示页面，缺少实际功能页面。用户无法通过 UI 与系统交互。

**现状**:
- 后端 API 运行在端口 3001，提供完整的 REST API
- 前端只有首页（HomePage）和 404 页面
- 缺少领域管理、对话聊天等核心功能页面

## What Changes

### Phase 1: 领域管理 UI（MVP）
- 领域列表页面：展示用户的所有领域
- 领域创建页面：创建新领域的表单
- 领域详情页面：查看和编辑领域信息

### Phase 2: 对话聊天 UI
- 对话列表页面：展示领域下的所有对话
- 聊天页面：与 AI 进行对话，支持流式响应
- WebSocket 连接：接收 AgentX 的流式事件

### Phase 3: 文档管理 UI（可选）
- 文档列表页面：展示领域下的所有文档
- 文档上传功能：上传和处理文档

## Impact

- **新增 capability**: frontend-ui
- **依赖 capability**: domain-management, conversation-system
- **受影响的代码**:
  - 新增: `apps/web/src/client/pages/` 下的页面组件
  - 新增: `apps/web/src/client/hooks/` 下的 API hooks
  - 新增: `apps/web/src/client/stores/` 下的状态管理
  - 修改: `apps/web/src/client/App.tsx`（添加路由）
  - 修改: `apps/web/vite.config.ts`（API 代理配置）
