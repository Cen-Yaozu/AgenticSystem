# Tasks: Align conversations to AgentX Agent-First model

## 1. Schema and types ✅
- [x] Add `template_image_id` column to domains table
- [x] Add `agent_id` column to conversations table (primary conversation identifier)
- [x] Add `image_id` column to conversations table (reference to domain template)
- [x] Update shared types to reflect `Conversation.agentId` as required field
- [x] Create migration script for existing conversations

## 2. Domain template image ✅
- [x] On domain registration, create template image via `image_create_request`
- [x] Persist `templateImageId` in domains table
- [x] Ensure template image contains domain config (systemPrompt, mcpServers)

## 3. Conversation lifecycle (Agent-First) ✅
- [x] Create conversation via `image_run_request(templateImageId, sessionId)`
- [x] Extract and store `agentId` from response
- [x] Update message send to use `message_send_request(agentId, content)`
- [x] Update history fetch to use `session_messages_request(sessionId)`
- [x] Update abort to use `agent_interrupt_request(agentId)`

## 4. Streaming (filter by agentId) ✅
- [x] Change WebSocket filtering from `imageId` to `agentId`
- [x] Update `conversation-stream.service.ts` forwardEvent logic
- [x] Use app-owned endpoint: `/api/v1/conversations/:id/stream?token=...`
- [x] Ensure authentication via existing `authenticateStreamRequest`

## 5. Frontend updates ✅
- [x] Update `useAgentXWebSocket` hook to use `conversationId` parameter
- [x] Change connection URL to `/api/v1/conversations/:id/stream?token=...`
- [x] Remove client-side filtering (now handled server-side)

## 6. Validation ⏸️
- [ ] Add integration tests:
  - create domain → template image persisted
  - create conversation → agent created + stored
  - send message → correct agentId used
  - history fetch uses session_messages_request
  - WebSocket events filtered by agentId
  - Multiple conversations using same template don't receive each other's events
- [x] Run `openspec validate align-conversation-to-image-model --strict`
