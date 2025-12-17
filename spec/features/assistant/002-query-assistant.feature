# language: zh-CN
@assistant @query
Feature: 查询助手
  As a 用户
  I want 查看我的助手列表和详情
  So that 我可以管理我的助手

  Background:
    Given 我已登录系统

  @happy-path
  Scenario: 获取助手列表
    Given 我有以下助手:
      | name | domain |
      | 法律助手 | legal |
      | 财务助手 | finance |
    When 我请求助手列表
    Then 响应状态码应该是 200
    And 我应该看到 2 个助手
    And 列表应该按创建时间倒序排列

  @pagination
  Scenario: 分页获取助手列表
    Given 我有 15 个助手
    When 我请求助手列表，页码 2，每页 10 条
    Then 响应状态码应该是 200
    And 我应该看到 5 个助手
    And 分页信息应该正确

  @filter
  Scenario: 按领域筛选助手
    Given 我有以下助手:
      | name | domain |
      | 法律助手 | legal |
      | 财务助手 | finance |
      | 合同助手 | legal |
    When 我请求助手列表，筛选 domain = "legal"
    Then 响应状态码应该是 200
    And 我应该看到 2 个助手

  @detail
  Scenario: 获取助手详情
    Given 我有一个 ID 为 "ast_123" 的助手
    When 我请求助手 "ast_123" 的详情
    Then 响应状态码应该是 200
    And 响应应该包含完整的助手信息

  @not-found @negative
  Scenario: 获取不存在的助手
    When 我请求助手 "ast_not_exist" 的详情
    Then 响应状态码应该是 404
    And 错误码应该是 "ASSISTANT_NOT_FOUND"

  @isolation @security
  Scenario: 无法访问其他用户的助手
    Given 用户 B 有一个 ID 为 "ast_other" 的助手
    When 我请求助手 "ast_other" 的详情
    Then 响应状态码应该是 404