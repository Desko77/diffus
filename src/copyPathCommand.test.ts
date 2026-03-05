import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Uri, env, workspace } from 'vscode';
import { copyPathForClaude } from './copyPathCommand';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('copyPathForClaude', () => {
  it('copies single file path with @ prefix', () => {
    const uri = Uri.file('/project/src/index.ts');
    vi.mocked(workspace.asRelativePath).mockReturnValue('src/index.ts');

    copyPathForClaude(uri);

    expect(workspace.asRelativePath).toHaveBeenCalledWith(uri, false);
    expect(env.clipboard.writeText).toHaveBeenCalledWith('@src/index.ts');
  });

  it('copies multiple file paths as separate lines', () => {
    const uri1 = Uri.file('/project/src/a.ts');
    const uri2 = Uri.file('/project/src/b.ts');
    const uri3 = Uri.file('/project/lib/c.ts');
    vi.mocked(workspace.asRelativePath)
      .mockReturnValueOnce('src/a.ts')
      .mockReturnValueOnce('src/b.ts')
      .mockReturnValueOnce('lib/c.ts');

    copyPathForClaude(uri1, [uri1, uri2, uri3]);

    expect(workspace.asRelativePath).toHaveBeenCalledTimes(3);
    expect(env.clipboard.writeText).toHaveBeenCalledWith('@src/a.ts\n@src/b.ts\n@lib/c.ts');
  });

  it('uses uri array when provided, ignoring first uri arg', () => {
    const rightClicked = Uri.file('/project/src/clicked.ts');
    const selected1 = Uri.file('/project/src/selected1.ts');
    const selected2 = Uri.file('/project/src/selected2.ts');
    vi.mocked(workspace.asRelativePath)
      .mockReturnValueOnce('src/selected1.ts')
      .mockReturnValueOnce('src/selected2.ts');

    copyPathForClaude(rightClicked, [selected1, selected2]);

    expect(workspace.asRelativePath).toHaveBeenCalledTimes(2);
    expect(workspace.asRelativePath).toHaveBeenCalledWith(selected1, false);
    expect(workspace.asRelativePath).toHaveBeenCalledWith(selected2, false);
    expect(env.clipboard.writeText).toHaveBeenCalledWith('@src/selected1.ts\n@src/selected2.ts');
  });

  it('falls back to single uri when uris array is empty', () => {
    const uri = Uri.file('/project/src/file.ts');
    vi.mocked(workspace.asRelativePath).mockReturnValue('src/file.ts');

    copyPathForClaude(uri, []);

    expect(workspace.asRelativePath).toHaveBeenCalledWith(uri, false);
    expect(env.clipboard.writeText).toHaveBeenCalledWith('@src/file.ts');
  });
});
