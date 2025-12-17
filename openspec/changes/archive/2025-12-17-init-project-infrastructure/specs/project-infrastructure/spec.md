## ADDED Requirements

### Requirement: 项目结构初始化

系统 SHALL 提供完整的 Monorepo 项目结构，包括根目录配置、应用目录和共享包目录。

#### Scenario: 项目目录结构完整
- **GIVEN** 项目已初始化
- **WHEN** 检查项目结构
- **THEN** 应存在 `apps/web/` 目录
- **AND** 应存在 `packages/shared/` 目录
- **AND** 应存在根目录配置文件（package.json, pnpm-workspace.yaml, turbo.json）

#### Scenario: pnpm 工作区配置正确
- **GIVEN** 项目已初始化
- **WHEN** 执行 `pnpm install`
- **THEN** 安装应成功完成
- **AND** 所有工作区包应被正确链接

---

### Requirement: 后端服务启动

系统 SHALL 提供可运行的后端服务，使用 Hono 框架，支持健康检查。

#### Scenario: 后端服务可启动
- **GIVEN** 项目依赖已安装
- **WHEN** 执行 `pnpm dev`
- **THEN** 后端服务应在端口 3000 启动
- **AND** 控制台应显示启动成功信息

#### Scenario: 健康检查端点可访问
- **GIVEN** 后端服务正在运行
- **WHEN** 请求 `GET /health`
- **THEN** 应返回 HTTP 200
- **AND** 响应体应包含 `{ "status": "ok" }`

---

### Requirement: 数据库初始化

系统 SHALL 使用 SQLite 数据库，自动创建所需的表结构。

#### Scenario: 数据库文件自动创建
- **GIVEN** 后端服务首次启动
- **WHEN** 数据库初始化完成
- **THEN** 应在 `data/` 目录创建 `agentic-rag.db` 文件

#### Scenario: 数据库表结构完整
- **GIVEN** 数据库已初始化
- **WHEN** 查询数据库表
- **THEN** 应存在 users 表
- **AND** 应存在 assistants 表
- **AND** 应存在 documents 表
- **AND** 应存在 conversations 表
- **AND** 应存在 messages 表

---

### Requirement: Docker 开发环境

系统 SHALL 提供 Docker Compose 配置，用于启动 Qdrant 向量数据库。

#### Scenario: Qdrant 服务可启动
- **GIVEN** Docker 已安装
- **WHEN** 执行 `docker-compose up -d`
- **THEN** Qdrant 服务应在端口 6333 启动
- **AND** Qdrant Web UI 应可访问

---

### Requirement: 代码规范工具

系统 SHALL 配置 ESLint 和 Prettier，确保代码风格一致。

#### Scenario: ESLint 检查通过
- **GIVEN** 项目代码符合规范
- **WHEN** 执行 `pnpm lint`
- **THEN** 检查应通过，无错误

#### Scenario: Prettier 格式化生效
- **GIVEN** VSCode 已配置
- **WHEN** 保存文件
- **THEN** 文件应自动格式化