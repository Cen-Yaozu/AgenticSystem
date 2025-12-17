# 开发环境配置指南

> **版本**: 1.0.0  
> **状态**: Draft  
> **最后更新**: 2024-12-16

---

## 1. 概述

本文档定义 AgentX Agentic RAG 系统的开发环境配置，包括环境变量、IDE 配置、调试设置和开发工作流。

### 相关文档

| 文档 | 描述 |
|------|------|
| [项目初始化](./PROJECT-SETUP.md) | 项目结构和初始化 |
| [技术架构](./TECHNICAL-ARCHITECTURE.md) | 系统架构设计 |
| [API 参考](./API-REFERENCE.md) | API 接口定义 |

---

## 2. 环境变量配置

### 2.1 后端环境变量

创建 `packages/backend/.env` 文件：

```bash
# ============================================
# 数据库配置
# ============================================

# PostgreSQL 连接字符串
DATABASE_URL=postgresql://user:password@localhost:5432/agentic_rag

# Redis 连接字符串
REDIS_URL=redis://localhost:6379

# ============================================
# 向量数据库配置
# ============================================

# Qdrant 服务地址
QDRANT_URL=http://localhost:6333

# Qdrant API Key（可选，本地开发可留空）
QDRANT_API_KEY=

# Qdrant Collection 名称
QDRANT_COLLECTION_NAME=agentic_rag_documents

# ============================================
# AI 服务配置
# ============================================

# Claude API Key
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Claude 模型名称
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# OpenAI API Key（用于 Embeddings）
OPENAI_API_KEY=sk-xxxxx

# OpenAI Embedding 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Embedding 维度
EMBEDDING_DIMENSION=1536

# ============================================
# 应用配置
# ============================================

# 运行环境
NODE_ENV=development

# 服务端口
PORT=3000

# API 前缀
API_PREFIX=/api/v1

# 日志级别
LOG_LEVEL=debug

# ============================================
# 安全配置
# ============================================

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# JWT 过期时间
JWT_EXPIRES_IN=7d

# Refresh Token 过期时间
REFRESH_TOKEN_EXPIRES_IN=30d

# API Key（用于服务间通信）
API_KEY=your-api-key

# ============================================
# 文件上传配置
# ============================================

# 最大文件大小（字节）
MAX_FILE_SIZE=10485760

# 允许的文件类型
ALLOWED_FILE_TYPES=pdf,docx,txt,md,xlsx

# 临时文件目录
TEMP_DIR=./temp

# ============================================
# 文档处理配置
# ============================================

# 分块大小（字符数）
CHUNK_SIZE=1000

# 分块重叠（字符数）
CHUNK_OVERLAP=200

# 检索 Top K
RETRIEVAL_TOP_K=5

# 检索相似度阈值
RETRIEVAL_THRESHOLD=0.7

# ============================================
# PromptX MCP 配置
# ============================================

# PromptX MCP 服务地址
PROMPTX_MCP_URL=http://localhost:3001

# PromptX 默认角色
PROMPTX_DEFAULT_ROLE=coordinator
```

### 2.2 前端环境变量

创建 `packages/frontend/.env` 文件：

```bash
# API 服务地址
VITE_API_URL=http://localhost:3000/api/v1

# WebSocket 地址
VITE_WS_URL=ws://localhost:3000

# 应用名称
VITE_APP_NAME=AgentX Agentic RAG

# 应用版本
VITE_APP_VERSION=0.1.0
```

### 2.3 环境变量验证

后端启动时验证必需的环境变量：

```typescript
// packages/backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  // 向量数据库
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION_NAME: z.string().default('agentic_rag_documents'),
  
  // AI 服务
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSION: z.coerce.number().default(1536),
  
  // 应用
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // 安全
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  
  // 文件上传
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  ALLOWED_FILE_TYPES: z.string().default('pdf,docx,txt,md,xlsx'),
  
  // 文档处理
  CHUNK_SIZE: z.coerce.number().default(1000),
  CHUNK_OVERLAP: z.coerce.number().default(200),
  RETRIEVAL_TOP_K: z.coerce.number().default(5),
  RETRIEVAL_THRESHOLD: z.coerce.number().default(0.7),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ 环境变量验证失败:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

export const env = validateEnv();
```

---

## 3. IDE 配置

### 3.1 VSCode 配置

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  }
}
```

创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag"
  ]
}
```

### 3.2 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "backend", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Backend Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "backend", "test"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "backend", "vitest", "run", "${relativeFile}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Debug Backend"],
      "stopAll": true
    }
  ]
}
```

---

## 4. 代码规范配置

### 4.1 ESLint 配置

创建 `eslint.config.js`（根目录）：

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['packages/frontend/**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
];
```

### 4.2 Prettier 配置

创建 `.prettierrc`：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

创建 `.prettierignore`：

```
node_modules
dist
.turbo
coverage
*.md
```

### 4.3 TypeScript 配置

创建 `tsconfig.base.json`（根目录）：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

后端 `packages/backend/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

前端 `packages/frontend/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 5. Git 配置

### 5.1 .gitignore

```gitignore
# 依赖
node_modules/
.pnpm-store/

# 构建产物
dist/
build/
.turbo/

# 环境变量
.env
.env.local
.env.*.local

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json
.idea/

# 日志
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# 测试
coverage/

# 临时文件
temp/
tmp/
*.tmp

# 系统文件
.DS_Store
Thumbs.db

# Prisma
packages/backend/prisma/migrations/*_migration_lock.toml
```

### 5.2 Git Hooks（使用 Husky）

安装 Husky：

```bash
pnpm add -D husky lint-staged
npx husky init
```

创建 `.husky/pre-commit`：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

在根 `package.json` 中添加：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## 6. 开发工作流

### 6.1 日常开发流程

```bash
# 1. 启动基础设施
pnpm docker:up

# 2. 安装依赖（首次或依赖更新后）
pnpm install

# 3. 运行数据库迁移
pnpm db:migrate

# 4. 启动开发服务器
pnpm dev

# 5. 在另一个终端查看日志
docker logs -f agentic-rag-postgres
docker logs -f agentic-rag-qdrant
```

### 6.2 常用命令

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动所有开发服务器 |
| `pnpm build` | 构建所有包 |
| `pnpm test` | 运行所有测试 |
| `pnpm lint` | 运行代码检查 |
| `pnpm db:migrate` | 运行数据库迁移 |
| `pnpm db:seed` | 填充种子数据 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm docker:up` | 启动 Docker 服务 |
| `pnpm docker:down` | 停止 Docker 服务 |

### 6.3 分支策略

```
main          # 生产分支
├── develop   # 开发分支
│   ├── feature/xxx  # 功能分支
│   ├── fix/xxx      # 修复分支
│   └── refactor/xxx # 重构分支
└── release/x.x.x    # 发布分支
```

### 6.4 提交规范

使用 Conventional Commits：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(assistant): 添加助手创建功能

- 实现 POST /api/v1/assistants 接口
- 添加请求验证
- 添加单元测试

Closes #123
```

---

## 7. 调试技巧

### 7.1 后端调试

```typescript
// 使用 Pino 日志
import { logger } from './utils/logger';

logger.debug({ data }, '调试信息');
logger.info({ userId }, '用户操作');
logger.error({ error }, '错误发生');
```

### 7.2 数据库调试

```bash
# 查看数据库
pnpm db:studio

# 查看 SQL 日志（在 schema.prisma 中启用）
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}

# 重置数据库
npx prisma migrate reset
```

### 7.3 向量数据库调试

```bash
# 查看 Qdrant 集合
curl http://localhost:6333/collections

# 查看集合详情
curl http://localhost:6333/collections/agentic_rag_documents

# 搜索测试
curl -X POST http://localhost:6333/collections/agentic_rag_documents/points/search \
  -H "Content-Type: application/json" \
  -d '{"vector": [...], "limit": 5}'
```

### 7.4 API 调试

使用 VSCode REST Client 扩展，创建 `api.http`：

```http
### 健康检查
GET http://localhost:3000/health

### 创建助手
POST http://localhost:3000/api/v1/assistants
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "法律助手",
  "description": "专业的法律文档分析助手",
  "domain": "legal"
}

### 获取助手列表
GET http://localhost:3000/api/v1/assistants
Authorization: Bearer {{token}}
```

---

## 8. 故障排除

### 8.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 数据库连接失败 | Docker 未启动 | `pnpm docker:up` |
| Prisma 错误 | Schema 未同步 | `pnpm db:migrate` |
| 端口被占用 | 服务未正确关闭 | `lsof -i :3000` 然后 `kill -9 <PID>` |
| 依赖安装失败 | 缓存问题 | `pnpm store prune && pnpm install` |
| TypeScript 错误 | 类型定义过期 | `pnpm build` 重新生成 |

### 8.2 日志查看

```bash
# 后端日志
pnpm --filter backend dev 2>&1 | pnpm pino-pretty

# Docker 日志
docker logs -f agentic-rag-postgres
docker logs -f agentic-rag-redis
docker logs -f agentic-rag-qdrant
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 初始版本 |