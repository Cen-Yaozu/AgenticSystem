# Tasks: 助手工作区集成

## 实现任务

### 阶段 1：数据库迁移

- [x] **T1.1** 添加数据库迁移：`workspace_path` 字段
  - 文件：`apps/web/src/server/database/index.ts`
  - 添加迁移 `003_add_workspace_path`
  - 验证：运行迁移后，`assistants` 表有 `workspace_path` 字段

### 阶段 2：工作区服务

- [x] **T2.1** 创建工作区服务
  - 文件：`apps/web/src/server/services/workspace.service.ts`
  - 功能：
    - `createWorkspace(assistantId)` - 创建工作区目录结构
    - `deleteWorkspace(assistantId)` - 删除工作区目录
    - `getWorkspacePath(assistantId)` - 获取工作区路径
  - 验证：单元测试通过

- [x] **T2.2** 生成 MCP 配置文件
  - 在 `createWorkspace` 中生成 `mcp.json`
  - 验证：创建工作区后，`mcp.json` 文件存在且格式正确

### 阶段 3：助手服务集成

- [x] **T3.1** 修改创建助手流程
  - 文件：`apps/web/src/server/services/assistant.service.ts`
  - 在创建助手时调用 `workspaceService.createWorkspace()`
  - 保存 `workspace_path` 到数据库
  - 验证：创建助手后，工作区目录存在，数据库有 `workspace_path`

- [x] **T3.2** 修改删除助手流程
  - 在删除助手时调用 `workspaceService.deleteWorkspace()`
  - 验证：删除助手后，工作区目录被删除

### 阶段 4：API 更新

- [x] **T4.1** 更新助手 API 响应
  - 在助手详情中返回 `workspacePath`
  - 验证：API 响应包含 `workspacePath` 字段

### 阶段 5：测试

- [x] **T5.1** 更新单元测试
  - 更新 `assistant.service.test.ts`
  - 添加工作区相关测试用例
  - 验证：所有测试通过

- [x] **T5.2** 更新 API 测试
  - 更新 `assistants.api.test.ts`
  - 验证：所有测试通过

## 依赖关系

```
T1.1 (数据库迁移)
  │
  ▼
T2.1 (工作区服务) ──► T2.2 (MCP 配置)
  │
  ▼
T3.1 (创建流程) ──► T3.2 (删除流程)
  │
  ▼
T4.1 (API 更新)
  │
  ▼
T5.1 (单元测试) ──► T5.2 (API 测试)
```

## 验收标准

1. 创建助手时自动创建工作区目录
2. 工作区包含 `.promptx/resource/role/`、`documents/`、`mcp.json`
3. 删除助手时自动删除工作区目录
4. 数据库 `assistants` 表有 `workspace_path` 字段
5. 所有测试通过
