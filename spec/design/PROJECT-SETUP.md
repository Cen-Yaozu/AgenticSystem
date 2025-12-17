# 项目初始化指南

> **版本**: 2.0.0
> **状态**: Draft
> **最后更新**: 2024-12-17

---

## 1. 概述

本文档定义 AgentX Agentic RAG 系统的项目结构、技术栈和初始化步骤。

> **注意**: 本文档已更新以反映实际项目结构。项目采用前后端一体的 Monorepo 结构。

### 相关文档

| 文档 | 描述 |
|------|------|
| [技术架构](./TECHNICAL-ARCHITECTURE.md) | 系统架构设计 |
| [Agentic 架构](./AGENTIC-ARCHITECTURE.md) | 多角色架构设计 |
| [数据模型](./DATA-MODEL.md) | 数据库设计 |
| [API 参考](./API-REFERENCE.md) | API 接口定义 |

---

## 2. 项目结构

### 2.1 Monorepo 结构（实际）

```
agentic-rag/
├── apps/
│   └── web/                          # 主应用（前后端一体）
│       ├── src/
│       │   ├── client/               # 前端代码
│       │   │   ├── components/       # UI 组件
│       │   │   │   ├── Layout.tsx    # 布局组件
│       │   │   │   └── ...
│       │   │   ├── pages/            # 页面组件
│       │   │   │   ├── HomePage.tsx
│       │   │   │   └── NotFoundPage.tsx
│       │   │   ├── hooks/            # 自定义 Hooks
│       │   │   ├── stores/           # Zustand 状态
│       │   │   ├── services/         # API 服务
│       │   │   ├── App.tsx           # 应用入口
│       │   │   ├── main.tsx          # 渲染入口
│       │   │   └── index.css         # 全局样式
│       │   │
│       │   └── server/               # 后端代码
│       │       ├── routes/           # API 路由
│       │       │   └── assistants.ts # 助手路由
│       │       ├── services/         # 业务服务
│       │       │   └── assistant.service.ts
│       │       ├── repositories/     # 数据访问层
│       │       │   └── assistant.repository.ts
│       │       ├── database/         # 数据库
│       │       │   └── index.ts      # SQLite 初始化
│       │       ├── middleware/       # 中间件
│       │       │   ├── auth.ts       # 认证中间件
│       │       │   ├── error.ts      # 错误处理
│       │       │   └── logger.ts     # 日志中间件
│       │       ├── validators/       # 数据验证
│       │       │   └── assistant.validator.ts
│       │       ├── errors/           # 错误定义
│       │       │   └── business.error.ts
│       │       ├── utils/            # 工具函数
│       │       │   ├── id.ts         # ID 生成
│       │       │   ├── logger.ts     # 日志工具
│       │       │   └── response.ts   # 响应工具
│       │       ├── processing/       # 文档处理（待实现）
│       │       ├── retrieval/        # 向量检索（待实现）
│       │       ├── agentic/          # Agentic 角色系统（待实现）
│       │       ├── __tests__/        # 测试文件
│       │       │   ├── setup.ts
│       │       │   ├── assistant.service.test.ts
│       │       │   └── assistants.api.test.ts
│       │       └── index.ts          # 服务器入口
│       │
│       ├── public/                   # 静态文件
│       ├── index.html                # HTML 模板
│       ├── vite.config.ts            # Vite 配置
│       ├── vitest.config.ts          # 测试配置
│       ├── tailwind.config.ts        # Tailwind 配置
│       ├── postcss.config.js         # PostCSS 配置
│       ├── tsconfig.json             # TypeScript 配置
│       └── package.json
│
├── packages/
│   └── shared/                       # 共享包
│       ├── src/
│       │   ├── types/                # 共享类型定义
│       │   │   └── index.ts
│       │   ├── constants/            # 共享常量
│       │   │   └── index.ts
│       │   └── index.ts              # 导出入口
│       ├── tsconfig.json
│       └── package.json
│
├── spec/                             # 规格文档
│   ├── SPEC-001-OVERVIEW.md
│   ├── SPEC-002-ASSISTANT-MANAGEMENT.md
│   ├── SPEC-003-DOCUMENT-PROCESSING.md
│   ├── SPEC-004-CONVERSATION-SYSTEM.md
│   ├── SPEC-005-ROLE-MEMORY.md
│   ├── design/                       # 设计文档
│   │   ├── AGENTIC-ARCHITECTURE.md   # Agentic 架构
│   │   ├── ARCHITECTURE-DESIGN.md
│   │   ├── TECHNICAL-ARCHITECTURE.md
│   │   ├── DATA-MODEL.md
│   │   ├── API-REFERENCE.md
│   │   └── ...
│   └── features/                     # Gherkin 特性文件
│
├── openspec/                         # OpenSpec 变更管理
│   ├── AGENTS.md                     # AI 助手指南
│   ├── project.md                    # 项目约定
│   ├── changes/                      # 活跃变更
│   │   └── archive/                  # 已归档变更
│   └── specs/                        # 已归档规格
│
├── data/                             # 数据目录（gitignore）
│   ├── agentic-rag.db                # SQLite 数据库
│   ├── uploads/                      # 上传文件
│   └── logs/                         # 日志文件
│
├── docker-compose.yml                # Docker 编排（Qdrant）
├── .env.example                      # 环境变量示例
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── package.json                      # 根 package.json
├── pnpm-workspace.yaml               # pnpm 工作区配置
├── pnpm-lock.yaml
├── AGENTS.md                         # 项目 AI 助手指南
└── README.md
```

---

## 3. 技术栈

### 3.1 后端技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 运行时 | Node.js | 20.x LTS | JavaScript 运行环境 |
| 语言 | TypeScript | 5.x | 类型安全 |
| Web 框架 | **Hono** | 4.x | 轻量 HTTP 服务器 |
| 数据库 | **SQLite** | - | 关系数据存储（better-sqlite3） |
| 向量数据库 | Qdrant | 1.x | 向量存储和检索 |
| 验证 | Zod | 3.x | 请求验证 |
| 日志 | Pino | 8.x | 结构化日志 |
| 测试 | Vitest | 2.x | 单元测试 |
| AI SDK | @anthropic-ai/sdk | - | Claude API |
| 嵌入 | openai | 4.x | OpenAI Embeddings |

### 3.2 前端技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.x | UI 框架 |
| 构建 | Vite | 6.x | 构建工具 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 状态管理 | Zustand | 4.x | 客户端状态 |
| 请求 | TanStack Query | 5.x | 服务端状态 |
| 样式 | Tailwind CSS | 4.x | CSS 框架 |
| 路由 | React Router | 7.x | 路由管理 |
| 图标 | Lucide React | - | 图标库 |

### 3.3 基础设施

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 主数据库 | **SQLite** | - | 关系数据存储 |
| 向量数据库 | Qdrant | 1.x | 向量存储和检索 |
| 包管理 | pnpm | 9.x | 包管理器 |
| 容器 | Docker | 24.x | 容器化（Qdrant） |

---

## 4. 初始化步骤

### 4.1 环境要求

```bash
# 检查 Node.js 版本
node --version  # 需要 >= 20.0.0

# 检查 pnpm 版本
pnpm --version  # 需要 >= 9.0.0

# 检查 Docker 版本（用于 Qdrant）
docker --version  # 需要 >= 24.0.0
```

### 4.2 克隆和安装

```bash
# 1. 克隆项目
git clone <repository-url>
cd agentic-rag

# 2. 安装依赖
pnpm install

# 3. 复制环境变量
cp .env.example .env

# 4. 编辑环境变量
# 填入必要的 API Key
```

### 4.3 启动基础设施

```bash
# 启动 Qdrant 向量数据库
docker-compose up -d qdrant

# 验证 Qdrant 运行
curl http://localhost:6333/health
```

### 4.4 启动开发服务器

```bash
# 启动开发服务器（前后端一体）
pnpm --filter @agentic-rag/web dev

# 或使用根目录脚本
pnpm dev
```

### 4.5 运行测试

```bash
# 运行所有测试
pnpm --filter @agentic-rag/web test

# 运行测试并监听变化
pnpm --filter @agentic-rag/web test:watch
```

---

## 5. 根 package.json 配置

```json
{
  "name": "agentic-rag",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @agentic-rag/web dev",
    "build": "pnpm --filter @agentic-rag/web build",
    "test": "pnpm --filter @agentic-rag/web test",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "eslint": "^9.x",
    "prettier": "^3.x",
    "typescript": "^5.x"
  }
}
```

---

## 6. Web 应用 package.json 配置

```json
{
  "name": "@agentic-rag/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server/index.ts",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    // 后端
    "hono": "^4.x",
    "@hono/node-server": "^1.x",
    "better-sqlite3": "^11.x",
    "zod": "^3.x",
    "pino": "^9.x",
    "nanoid": "^5.x",

    // 前端
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^7.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "tailwindcss": "^4.x",
    "tsx": "^4.x",
    "typescript": "^5.x",
    "vite": "^6.x",
    "vitest": "^2.x"
  }
}
```

---

## 7. 环境变量配置

创建 `.env` 文件（基于 `.env.example`）：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库
DATABASE_PATH=./data/agentic-rag.db

# 向量数据库
QDRANT_URL=http://localhost:6333

# AI 服务
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# 认证（MVP 阶段简化）
API_KEY=your-api-key

# 嵌入模型
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

---

## 8. 验证清单

### 8.1 环境验证

- [ ] Node.js >= 20.0.0
- [ ] pnpm >= 9.0.0
- [ ] Docker >= 24.0.0（用于 Qdrant）

### 8.2 基础设施验证

- [ ] Qdrant 可连接（端口 6333）
- [ ] SQLite 数据库文件可创建

### 8.3 项目验证

- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 可启动开发服务器
- [ ] `pnpm test` 测试通过
- [ ] 访问 http://localhost:3000 显示前端页面
- [ ] 访问 http://localhost:3000/api/v1/health 返回健康状态

---

## 9. 常见问题

### Q: 为什么使用 SQLite 而不是 PostgreSQL？

A: MVP 阶段使用 SQLite 简化部署，无需额外的数据库服务。后期可迁移到 PostgreSQL。

### Q: 为什么前后端在同一个应用中？

A: 简化开发和部署。Vite 开发服务器代理 API 请求到 Hono 后端。

### Q: 如何添加新的 API 路由？

A:
1. 在 `apps/web/src/server/routes/` 创建路由文件
2. 在 `apps/web/src/server/index.ts` 注册路由

### Q: 如何运行特定测试？

A:
```bash
pnpm --filter @agentic-rag/web vitest run src/server/__tests__/assistant.service.test.ts
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 初始版本 |
| 2.0.0 | 2024-12-17 | 更新为实际项目结构（Hono/SQLite/前后端一体） |
