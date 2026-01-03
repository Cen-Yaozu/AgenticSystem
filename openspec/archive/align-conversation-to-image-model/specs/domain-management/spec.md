## ADDED Requirements

### Requirement: DOMAIN-AGENTX-001 领域模板 Image

系统 SHALL 为每个领域创建并持久化一个 AgentX template Image，用于该领域下所有对话的配置模板。

**业务规则**:
- 领域 MUST 对应一个 AgentX Container（`domain_${domainId}`）
- 系统 MUST 创建 template image 并保存 `templateImageId`
- template image MUST 存储领域级别的静态配置（systemPrompt、mcpServers）
- template image SHALL 在该领域的所有对话中共享（不为每个对话创建新 Image）

#### Scenario: 创建领域时生成 template image

```gherkin
Given 用户创建领域 "法律领域"
When 领域初始化完成
Then 系统创建 AgentX Container "domain_{domainId}"
And 系统创建 template Image（image_create_request）
And 领域记录包含 templateImageId
```

#### Scenario: 多个对话共享同一 template image

```gherkin
Given 领域 "法律领域" 存在 templateImageId = "img_template_law123"
When 用户创建对话 A
Then 系统调用 image_run_request(img_template_law123, sessionId_A)
And 系统保存对话 A 的 agentId

When 用户创建对话 B
Then 系统调用 image_run_request(img_template_law123, sessionId_B)
And 系统保存对话 B 的 agentId
And 对话 A 和对话 B 共享同一 template image
```
