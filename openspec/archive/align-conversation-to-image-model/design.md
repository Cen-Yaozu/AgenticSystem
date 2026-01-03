# Design: Align conversations to AgentX Image-First model

## Context

### AgentX Architecture (Corrected Understanding)

After analyzing AgentX source code (`RuntimeImage.ts`, `RuntimeContainer.ts`, `RuntimeImpl.ts`), we found:

| Concept | Description | Persistence | ID Format |
|---------|-------------|-------------|-----------|
| **Container** | Isolation boundary, groups Images | ✅ Database | `domain_xxx` |
| **Image** | Conversation entity (config + session reference) | ✅ Database | `img_xxx` |
| **Session** | Message storage, 1:1 bound to Image | ✅ Database | `sess_xxx` |
| **Agent** | Temporary executor, processes messages | ❌ Memory | `agent_xxx` |

**Critical insight**: Image and Session are 1:1 bound at creation time. There is NO API to create multiple Sessions for one Image.

```
Container
├── Image 1 ─1:1─ Session 1 (messages for conversation 1)
├── Image 2 ─1:1─ Session 2 (messages for conversation 2)
└── Image 3 ─1:1─ Session 3 (messages for conversation 3)
```

### Our Application Model

```
Domain (user-facing concept)
├── maps to → Container (AgentX)
│
├── Conversation 1 → Image 1 (with its own Session)
├── Conversation 2 → Image 2 (with its own Session)
└── Conversation 3 → Image 3 (with its own Session)
```

## Goal

Adopt AgentX's native Image-First model:
- **1 Conversation = 1 Image**
- Store `imageId` as conversation identifier
- Each conversation has independent message storage

## Data Model Changes

### Conversations Table

**Current schema:**
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  title TEXT,
  session_id TEXT,  -- Currently stores agentId (wrong!)
  created_at INTEGER,
  updated_at INTEGER
);
```

**New schema:**
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  title TEXT,
  image_id TEXT NOT NULL,  -- AgentX Image ID (img_xxx)
  created_at INTEGER,
  updated_at INTEGER
);
```

**Migration:**
```sql
-- Rename column (SQLite requires table recreation)
ALTER TABLE conversations RENAME COLUMN session_id TO image_id;
```

### Domains Table

No changes needed. Domain configuration is used as a **template** when creating conversation Images.

## Runtime Flow

### Domain Registration (unchanged)

1. Create container: `container_create_request(containerId=domain_${domainId})`
2. Domain config stored in our database (systemPrompt, mcpServers)

### Conversation Creation (CHANGED)

**Current (wrong):**
```typescript
// Gets first Image in container (shared by all conversations!)
const images = await agentx.request('image_list_request', { containerId });
const imageId = images[0].imageId;
const runResponse = await agentx.request('image_run_request', { imageId });
// Stores agentId as session_id
```

**New (correct):**
```typescript
// Create NEW Image for this conversation
const imageResponse = await agentx.request('image_create_request', {
  containerId: `domain_${domainId}`,
  config: {
    name: title || `Conversation ${nanoid()}`,
    systemPrompt: domain.systemPrompt,  // Copy from Domain
    mcpServers: domain.mcpServers,      // Copy from Domain
  },
});
const imageId = imageResponse.data.record.imageId;

// Store imageId in conversations table
await db.conversations.create({
  id: conversationId,
  domainId,
  title,
  imageId,  // Store imageId, not agentId
});
```

### Send Message (CHANGED)

**Current:**
```typescript
// Uses imageId from first Image (wrong - shared)
await agentx.request('message_send_request', { imageId, content });
```

**New:**
```typescript
// Uses conversation's own imageId
const conversation = await db.conversations.findById(conversationId);
await agentx.request('message_send_request', {
  imageId: conversation.imageId,
  content,
});
```

### Get Message History (unchanged logic, but correct imageId)

```typescript
const conversation = await db.conversations.findById(conversationId);
const messages = await agentx.request('image_messages_request', {
  imageId: conversation.imageId,  // Now using correct imageId
});
```

### Abort Generation

```typescript
const conversation = await db.conversations.findById(conversationId);
await agentx.request('agent_interrupt_request', {
  imageId: conversation.imageId,  // AgentX auto-finds the agent
});
```

## Streaming

### Event Context

All AgentX events contain:
```typescript
context: {
  containerId: string,
  imageId: string,     // Conversation's Image
  agentId: string,     // Temporary executor
  sessionId: string    // Message storage
}
```

### Filtering Strategy

Filter by `imageId` (not `agentId`):
- `imageId` is persistent and unique per conversation
- `agentId` is temporary and may change

```typescript
const forwardEvent = (event: any) => {
  const imageId = event?.context?.imageId;
  if (!imageId) return;

  const sockets = byImageId.get(imageId);
  // Forward only to matching conversation
};
```

## Configuration Snapshot Behavior

When a conversation is created:
1. Domain's `systemPrompt` and `mcpServers` are **copied** to the new Image
2. The Image stores its own copy of the configuration
3. Changing Domain config does NOT affect existing conversations

This is intentional:
- ✅ Conversation consistency (behavior doesn't change mid-conversation)
- ✅ Historical accuracy (can see what config was used)
- ⚠️ Trade-off: Old conversations won't get config updates

## Migration Plan

### For Existing Conversations

Conversations with `session_id` containing:
- `agent_xxx`: Cannot recover (agent is temporary, may not exist)
- `img_xxx`: Already correct, just rename column
- `sess_xxx`: Need to find corresponding imageId

### Migration Script

```typescript
// 1. Rename column
await db.exec('ALTER TABLE conversations RENAME COLUMN session_id TO image_id');

// 2. For conversations with agent_xxx or sess_xxx, mark as legacy
// These conversations will need to be recreated
