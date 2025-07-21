# Automate Release Changelog Template

Use this prompt template to generate release changelogs:

```
You are Claude Code, an agentic developer. Generate a comprehensive release changelog for Persona Chain:

### Release Information:
- Version: [VERSION] (e.g., v1.2.0)
- Previous version: [PREV_VERSION] (e.g., v1.1.0)
- Release date: [RELEASE_DATE]
- Release type: [major|minor|patch]

### Tasks:
1. Use git commands to analyze changes since last release:
   ```bash
   git log [PREV_VERSION]..HEAD --oneline
   git diff [PREV_VERSION]..HEAD --stat
   ```

2. Categorize changes:
   - ✨ **New Features**
   - 🐛 **Bug Fixes**
   - 🔧 **Improvements**
   - 🔒 **Security**
   - 📚 **Documentation**
   - 🧪 **Testing**
   - 🚀 **Performance**
   - 💥 **Breaking Changes**
   - 🗑️ **Deprecated**

3. Analyze commit messages and pull requests
4. Identify breaking changes and migration steps
5. List new dependencies or removed ones
6. Note compatibility requirements

### Changelog Format:
```markdown
# Release [VERSION] - [RELEASE_DATE]

## Overview
[Brief description of the release]

## 💥 Breaking Changes
- [List breaking changes with migration instructions]

## ✨ New Features
### Blockchain Modules
- [Feature]: [Description] ([commit/PR])

### Services
- [Feature]: [Description] ([commit/PR])

### Frontend
- [Feature]: [Description] ([commit/PR])

## 🐛 Bug Fixes
- [Fix]: [Description] ([commit/PR])

## 🔧 Improvements
- [Improvement]: [Description] ([commit/PR])

## 🔒 Security
- [Security fix]: [Description] ([commit/PR])

## 📚 Documentation
- [Doc update]: [Description] ([commit/PR])

## 🧪 Testing
- [Test improvement]: [Description] ([commit/PR])

## Dependencies
### Added
- [dependency] [version] - [reason]

### Updated
- [dependency] [old-version] → [new-version] - [reason]

### Removed
- [dependency] - [reason]

## Compatibility
- **Blockchain**: Compatible with [versions]
- **Node.js**: Requires [version]
- **Go**: Requires [version]
- **Database**: Schema version [version]

## Migration Guide
[Step-by-step migration instructions for breaking changes]

## Contributors
[List of contributors with their contributions]

## Download
- **Source code**: [GitHub release link]
- **Docker images**: 
  - `ghcr.io/persona-chain/persona-chain:[VERSION]`
  - `ghcr.io/persona-chain/api-service:[VERSION]`
  - `ghcr.io/persona-chain/db-service:[VERSION]`
  - `ghcr.io/persona-chain/frontend:[VERSION]`

## Verification
- **Git tag**: `git verify-tag [VERSION]`
- **Docker image signatures**: [Include signature verification]
```

### Additional Tasks:
1. Update version numbers in:
   - `package.json` files
   - `Chart.yaml`
   - `go.mod`
   - Docker tags
   - Documentation references

2. Create GitHub release with:
   - Release notes
   - Compiled binaries
   - Docker image references
   - Security signatures

3. Update documentation:
   - API docs
   - Deployment guides
   - Migration instructions

4. Notify relevant channels:
   - GitHub discussions
   - Community channels
   - Integration partners

Generate the changelog and create all necessary release artifacts.
```

## Example Usage:

Replace placeholders with:
- [VERSION]: `v1.2.0`
- [PREV_VERSION]: `v1.1.0`
- [RELEASE_DATE]: `2024-01-15`
- [major|minor|patch]: `minor`