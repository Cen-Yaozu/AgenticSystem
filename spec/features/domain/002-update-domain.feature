# language: zh-CN
@domain @update
Feature: 更新领域
  As a 用户
  I want 修改领域的配置
  So that 领域能更好地满足我的需求

  Background:
    Given 我已登录系统
    And 我有一个名为 "法律知识库" 的领域

  @happy-path
  Scenario: 更新领域名称
    When 我更新领域名称为 "高级法律知识库"
    Then 响应状态码应该是 200
    And 领域名称应该是 "高级法律知识库"
    And updatedAt 应该更新

  @happy-path
  Scenario: 更新领域设置
    When 我更新领域设置:
      | 字段 | 值 |
      | responseStyle | concise |
      | tone | friendly |
    Then 响应状态码应该是 200
    And 领域设置应该更新

  @partial-update
  Scenario: 部分更新领域
    When 我只更新领域的 description
    Then 响应状态码应该是 200
    And 其他字段应该保持不变

  @validation @negative
  Scenario: 更新失败 - 名称重复
    Given 我还有一个名为 "财务知识库" 的领域
    When 我更新 "法律知识库" 的名称为 "财务知识库"
    Then 响应状态码应该是 409
    And 错误码应该是 "DOMAIN_NAME_DUPLICATE"
