# Change: Align conversations to AgentX Agent-First model

## Why

The application currently misunderstands AgentX's architecture by treating `imageId` as the conversation identity. This is incorrect:

- **Image**: A configuration template (systemPrompt + MCP servers) that can be shared across multiple conversations
- **Agent**: A runtime instance created by `runImage(imageId, sessionId)` - this IS the conversation
- **Session**: Message storage for an Agent

Current issues:
1. Attempting to create a new Image per conversation creates unnecessary config duplication
2. WebSocket events are filtered by `imageId`, causing all conversations using the same template to receive each other's events
3. Using `image_messages_request(imageId)` returns messages from the Image's DEFAULT session, not the specific conversation

## What Changes

**Core Principle**: "1 Conversation = 1 Agent (agentId)" using a shared Domain Template Image.

- Store **conversation identity** using AgentX **agentId** (runtime instance identifier)
- Introduce a **domain template image** (per domain) that is SHARED across all conversations in that domain
- Align server operations to Agent-First APIs:
  - Create conversation: `image_run_request(imageId, sessionId)` → returns `agentId`
  - Send message: `message_send_request(agentId, content)`
  - History: `session_messages_request(sessionId)` (where sessionId ≈ agentId in practice)
  - Abort: `agent_interrupt_request(agentId)`
- Filter WebSocket events by `agentId` instead of `imageId`
- Stop exposing AgentX's raw `/ws` broadcast; use authenticated per-conversation endpoint

## Impact

- Affected specs:
  - `conversation-system` (conversation identity as agentId + streaming filtering)
  - `domain-management` (domain template image creation and persistence)
- Affected code (implementation stage):
  - `apps/web/src/server/services/conversation.service.ts` (use image_run_request, store agentId)
  - `apps/web/src/server/services/chat.service.ts` (use session_messages_request)
  - `apps/web/src/server/services/conversation-stream.service.ts` (filter by agentId)
  - `apps/web/src/server/database/index.ts` (add agent_id column)
  - `apps/web/src/client/hooks/useAgentXWebSocket.ts` (connect to app endpoint)
