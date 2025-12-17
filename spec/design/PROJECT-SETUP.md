# 项目初始化指南

> **版本**: 1.0.0  
> **状态**: Draft  
> **最后更新**: 2024-12-16

---

## 1. 概述

本文档定义 AgentX Agentic RAG 系统的项目结构、技术栈和初始化步骤。

### 相关文档

| 文档 | 描述 |
|------|------|
| [技术架构](./TECHNICAL-ARCHITECTURE.md) | 系统架构设计 |
| [数据模型](./DATA-MODEL.md) | 数据库设计 |
| [API 参考](./API-REFERENCE.md) | API 接口定义 |

---

## 2. 项目结构

### 2.1 Monorepo 结构

```
agentic-rag/
├── packages/
│   ├── backend/                 # 后端服务
│   │   ├── src/
│   │   │   ├── api/             # API 路由层
│   │   │   │   ├── routes/      # 路由定义
│   │   │   │   ├── middlewares/ # 中间件
│   │   │   │   └── validators/  # 请求验证
│   │   │   ├── services/        # 业务服务层
│   │   │   │   ├── assistant/   # 助手服务
│   │   │   │   ├── document/    # 文档服务
│   │   │   │   ├── conversation/# 对话服务
│   │   │   │   └── role/        # 角色服务
│   │   │   ├── agents/          # AgentX 集成
│   │   │   │   ├── runtime/     # Agent 运行时
│   │   │   │   └── tools/       # Agent 工具
│   │   │   ├── promptx/         # PromptX 集成
│   │   │   │   ├── mcp/         # MCP 协议
│   │   │   │   ├── roles/       # 角色管理
│   │   │   │   └── memory/      # 记忆系统
│   │   │   ├── processing/      # 文档处理
│   │   │   │   ├── extractors/  # 文本提取器
│   │   │   │   ├── chunkers/    # 分块器
│   │   │   │   └── embedders/   # 嵌入生成
│   │   │   ├── retrieval/       # 向量检索
│   │   │   │   ├── qdrant/      # Qdrant 客户端
│   │   │   │   └── search/      # 搜索逻辑
│   │   │   ├── models/          # 数据模型
│   │   │   │   └── prisma/      # Prisma 客户端
│   │   │   ├── config/          # 配置管理
│   │   │   ├── utils/           # 工具函数
│   │   │   └── index.ts         # 入口文件
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 数据库 Schema
│   │   │   ├── migrations/      # 迁移文件
│   │   │   └── seed.ts          # 种子数据
│   │   ├── tests/               # 测试文件
│   │   │   ├── unit/            # 单元测试
│   │   │   ├── integration/     # 集成测试
│   │   │   └── e2e/             # 端到端测试
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── frontend/                # 前端应用
│   │   ├── src/
│   │   │   ├── components/      # UI 组件
│   │   │   │   ├── common/      # 通用组件
│   │   │   │   ├── assistant/   # 助手相关组件
│   │   │   │   ├── document/    # 文档相关组件
│   │   │   │   ├── conversation/# 对话相关组件
│   │   │   │   └── layout/      # 布局组件
│   │   │   ├── pages/           # 页面
│   │   │   │   ├── Home/
│   │   │   │   ├── Assistant/
│   │   │   │   ├── Document/
│   │   │   │   └── Conversation/
│   │   │   ├── hooks/           # 自定义 Hooks
│   │   │   ├── services/        # API 服务
│   │   │   ├── stores/          # 状态管理
│   │   │   ├── types/           # 类型定义
│   │   │   ├── utils/           # 工具函数
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   └── shared/                  # 共享代码
│       ├── src/
│       │   ├── types/           # 共享类型
│       │   ├── constants/       # 共享常量
│       │   └── utils/           # 共享工具
│       └── package.json
│
├── spec/                        # 规格文档（已有）
│   ├── SPEC-*.md
│   ├── design/
│   └── features/
│
├── docker/                      # Docker 配置
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
├── scripts/                     # 脚本工具
│   ├── setup.sh                 # 初始化脚本
│   ├── dev.sh                   # 开发启动脚本
│   └── deploy.sh                # 部署脚本
│
├── .github/                     # GitHub 配置
│   └── workflows/
│       ├── ci.yml               # CI 流程
│       └── cd.yml               # CD 流程
│
├── package.json                 # 根 package.json
├── pnpm-workspace.yaml          # pnpm 工作区配置
├── turbo.json                   # Turborepo 配置
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. 技术栈

### 3.1 后端技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 运行时 | Node.js | 20.x LTS | JavaScript 运行环境 |
| 语言 | TypeScript | 5.x | 类型安全 |
| Web 框架 | Fastify | 4.x | HTTP 服务器 |
| ORM | Prisma | 5.x | 数据库访问 |
| 验证 | Zod | 3.x | 请求验证 |
| 日志 | Pino | 8.x | 结构化日志 |
| 测试 | Vitest | 1.x | 单元测试 |
| 向量数据库 | @qdrant/js-client-rest | 1.x | Qdrant 客户端 |
| AI SDK | @anthropic-ai/sdk | 0.x | Claude API |
| 嵌入 | openai | 4.x | OpenAI Embeddings |

### 3.2 前端技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.x | UI 框架 |
| 构建 | Vite | 5.x | 构建工具 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 状态管理 | TanStack Query | 5.x | 服务端状态 |
| 状态管理 | Zustand | 4.x | 客户端状态 |
| 样式 | Tailwind CSS | 3.x | CSS 框架 |
| UI 组件 | shadcn/ui | - | 组件库 |
| 路由 | React Router | 6.x | 路由管理 |
| 表单 | React Hook Form | 7.x | 表单处理 |
| 图标 | Lucide React | - | 图标库 |

### 3.3 基础设施

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 主数据库 | PostgreSQL | 15.x | 关系数据存储 |
| 向量数据库 | Qdrant | 1.x | 向量存储和检索 |
| 缓存 | Redis | 7.x | 缓存和会话 |
| 包管理 | pnpm | 8.x | 包管理器 |
| Monorepo | Turborepo | 1.x | 构建系统 |
| 容器 | Docker | 24.x | 容器化 |

---

## 4. 初始化步骤

### 4.1 环境要求

```bash
# 检查 Node.js 版本
node --version  # 需要 >= 20.0.0

# 检查 pnpm 版本
pnpm --version  # 需要 >= 8.0.0

# 检查 Docker 版本
docker --version  # 需要 >= 24.0.0
```

### 4.2 创建项目结构

```bash
# 1. 创建根目录结构
mkdir -p packages/{backend,frontend,shared}
mkdir -p docker scripts .github/workflows

# 2. 初始化根 package.json
pnpm init

# 3. 创建 pnpm 工作区配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# 4. 创建 Turborepo 配置
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
EOF
```

### 4.3 初始化后端

```bash
cd packages/backend

# 1. 初始化 package.json
pnpm init

# 2. 安装依赖
pnpm add fastify @fastify/cors @fastify/multipart @fastify/websocket
pnpm add @prisma/client zod pino pino-pretty
pnpm add @qdrant/js-client-rest @anthropic-ai/sdk openai
pnpm add dotenv

# 3. 安装开发依赖
pnpm add -D typescript @types/node tsx vitest
pnpm add -D prisma eslint prettier

# 4. 初始化 TypeScript
npx tsc --init

# 5. 初始化 Prisma
npx prisma init
```

### 4.4 初始化前端

```bash
cd packages/frontend

# 1. 使用 Vite 创建 React 项目
pnpm create vite . --template react-ts

# 2. 安装依赖
pnpm add @tanstack/react-query zustand react-router-dom
pnpm add react-hook-form @hookform/resolvers zod
pnpm add lucide-react clsx tailwind-merge

# 3. 安装开发依赖
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D @types/react @types/react-dom

# 4. 初始化 Tailwind
npx tailwindcss init -p
```

### 4.5 配置环境变量

```bash
# 创建 .env.example
cat > .env.example << 'EOF'
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/agentic_rag

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Claude API
ANTHROPIC_API_KEY=your-api-key

# OpenAI (用于 Embeddings)
OPENAI_API_KEY=your-api-key

# 应用配置
NODE_ENV=development
PORT=3000
API_KEY=your-api-key

# 前端
VITE_API_URL=http://localhost:3000/api/v1
EOF
```

### 4.6 启动基础设施

```bash
# 创建 docker-compose.yml
cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: agentic-rag-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: agentic_rag
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: agentic-rag-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    container_name: agentic-rag-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
EOF

# 启动服务
docker-compose -f docker/docker-compose.yml up -d
```

---

## 5. 根 package.json 配置

```json
{
  "name": "agentic-rag",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:migrate": "turbo run db:migrate --filter=backend",
    "db:seed": "turbo run db:seed --filter=backend",
    "docker:up": "docker-compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker-compose -f docker/docker-compose.yml down",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.13.0"
  }
}
```

---

## 6. 后端 package.json 配置

```json
{
  "name": "@agentic-rag/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/multipart": "^8.0.0",
    "@fastify/websocket": "^10.0.0",
    "@prisma/client": "^5.10.0",
    "@qdrant/js-client-rest": "^1.8.0",
    "dotenv": "^16.4.0",
    "fastify": "^4.26.0",
    "openai": "^4.28.0",
    "pino": "^8.19.0",
    "pino-pretty": "^10.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.3.0"
  }
}
```

---

## 7. 前端 package.json 配置

```json
{
  "name": "@agentic-rag/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.0",
    "@tanstack/react-query": "^5.24.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.51.0",
    "react-router-dom": "^6.22.0",
    "tailwind-merge": "^2.2.0",
    "zod": "^3.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```

---

## 8. 验证清单

### 8.1 环境验证

- [ ] Node.js >= 20.0.0
- [ ] pnpm >= 8.0.0
- [ ] Docker >= 24.0.0
- [ ] Docker Compose 可用

### 8.2 基础设施验证

- [ ] PostgreSQL 可连接（端口 5432）
- [ ] Redis 可连接（端口 6379）
- [ ] Qdrant 可连接（端口 6333）

### 8.3 项目验证

- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 可启动
- [ ] 数据库迁移成功
- [ ] API 健康检查通过

---

## 9. 下一步

1. 按照本文档创建项目结构
2. 参考 [开发环境配置](./DEV-ENVIRONMENT.md) 配置开发环境
3. 参考 [实现路线图](./IMPLEMENTATION-ROADMAP.md) 开始开发

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 初始版本 |