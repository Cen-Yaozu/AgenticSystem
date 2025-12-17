# language: zh-CN
@conversation @create
Feature: 创建对话
  As a 用户
  I want 与助手开始新的对话
  So that 我可以获得专业咨询服务

  Background:
    Given 我已登录系统
    And 我有一个名为 "法律助手" 的助手

  @happy-path @smoke
  Scenario: 成功创建对话
    When 我创建一个新对话
    Then 响应状态码应该是 201
    And 响应应该包含对话 ID
    And 对话状态应该是 "active"
    And 对话消息数应该是 0

  @happy-path
  Scenario: 创建对话时指定标题
    When 我创建对话，标题为 "合同风险分析"
    Then 响应状态码应该是 201
    And 对话标题应该是 "合同风险分析"

  @auto-title
  Scenario: 对话标题自动生成
    Given 我创建了一个无标题的对话
    When 我发送第一条消息 "请帮我分析合同风险"
    Then 对话标题应该自动更新为消息摘要