import * as vscode from 'vscode';
import { DiffHunk, FileChangeState } from './types';

export class HunkManager {
  private fileStates: Map<string, FileChangeState[]> = new Map();
  private _onDidChange = new vscode.EventEmitter<string>();
  readonly onDidChange = this._onDidChange.event;

  setHunksForFile(filePath: string, sessionId: string, hunks: DiffHunk[]): void {
    if (hunks.length === 0) {
      // Remove this session's entry for the file
      const states = this.fileStates.get(filePath);
      if (states) {
        const filtered = states.filter((s) => s.sessionId !== sessionId);
        if (filtered.length === 0) {
          this.fileStates.delete(filePath);
        } else {
          this.fileStates.set(filePath, filtered);
        }
      }
    } else {
      const states = this.fileStates.get(filePath) ?? [];
      const existingIndex = states.findIndex((s) => s.sessionId === sessionId);
      const newState: FileChangeState = { filePath, hunks, sessionId };
      if (existingIndex >= 0) {
        states[existingIndex] = newState;
      } else {
        states.push(newState);
      }
      this.fileStates.set(filePath, states);
    }
    this._onDidChange.fire(filePath);
  }

  getAllHunksForFile(filePath: string): DiffHunk[] {
    const states = this.fileStates.get(filePath);
    if (!states) {
      return [];
    }
    // Merge all sessions' hunks, sorted by newStart
    const allHunks = states.flatMap((s) => s.hunks);
    return allHunks.sort((a, b) => a.newStart - b.newStart);
  }

  getHunkById(hunkId: string): { hunk: DiffHunk; filePath: string } | undefined {
    for (const [filePath, states] of this.fileStates) {
      for (const state of states) {
        const hunk = state.hunks.find((h) => h.id === hunkId);
        if (hunk) {
          return { hunk, filePath };
        }
      }
    }
    return undefined;
  }

  removeHunk(hunkId: string): string | undefined {
    for (const [filePath, states] of this.fileStates) {
      for (const state of states) {
        const idx = state.hunks.findIndex((h) => h.id === hunkId);
        if (idx >= 0) {
          state.hunks.splice(idx, 1);
          // Clean up empty states
          if (state.hunks.length === 0) {
            const filtered = states.filter((s) => s.hunks.length > 0);
            if (filtered.length === 0) {
              this.fileStates.delete(filePath);
            } else {
              this.fileStates.set(filePath, filtered);
            }
          }
          this._onDidChange.fire(filePath);
          return filePath;
        }
      }
    }
    return undefined;
  }

  removeAllHunksForFile(filePath: string): void {
    this.fileStates.delete(filePath);
    this._onDidChange.fire(filePath);
  }

  getChangedFiles(): string[] {
    return Array.from(this.fileStates.keys());
  }

  getChangedFileCount(): number {
    return this.fileStates.size;
  }

  hasChanges(): boolean {
    return this.fileStates.size > 0;
  }

  fileHasChanges(filePath: string): boolean {
    const states = this.fileStates.get(filePath);
    return !!states && states.some((s) => s.hunks.length > 0);
  }

  /** Find the hunk that contains the given 1-based original line number */
  getHunkAtLine(filePath: string, originalLine: number): DiffHunk | undefined {
    const hunks = this.getAllHunksForFile(filePath);
    for (const hunk of hunks) {
      const hunkEndNew = hunk.newStart + Math.max(hunk.newLines.length, 1) - 1;
      const hunkEndOld = hunk.oldStart + Math.max(hunk.oldLines.length, 1) - 1;
      // Check if the line falls within the range of this hunk (either old or new range)
      if (
        (originalLine >= hunk.newStart && originalLine <= hunkEndNew) ||
        (originalLine >= hunk.oldStart && originalLine <= hunkEndOld)
      ) {
        return hunk;
      }
    }
    return undefined;
  }

  /** Get the next hunk after the given line in the same file, or the first hunk in the next changed file */
  getNextHunk(
    filePath: string,
    afterLine: number,
  ): { hunk: DiffHunk; filePath: string } | undefined {
    // Try same file first
    const hunks = this.getAllHunksForFile(filePath);
    const next = hunks.find((h) => h.newStart > afterLine);
    if (next) {
      return { hunk: next, filePath };
    }

    // Try next changed file
    const files = this.getChangedFiles();
    const currentIdx = files.indexOf(filePath);
    if (currentIdx === -1 && files.length > 0) {
      const firstHunks = this.getAllHunksForFile(files[0]);
      if (firstHunks.length > 0) {
        return { hunk: firstHunks[0], filePath: files[0] };
      }
    }

    for (let i = 1; i <= files.length; i++) {
      const nextFile = files[(currentIdx + i) % files.length];
      if (nextFile === filePath) {
        // Wrapped around, check if there are remaining hunks at start of same file
        const remaining = this.getAllHunksForFile(filePath);
        if (remaining.length > 0) {
          return { hunk: remaining[0], filePath };
        }
        return undefined;
      }
      const nextHunks = this.getAllHunksForFile(nextFile);
      if (nextHunks.length > 0) {
        return { hunk: nextHunks[0], filePath: nextFile };
      }
    }

    return undefined;
  }

  getSessionIdsForFile(filePath: string): string[] {
    const states = this.fileStates.get(filePath);
    return states?.map((s) => s.sessionId) ?? [];
  }

  dispose(): void {
    this.fileStates.clear();
    this._onDidChange.dispose();
  }
}
