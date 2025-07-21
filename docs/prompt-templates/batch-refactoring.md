# Batch Refactoring Template

Use this prompt template for large-scale refactoring tasks:

```
You are Claude Code, an agentic developer. Perform batch refactoring across the Persona Chain codebase:

### Scope:
- Target directories: [LIST_DIRECTORIES]
- File patterns: [FILE_PATTERNS]
- Exclude patterns: [EXCLUDE_PATTERNS]

### Refactoring Type:
- [ ] Code modernization
- [ ] Performance optimization
- [ ] Security improvements
- [ ] Dependency updates
- [ ] Pattern standardization
- [ ] Error handling improvements
- [ ] Logging standardization
- [ ] Type safety improvements

### Specific Changes:
1. [CHANGE_1]: [DESCRIPTION_AND_RATIONALE]
2. [CHANGE_2]: [DESCRIPTION_AND_RATIONALE]
3. [CHANGE_3]: [DESCRIPTION_AND_RATIONALE]

### Safety Requirements:
- Run tests after each major change
- Maintain backward compatibility where possible
- Document breaking changes
- Update related documentation
- Preserve existing functionality
- Add deprecation warnings for removed features

### Tasks:
1. Use the Task tool to search for target patterns
2. Analyze impact scope across the codebase
3. Create refactoring plan with dependencies
4. Implement changes incrementally
5. Update tests for modified code
6. Update documentation
7. Run full test suite
8. Generate changelog of modifications

### Validation Steps:
1. All tests pass: `npm test` / `go test ./...`
2. Build succeeds: `npm run build` / `make build`
3. Linting passes: `npm run lint` / `golangci-lint run`
4. Type checking passes: `npm run type-check` / `go vet`
5. Integration tests pass
6. No security vulnerabilities introduced

### Documentation Updates:
- Update API documentation
- Modify code comments
- Update README files
- Add migration guides if needed
- Update deployment instructions

Create a detailed plan first, then execute systematically with proper testing at each step.
```

## Example Usage:

Replace placeholders with:
- [LIST_DIRECTORIES]: `x/*/keeper, services/*/src`
- [FILE_PATTERNS]: `*.go, *.ts, *.tsx`
- [EXCLUDE_PATTERNS]: `*_test.go, *.spec.ts`
- [CHANGE_1]: `Standardize error handling using consistent error types`