# language: zh-CN
@document @management
Feature: 管理文档
  As a 用户
  I want 管理助手的文档
  So that 我可以更新知识库

  Background:
    Given 我已登录系统
    And 我有一个助手，包含以下文档:
      | filename     | status    |
      | doc1.pdf     | completed |
      | doc2.docx    | completed |
      | doc3.txt     | failed    |

  @list
  Scenario: 查看文档列表
    When 我请求文档列表
    Then 我应该看到 3 个文档
    And 每个文档应该显示名称、类型、状态、上传时间

  @filter
  Scenario: 按状态筛选文档
    When 我请求文档列表，筛选 status = "completed"
    Then 我应该看到 2 个文档

  @delete
  Scenario: 删除文档
    When 我删除文档 "doc1.pdf"
    Then 响应状态码应该是 204
    And 文档应该从列表中移除
    And 向量数据库中的相关数据应该被删除

  @reprocess
  Scenario: 重新处理失败的文档
    When 我重新处理文档 "doc3.txt"
    Then 响应状态码应该是 202
    And 文档状态应该变为 "queued"
    And 文档应该重新进入处理流程