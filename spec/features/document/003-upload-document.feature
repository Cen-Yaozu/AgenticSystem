# language: zh-CN
@document @upload
Feature: 上传文档
  As a 用户
  I want 上传文档给助手学习
  So that 助手能够基于文档内容提供专业回答

  Background:
    Given 我已登录系统
    And 我有一个名为 "法律助手" 的助手

  @happy-path @smoke
  Scenario: 成功上传 PDF 文档
    When 我上传文件 "contract.pdf"，大小为 1MB
    Then 响应状态码应该是 201
    And 文档状态应该是 "queued"
    And 我应该收到文档 ID

  @happy-path
  Scenario Outline: 成功上传不同格式的文档
    When 我上传文件 "<filename>"
    Then 响应状态码应该是 201
    And 文档类型应该是 "<type>"

    Examples:
      | filename        | type |
      | document.pdf    | pdf  |
      | document.docx   | docx |
      | document.txt    | txt  |
      | document.md     | md   |
      | document.xlsx   | xlsx |

  @validation @negative
  Scenario: 上传失败 - 文件过大
    When 我上传文件 "large.pdf"，大小为 15MB
    Then 响应状态码应该是 400
    And 错误码应该是 "DOCUMENT_TOO_LARGE"

  @validation @negative
  Scenario: 上传失败 - 不支持的格式
    When 我上传文件 "image.jpg"
    Then 响应状态码应该是 400
    And 错误码应该是 "DOCUMENT_TYPE_NOT_SUPPORTED"

  @limit @negative
  Scenario: 上传失败 - 超过数量限制
    Given 助手已有 100 个文档
    When 我上传文件 "new.pdf"
    Then 响应状态码应该是 403
    And 错误码应该是 "DOCUMENT_LIMIT_EXCEEDED"