## 1. 基础设施

- [x] 1.1 添加文档相关类型定义到 `packages/shared/src/types/index.ts`
- [x] 1.2 创建 `document.repository.ts` 实现数据库操作
- [x] 1.3 创建 `document.validator.ts` 实现请求验证
- [x] 1.4 安装文档解析依赖（pdf-parse, node-xlsx, mammoth）

## 2. 文档解析器（复用 collector）

- [x] 2.1 创建 `parsers/` 目录结构
- [x] 2.2 复用并适配 `asPDF` 解析器（TypeScript 重写）
- [x] 2.3 复用并适配 `asDocx` 解析器（TypeScript 重写）
- [x] 2.4 复用并适配 `asXlsx` 解析器（TypeScript 重写）
- [x] 2.5 复用并适配 `asTxt` 解析器（TypeScript 重写）
- [x] 2.6 创建统一的 `document-parser.service.ts` 入口

## 3. Qdrant 集成

- [x] 3.1 安装 `@qdrant/js-client-rest` 依赖
- [x] 3.2 创建 `qdrant.service.ts` 实现向量数据库操作
- [x] 3.3 实现 collection 创建/删除方法
- [x] 3.4 实现向量 upsert/delete/search 方法

## 4. 文档处理服务

- [x] 4.1 创建 `document-processor.service.ts` 实现处理流水线
- [x] 4.2 实现文本提取（调用复用的解析器）
- [x] 4.3 实现文本清理和分块（1000字符/块，100字符重叠）
- [x] 4.4 实现向量化（调用 Embedding API）
- [x] 4.5 实现向量存储（调用 Qdrant 服务）
- [x] 4.6 实现重试机制（最多3次）

## 5. 文档管理服务

- [x] 5.1 创建 `document.service.ts` 实现业务逻辑
- [x] 5.2 实现文档上传（保存文件 + 创建记录 + 触发处理）
- [x] 5.3 实现文档列表查询（分页 + 筛选）
- [x] 5.4 实现文档详情查询
- [x] 5.5 实现文档删除（删除文件 + 删除向量 + 删除记录）
- [x] 5.6 实现文档重新处理

## 6. API 路由

- [x] 6.1 创建 `documents.ts` 路由文件
- [x] 6.2 实现 POST /api/assistants/:id/documents（上传）
- [x] 6.3 实现 GET /api/assistants/:id/documents（列表）
- [x] 6.4 实现 GET /api/assistants/:id/documents/:docId（详情）
- [x] 6.5 实现 DELETE /api/assistants/:id/documents/:docId（删除）
- [x] 6.6 实现 POST /api/assistants/:id/documents/:docId/reprocess（重试）
- [x] 6.7 注册路由到主应用

## 7. 测试

- [x] 7.1 编写 `document-parser.service.test.ts` 解析器单元测试
- [x] 7.2 编写 `document.service.test.ts` 服务单元测试
- [x] 7.3 编写 `documents.api.test.ts` API 集成测试
- [x] 7.4 验证所有测试通过
