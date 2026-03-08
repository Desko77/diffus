# Diffus

VS Code extension for inline diff review while working with CLI AI tools (Claude Code, Codex, etc.).

CLI AI tools modify files directly on disk but only show diffs in the terminal, which is hard to read and interact with. Diffus brings Cursor-style inline diff review to VS Code — snapshot your workspace, let the AI make changes, then review every hunk with accept/reject controls right in the editor.

## Examples

### Changes Tracking

![Changes Tracking](assets/changes-tracking.png)

### References Copier

![References Copier](assets/references-copier.png)

## How It Works

1. Click **Start Tracking** in the status bar — Diffus snapshots all workspace files.
2. Let your CLI AI tool make changes — Diffus detects them via filesystem watcher.
3. Review diffs inline: added lines in green, removed lines as red ghost lines above.
4. **Accept** or **Reject** each hunk, or use **Accept All / Reject All** per file.
5. Navigate between changed files with **Back / Next** buttons in the editor title bar.

## Features

- **Inline diff rendering** — added lines highlighted green, removed lines shown as red ghost lines (no side-by-side view needed)
- **Per-hunk accept/reject** — CodeLens buttons on each hunk
- **Per-file accept all / reject all** — editor title bar buttons
- **File navigation** — Back/Next buttons with file counter (e.g. "2 / 5 files")
- **Status bar toggle** — Start/Stop tracking with changed file count badge
- **Debounced watching** — handles rapid multi-file saves without flickering
- **Session persistence** — stop tracking and still review pending diffs; start a new session without losing unreviewed changes

## Commands & Keybindings

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `diffus.toggleTracking` | Toggle tracking on/off (status bar) |
| `diffus.startTracking`  | Start tracking changes              |
| `diffus.stopTracking`   | Stop tracking changes               |
| `diffus.nextFile`       | Next changed file (`Alt+]`)         |
| `diffus.prevFile`       | Previous changed file (`Alt+[`)     |
| `diffus.acceptHunk`     | Accept hunk at cursor               |
| `diffus.rejectHunk`     | Reject hunk at cursor               |
| `diffus.acceptAllFile`  | Accept all hunks in file            |
| `diffus.rejectAllFile`  | Reject all hunks in file            |

## Install

```bash
npx @vscode/vsce package
code --install-extension diffus-0.1.0.vsix
```

## Tech Stack

- TypeScript
- VS Code Extension API (no Webview)
- Local VSIX install (not on Marketplace)
