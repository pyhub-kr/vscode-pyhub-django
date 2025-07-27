# Release Process

This document describes the release process for Django Power Tools.

## Automated Release via GitHub Actions

The release process is automated using GitHub Actions. When you push a version tag, the workflow automatically:

1. Compiles TypeScript and runs linting
2. Creates a `.vsix` package file
3. Creates a GitHub Release
4. Uploads the `.vsix` file as a release asset

**Note**: Due to the complexity of running VS Code Extension tests in CI environments, automated tests are run separately in the CI workflow but are not blocking for releases.

## How to Create a Release

1. **Update the version in package.json**:
   ```bash
   npm version patch  # for bug fixes (0.1.0 -> 0.1.1)
   npm version minor  # for new features (0.1.0 -> 0.2.0)
   npm version major  # for breaking changes (0.1.0 -> 1.0.0)
   ```

2. **Update CHANGELOG.md**:
   - Move items from "Unreleased" to the new version section
   - Add the release date
   - Update comparison links at the bottom

3. **Commit the changes**:
   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore: prepare release v0.1.0"
   ```

4. **Create and push the tag**:
   ```bash
   git tag v0.1.0
   git push origin main
   git push origin v0.1.0
   ```

5. **GitHub Actions will automatically**:
   - Run tests
   - Build the extension
   - Create a GitHub Release
   - Upload the `.vsix` file

## Manual Release Process (if needed)

If you need to create a release manually:

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Package the extension
vsce package

# This creates a file like: django-power-tools-0.1.0.vsix
```

## Publishing to VS Code Marketplace

To publish to the VS Code Marketplace (requires publisher account):

1. Create a Personal Access Token at https://dev.azure.com/
2. Add the token as a GitHub Secret named `VSCE_PAT`
3. Uncomment the marketplace publishing section in `.github/workflows/release.yml`

Or manually:
```bash
vsce publish
```

## Pre-release Checklist

- [ ] **Run tests locally** (`npm test`) - VS Code Extension tests must be run locally
- [ ] No linting errors (`npm run lint`)
- [ ] Extension builds successfully (`npm run compile`)
- [ ] Manual testing completed
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

## Testing Guidelines

### Local Testing

VS Code Extension tests require a full VS Code instance and cannot reliably run in headless CI environments. Before releasing:

1. **Run all tests locally**:
   ```bash
   npm test
   ```

2. **Test on multiple platforms if possible**:
   - Windows
   - macOS
   - Linux

3. **Manual smoke testing**:
   - Install the extension from the `.vsix` file
   - Test core features:
     - Python path configuration
     - Django model completions
     - URL tag completions
     - manage.py commands

### CI Testing

The CI workflow (`ci.yml`) attempts to run tests but is configured with `continue-on-error: true` to prevent blocking PRs. Use CI results as guidance but rely on local testing for release validation.