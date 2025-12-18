## ADDED Requirements

### Requirement: 上传文档

系统 SHALL 允许用户上传文档给助手学习，支持 PDF、DOCX、TXT、MD、XLSX 格式。

#### Scenario: 成功上传 PDF 文档
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户上传 PDF 文件，大小为 1MB
- **THEN** 系统应返回 HTTP 201
- **AND** 响应应包含文档 ID（格式：doc_xxxxxxxx）
- **AND** 文档状态应为 "queued"
- **AND** 文件应保存到助手工作区的 documents 目录

#### Scenario: 成功上传不同格式的文档
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户上传 DOCX/TXT/MD/XLSX 格式的文件
- **THEN** 系统应返回 HTTP 201
- **AND** 文档类型应正确识别

#### Scenario: 上传失败 - 文件过大
- **GIVEN** 用户已认证
- **WHEN** 用户上传大于 10MB 的文件
- **THEN** 系统应返回 HTTP 400
- **AND** 错误码应为 "DOCUMENT_TOO_LARGE"

#### Scenario: 上传失败 - 不支持的格式
- **GIVEN** 用户已认证
- **WHEN** 用户上传不支持的文件格式（如 .jpg）
- **THEN** 系统应返回 HTTP 400
- **AND** 错误码应为 "DOCUMENT_TYPE_NOT_SUPPORTED"

#### Scenario: 上传失败 - 超过数量限制
- **GIVEN** 用户已认证
- **AND** 助手已有 100 个文档
- **WHEN** 用户上传新文档
- **THEN** 系统应返回 HTTP 403
- **AND** 错误码应为 "DOCUMENT_LIMIT_EXCEEDED"

---

### Requirement: 文档处理流水线

系统 SHALL 自动处理上传的文档，包括验证、提取、清理、分块、嵌入和索引。

#### Scenario: 完整的文档处理流程
- **GIVEN** 用户上传了一个 PDF 文档
- **WHEN** 文档进入处理队列
- **THEN** 文档状态应依次变为 queued → processing → completed
- **AND** 处理完成后应生成文档块
- **AND** 文档块应存储到 Qdrant 向量数据库

#### Scenario: 处理阶段正确执行
- **GIVEN** 用户上传了一个 PDF 文档
- **WHEN** 文档处理完成
- **THEN** 应依次完成以下阶段：validation、extraction、cleaning、chunking、embedding、indexing

#### Scenario: 使用复用的解析器提取文本
- **GIVEN** 用户上传了一个 PDF 文档
- **WHEN** 文档进入提取阶段
- **THEN** 系统应使用 PdfParser（复用 collector/asPDF，基于 pdf-parse）提取文本
- **AND** 对于 DOCX 文件应使用 DocxParser（复用 collector/asDocx，基于 langchain DocxLoader）
- **AND** 对于 XLSX 文件应使用 XlsxParser（复用 collector/asXlsx，基于 node-xlsx）
- **AND** 对于 TXT/MD 文件应使用 TextParser（直接读取）

#### Scenario: 文本分块
- **GIVEN** 文档文本已提取
- **WHEN** 进入分块阶段
- **THEN** 系统应按 1000 字符分块
- **AND** 相邻块应有 100 字符重叠
- **AND** 每个块应记录位置信息

#### Scenario: 向量化存储
- **GIVEN** 文档已分块
- **WHEN** 进入嵌入阶段
- **THEN** 系统应调用 Embedding API 生成向量
- **AND** 向量应存储到 Qdrant collection（命名：assistant_{assistantId}）
- **AND** 向量 payload 应包含 documentId、content、chunkIndex

---

### Requirement: 处理失败重试

系统 SHALL 支持处理失败的文档自动重试，最多 3 次。

#### Scenario: 处理失败自动重试
- **GIVEN** 用户上传了一个文档
- **AND** 嵌入服务暂时不可用
- **WHEN** 文档处理到嵌入阶段失败
- **THEN** 系统应自动重试
- **AND** 最多重试 3 次

#### Scenario: 重试仍然失败
- **GIVEN** 文档处理失败
- **AND** 已重试 3 次
- **WHEN** 仍然失败
- **THEN** 文档状态应为 "failed"
- **AND** 应记录错误信息

---

### Requirement: 查询文档列表

系统 SHALL 允许用户查询助手的文档列表，支持分页和状态筛选。

#### Scenario: 获取文档列表
- **GIVEN** 用户已认证
- **AND** 助手有多个文档
- **WHEN** 用户请求文档列表
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含文档数组
- **AND** 每个文档应显示名称、类型、状态、上传时间

#### Scenario: 分页获取文档列表
- **GIVEN** 用户已认证
- **AND** 助手有 15 个文档
- **WHEN** 用户请求第 2 页，每页 10 条
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含 5 个文档
- **AND** 分页信息应正确

#### Scenario: 按状态筛选文档
- **GIVEN** 用户已认证
- **AND** 助手有不同状态的文档
- **WHEN** 用户请求列表，筛选 status = "completed"
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应只包含 completed 状态的文档

---

### Requirement: 查询文档详情

系统 SHALL 允许用户查询单个文档的详细信息。

#### Scenario: 获取文档详情
- **GIVEN** 用户已认证
- **AND** 文档存在
- **WHEN** 用户请求文档详情
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含完整的文档信息（ID、文件名、类型、大小、状态、进度、块数、上传时间、处理时间）

#### Scenario: 获取不存在的文档
- **GIVEN** 用户已认证
- **WHEN** 用户请求不存在的文档详情
- **THEN** 系统应返回 HTTP 404
- **AND** 错误码应为 "DOCUMENT_NOT_FOUND"

---

### Requirement: 删除文档

系统 SHALL 允许用户删除文档，并同时删除向量数据。

#### Scenario: 成功删除文档
- **GIVEN** 用户已认证
- **AND** 文档存在且状态不是 "processing"
- **WHEN** 用户删除文档
- **THEN** 系统应返回 HTTP 204
- **AND** 文档记录应被删除
- **AND** 文件应从工作区删除
- **AND** Qdrant 中的相关向量应被删除

#### Scenario: 无法删除正在处理的文档
- **GIVEN** 用户已认证
- **AND** 文档状态为 "processing"
- **WHEN** 用户尝试删除文档
- **THEN** 系统应返回 HTTP 409
- **AND** 错误码应为 "DOCUMENT_ALREADY_PROCESSING"

#### Scenario: 删除不存在的文档
- **GIVEN** 用户已认证
- **WHEN** 用户删除不存在的文档
- **THEN** 系统应返回 HTTP 404
- **AND** 错误码应为 "DOCUMENT_NOT_FOUND"

---

### Requirement: 重新处理文档

系统 SHALL 允许用户重新处理失败的文档。

#### Scenario: 重新处理失败的文档
- **GIVEN** 用户已认证
- **AND** 文档状态为 "failed"
- **WHEN** 用户请求重新处理
- **THEN** 系统应返回 HTTP 202
- **AND** 文档状态应变为 "queued"
- **AND** 文档应重新进入处理流程

#### Scenario: 无法重新处理非失败状态的文档
- **GIVEN** 用户已认证
- **AND** 文档状态为 "completed"
- **WHEN** 用户请求重新处理
- **THEN** 系统应返回 HTTP 409
- **AND** 错误码应为 "DOCUMENT_ALREADY_PROCESSING"

---

### Requirement: 支持的文档格式

系统 SHALL 支持以下文档格式：PDF、DOCX、TXT、MD、XLSX，使用复用的 collector 解析器。

#### Scenario: 验证支持的格式和解析器
- **GIVEN** 系统运行中
- **WHEN** 检查支持的文档格式
- **THEN** 应支持 PDF（application/pdf）使用 PdfParser（pdf-parse + OCR 回退）
- **AND** 应支持 DOCX（application/vnd.openxmlformats-officedocument.wordprocessingml.document）使用 DocxParser（langchain DocxLoader）
- **AND** 应支持 TXT（text/plain）使用 TextParser（直接读取）
- **AND** 应支持 MD（text/markdown）使用 TextParser（直接读取）
- **AND** 应支持 XLSX（application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）使用 XlsxParser（node-xlsx）

---

### Requirement: 文档大小限制

系统 SHALL 限制单个文档大小不超过 10MB。

#### Scenario: 验证文档大小限制
- **GIVEN** 系统运行中
- **WHEN** 用户上传文档
- **THEN** 系统应验证文件大小不超过 10MB
- **AND** 超过限制应返回错误

---

### Requirement: 文档数量限制

系统 SHALL 限制每个助手最多存储 100 个文档（MVP 限制）。

#### Scenario: 验证文档数量限制
- **GIVEN** 助手已有 100 个文档
- **WHEN** 用户尝试上传新文档
- **THEN** 系统应返回 HTTP 403
- **AND** 错误码应为 "DOCUMENT_LIMIT_EXCEEDED"
