# language: zh-CN
@domain @query
Feature: 查询领域
  As a 用户
  I want 查看我的领域列表和详情
  So that 我可以管理我的领域

  Background:
    Given 我已登录系统

  @happy-path
  Scenario: 获取领域列表
    Given 我有以下领域:
      | name | expertise |
      | 法律知识库 | legal |
      | 财务知识库 | finance |
    When 我请求领域列表
    Then 响应状态码应该是 200
    And 我应该看到 2 个领域
    And 列表应该按创建时间倒序排列

  @pagination
  Scenario: 分页获取领域列表
    Given 我有 15 个领域
    When 我请求领域列表，页码 2，每页 10 条
    Then 响应状态码应该是 200
    And 我应该看到 5 个领域
    And 分页信息应该正确

  @filter
  Scenario: 按专业领域筛选
    Given 我有以下领域:
      | name | expertise |
      | 法律知识库 | legal |
      | 财务知识库 | finance |
      | 合同知识库 | legal |
    When 我请求领域列表，筛选 expertise = "legal"
    Then 响应状态码应该是 200
    And 我应该看到 2 个领域

  @detail
  Scenario: 获取领域详情
    Given 我有一个 ID 为 "dom_123" 的领域
    When 我请求领域 "dom_123" 的详情
    Then 响应状态码应该是 200
    And 响应应该包含完整的领域信息

  @not-found @negative
  Scenario: 获取不存在的领域
    When 我请求领域 "dom_not_exist" 的详情
    Then 响应状态码应该是 404
    And 错误码应该是 "DOMAIN_NOT_FOUND"

  @isolation @security
  Scenario: 无法访问其他用户的领域
    Given 用户 B 有一个 ID 为 "dom_other" 的领域
    When 我请求领域 "dom_other" 的详情
    Then 响应状态码应该是 404
