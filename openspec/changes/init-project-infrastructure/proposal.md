# Change: 初始化项目基础设施

## Why

项目目录结构已创建但为空，需要初始化完整的 Monorepo 基础设施，包括：
- pnpm 工作区配置
- TypeScript 配置
- 后端和前端项目骨架
- 数据库配置（SQLite + Qdrant）
- Docker 开发环境
- 代码规范工具

这是所有后续开发的基础，必须先完成。

## What Changes

### 新增内容

- **根目录配置**
  - `package.json` - 根 package.json，定义工作区脚本
  - `pnpm-workspace.yaml` - pnpm 工作区配置
  - `turbo.json` - Turborepo 构建配置
  - `tsconfig.base.json` - 基础 TypeScript 配置
  - `.gitignore` - Git 忽略规则
  - `.env.example` - 环境变量示例
  - `README.md` - 项目说明文档

- **后端项目** (`apps/web/src/server/`)
  - Hono Web 框架配置
  - SQLite 数据库配置（better-sqlite3）
  - 数据库 Schema 定义
  - 基础中间件（日志、错误处理）
  - 健康检查端点

- **前端项目** (`apps/web/src/client/`)
  - Vite + React 配置
  - Tailwind CSS 配置
  - 基础布局组件

- **共享包** (`packages/shared/`)
  - 共享类型定义
  - 共享常量

- **Docker 配置**
  - `docker-compose.yml` - Qdrant 向量数据库

- **代码规范**
  - ESLint 配置
  - Prettier 配置
  - VSCode 配置

## Impact

- **Affected specs**: 无（这是基础设施，不涉及业务功能）
- **Affected code**: 
  - `apps/web/` - 主应用
  - `packages/shared/` - 共享包
  - 根目录配置文件

## Dependencies

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker >= 24.0.0（用于 Qdrant）

## References

- [PROJECT-SETUP.md](../../spec/design/PROJECT-SETUP.md)
- [DEV-ENVIRONMENT.md](../../spec/design/DEV-ENVIRONMENT.md)
- [ARCHITECTURE-DESIGN.md](../../spec/design/ARCHITECTURE-DESIGN.md)