DIFFUS - VS Code Extension for Inline Diff Review of AI changes
=========================================================================

PROBLEM
-------
Claude Code (CLI) modifies files directly on disk but only shows diffs in the
terminal. The terminal output is hard to read, lacks context, and cannot be
interacted with. Cursor-style inline diff review in the editor is needed.

OVERVIEW
--------
A VS Code extension that snapshots workspace files when tracking starts,
detects filesystem changes via FileSystemWatcher, and renders inline diff
decorations in the editor with per-hunk accept/reject controls.

TECH STACK
----------
- Language: TypeScript
- Platform: VS Code Extension API (no Webview)
- Distribution: Local VSIX install (personal use, no marketplace)
- File scope: Text files only (ignore binary files)
- Workspace scope: Only track files within the opened VS Code workspace

ARCHITECTURE
------------

1. SNAPSHOT MANAGER
   - When "Start track changes" is clicked, iterate all text files in the
     workspace and store their contents in memory (Map<filePath, string>).
   - For files that don't exist at snapshot time but are created later,
     treat the snapshot as "file did not exist" (empty baseline).
   - When "Stop track changes" is clicked, stop the filesystem watcher
     (no new changes are detected), but keep all snapshots and diff
     decorations intact. The user can still accept/reject hunks and
     navigate changed files after stopping.
   - Snapshots and decorations are only cleared when all hunks have been
     accepted/rejected.
   - When "Start track changes" is clicked again while pending diffs
     exist: take a fresh snapshot for the new tracking session, but do
     NOT discard existing pending diffs from the previous session. Old
     diffs remain reviewable (accept/reject) alongside any new diffs
     that appear from the new session.

2. FILESYSTEM WATCHER
   - Use vscode.workspace.createFileSystemWatcher("**/*") scoped to the
     workspace folder.
   - Listen to onDidChange, onDidCreate, and onDidDelete events.
   - On each event, compare the current file content against the snapshot
     to compute a diff (added/removed/modified hunks).
   - Ignore binary files (detect via file extension list or content check).
   - Debounce rapid changes (e.g., 300ms) to avoid flickering during
     multi-file saves by Claude Code.

3. DIFF ENGINE
   - Use a line-based diff algorithm (e.g., the "diff" npm package or
     VS Code's built-in diff utilities) to compute hunks.
   - A "hunk" is a contiguous block of changed lines (added, removed, or
     modified). This is the unit of accept/reject.
   - For modified lines: show the removed version (from snapshot) in red
     and the added version (current file) in green.
   - For new files (no snapshot baseline): all lines are "added" (green).
   - For deleted files (file removed from disk): all lines from the
     snapshot are "removed" (red).

4. INLINE DIFF RENDERING
   - Display diffs inline in the same editor tab (not side-by-side).
   - Use VS Code DecorationTypes for styling:
     * Added lines: green background (e.g., rgba(0, 180, 0, 0.15))
     * Removed lines: red background (e.g., rgba(220, 0, 0, 0.15))
       Removed lines should be rendered as virtual content (using
       DecorationRenderOptions with "before" content) above the current
       line, since they don't exist in the current file.
   - When the user opens a file that has pending changes, decorations
     should appear automatically.
   - When changes are detected in a file, do NOT auto-scroll or auto-open
     the file. Instead, show a notification badge/indicator.

5. ACCEPT / REJECT PER HUNK
   - Each hunk shows two CodeLens or inline buttons: "Accept" and "Reject".
   - "Accept" = keep the file as-is on disk for that hunk. Remove the diff
     decoration (both the green added lines and the red removed lines
     overlay) for that hunk. The snapshot for that region is updated to
     match the current file content so it won't show as a diff again.
   - "Reject" = restore that hunk to the snapshot version. The extension
     writes the original lines back to the file on disk for that hunk
     region, then removes the diff decoration. The snapshot is already
     correct for that region.
   - After accept/reject, if no more hunks remain in the file, remove the
     file from the "changed files" list.

6. ACCEPT ALL / REJECT ALL PER FILE
   - Each file with pending changes shows "Accept All" and "Reject All"
     buttons in the editor title bar (top-right area of the editor tab).
   - "Accept All" = accept every hunk in the file at once.
   - "Reject All" = reject every hunk (restore entire file to snapshot).
   - After either action, clear all decorations for that file.

7. FILE NAVIGATION (BACK / NEXT)
   - The extension maintains an ordered list of files with pending changes.
   - "Back" and "Next" buttons appear in the editor title bar (top-right
     corner of the editor, like Cursor does).
   - Clicking "Next" opens the next changed file in the editor.
   - Clicking "Back" opens the previous changed file.
   - Show a counter like "2 / 5 files" between the buttons.
   - Navigation wraps around (after last file, next goes to first).

8. STATUS BAR TOGGLE
   - A status bar item in the bottom-right area of VS Code.
   - Three states:
     * Idle (no snapshots): shows "Start Tracking" with a play icon.
     * Tracking (watcher active): shows "Stop Tracking" with a stop icon,
       plus a badge with the number of changed files (e.g., "Stop Tracking
       (3 files)").
     * Stopped with pending diffs: shows "Start Tracking" with a play
       icon, plus a badge with remaining unreviewed files (e.g.,
       "Start Tracking (3 pending)"). The user can still accept/reject.
   - Clicking in "Idle" state: takes snapshots, starts watcher.
   - Clicking in "Tracking" state: stops watcher, keeps snapshots & diffs.
   - Clicking in "Stopped with pending diffs" state: takes fresh
     snapshots and starts a new watcher. Old pending diffs are kept —
     the user can still accept/reject them.

9. COMMANDS & KEYBINDINGS
   - diffus.startTracking  — Start tracking changes
   - diffus.stopTracking   — Stop tracking changes
   - diffus.toggleTracking — Toggle tracking on/off (status bar click)
   - diffus.nextFile       — Navigate to next changed file
   - diffus.prevFile       — Navigate to previous changed file
   - diffus.acceptHunk     — Accept the hunk at cursor position
   - diffus.rejectHunk     — Reject the hunk at cursor position
   - diffus.acceptAllFile  — Accept all hunks in the current file
   - diffus.rejectAllFile  — Reject all hunks in the current file

   Default keybindings (suggestions):
   - Alt+] — Next changed file
   - Alt+[ — Previous changed file

VISUAL DESIGN
-------------
- Added lines: green background highlight, full line width.
- Removed lines: red background highlight, rendered as "ghost" lines
  above the insertion point (virtual/overlay text that is not editable).
- Modified lines: show the old version in red (ghost line above) and the
  new version in green (actual line highlighted).
- Accept/Reject buttons: rendered via CodeLens above each hunk, with
  labels "Accept" and "Reject".
- Accept All / Reject All: editor title bar buttons (top-right of editor).
- Back / Next / file counter: editor title bar buttons (top-right of editor).

EDGE CASES
----------
- User manually edits a tracked file: re-diff against the original
  snapshot. The diff updates to reflect both Claude's and user's changes.
- File is saved externally (outside VS Code): FileSystemWatcher picks it
  up and re-diffs.
- Large files: consider limiting snapshot size or excluding files above a
  threshold (e.g., 5 MB).
- Multiple workspace folders: track all folders in the workspace.
- Tracking started with uncommitted changes: the snapshot captures the
  current state, so pre-existing uncommitted changes are part of the
  baseline, not shown as diffs.

NON-GOALS (out of scope for v1)
-------------------------------
- Parsing Claude Code terminal output (use filesystem watching instead).
- Side-by-side diff view.
- Per-line accept/reject (only per-hunk).
- Binary file diffing.
- Publishing to VS Code Marketplace.
- Git integration (works independently of git).
- Tracking files outside the workspace.
