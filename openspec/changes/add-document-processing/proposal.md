# Change: 添加文档处理功能

## Why

用户需要上传专业文档给助手学习，以便助手能够基于这些文档提供专业回答。当前系统已有助手管理功能，但缺少文档上传、处理和向量化的能力。

## What Changes

- 添加文档上传 API（支持 PDF、DOCX、TXT、MD、XLSX 格式）
- 实现文档处理流水线（验证→提取→清理→分块→嵌入→索引）
- 集成 PromptX 工具进行文档文本提取（pdf-reader, word-tool, excel-tool）
- 集成 Embedding API 进行向量化
- 集成 Qdrant 进行向量存储
- 添加文档管理 API（列表、详情、删除、重试）
- 实现处理状态实时更新

## Impact

- Affected specs: document-processing (新增)
- Affected code:
  - `apps/web/src/server/routes/documents.ts` (新增)
  - `apps/web/src/server/services/document.service.ts` (新增)
  - `apps/web/src/server/services/document-processor.service.ts` (新增)
  - `apps/web/src/server/services/qdrant.service.ts` (新增)
  - `apps/web/src/server/repositories/document.repository.ts` (新增)
  - `apps/web/src/server/validators/document.validator.ts` (新增)
  - `packages/shared/src/types/index.ts` (修改 - 添加文档类型)
