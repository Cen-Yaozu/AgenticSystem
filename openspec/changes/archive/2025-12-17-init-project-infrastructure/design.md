# Design: 项目基础设施架构

## Context

AgentX Agentic RAG 是一个智能助手平台，需要建立可扩展的项目基础设施。本设计文档记录关键的技术决策和架构选择。

### 约束条件

- MVP 阶段，优先简单可用
- 单开发者/小团队
- 需要支持后续扩展（多租户、分布式）

## Goals / Non-Goals

### Goals
- 建立可运行的 Monorepo 项目结构
- 配置开发环境和工具链
- 初始化数据库 Schema
- 提供 Docker 开发环境

### Non-Goals
- 生产环境部署配置
- CI/CD 流水线（后续迭代）
- 完整的测试框架（后续迭代）

## Decisions

### 1. 项目结构：前后端一体 vs 分离

**决策**: 采用前后端一体的 `apps/web` 结构

**理由**:
- MVP 阶段简化部署
- 共享类型定义更方便
- 参考 Agent 项目的成功实践

**替代方案**:
- `packages/backend` + `packages/frontend` 分离
- 优点：边界清晰
- 缺点：增加配置复杂度

### 2. 数据库：SQLite vs PostgreSQL

**决策**: MVP 使用 SQLite（better-sqlite3）

**理由**:
- 零配置，无需额外服务
- 单文件，便于开发和测试
- better-sqlite3 性能优秀
- 后续可迁移到 PostgreSQL

**替代方案**:
- 直接使用 PostgreSQL
- 优点：生产就绪
- 缺点：需要 Docker 或本地安装

### 3. ORM：Prisma vs 原生 SQL

**决策**: 使用原生 SQL + 类型定义

**理由**:
- SQLite 不需要复杂 ORM
- 更直接的控制
- 减少依赖

**替代方案**:
- 使用 Prisma
- 优点：类型安全、迁移管理
- 缺点：SQLite 支持有限，增加复杂度

### 4. Web 框架：Hono vs Fastify

**决策**: 使用 Hono

**理由**:
- 轻量（14KB）
- TypeScript 原生
- 与 Agent 项目一致
- 支持多运行时

**替代方案**:
- Fastify
- 优点：生态丰富、插件多
- 缺点：体积较大

### 5. 向量数据库：Qdrant

**决策**: 使用 Qdrant（Docker 部署）

**理由**:
- 专业向量数据库
- REST API 简单易用
- 支持过滤查询
- 社区活跃

**替代方案**:
- ChromaDB：更轻量但功能较少
- Pinecone：云服务，需要付费

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite 并发限制 | 中 | MVP 阶段可接受，后续迁移 PostgreSQL |
| 无 ORM 类型安全 | 低 | 手动定义类型，编写测试 |
| 前后端耦合 | 低 | 通过 shared 包隔离类型 |

## Migration Plan

### 从 SQLite 迁移到 PostgreSQL

1. 创建 PostgreSQL Schema（与 SQLite 兼容）
2. 编写数据迁移脚本
3. 更新数据库连接配置
4. 测试所有功能
5. 切换生产环境

### 从一体到分离

1. 将 `apps/web/src/server` 提取到 `packages/backend`
2. 将 `apps/web/src/client` 提取到 `packages/frontend`
3. 更新构建配置
4. 配置 API 代理

## Open Questions

- [ ] 是否需要 Redis 缓存？（MVP 阶段暂不需要）
- [ ] 是否需要消息队列？（文档处理可能需要，后续评估）

## File Structure

```
agentic-rag/
├── apps/
│   └── web/                      # 主应用
│       ├── src/
│       │   ├── client/           # 前端
│       │   │   ├── components/
│       │   │   ├── App.tsx
│       │   │   └── main.tsx
│       │   └── server/           # 后端
│       │       ├── api/
│       │       ├── database/
│       │       ├── middleware/
│       │       ├── utils/
│       │       └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
├── packages/
│   └── shared/                   # 共享代码
│       ├── src/
│       │   ├── types/
│       │   └── constants/
│       └── package.json
├── data/                         # 数据目录
│   └── .gitkeep
├── docker-compose.yml            # Qdrant
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── .gitignore
├── .env.example
└── README.md