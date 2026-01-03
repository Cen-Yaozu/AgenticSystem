# Tasks: Align conversations to AgentX Image-First model

## Overview

**Core Change**: 1 Conversation = 1 Image (not 1 Agent)

Each conversation creates its own Image with configuration copied from Domain.

---

## 1. Schema Migration ✅

- [x] Rename `session_id` column to `image_id` in conversations table
- [x] Update TypeScript types: `Conversation.imageId` instead of `Conversation.sessionId`
- [x] Create migration script for existing data

**Files:**
- `apps/web/src/server/database/index.ts`
- `packages/shared/src/types/index.ts`

---

## 2. Conversation Creation ✅

- [x] Change from `image_run_request` to `image_create_request`
- [x] Copy Domain config (systemPrompt, mcpServers) to new Image
- [x] Store `imageId` (not `agentId`) in database

**Implementation:**
```typescript
// conversation.service.ts
const imageResponse = await agentx.request('image_create_request', {
  containerId: `domain_${domainId}`,
  config: {
    name: title,
    systemPrompt: domain.systemPrompt,
    mcpServers: domain.mcpServers,
  },
});
const imageId = imageResponse.data.record.imageId;
```

**Files:**
- `apps/web/src/server/services/conversation.service.ts`

---

## 3. Message Operations ✅

- [x] Update `sendMessage` to use conversation's own `imageId`
- [x] Update `getMessages` to use `image_messages_request` with `imageId`
- [x] Update `abortGeneration` to use conversation's `imageId`

**Files:**
- `apps/web/src/server/services/chat.service.ts`

---

## 4. Streaming ✅

- [x] Filter WebSocket events by `imageId` (not `agentId`)
- [x] Update frontend to use `imageId` for filtering
- [x] Implement WebSocket URL auto-discovery (uses `window.location.host`)

**Files:**
- `apps/web/src/client/hooks/useAgentXWebSocket.ts`

---

## 5. Domain Registration Cleanup ⏸️ (Deferred)

- [ ] Remove automatic Image creation during domain registration
- [ ] Domain only creates Container, not Image

**Note:** This is optional cleanup. Current implementation works correctly.

**Files:**
- `apps/web/src/server/services/agentx.service.ts`

---

## 6. Testing ✅

- [x] Test: Create conversation → new Image created
- [x] Test: Send message → uses correct imageId
- [x] Test: Get history → returns only this conversation's messages
- [x] Test: Multiple conversations → independent message storage
- [x] Test: WebSocket events → filtered by imageId

---

## Summary

| Phase | Status | Priority |
|-------|--------|----------|
| 1. Schema Migration | ✅ Completed | High |
| 2. Conversation Creation | ✅ Completed | High |
| 3. Message Operations | ✅ Completed | High |
| 4. Streaming | ✅ Completed | Medium |
| 5. Domain Cleanup | ⏸️ Deferred | Low |
| 6. Testing | ✅ Completed | - |

**Overall Progress: 100% (Core tasks completed)**

---

## Quick Reference

### AgentX API Mapping

| Operation | API | Key Parameter |
|-----------|-----|---------------|
| Create conversation | `image_create_request` | `containerId`, `config` |
| Send message | `message_send_request` | `imageId`, `content` |
| Get history | `image_messages_request` | `imageId` |
| Abort | `agent_interrupt_request` | `imageId` |

### ID Formats

| ID | Format | Persistence |
|----|--------|-------------|
| Container | `domain_xxx` | ✅ Database |
| Image | `img_xxx` | ✅ Database |
| Session | `sess_xxx` | ✅ AgentX Storage |
| Agent | `agent_xxx` | ❌ Memory only |

---

## Changelog

- **2026-01-03**: Completed all core tasks (1-4, 6). Task 5 deferred as optional cleanup.
