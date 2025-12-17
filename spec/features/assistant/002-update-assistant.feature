# language: zh-CN
@assistant @update
Feature: 更新助手
  As a 用户
  I want 修改助手的配置
  So that 助手能更好地满足我的需求

  Background:
    Given 我已登录系统
    And 我有一个名为 "法律助手" 的助手

  @happy-path
  Scenario: 更新助手名称
    When 我更新助手名称为 "高级法律助手"
    Then 响应状态码应该是 200
    And 助手名称应该是 "高级法律助手"
    And updatedAt 应该更新

  @happy-path
  Scenario: 更新助手设置
    When 我更新助手设置:
      | 字段 | 值 |
      | responseStyle | concise |
      | tone | friendly |
    Then 响应状态码应该是 200
    And 助手设置应该更新

  @partial-update
  Scenario: 部分更新助手
    When 我只更新助手的 description
    Then 响应状态码应该是 200
    And 其他字段应该保持不变

  @validation @negative
  Scenario: 更新失败 - 名称重复
    Given 我还有一个名为 "财务助手" 的助手
    When 我更新 "法律助手" 的名称为 "财务助手"
    Then 响应状态码应该是 409
    And 错误码应该是 "ASSISTANT_NAME_DUPLICATE"