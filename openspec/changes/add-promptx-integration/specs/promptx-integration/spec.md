## ADDED Requirements

### Requirement: PromptX MCP Configuration
The system SHALL configure PromptX MCP server when creating AgentX Image for a domain.

#### Scenario: MCP server configured on image creation
- **WHEN** a new AgentX Image is created for a domain
- **THEN** the Image configuration SHALL include PromptX MCP server settings
- **AND** the MCP server SHALL be configured with command `npx -y @promptx/mcp-server`

#### Scenario: System prompt includes cognitive cycle guidance
- **WHEN** a new AgentX Image is created
- **THEN** the system prompt SHALL include guidance for the cognitive cycle
- **AND** the guidance SHALL explain how to use recall, answer, and remember tools

### Requirement: Role Activation
The system SHALL enable AI to activate professional roles through PromptX action tool.

#### Scenario: AI activates role during conversation
- **WHEN** a conversation starts in a domain
- **THEN** the AI SHALL be able to call the action tool to activate a role
- **AND** the role activation SHALL affect the AI's behavior and knowledge

#### Scenario: Default role activation
- **WHEN** a domain has a configured role ID
- **THEN** the system prompt SHALL instruct AI to activate that role
- **AND** the AI SHALL activate the role at the beginning of conversation

### Requirement: Memory Retrieval
The system SHALL enable AI to retrieve memories through PromptX recall tool.

#### Scenario: AI retrieves memories using DMN mode
- **WHEN** AI needs to understand the memory landscape
- **THEN** AI SHALL call recall with null query (DMN mode)
- **AND** the recall SHALL return a panoramic view of memory network

#### Scenario: AI retrieves memories using keyword mode
- **WHEN** AI needs specific information from memory
- **THEN** AI SHALL call recall with relevant keywords
- **AND** the recall SHALL return memories matching the keywords

### Requirement: Memory Storage
The system SHALL enable AI to store memories through PromptX remember tool.

#### Scenario: AI saves important information as memory
- **WHEN** AI learns important information during conversation
- **THEN** AI SHALL call remember to save the information
- **AND** the memory SHALL include content, schema (keywords), strength, and type

#### Scenario: Memory types
- **WHEN** AI saves a memory
- **THEN** the memory type SHALL be one of: ATOMIC (facts), LINK (relationships), PATTERN (processes)
- **AND** the schema SHALL contain space-separated keywords extracted from content

### Requirement: Domain Role Creation
The system SHALL create a dedicated role for each domain using PromptX Nuwa.

#### Scenario: Role created on domain creation
- **WHEN** a new domain is created with expertise field
- **THEN** the system SHALL invoke Nuwa to create a professional role
- **AND** the role ID SHALL be saved to domain configuration

#### Scenario: Role creation failure handling
- **WHEN** role creation fails
- **THEN** the system SHALL use a default role (assistant)
- **AND** the error SHALL be logged for debugging

### Requirement: Tool Discovery
The system SHALL enable AI to discover available roles and tools through PromptX discover tool.

#### Scenario: AI discovers available resources
- **WHEN** AI needs to know what roles or tools are available
- **THEN** AI SHALL call discover tool
- **AND** the discover SHALL return lists of available roles and tools
