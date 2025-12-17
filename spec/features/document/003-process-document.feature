# language: zh-CN
@document @processing
Feature: 处理文档
  As a 系统
  I want 自动处理上传的文档
  So that 文档内容可以被检索

  @happy-path
  Scenario: 完整的文档处理流程
    Given 用户上传了一个 PDF 文档
    When 文档进入处理队列
    Then 文档状态应该依次变为:
      | 状态       |
      | queued     |
      | processing |
      | completed  |
    And 处理完成后应该生成文档块
    And 文档块应该存储到向量数据库

  @progress
  Scenario: 实时更新处理进度
    Given 用户上传了一个文档
    When 文档开始处理
    Then 我应该通过 WebSocket 收到进度更新
    And 进度应该从 0 增加到 100

  @stages
  Scenario: 处理阶段正确执行
    Given 用户上传了一个 PDF 文档
    When 文档处理完成
    Then 应该依次完成以下阶段:
      | 阶段       | 描述           |
      | validation | 文件验证       |
      | extraction | 文本提取       |
      | cleaning   | 内容清理       |
      | chunking   | 智能分块       |
      | embedding  | 向量嵌入       |
      | indexing   | 索引存储       |

  @failure @retry
  Scenario: 处理失败自动重试
    Given 用户上传了一个文档
    And 嵌入服务暂时不可用
    When 文档处理到嵌入阶段失败
    Then 系统应该自动重试
    And 最多重试 3 次
    And 如果仍然失败，文档状态应该是 "failed"

  @chunking
  Scenario: 智能分块保留上下文
    Given 用户上传了一个包含多个章节的文档
    When 文档处理完成
    Then 每个块应该包含完整的语义单元
    And 相邻块应该有重叠内容
    And 块元数据应该包含章节信息