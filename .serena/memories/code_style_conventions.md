# PersonaPass Code Style & Conventions

## File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `cryptoUtils.ts`)
- **Test files**: kebab-case (e.g., `user-profile.test.tsx`)
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase with Type suffix (e.g., `UserProfileType`)

## Import/Export Patterns
- **Prefer named exports** over default exports
- **Destructure imports**: `import { useState } from 'react'`
- **Group imports**: external → internal → relative
- **Co-locate types** with implementation where possible

## TypeScript Standards
- **Strict mode enabled**
- **Prefer interfaces** over types for object shapes
- **Use discriminated unions** for complex states
- **Always type external API responses**
- **No `any` types** - use `unknown` when needed

## React Patterns
- **Functional components** with hooks only
- **Custom hooks** for shared logic (prefix with `use`)
- **Error boundaries** for robustness
- **Lazy loading** for performance optimization
- **Props interfaces** for all components

## Security Requirements
- **Never log private keys** or sensitive data
- **Validate all external inputs**
- **Use constant-time comparisons** for crypto
- **Implement proper error handling** without info leakage
- **Always use HTTPS** in production

## Component Structure
```typescript
// 1. External imports
import React from 'react';
import { useState } from 'react';

// 2. Internal imports
import { Button } from '../ui/Button';

// 3. Type definitions
interface ComponentProps {
  title: string;
}

// 4. Component implementation
export const Component: React.FC<ComponentProps> = ({ title }) => {
  // Component logic
};
```