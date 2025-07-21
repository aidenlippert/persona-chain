# Scaffold New Module Template

Use this prompt template to scaffold new Cosmos-SDK modules for Persona Chain:

```
You are Claude Code, an agentic developer. Scaffold a new Cosmos-SDK module for Persona Chain:

### Requirements:
- Module name: [MODULE_NAME]
- Purpose: [MODULE_DESCRIPTION]
- Key functionality: [LIST_KEY_FUNCTIONS]

### Tasks:
1. Create protobuf definitions in `proto/persona_chain/[MODULE_NAME]/v1/`
   - Define message types
   - Define query service
   - Define tx service
   - Include proper imports and options

2. Generate Go types and services in `x/[MODULE_NAME]/`
   - types/keys.go (store keys and prefixes)
   - types/messages.go (message validation and routing)
   - keeper/keeper.go (state management)
   - keeper/msg_server.go (transaction handlers)
   - keeper/query_server.go (query handlers)
   - module.go (module definition and lifecycle)

3. Add module to main app in `app/app.go`
   - Import the module
   - Add to module manager
   - Configure store keys
   - Set up keepers with dependencies

4. Create CLI commands in `x/[MODULE_NAME]/client/cli/`
   - Query commands
   - Transaction commands

5. Add genesis handling
   - Default genesis state
   - Validation logic
   - Import/export functions

6. Include proper error handling and events
7. Add comprehensive tests
8. Update go.mod if needed

### Integration Points:
- DID module integration: [IF_NEEDED]
- VC module integration: [IF_NEEDED]
- Guardian module integration: [IF_NEEDED]
- IBC packet types: [IF_NEEDED]

Proceed step by step, creating all necessary files with proper Cosmos-SDK patterns and Persona Chain conventions.
```

## Example Usage:

Replace placeholders with:
- [MODULE_NAME]: `reputation`
- [MODULE_DESCRIPTION]: `Manages user reputation scores and history`
- [LIST_KEY_FUNCTIONS]: `Track reputation events, Calculate scores, Query reputation history`
- [IF_NEEDED]: Specify integration requirements