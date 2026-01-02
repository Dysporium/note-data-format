# Publishing Guide

How to publish this extension to the VS Code Marketplace. It's not rocket science, but Microsoft's documentation can be a bit scattered, so here's everything in one place.

## Prerequisites

You'll need:
- A Microsoft account (or Azure DevOps account)
- A Personal Access Token with Marketplace permissions
- The `vsce` tool (we'll install it)

## Step 1: Install vsce

You can install it globally, but using npx is cleaner:

```bash
npm install -g @vscode/vsce
```

Or just use npx when you need it (recommended):

```bash
npx @vscode/vsce package
```

## Step 2: Get a Personal Access Token

1. Go to [Azure DevOps](https://dev.azure.com) and sign in
2. Click your profile picture (top right) → Security
3. Click "Personal access tokens" → "New Token"
4. Configure it:
   - Name: `VS Code Extension Publishing` (or whatever you want)
   - Organization: `All accessible organizations`
   - Expiration: Your choice (90 days is reasonable)
   - Scopes: Select "Custom defined" → Check "Marketplace (Manage)"
5. Click Create
6. **Copy the token immediately** - Microsoft won't show it to you again, and you'll have to make a new one if you lose it.

## Step 3: Create a Publisher Account

1. Go to [Visual Studio Marketplace - Manage](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. If you don't have a publisher account yet, you'll be prompted to create one
4. Fill in:
   - Publisher ID: `dysporium` (must be unique, lowercase, no spaces)
   - Publisher Name: `Dysporium` (this is what users see)
   - Support Email: Your email
5. Click Create

The publisher ID in your `package.json` must match this exactly, or publishing will fail with a cryptic error message.

## Step 4: Verify package.json

Check that `package.json` has:
- `publisher` field matching your publisher ID exactly
- `name` field that's globally unique (e.g., `notedf-vscode`)
- `version` field (start with `0.1.0` for first release)
- All the usual metadata (description, repository, etc.)

## Step 5: Build the Extension

```bash
cd packages/notedf-vscode
npm install
npm run compile
```

This compiles TypeScript to JavaScript in the `out/` directory. If it fails, fix the errors before proceeding. The Marketplace won't accept broken extensions (surprisingly).

## Step 6: Package the Extension

Create a `.vsix` file:

```bash
npm run package
```

This creates `notedf-vscode-0.1.0.vsix` (or whatever your version is). You can also upload this file manually if you prefer the web interface.

## Step 7: Publish

### Command Line (Recommended)

```bash
npx @vscode/vsce publish
```

It will ask for your Personal Access Token. Paste the one you created in Step 2.

### Web Interface (Alternative)

1. Go to [Visual Studio Marketplace - Manage](https://marketplace.visualstudio.com/manage)
2. Click "New extension" → "Visual Studio Code"
3. Upload your `.vsix` file
4. Fill in the details (most of this comes from package.json, but you can add more)
5. Click Save → Publish

## Step 8: Wait

The extension usually appears within a few minutes. Sometimes it takes longer. Check:

`https://marketplace.visualstudio.com/items?itemName=dysporium.notedf-vscode`

Replace `dysporium.notedf-vscode` with your actual publisher ID and extension name.

## Updating the Extension

When you need to push an update:

1. Bump the version in `package.json` (use semantic versioning: `0.1.1` for patches, `0.2.0` for minor updates, `1.0.0` for major changes)
2. Build and package:
   ```bash
   npm run compile
   npm run package
   ```
3. Publish:
   ```bash
   npx @vscode/vsce publish
   ```

The Marketplace will automatically update the extension. Users will get notified about updates if they have auto-update enabled.

## Common Issues

**"Publisher not found"**
- The `publisher` field in `package.json` doesn't match your publisher ID. Check for typos, case sensitivity, and extra spaces.

**"Extension name already exists"**
- Someone else already took that name. Pick something else. The name must be globally unique across all VS Code extensions.

**"Invalid Personal Access Token"**
- The token doesn't have the "Marketplace (Manage)" scope, or it expired. Create a new one.

**"File size too large"**
- Extensions have a 50MB limit. Check your `.vscodeignore` file to exclude unnecessary files. Source files, node_modules, and build artifacts should already be excluded.

## Testing Locally

Before publishing, test the extension:

1. Press `F5` in VS Code (opens a new window with the extension loaded)
2. Create a `.notedf` file
3. Verify syntax highlighting works
4. Make sure nothing crashes

If it works locally, it should work for others. Mostly.

## Resources

- [Official Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Policies](https://aka.ms/vsmarketplace-policies)

## Quick Reference

```bash
npm install              # Install dependencies
npm run compile          # Build extension
npm run watch            # Watch mode (auto-rebuild)
npm run package          # Create .vsix file
npx @vscode/vsce publish # Publish to marketplace
npx @vscode/vsce ls      # List published extensions
```
