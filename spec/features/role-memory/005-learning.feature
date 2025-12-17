# language: zh-CN
@memory @learning
Feature: 持续学习
  As a 助手
  I want 从用户交互中学习
  So that 我可以提供越来越个性化的服务

  Background:
    Given 我已登录系统
    And 我有一个助手
    And 助手已与用户进行了多轮对话

  @preference
  Scenario: 学习用户偏好
    Given 用户多次要求详细的分析报告
    When 系统分析用户行为模式
    Then 应该创建偏好记忆 "用户偏好详细报告"
    And 记忆类型应该是 "preference"

  @habit
  Scenario: 学习交互习惯
    Given 用户经常在早上提问法律问题
    When 系统分析用户行为模式
    Then 应该创建习惯记忆
    And 记忆类型应该是 "habit"

  @insight
  Scenario: 发现用户洞察
    Given 用户频繁关注合同风险条款
    When 系统分析用户关注点
    Then 应该创建洞察记忆 "用户关注合同风险"
    And 记忆类型应该是 "insight"

  @personalization
  Scenario: 个性化回答调整
    Given 用户有偏好记忆 "喜欢简洁回答"
    When 用户提问
    Then 助手的回答应该更加简洁
    And 回答风格应该符合用户偏好

  @feedback
  Scenario: 从反馈中学习
    Given 用户对回答给出负面反馈 "太长了"
    When 系统处理反馈
    Then 应该更新或创建相关偏好记忆
    And 后续回答应该调整长度

  @context-learning
  Scenario: 上下文学习
    Given 用户在讨论劳动合同
    And 用户提到 "我们公司是互联网行业"
    When 系统分析对话上下文
    Then 应该创建事实记忆 "用户公司是互联网行业"
    And 后续回答应该考虑行业特点