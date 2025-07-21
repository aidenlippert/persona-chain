# Refactor UI Components Template

Use this prompt template for UI component refactoring tasks:

```
You are Claude Code, an agentic developer. Refactor the Persona Chain frontend components:

### Current State:
- Component location: [COMPONENT_PATH]
- Current implementation: [DESCRIBE_CURRENT_STATE]
- Issues to address: [LIST_ISSUES]

### Refactoring Goals:
1. [GOAL_1] - [DESCRIPTION]
2. [GOAL_2] - [DESCRIPTION]
3. [GOAL_3] - [DESCRIPTION]

### Requirements:
- Maintain existing functionality
- Improve code reusability
- Follow React best practices
- Use TypeScript strictly
- Implement proper error handling
- Add loading states
- Ensure accessibility compliance
- Maintain responsive design

### Tasks:
1. Analyze current component structure
2. Identify reusable patterns
3. Create shared component library if needed
4. Implement proper prop interfaces
5. Add comprehensive JSDoc comments
6. Refactor state management (React Query/SWR)
7. Improve error boundaries
8. Add proper form validation with react-hook-form + zod
9. Ensure proper MCP tool integration
10. Update tests accordingly

### Integration Points:
- MCP API calls: [LIST_ENDPOINTS]
- Shared state: [DESCRIBE_STATE]
- Shell command integration: [IF_NEEDED]
- Cosmos SDK interaction: [IF_NEEDED]

### Design System:
- Use Radix UI components
- Maintain Tailwind CSS classes
- Follow existing color scheme
- Ensure consistent spacing and typography
- Add proper focus management

Proceed systematically, creating modular, maintainable, and accessible components.
```

## Example Usage:

Replace placeholders with:
- [COMPONENT_PATH]: `frontend/pages/create-did.tsx`
- [DESCRIBE_CURRENT_STATE]: `Monolithic component with inline form handling`
- [LIST_ISSUES]: `Poor error handling, No loading states, Difficult to test`
- [GOAL_1]: `Extract form logic into custom hook`