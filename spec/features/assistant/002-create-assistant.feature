# language: zh-CN
@assistant @create
Feature: 创建助手
  As a 用户
  I want 创建一个专业领域的 AI 助手
  So that 我可以获得该领域的专业服务

  Background:
    Given 我已登录系统
    And 我当前有 0 个助手

  @happy-path @smoke
  Scenario: 成功创建助手（最小信息）
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | 法律助手 |
    Then 响应状态码应该是 201
    And 响应应该包含助手 ID
    And 助手状态应该是 "initializing"
    And 助手应该有默认设置

  @happy-path
  Scenario: 成功创建助手（完整信息）
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | 法律助手 |
      | description | 专业的法律文档分析助手 |
      | domain | legal |
      | responseStyle | detailed |
      | tone | formal |
    Then 响应状态码应该是 201
    And 助手信息应该与请求一致

  @validation @negative
  Scenario: 创建助手失败 - 名称为空
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | |
    Then 响应状态码应该是 400
    And 错误码应该是 "ASSISTANT_NAME_REQUIRED"

  @validation @negative
  Scenario: 创建助手失败 - 名称过长
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | <101个字符的名称> |
    Then 响应状态码应该是 400
    And 错误码应该是 "ASSISTANT_NAME_TOO_LONG"

  @validation @negative
  Scenario: 创建助手失败 - 名称重复
    Given 我已有一个名为 "法律助手" 的助手
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | 法律助手 |
    Then 响应状态码应该是 409
    And 错误码应该是 "ASSISTANT_NAME_DUPLICATE"

  @limit @negative
  Scenario: 创建助手失败 - 超过数量限制
    Given 我已有 10 个助手
    When 我发送创建助手请求:
      | 字段 | 值 |
      | name | 第11个助手 |
    Then 响应状态码应该是 403
    And 错误码应该是 "ASSISTANT_LIMIT_EXCEEDED"