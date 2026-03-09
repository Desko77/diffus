import { describe, it, expect, beforeEach } from 'vitest';
import { DiffusCodeLensProvider } from './codeLensProvider';
import { HunkManager } from './hunkManager';
import { DiffHunk } from './types';

function makeHunk(id: string, newStart: number): DiffHunk {
  return {
    id,
    sessionId: 's1',
    oldStart: newStart,
    oldLines: ['old'],
    newStart,
    newLines: ['new'],
  };
}

function makeDocument(filePath: string) {
  return {
    uri: { fsPath: filePath },
  } as { uri: { fsPath: string } };
}

describe('DiffusCodeLensProvider', () => {
  let hunkManager: HunkManager;
  let provider: DiffusCodeLensProvider;

  beforeEach(() => {
    hunkManager = new HunkManager();
    provider = new DiffusCodeLensProvider(hunkManager);
  });

  it('returns no lenses for file without hunks', () => {
    const lenses = provider.provideCodeLenses(makeDocument('unknown.ts') as never);
    expect(lenses).toHaveLength(0);
  });

  it('returns file-level lenses and keyboard hint (no per-hunk lenses)', () => {
    hunkManager.setHunksForFile('file.ts', 's1', [makeHunk('h1', 5), makeHunk('h2', 15)]);

    const lenses = provider.provideCodeLenses(makeDocument('file.ts') as never);

    // Should have: Show Diff, Accept All, Reject All, Keyboard hint = 4 lenses
    expect(lenses).toHaveLength(4);

    const titles = lenses.map((l) => l.command?.title);
    expect(titles).toContainEqual(expect.stringContaining('Show Diff'));
    expect(titles).toContainEqual(expect.stringContaining('Accept All'));
    expect(titles).toContainEqual(expect.stringContaining('Reject All'));
    expect(titles).toContainEqual(expect.stringContaining('Tab = Accept'));

    // No per-hunk Accept/Reject lenses
    const acceptLenses = lenses.filter((l) => l.command?.title === '$(check) Accept');
    expect(acceptLenses).toHaveLength(0);
  });

  it('shows correct hunk count in Accept All / Reject All', () => {
    hunkManager.setHunksForFile('file.ts', 's1', [
      makeHunk('h1', 5),
      makeHunk('h2', 15),
      makeHunk('h3', 25),
    ]);

    const lenses = provider.provideCodeLenses(makeDocument('file.ts') as never);
    const acceptAll = lenses.find((l) => l.command?.title?.includes('Accept All'));
    expect(acceptAll?.command?.title).toContain('3');
  });

  it('all file-level lenses are at line 0', () => {
    hunkManager.setHunksForFile('file.ts', 's1', [makeHunk('h1', 10)]);

    const lenses = provider.provideCodeLenses(makeDocument('file.ts') as never);
    for (const lens of lenses) {
      expect(lens.range.start.line).toBe(0);
    }
  });
});
