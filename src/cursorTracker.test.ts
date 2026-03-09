import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CursorTracker } from './cursorTracker';
import { HunkManager } from './hunkManager';
import { DiffHunk } from './types';
import { commands, window } from 'vscode';

function makeHunk(id: string, newStart: number, newLinesCount = 3): DiffHunk {
  return {
    id,
    sessionId: 's1',
    oldStart: newStart,
    oldLines: Array(newLinesCount).fill('old'),
    newStart,
    newLines: Array(newLinesCount).fill('new'),
  };
}

describe('CursorTracker', () => {
  let hunkManager: HunkManager;
  let tracker: CursorTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    hunkManager = new HunkManager();
    (window as { activeTextEditor: unknown }).activeTextEditor = undefined;
    tracker = new CursorTracker(hunkManager);
  });

  it('returns undefined hunkId when no hunks exist', () => {
    expect(tracker.getCurrentHunkId()).toBeUndefined();
  });

  it('update() sets cursorInHunk to false when no active editor', () => {
    tracker.update();

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'diffus.cursorInHunk',
      false,
    );
  });

  it('dispose clears context key', () => {
    tracker.dispose();

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'diffus.cursorInHunk',
      false,
    );
  });

  it('update() sets cursorInHunk to true when cursor is in a hunk', () => {
    hunkManager.setHunksForFile('/test/file.ts', 's1', [makeHunk('h1', 5)]);

    (window as { activeTextEditor: unknown }).activeTextEditor = {
      document: { uri: { fsPath: '/test/file.ts' } },
      selection: { active: { line: 5 } },
    };

    tracker.update();

    expect(commands.executeCommand).toHaveBeenCalledWith('setContext', 'diffus.cursorInHunk', true);
    expect(tracker.getCurrentHunkId()).toBe('h1');
  });

  it('update() sets cursorInHunk to false when cursor is outside hunk', () => {
    hunkManager.setHunksForFile('/test/file.ts', 's1', [makeHunk('h1', 5)]);

    (window as { activeTextEditor: unknown }).activeTextEditor = {
      document: { uri: { fsPath: '/test/file.ts' } },
      selection: { active: { line: 100 } },
    };

    tracker.update();

    expect(commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'diffus.cursorInHunk',
      false,
    );
    expect(tracker.getCurrentHunkId()).toBeUndefined();
  });
});
