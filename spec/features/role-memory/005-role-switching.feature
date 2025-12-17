# language: zh-CN
@role @switching
Feature: 角色切换
  As a 系统
  I want 根据用户意图自动选择合适的角色
  So that 用户能获得最专业的回答

  Background:
    Given 我已登录系统
    And 我有一个助手，配置了多个角色:
      | name | capabilities |
      | 主协调者 | 意图理解, 任务分配 |
      | 合同分析师 | 风险识别, 条款分析 |
      | 法规顾问 | 法规解读, 合规检查 |

  @auto-select
  Scenario: 自动选择最匹配的角色
    When 用户提问 "这份合同有什么风险？"
    Then 系统应该选择 "合同分析师" 角色
    And 回复应该体现合同分析的专业性

  @auto-select
  Scenario: 法规问题选择法规顾问
    When 用户提问 "最新的劳动法有什么规定？"
    Then 系统应该选择 "法规顾问" 角色

  @fallback
  Scenario: 无明确匹配时使用主协调者
    When 用户提问 "你好，请介绍一下你自己"
    Then 系统应该使用 "主协调者" 角色

  @context-preserve
  Scenario: 角色切换时保持上下文
    Given 当前使用 "合同分析师" 角色
    And 已讨论了合同的违约条款
    When 用户提问 "相关的法律法规是什么？"
    Then 系统应该切换到 "法规顾问" 角色
    And 回复应该关联之前讨论的违约条款

  @manual-switch
  Scenario: 手动切换角色
    Given 当前使用 "主协调者" 角色
    When 用户请求切换到 "合同分析师"
    Then 系统应该切换到指定角色
    And 后续回复应该使用新角色

  @inactive-role
  Scenario: 无法切换到停用的角色
    Given "法规顾问" 角色已停用
    When 用户请求切换到 "法规顾问"
    Then 系统应该提示角色不可用
    And 应该建议可用的替代角色