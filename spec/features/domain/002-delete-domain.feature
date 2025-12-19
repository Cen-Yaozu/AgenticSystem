# language: zh-CN
@domain @delete
Feature: 删除领域
  As a 用户
  I want 删除不需要的领域
  So that 我可以清理资源

  Background:
    Given 我已登录系统

  @happy-path
  Scenario: 成功删除领域
    Given 我有一个 ID 为 "dom_123" 的领域
    When 我删除领域 "dom_123"
    Then 响应状态码应该是 204
    And 领域应该不再存在

  @cascade
  Scenario: 删除领域时级联删除关联数据
    Given 我有一个领域，包含:
      | 关联数据 | 数量 |
      | 文档 | 5 |
      | 对话 | 10 |
      | 角色 | 2 |
      | 记忆 | 20 |
    When 我删除该领域
    Then 响应状态码应该是 204
    And 所有关联的文档应该被删除
    And 所有关联的对话应该被删除
    And 所有关联的角色应该被删除
    And 所有关联的记忆应该被删除
    And 向量数据库中的数据应该被清理

  @processing @negative
  Scenario: 无法删除正在处理的领域
    Given 我有一个状态为 "processing" 的领域
    When 我尝试删除该领域
    Then 响应状态码应该是 409
    And 错误码应该是 "DOMAIN_CANNOT_DELETE"

  @not-found @negative
  Scenario: 删除不存在的领域
    When 我删除领域 "dom_not_exist"
    Then 响应状态码应该是 404
