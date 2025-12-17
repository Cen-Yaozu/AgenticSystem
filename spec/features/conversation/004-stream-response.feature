# language: zh-CN
@conversation @stream
Feature: 流式响应
  As a 用户
  I want 实时看到助手的回复
  So that 我可以获得更好的交互体验

  Background:
    Given 我已登录系统
    And 我有一个活跃的对话
    And 我已发送一条消息

  @happy-path @smoke
  Scenario: 接收流式响应
    When 我连接到流式响应端点
    Then 我应该收到 "message_start" 事件
    And 我应该收到多个 "content_delta" 事件
    And 我应该收到 "message_complete" 事件

  @sse
  Scenario: SSE 事件格式正确
    When 我连接到流式响应端点
    Then 每个事件应该包含 event 字段
    And 每个事件应该包含 data 字段
    And data 应该是有效的 JSON

  @source
  Scenario: 流式响应包含来源引用
    Given 助手已学习了相关文档
    When 我连接到流式响应端点
    Then 我应该收到 "source_reference" 事件
    And 来源引用应该包含文档 ID 和内容片段

  @abort
  Scenario: 中断流式响应
    Given 我正在接收流式响应
    When 我发送中断请求
    Then 流式响应应该停止
    And 我应该收到 "generation_aborted" 事件

  @timeout
  Scenario: 流式响应超时
    Given 响应生成时间超过 60 秒
    Then 我应该收到 "error" 事件
    And 错误类型应该是 "GENERATION_TIMEOUT"

  @reconnect
  Scenario: 断线重连
    Given 我正在接收流式响应
    When 连接意外断开
    And 我重新连接
    Then 我应该能够继续接收剩余内容