# Design: Align conversations to AgentX Agent-First model

## Context

Upstream AgentX runtime architecture:
- **Image**: Configuration template (stores `systemPrompt`, `mcpServers`) - REUSABLE across conversations
- **Agent**: Runtime instance created by `runImage(imageId, sessionId)` - UNIQUE per conversation
- **Session**: Message storage for an Agent (keyed by `sessionId`)

Critical insight: `image_run_request(imageId, sessionId)` creates a NEW Agent instance with its own `agentId`. The same Image can be used to create multiple independent conversations (Agents) by passing different `sessionIds`.

Our application adds a **Domain** concept as the top-level user entry point. Domains map naturally to AgentX containers.

## Goal

Adopt AgentX's native identity model:
- **Domain → Container** (many-to-one)
- **Domain Template Image → shared configuration** for all conversations in a domain
- **Conversation → Agent (agentId)** (runtime instance)

## Data model changes

### Domains
Persist a per-domain **template image** identifier (recommended: `template_image_id` column).

Rationale:
- All conversations in a domain share the same systemPrompt and MCP servers
- Creating one template image at domain creation is efficient

### Conversations
Persist the **agentId** (recommended: `agent_id` column) as the conversation's primary identifier.

Also persist:
- `image_id`: Reference to the domain template image (for config retrieval)
- `session_id`: Agent's sessionId (matches agentId in practice)

Rationale:
- `agentId` is the unique runtime instance identifier
- `imageId` is shared across conversations, NOT unique per conversation
- `sessionId` is needed for `session_messages_request()`

## Runtime flow

### Domain creation
1. Create container: `container_create_request(containerId=domain_${domainId})`
2. Create template image: `image_create_request(containerId, config={systemPrompt, mcpServers})`
3. Persist `templateImageId` for the domain

### Conversation creation
1. Get domain's `templateImageId`
2. Create Agent instance: `image_run_request(templateImageId, sessionId=conv_${conversationId})`
3. Extract `agentId` from response
4. Persist conversation `{ id, domainId, agentId, imageId, sessionId }`

### Send message
```
message_send_request({
  agentId: conversation.agentId,
  content: userMessage
})
```

### Fetch history
```
session_messages_request(conversation.sessionId)
```
NOT `image_messages_request(imageId)` - that returns the Image's DEFAULT session messages

### Abort generation
```
agent_interrupt_request(conversation.agentId)
```

## Streaming and security

### Problem
1. Current implementation filters events by `imageId`, causing cross-talk between conversations sharing the same template image
2. AgentX's `/ws` broadcasts all events to all connections without authentication

### Solution
Filter WebSocket events by `agentId` instead of `imageId`:

```typescript
const forwardEvent = (event: any) => {
  const agentId = event?.context?.agentId;  // Filter by agentId
  if (!agentId) return;

  const sockets = byAgentId.get(agentId);
  // Forward only to matching conversations
};
```

Additionally:
- Use app-owned endpoint: `/api/v1/conversations/:id/stream?token=...`
- Authenticate via token (existing `authenticateStreamRequest`)
- Do NOT expose AgentX's raw `/ws` to end users

## Event context structure

All AgentX events contain:
```typescript
context: {
  containerId: string,
  imageId: string,     // Template image (shared)
  agentId: string,     // Conversation instance (unique)
  sessionId: string
}
```

The `agentId` is the correct identifier for filtering events to a specific conversation.

## Compatibility and migration

### Existing conversations
- If `session_id` contains `img_*`: This was incorrectly using imageId. Cannot recover - recreate or mark as legacy.
- If `session_id` contains `sess_*` or `agent_*`: Map to `agentId` if still exists in AgentX persistence.

### Schema migration
```sql
ALTER TABLE conversations ADD COLUMN agent_id TEXT;
ALTER TABLE conversations ADD COLUMN image_id TEXT;

-- Backfill: domain.templateImageId → conversations.image_id
UPDATE conversations
SET image_id = (SELECT template_image_id FROM domains WHERE id = domain_id);
```
