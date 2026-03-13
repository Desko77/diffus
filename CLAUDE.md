# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run compile        # Compile TypeScript → out/
npm run watch          # Compile in watch mode
npm test               # Run tests (vitest)
npm run test:watch     # Run tests in watch mode
npm run lint           # Fix: prettier + eslint + tsc type check
npm run lint:check     # Check only (CI-friendly)
npm run package        # Build .vsix package
```

Run a single test file:
```bash
npx vitest run src/diffEngine.test.ts
```

### Mandatory Post-Change Step

After every code change, reinstall the extension so the user only needs to reload VS Code:

```bash
cd /c/development/projects/diffus && npx @vscode/vsce package && "/c/Users/Rostislav/AppData/Local/Programs/Microsoft VS Code/bin/code.cmd" --install-extension diffus-0.1.1.vsix --force
```

Always do this before telling the user the change is ready.

### Write tests after feature implementation

## Architecture

Diffus is a VS Code extension for inline diff review of AI code changes. It snapshots workspace files, detects changes via filesystem watcher, and lets users accept/reject changes hunk-by-hunk using keyboard shortcuts (Tab/Esc).

### Core Data Flow

```
File change on disk
  → FileSystemWatcherManager (debounce 300ms, filter gitignore/binary/>1MB)
  → DiffEngine.computeHunks() (uses npm `diff` package)
  → HunkManager stores hunks per file
  → HunkManager.onDidChange event fires
  → DecorationManager applies green/red styling
  → CursorTracker sets context key `diffus.cursorInHunk`
  → Tab/Esc keybindings enabled when cursor is in a hunk
```

### Key Modules

- **extension.ts** — Entry point. Command handlers, state management (Idle/Tracking/StoppedWithPending), coordinates all managers.
- **snapshotManager.ts** — Takes and stores file snapshots at tracking start. Session-based (multiple concurrent sessions).
- **hunkManager.ts** — Stores DiffHunk[] per file, emits change events. Central state for what hunks exist.
- **fileSystemWatcher.ts** — Watches disk changes, debounces per-file, filters ignored files, triggers hunk computation.
- **diffEngine.ts** — Computes DiffHunk[] from old/new content using `structuredPatch()`.
- **decorationManager.ts** — Green backgrounds (added lines), red deletion markers (removed lines).
- **cursorTracker.ts** — Sets VS Code context key `diffus.cursorInHunk` to enable/disable Tab/Esc.
- **navigationManager.ts** — Cycles through changed files (Alt+]/Alt+[).
- **storageManager.ts** — Persists session to `${TMPDIR}/diffus/${WORKSPACE_HASH}/` for survival across reloads.
- **codeLensProvider.ts** — Renders "Accept All | Reject All | Show Diff" above files with hunks.
- **diffViewManager.ts** — Opens native VS Code side-by-side diff editor.
- **snapshotContentProvider.ts** — Virtual file provider (URI scheme `diffus://`) for diff editor "before" side.

### Important Design Patterns

- **Guard flags**: `isProcessingHunk` and `selfEditing` prevent infinite loops when the extension modifies files (reject hunk → file change → watcher detects → recompute).
- **Session-based tracking**: New tracking sessions can start while old hunks are still pending review.
- **Context keys**: Menu items and keybindings only appear when relevant (e.g., `diffus.cursorInHunk`, `diffus.hasChanges`).

### Testing

Tests use Vitest with a mocked `vscode` module (`src/__mocks__/vscode.ts`). Tests run without a VS Code instance.

### Design Decisions

See `TRIED-APPROACHES.md` for why inline ghost lines and contentText decorations were rejected in favor of the current diff editor approach.
