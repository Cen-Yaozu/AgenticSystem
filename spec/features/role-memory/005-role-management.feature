# language: zh-CN
@role @management
Feature: 角色管理
  As a 用户
  I want 管理助手的角色
  So that 助手能够以不同的专业身份提供服务

  Background:
    Given 我已登录系统
    And 我有一个名为 "法律助手" 的助手

  @happy-path @smoke
  Scenario: 查看角色列表
    When 我请求助手的角色列表
    Then 响应状态码应该是 200
    And 我应该看到默认的 "主协调者" 角色
    And 默认角色应该是激活状态

  @happy-path
  Scenario: 创建新角色
    When 我创建角色:
      | 字段 | 值 |
      | name | 合同风险分析师 |
      | description | 专门分析合同中的法律风险 |
      | capabilities | 风险识别, 条款分析, 合规检查 |
    Then 响应状态码应该是 201
    And 角色应该被创建
    And 角色状态应该是激活

  @validation @negative
  Scenario: 创建角色失败 - 名称重复
    Given 助手已有一个名为 "合同分析师" 的角色
    When 我创建名为 "合同分析师" 的角色
    Then 响应状态码应该是 409
    And 错误码应该是 "ROLE_NAME_DUPLICATE"

  @limit @negative
  Scenario: 创建角色失败 - 超过数量限制
    Given 助手已有 10 个角色
    When 我创建新角色
    Then 响应状态码应该是 403
    And 错误码应该是 "ROLE_LIMIT_EXCEEDED"

  @default
  Scenario: 无法删除默认角色
    When 我尝试删除 "主协调者" 角色
    Then 响应状态码应该是 403
    And 错误码应该是 "CANNOT_DELETE_DEFAULT_ROLE"

  @activate
  Scenario: 激活和停用角色
    Given 我有一个名为 "合同分析师" 的角色
    When 我停用该角色
    Then 角色状态应该是停用
    When 我激活该角色
    Then 角色状态应该是激活