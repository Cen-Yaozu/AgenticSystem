# language: zh-CN
@memory @management
Feature: 记忆管理
  As a 角色
  I want 保存和检索记忆
  So that 我可以持续学习和改进服务

  Background:
    Given 我已登录系统
    And 我有一个助手
    And 助手有一个激活的角色

  @remember @happy-path
  Scenario: 保存新记忆
    When 我保存记忆:
      | 字段 | 值 |
      | content | 用户偏好详细的风险分析报告 |
      | schema | 用户 偏好 详细 风险分析 报告 |
      | type | preference |
      | strength | 0.8 |
    Then 响应状态码应该是 201
    And 记忆应该被保存
    And 记忆网络应该更新

  @remember
  Scenario: 增强已有记忆
    Given 已有记忆 "用户偏好详细报告"，强度为 0.6
    When 我保存相似的记忆
    Then 原有记忆的强度应该增加
    And 不应该创建重复记忆

  @recall @happy-path
  Scenario: DMN 模式检索记忆
    Given 角色有多条记忆
    When 我使用 DMN 模式检索（query 为 null）
    Then 我应该看到记忆网络全景图
    And 应该显示核心枢纽节点

  @recall
  Scenario: 关键词检索记忆
    Given 角色有关于 "风险分析" 的记忆
    When 我检索关键词 "风险分析"
    Then 我应该获得相关记忆列表
    And 记忆应该按相关性排序

  @recall
  Scenario: 多关键词检索
    When 我检索 "合同 风险 分析"
    Then 系统应该进行多中心激活
    And 返回与所有关键词相关的记忆

  @mode
  Scenario Outline: 不同检索模式
    When 我使用 "<mode>" 模式检索 "风险"
    Then 检索结果应该符合 "<特征>"

    Examples:
      | mode | 特征 |
      | focused | 精确匹配，常用记忆优先 |
      | balanced | 平衡精确和联想 |
      | creative | 广泛联想，远距离连接 |

  @decay
  Scenario: 记忆强度衰减
    Given 有一条 30 天未访问的记忆
    When 系统执行衰减任务
    Then 记忆强度应该降低
    And 强度不应低于最小值 0.1

  @cleanup
  Scenario: 清理弱记忆
    Given 有记忆强度低于 0.1
    When 系统执行清理任务
    Then 弱记忆应该被删除