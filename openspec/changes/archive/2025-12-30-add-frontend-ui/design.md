# Design: 前端 UI

## Context

当前系统采用前后端分离架构：
- 后端：Hono + Node.js，端口 3001
- 前端：Vite + React，端口 5173

后端 API 已完成，需要构建前端 UI 来与用户交互。

### 约束条件
- 使用现有技术栈：React 18 + TypeScript + Tailwind CSS
- 前端通过 Vite 代理访问后端 API
- WebSocket 直连 AgentX 接收流式响应

### 利益相关者
- 用户：需要直观的界面来管理领域和进行对话
- 开发者：需要清晰的组件结构和状态管理

## Goals / Non-Goals

### Goals
- 提供领域管理的完整 UI
- 提供对话聊天的完整 UI
- 支持流式响应展示
- 响应式设计，支持移动端

### Non-Goals
- 不实现复杂的状态管理（使用简单的 React hooks）
- 不实现离线功能
- 不实现国际化（仅支持中文）

## Decisions

### Decision 1: 状态管理方案

**选择**: React Query + React Context

**原因**:
- React Query 处理服务端状态（API 数据）
- React Context 处理客户端状态（UI 状态）
- 避免引入 Redux 等重量级方案

**替代方案**: Zustand
- 优点：更简单的 API
- 缺点：需要额外学习成本

### Decision 2: API 调用方式

**选择**: 自定义 hooks + fetch

**原因**:
- 简单直接，无需额外依赖
- 配合 React Query 使用
- TypeScript 类型安全

**API 客户端示例**:
```typescript
// apps/web/src/client/utils/api.ts
const API_BASE = '/api/v1';

export async function fetchDomains() {
  const res = await fetch(`${API_BASE}/domains`);
  if (!res.ok) throw new Error('Failed to fetch domains');
  return res.json();
}
```

### Decision 3: WebSocket 连接管理

**选择**: 自定义 hook 管理 WebSocket 连接

**原因**:
- AgentX WebSocket 端点为 `/ws`
- 需要订阅特定 sessionId 的事件
- 需要处理重连逻辑

**WebSocket hook 示例**:
```typescript
// apps/web/src/client/hooks/useAgentXWebSocket.ts
export function useAgentXWebSocket(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', sessionId }));
      setIsConnected(true);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 处理不同类型的事件
    };
    return () => ws.close();
  }, [sessionId]);

  return { messages, isConnected };
}
```

### Decision 4: 组件结构

**选择**: Atomic Design 模式

**原因**:
- 已有目录结构（atoms, molecules, organisms, templates）
- 便于组件复用
- 清晰的层次结构

**目录结构**:
```
src/client/
├── components/
│   ├── atoms/          # 基础组件（Button, Input, Card）
│   ├── molecules/      # 组合组件（FormField, MessageBubble）
│   ├── organisms/      # 复杂组件（DomainCard, ChatWindow）
│   └── templates/      # 页面模板（DashboardLayout）
├── pages/              # 页面组件
├── hooks/              # 自定义 hooks
├── stores/             # Context providers
└── utils/              # 工具函数
```

### Decision 5: 路由结构

**选择**: 嵌套路由

**路由配置**:
```typescript
// 路由结构
/                           # 首页
/domains                    # 领域列表
/domains/new                # 创建领域
/domains/:id                # 领域详情
/domains/:id/chat           # 对话列表
/domains/:id/chat/:convId   # 聊天页面
/domains/:id/documents      # 文档列表（Phase 3）
```

## Architecture

### 组件架构

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.tsx                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Layout    │    │   Router    │    │  Providers  │         │
│  │  (Header,   │    │  (Routes)   │    │  (Query,    │         │
│  │   Footer)   │    │             │    │   Context)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
│  Pages:                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  DomainList │    │ DomainDetail│    │  ChatPage   │         │
│  │    Page     │    │    Page     │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  useDomains │    │  useDomain  │    │   useChat   │         │
│  │   (hook)    │    │   (hook)    │    │   (hook)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                    API Client                        │       │
│  │              (fetch + React Query)                   │       │
│  └─────────────────────────────────────────────────────┘       │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  Backend API    │
                    │  (port 3001)    │
                    └─────────────────┘
```

### 数据流

```
用户操作 → React Component → Custom Hook → API Client → Backend API
                                    ↓
                              React Query Cache
                                    ↓
                              UI 更新
```

### WebSocket 数据流

```
用户发送消息 → POST /api/conversations/:id/messages → Backend
                                                          ↓
                                                      AgentX
                                                          ↓
WebSocket ← AgentX Events ← /ws
    ↓
useAgentXWebSocket hook
    ↓
ChatPage 组件更新
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WebSocket 连接不稳定 | 高 | 实现重连逻辑，显示连接状态 |
| API 请求失败 | 中 | 错误边界，重试机制 |
| 大量消息导致性能问题 | 中 | 虚拟滚动，消息分页 |
| 移动端适配问题 | 低 | 响应式设计，测试多种设备 |

## Migration Plan

### Phase 1: 领域管理 UI
1. 配置 Vite 代理
2. 创建 API 客户端和 hooks
3. 实现领域列表页面
4. 实现领域创建页面
5. 实现领域详情页面

### Phase 2: 对话聊天 UI
1. 实现 WebSocket hook
2. 实现对话列表页面
3. 实现聊天页面
4. 实现流式消息展示

### Phase 3: 文档管理 UI（可选）
1. 实现文档列表页面
2. 实现文档上传功能

## Open Questions

1. ~~是否需要引入状态管理库？~~
   - 答：使用 React Query + Context，不引入 Redux

2. ~~WebSocket 重连策略？~~
   - 答：指数退避重连，最多重试 5 次

3. 是否需要支持暗色模式？
   - 待定：MVP 阶段不支持，后续可添加
