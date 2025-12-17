# 开发环境配置指南

> **版本**: 2.0.0
> **状态**: Draft
> **最后更新**: 2024-12-17

---

## 1. 概述

本文档定义 AgentX Agentic RAG 系统的开发环境配置，包括环境变量、IDE 配置、调试设置和开发工作流。

> **注意**: 本文档已更新以反映实际项目配置。

### 相关文档

| 文档 | 描述 |
|------|------|
| [项目初始化](./PROJECT-SETUP.md) | 项目结构和初始化 |
| [技术架构](./TECHNICAL-ARCHITECTURE.md) | 系统架构设计 |
| [Agentic 架构](./AGENTIC-ARCHITECTURE.md) | 多角色架构设计 |
| [API 参考](./API-REFERENCE.md) | API 接口定义 |

---

## 2. 环境变量配置

### 2.1 环境变量文件

项目根目录的 `.env` 文件（基于 `.env.example`）：

```bash
# ============================================
# 服务器配置
# ============================================

# 运行环境
NODE_ENV=development

# 服务端口
PORT=3000

# ============================================
# 数据库配置
# ============================================

# SQLite 数据库路径
DATABASE_PATH=./data/agentic-rag.db

# ============================================
# 向量数据库配置
# ============================================

# Qdrant 服务地址
QDRANT_URL=http://localhost:6333

# Qdrant Collection 名称
QDRANT_COLLECTION_NAME=document_vectors

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
EMBEDDING_MODEL=text-embedding-3-small

# Embedding 维度
EMBEDDING_DIMENSIONS=1536

# ============================================
# 认证配置（MVP 简化）
# ============================================

# API Key（MVP 阶段使用固定 Key）
API_KEY=your-api-key

# JWT 密钥（后期使用）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# ============================================
# 日志配置
# ============================================

# 日志级别
LOG_LEVEL=debug

# ============================================
# 文件上传配置
# ============================================

# 最大文件大小（字节，默认 10MB）
MAX_FILE_SIZE=10485760

# 允许的文件类型
ALLOWED_FILE_TYPES=pdf,docx,txt,md,xlsx

# 上传文件目录
UPLOAD_DIR=./data/uploads

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
```

### 2.2 环境变量说明

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `NODE_ENV` | 否 | development | 运行环境 |
| `PORT` | 否 | 3000 | 服务端口 |
| `DATABASE_PATH` | 否 | ./data/agentic-rag.db | SQLite 数据库路径 |
| `QDRANT_URL` | 否 | http://localhost:6333 | Qdrant 服务地址 |
| `ANTHROPIC_API_KEY` | **是** | - | Claude API Key |
| `OPENAI_API_KEY` | **是** | - | OpenAI API Key（Embeddings） |
| `API_KEY` | **是** | - | API 认证 Key |

### 2.3 获取 API Key

#### Anthropic (Claude)

1. 访问 https://console.anthropic.com/
2. 创建账户并登录
3. 在 API Keys 页面创建新的 Key
4. 复制 Key 到 `.env` 文件

#### OpenAI (Embeddings)

1. 访问 https://platform.openai.com/
2. 创建账户并登录
3. 在 API Keys 页面创建新的 Key
4. 复制 Key 到 `.env` 文件

---

## 3. IDE 配置

### 3.1 VSCode 配置

项目已包含 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/data": true
  }
}
```

### 3.2 推荐扩展

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense"
  ]
}
```

### 3.3 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@agentic-rag/web", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@agentic-rag/web", "test"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@agentic-rag/web", "vitest", "run", "${relativeFile}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 4. 代码规范配置

### 4.1 ESLint 配置

项目使用 ESLint 9.x 扁平配置（`eslint.config.js`）：

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

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
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/data/**'],
  },
];
```

### 4.2 Prettier 配置

`.prettierrc`：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

`.prettierignore`：

```
node_modules
dist
data
*.md
pnpm-lock.yaml
```

---

## 5. 开发工作流

### 5.1 启动开发环境

```bash
# 1. 启动 Qdrant（首次或需要时）
docker-compose up -d qdrant

# 2. 启动开发服务器
pnpm dev

# 开发服务器将在 http://localhost:3000 启动
# - 前端页面: http://localhost:3000
# - API 端点: http://localhost:3000/api/v1/*
# - 健康检查: http://localhost:3000/api/v1/health
```

### 5.2 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm --filter @agentic-rag/web test:watch

# 运行特定测试文件
pnpm --filter @agentic-rag/web vitest run src/server/__tests__/assistant.service.test.ts
```

### 5.3 代码检查

```bash
# ESLint 检查
pnpm lint

# Prettier 格式化
pnpm format
```

### 5.4 构建

```bash
# 构建生产版本
pnpm build
```

---

## 6. Docker 配置

### 6.1 docker-compose.yml

```yaml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: agentic-rag-qdrant
    ports:
      - "6333:6333"    # REST API
      - "6334:6334"    # gRPC
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  qdrant_data:
```

### 6.2 Docker 命令

```bash
# 启动 Qdrant
docker-compose up -d qdrant

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f qdrant

# 停止
docker-compose down

# 停止并删除数据
docker-compose down -v
```

---

## 7. 数据库管理

### 7.1 SQLite 数据库

数据库文件位于 `data/agentic-rag.db`，首次启动时自动创建。

```bash
# 查看数据库（需要安装 sqlite3）
sqlite3 data/agentic-rag.db

# 常用命令
.tables          # 列出所有表
.schema users    # 查看表结构
SELECT * FROM assistants;  # 查询数据
.quit            # 退出
```

### 7.2 重置数据库

```bash
# 删除数据库文件（会在下次启动时重新创建）
rm data/agentic-rag.db*
```

---

## 8. API 测试

### 8.1 使用 curl 测试

```bash
# 健康检查
curl http://localhost:3000/api/v1/health

# 创建助手（需要 API Key）
curl -X POST http://localhost:3000/api/v1/assistants \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"name": "测试助手", "description": "这是一个测试助手"}'

# 获取助手列表
curl http://localhost:3000/api/v1/assistants \
  -H "X-API-Key: your-api-key"
```

### 8.2 使用 HTTPie 测试

```bash
# 安装 HTTPie
brew install httpie  # macOS

# 健康检查
http GET localhost:3000/api/v1/health

# 创建助手
http POST localhost:3000/api/v1/assistants \
  X-API-Key:your-api-key \
  name="测试助手" \
  description="这是一个测试助手"
```

---

## 9. 常见问题

### Q: 端口 3000 被占用怎么办？

A:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT
```

### Q: Qdrant 连接失败怎么办？

A:
```bash
# 检查 Qdrant 是否运行
docker-compose ps

# 重启 Qdrant
docker-compose restart qdrant

# 查看日志
docker-compose logs qdrant
```

### Q: 数据库锁定错误怎么办？

A: SQLite 在高并发时可能出现锁定。解决方案：
1. 确保只有一个开发服务器在运行
2. 重启开发服务器
3. 如果问题持续，删除 `.db-shm` 和 `.db-wal` 文件

### Q: 如何查看详细日志？

A: 设置环境变量 `LOG_LEVEL=debug`，或在代码中使用 logger：
```typescript
import { logger } from './utils/logger';
logger.debug('调试信息');
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-12-16 | 初始版本 |
| 2.0.0 | 2024-12-17 | 更新为实际项目配置（SQLite/Hono/简化认证） |
