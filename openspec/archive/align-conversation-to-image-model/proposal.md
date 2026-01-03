# Change: Align conversations to AgentX Image-First model

## Why

The application currently misunderstands AgentX's architecture. After deep analysis of AgentX source code, we found:

### AgentX's Actual Design

| Concept | Role | Persistence |
|---------|------|-------------|
| **Image** | The conversation itself (config + message reference) | ✅ Database |
| **Session** | Message storage bucket (internal to Image) | ✅ Database |
| **Agent** | Temporary executor (processes messages, calls LLM) | ❌ Memory only |

**Key insight**: Image and Session are 1:1 bound. When an Image is created, a Session is automatically created and permanently associated with it. There is NO API to create multiple Sessions for one Image.

```typescript
// From RuntimeImage.ts:95-126
static async create(config) {
  const imageId = generateImageId();   // img_xxx
  const sessionId = generateSessionId(); // sess_xxx

  // Image and Session are bound at creation time
  const record = { imageId, sessionId, ...config };
  await imageRepository.saveImage(record);
  await sessionRepository.saveSession({ sessionId, imageId });
}
```

### Current Issues

1. **Reusing the same Image for all conversations**: Current code gets the first Image in the container and reuses it for all conversations, causing message cross-talk
2. **Storing wrong identifier**: Storing `agentId` (temporary) instead of `imageId` (persistent)
3. **Wrong message retrieval**: Using `image_messages_request(imageId)` works, but we're using the wrong imageId

## What Changes

**Core Principle**: "1 Conversation = 1 Image"

- Each conversation creates its **own Image** via `image_create_request`
- Configuration (systemPrompt, mcpServers) is **copied from Domain** at creation time
- Store **imageId** as the conversation's primary identifier (not agentId)
- Agent is just a temporary executor, created on-demand when processing messages

### Data Model

```
Domain (领域)
├── Container (AgentX 容器)
│
├── Conversation 1
│   └── Image 1 (config + Session 1 for messages)
│
├── Conversation 2
│   └── Image 2 (config + Session 2 for messages)
│
└── Conversation 3
    └── Image 3 (config + Session 3 for messages)
```

### API Usage

| Operation | Correct API |
|-----------|-------------|
| Create conversation | `image_create_request(containerId, config)` → returns `imageId` |
| Send message | `message_send_request(imageId, content)` |
| Get history | `image_messages_request(imageId)` |
| Abort generation | `agent_interrupt_request(imageId)` (auto-finds agent) |

## Impact

- Affected code:
  - `apps/web/src/server/services/conversation.service.ts` (use `image_create_request`, store `imageId`)
  - `apps/web/src/server/services/chat.service.ts` (use conversation's own `imageId`)
  - `apps/web/src/server/database/index.ts` (rename `session_id` to `image_id`)
  - `apps/web/src/client/hooks/useAgentXWebSocket.ts` (filter by `imageId`)

## Note on Configuration Snapshots

When a conversation is created, the Domain's configuration is **copied** to the Image. This means:
- Changing Domain config does NOT affect existing conversations
- Each conversation preserves the config it was created with
- This is by design (conversation consistency)
