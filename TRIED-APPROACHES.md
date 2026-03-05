# Tried Approaches for Displaying Removed Lines

## 1. Ghost Lines (Buffer Modification)

Insert actual text lines into the editor buffer prefixed with a zero-width space (`\u200B`) to show removed code inline. Red background decoration applied to ghost lines.

**Pros:**
- Removed code is always visible inline, right where the deletion happened
- Multiline content displays correctly (real lines in the buffer)

**Cons:**
- **Jumping/flickering**: `editor.edit()` adding/removing lines shifts the viewport. Even with serialized edits (single atomic edit, edit queue), the viewport jumps when lines are inserted or removed
- **ESLint/linters validate ghost lines**: Since ghost lines are real buffer content, all language extensions (ESLint, TypeScript, etc.) treat them as actual code and report errors
- **Complex save interception**: Must strip ghost lines before save (so disk content stays clean) and re-insert after save. This creates re-entrancy loops with the file system watcher
- **Re-entrancy hell**: Ghost line insertion triggers `onDidChangeTextDocument` events, which can re-trigger hunk computation and decoration application, causing infinite loops. Required multiple guard flags (`selfEditing`, `isEditing`, `isApplyingDecorations`, `isProcessingHunk`)
- **Cursor position corruption**: Inserting/removing lines shifts cursor position; restoration logic is fragile and often inaccurate

## 2. Decoration `contentText` with `before`/`after` (CSS Pseudo-elements)

Use VS Code's `DecorationRenderOptions.before` or `after` with `contentText` to inject text before/after a line.

**Pros:**
- No buffer modification
- Simple API

**Cons:**
- **VS Code strips newlines from `contentText`** (confirmed: VS Code issue #63600). Cannot display multiline content in a single decoration
- **Unicode Line Separator (`\u2028`) also stripped/collapsed** - attempted as workaround, doesn't work
- **CSS `display: block` + `white-space: pre`** via `textDecoration` injection: renders as a single-height rectangle (~20px) regardless of content length, because VS Code's line container has fixed height

## 3. Multiple `before`/`after` Decorations on Same Anchor Line

Create one decoration type per removed line, all anchored to the same editor line, each with `display: block`.

**Pros:**
- Attempted to stack multiple single-line decorations vertically

**Cons:**
- **Decorations overlap instead of stacking**: Multiple `::before`/`::after` CSS pseudo-elements on the same DOM element overlap each other. VS Code does not lay them out vertically
- Tried both `before` and `after` — same overlap behavior

## 4. Hover Provider (Tooltip on Hover)

Register a `HoverProvider` that shows removed code in a markdown tooltip when hovering over deletion markers.

**Pros:**
- No buffer modification
- Multiline markdown renders correctly in hover tooltips
- Clean, no visual clutter in the editor
- Simple to implement

**Cons:**
- **Not always visible** — user must hover to see removed code (user explicitly wanted always-visible)
- Easy to miss that lines were removed if you don't hover

**Bug encountered:** Initial implementation used a zero-width `Range` (end column `0`) for the `Hover` object, which prevented it from showing. Fixed by removing the range parameter entirely.

## 5. Line-by-Line Pairing (Old Line ↔ New Line)

Pair each removed line with a corresponding added line, showing the old content as a decoration on the new line.

**Pros:**
- Shows old content directly next to new content

**Cons:**
- **User rejected**: "It's bad idea to compare line by line. Because 2 blocks may have fully different sense." Removed and added blocks often have completely different semantics and shouldn't be paired 1:1
- Doesn't work for pure deletions (no new lines to anchor to)
- Doesn't work when old/new block sizes differ

## 6. Diff Editor View (Current Approach) ✅

Use VS Code's built-in `vscode.diff` command with a `TextDocumentContentProvider` to open a native side-by-side diff editor. Normal editor shows green decorations on added lines and red deletion markers.

**Pros:**
- No buffer modification — zero jumping, zero ESLint issues
- Native VS Code diff rendering (syntax highlighting, line numbers, proper diff navigation)
- Multiline removed blocks render perfectly
- Hover provider still works for quick preview of removed code at deletion markers
- CodeLens Accept/Reject buttons work in the normal editor
- Diff tab auto-closes when all hunks are resolved
- Simplest implementation (~300 lines of ghost line complexity removed)

**Cons:**
- Removed code is not inline in the normal editor — requires opening a separate diff tab
- Slightly more cognitive load (two views instead of one)

## Summary

| Approach | Always Visible | No Buffer Mod | Multiline | No Linter Issues |
|---|---|---|---|---|
| Ghost Lines | ✅ | ❌ | ✅ | ❌ |
| `contentText` | ✅ | ✅ | ❌ | ✅ |
| Multiple Decorations | ❌ (overlap) | ✅ | ❌ | ✅ |
| Hover Provider | ❌ | ✅ | ✅ | ✅ |
| Line-by-Line | ❌ (rejected) | ✅ | ❌ | ✅ |
| **Diff Editor** | ❌ (separate tab) | ✅ | ✅ | ✅ |

**Conclusion:** There is no VS Code API that supports always-visible multiline content inline without buffer modification. The diff editor approach is the best compromise — it provides proper multiline diff rendering without any of the jumping/linter issues.
