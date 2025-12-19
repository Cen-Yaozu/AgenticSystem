# language: zh-CN
@domain @create
Feature: 创建领域
  As a 用户
  I want 创建一个专业领域的 AI 知识库
  So that 我可以获得该领域的专业服务

  Background:
    Given 我已登录系统
    And 我当前有 0 个领域

  @happy-path @smoke
  Scenario: 成功创建领域（最小信息）
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | 法律知识库 |
    Then 响应状态码应该是 201
    And 响应应该包含领域 ID
    And 领域状态应该是 "initializing"
    And 领域应该有默认设置

  @happy-path
  Scenario: 成功创建领域（完整信息）
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | 法律知识库 |
      | description | 专业的法律文档分析知识库 |
      | expertise | legal |
      | responseStyle | detailed |
      | tone | formal |
    Then 响应状态码应该是 201
    And 领域信息应该与请求一致

  @validation @negative
  Scenario: 创建领域失败 - 名称为空
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | |
    Then 响应状态码应该是 400
    And 错误码应该是 "DOMAIN_NAME_REQUIRED"

  @validation @negative
  Scenario: 创建领域失败 - 名称过长
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | <101个字符的名称> |
    Then 响应状态码应该是 400
    And 错误码应该是 "DOMAIN_NAME_TOO_LONG"

  @validation @negative
  Scenario: 创建领域失败 - 名称重复
    Given 我已有一个名为 "法律知识库" 的领域
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | 法律知识库 |
    Then 响应状态码应该是 409
    And 错误码应该是 "DOMAIN_NAME_DUPLICATE"

  @limit @negative
  Scenario: 创建领域失败 - 超过数量限制
    Given 我已有 10 个领域
    When 我发送创建领域请求:
      | 字段 | 值 |
      | name | 第11个领域 |
    Then 响应状态码应该是 403
    And 错误码应该是 "DOMAIN_LIMIT_EXCEEDED"
