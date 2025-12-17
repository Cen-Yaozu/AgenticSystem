# language: zh-CN
@conversation @message
Feature: 发送消息
  As a 用户
  I want 向助手发送消息
  So that 我可以获得回答

  Background:
    Given 我已登录系统
    And 我有一个助手，已学习了相关文档
    And 我有一个活跃的对话

  @happy-path @smoke
  Scenario: 成功发送消息并获得回复
    When 我发送消息 "请帮我分析这份合同的主要风险点"
    Then 响应状态码应该是 201
    And 我应该收到用户消息 ID
    And 我应该收到助手消息 ID
    And 我应该收到流式响应 URL

  @rag
  Scenario: 回复基于文档内容
    Given 助手已学习了合同相关文档
    When 我发送消息 "合同中的违约责任是什么？"
    Then 助手的回复应该包含文档中的相关内容
    And 回复应该包含来源引用

  @context
  Scenario: 多轮对话保持上下文
    Given 我已发送消息 "请介绍一下合同的主要条款"
    And 助手已回复
    When 我发送消息 "第三条具体是什么内容？"
    Then 助手应该理解 "第三条" 指的是之前提到的条款
    And 回复应该是连贯的

  @validation @negative
  Scenario: 发送空消息失败
    When 我发送空消息
    Then 响应状态码应该是 400
    And 错误码应该是 "MESSAGE_CONTENT_REQUIRED"

  @validation @negative
  Scenario: 消息过长失败
    When 我发送超过 10000 字符的消息
    Then 响应状态码应该是 400
    And 错误码应该是 "MESSAGE_TOO_LONG"