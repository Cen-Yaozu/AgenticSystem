# Tasks: 初始化项目基础设施

## 1. 根目录配置

- [ ] 1.1 创建根 `package.json`
  - 定义 name: "agentic-rag"
  - 定义 scripts: dev, build, lint, test, docker:up, docker:down
  - 添加 devDependencies: turbo, typescript

- [ ] 1.2 创建 `pnpm-workspace.yaml`
  - 配置 packages: ['apps/*', 'packages/*']

- [ ] 1.3 创建 `turbo.json`
  - 配置 pipeline: build, dev, lint, test
  - 配置 globalDependencies

- [ ] 1.4 创建 `tsconfig.base.json`
  - 配置 target: ES2022
  - 配置 strict: true
  - 配置 moduleResolution: bundler

- [ ] 1.5 创建 `.gitignore`
  - 忽略 node_modules, dist, .turbo
  - 忽略 .env, *.db
  - 忽略 IDE 文件

- [ ] 1.6 创建 `.env.example`
  - 数据库配置
  - AI 服务配置（ANTHROPIC_API_KEY, OPENAI_API_KEY）
  - 应用配置（PORT, JWT_SECRET）

## 2. 后端项目初始化

- [ ] 2.1 创建 `apps/web/package.json`
  - 定义 name: "@agentic-rag/web"
  - 添加 dependencies: hono, better-sqlite3, zod, pino
  - 添加 devDependencies: typescript, tsx, vitest

- [ ] 2.2 创建 `apps/web/tsconfig.json`
  - 继承 tsconfig.base.json
  - 配置 outDir, rootDir

- [ ] 2.3 创建后端入口 `apps/web/src/server/index.ts`
  - 初始化 Hono 应用
  - 配置 CORS
  - 配置日志中间件
  - 添加健康检查端点 `/health`

- [ ] 2.4 创建数据库配置 `apps/web/src/server/database/index.ts`
  - 初始化 better-sqlite3
  - 配置数据库路径 `data/agentic-rag.db`

- [ ] 2.5 创建数据库 Schema `apps/web/src/server/database/schema.ts`
  - 定义 users 表
  - 定义 assistants 表
  - 定义 documents 表
  - 定义 conversations 表
  - 定义 messages 表
  - 定义 roles 表
  - 定义 memories 表

- [ ] 2.6 创建数据库初始化脚本 `apps/web/src/server/database/migrate.ts`
  - 执行 Schema 创建
  - 创建索引

- [ ] 2.7 创建错误处理中间件 `apps/web/src/server/middleware/error.ts`
  - 统一错误响应格式
  - 错误日志记录

- [ ] 2.8 创建日志中间件 `apps/web/src/server/middleware/logger.ts`
  - 使用 Pino 记录请求日志

- [ ] 2.9 创建工具函数 `apps/web/src/server/utils/`
  - `id.ts` - ID 生成（nanoid）
  - `response.ts` - 统一响应格式

## 3. 前端项目初始化

- [ ] 3.1 创建 Vite 配置 `apps/web/vite.config.ts`
  - 配置 React 插件
  - 配置代理到后端

- [ ] 3.2 创建 `apps/web/index.html`
  - HTML 模板

- [ ] 3.3 创建前端入口 `apps/web/src/client/main.tsx`
  - React 渲染入口

- [ ] 3.4 创建 App 组件 `apps/web/src/client/App.tsx`
  - 基础路由配置
  - 布局组件

- [ ] 3.5 创建 Tailwind 配置 `apps/web/tailwind.config.ts`
  - 配置 content 路径
  - 配置主题

- [ ] 3.6 创建全局样式 `apps/web/src/client/index.css`
  - Tailwind 指令
  - 基础样式

## 4. 共享包初始化

- [ ] 4.1 创建 `packages/shared/package.json`
  - 定义 name: "@agentic-rag/shared"
  - 配置 exports

- [ ] 4.2 创建 `packages/shared/tsconfig.json`
  - 继承 tsconfig.base.json

- [ ] 4.3 创建共享类型 `packages/shared/src/types/index.ts`
  - Assistant 类型
  - Document 类型
  - Conversation 类型
  - Message 类型
  - API 响应类型

- [ ] 4.4 创建共享常量 `packages/shared/src/constants/index.ts`
  - 文件类型常量
  - 状态常量
  - 错误码常量

## 5. Docker 配置

- [ ] 5.1 创建 `docker-compose.yml`
  - Qdrant 向量数据库服务
  - 配置端口映射 6333:6333
  - 配置数据卷

- [ ] 5.2 创建 `data/` 目录
  - 创建 `.gitkeep` 保留目录
  - 添加到 `.gitignore`（忽略 *.db 文件）

## 6. 代码规范配置

- [ ] 6.1 创建 ESLint 配置 `eslint.config.js`
  - TypeScript 规则
  - React 规则

- [ ] 6.2 创建 Prettier 配置 `.prettierrc`
  - 配置 semi, singleQuote, tabWidth

- [ ] 6.3 创建 `.prettierignore`
  - 忽略 dist, node_modules

- [ ] 6.4 创建 VSCode 配置 `.vscode/settings.json`
  - 配置 formatOnSave
  - 配置 ESLint 自动修复

- [ ] 6.5 创建 VSCode 扩展推荐 `.vscode/extensions.json`
  - 推荐 ESLint, Prettier, Tailwind CSS

## 7. 文档和验证

- [ ] 7.1 创建 `README.md`
  - 项目介绍
  - 快速开始指南
  - 开发命令说明

- [ ] 7.2 验证项目可运行
  - `pnpm install` 成功
  - `pnpm dev` 可启动
  - 健康检查端点可访问
  - Docker Qdrant 可启动

## 验收标准

- [ ] `pnpm install` 无错误
- [ ] `pnpm dev` 可启动后端服务
- [ ] `curl http://localhost:3000/health` 返回 200
- [ ] `docker-compose up -d` 可启动 Qdrant
- [ ] `pnpm lint` 无错误
- [ ] 数据库文件 `data/agentic-rag.db` 可创建