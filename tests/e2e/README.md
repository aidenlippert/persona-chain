# Persona Chain E2E Tests

Comprehensive end-to-end testing suite for Persona Chain using Puppeteer and Jest.

## Overview

This test suite provides complete E2E testing for the Persona Chain DID, VC, and ZK proof systems including:

- **API Integration Tests**: Direct API testing against the mock testnet
- **UI End-to-End Tests**: Browser automation testing of the frontend
- **Complete Workflow Tests**: Full user journey testing combining all components
- **Multi-User Scenarios**: Testing interactions between multiple users
- **Performance Testing**: Load testing and rapid operation scenarios

## Prerequisites

- Node.js 18+ 
- Mock testnet daemon running on port 1317
- Frontend application running on port 3000 (for UI tests)

## Installation

```bash
npm install
```

## Running Tests

### All Tests
```bash
npm test
```

### API Tests Only
```bash
npm test -- tests/api.test.ts
```

### UI Tests Only
```bash
npm test -- tests/ui.test.ts
```

### Workflow Tests Only
```bash
npm test -- tests/workflow.test.ts
```

### Watch Mode
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:ci
```

## Test Configuration

### Environment Variables

- `HEADLESS=false` - Run browser in non-headless mode for debugging
- `DEVTOOLS=true` - Open browser DevTools during tests
- `SLOW_MO=100` - Add delay between browser actions (ms)
- `DEBUG_BROWSER=true` - Log browser console messages
- `SCREENSHOTS=true` - Take screenshots on failures/key moments

### Example Debug Run
```bash
HEADLESS=false DEVTOOLS=true SLOW_MO=50 npm test -- tests/ui.test.ts
```

## Mock Testnet

The tests use a mock testnet daemon that provides realistic API responses without requiring a full Cosmos SDK chain. The daemon simulates:

- Chain status and health endpoints
- Transaction broadcasting with mock responses
- DID document management
- ZK proof and circuit management
- Verifiable credential operations

### Starting Mock Testnet
```bash
cd ../../cmd/testnet-daemon
./testnet-daemon
```

## Test Structure

### API Tests (`tests/api.test.ts`)
- Chain health and status verification
- Account balance queries
- DID operations (list, get, create)
- ZK proof operations (list circuits, submit proofs)
- VC operations (list, issue, revoke)
- Transaction broadcasting
- Chain progression testing

### UI Tests (`tests/ui.test.ts`)
- DID creation workflow through UI
- ZK proof generation interface
- VC management interface
- Navigation and layout testing
- Error handling and validation
- Network error simulation

### Workflow Tests (`tests/workflow.test.ts`)
- Complete DID → VC → ZK Proof → Verification workflow
- Multi-user interactions (issuer/subject scenarios)
- VC revocation and proof invalidation
- Performance testing with rapid operations
- Complex state transitions

## Custom Jest Matchers

The test suite includes custom Jest matchers for blockchain-specific assertions:

- `toBeValidTxHash()` - Validates transaction hash format
- `toBeValidDID()` - Validates DID format (did:persona:*)

## Screenshots

Screenshots are automatically taken at key test moments when `SCREENSHOTS=true`. They're saved to `./screenshots/` with timestamps.

## Debugging

### Browser Debugging
1. Set `HEADLESS=false DEVTOOLS=true`
2. Add `await page.waitForTimeout(60000)` to pause execution
3. Inspect elements and debug in browser

### Network Debugging
1. Set `DEBUG_BROWSER=true` to see console logs
2. Use request interception to mock specific scenarios
3. Check browser network tab for failed requests

## CI/CD Integration

The test suite is designed for CI environments:

- Headless by default
- Configurable timeouts
- Screenshots on failures
- Coverage reporting
- Exit codes for pass/fail

### Example CI Configuration
```yaml
- name: Run E2E Tests
  run: |
    cd tests/e2e
    npm ci
    npm run test:ci
```

## Performance Considerations

- Tests run against a mock testnet for speed
- Parallel test execution where possible
- Configurable timeouts for different scenarios
- Memory cleanup after browser tests

## Extending Tests

### Adding New Test Cases
1. Create new test file in `tests/` directory
2. Import required utilities from `src/utils/`
3. Follow existing patterns for setup/teardown
4. Add custom matchers as needed

### Adding New UI Pages
1. Update `browser.ts` utilities if needed
2. Create page-specific test functions
3. Add navigation tests for new routes
4. Include error scenarios

### Mock Data Updates
Update the mock testnet daemon (`../../cmd/testnet-daemon/`) to include new endpoints or modify response formats.