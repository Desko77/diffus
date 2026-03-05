import * as vscode from 'vscode';
import { DiffHunk } from './types';
import { DeletionMarker } from './decorationManager';

export interface DecorationRanges {
  addedRanges: vscode.Range[];
  deletionMarkers: DeletionMarker[];
}

export function computeDecorationRanges(hunks: DiffHunk[]): DecorationRanges {
  const addedRanges: vscode.Range[] = [];
  const deletionMarkers: DeletionMarker[] = [];
  const sortedHunks = [...hunks].sort((a, b) => a.newStart - b.newStart);

  for (const hunk of sortedHunks) {
    if (hunk.newLines.length > 0) {
      for (let i = 0; i < hunk.newLines.length; i++) {
        const line0 = hunk.newStart - 1 + i;
        addedRanges.push(new vscode.Range(line0, 0, line0, Number.MAX_SAFE_INTEGER));
      }
    }

    if (hunk.oldLines.length > 0) {
      // Marker goes on the line before the hunk's new content,
      // or at the insertion point for pure deletions
      const markerLine = Math.max(0, hunk.newStart - 1);
      const MAX_INLINE_LEN = 120;
      const joined = hunk.oldLines.map((l) => l.trimEnd()).join(' | ');
      const content =
        joined.length > MAX_INLINE_LEN ? joined.slice(0, MAX_INLINE_LEN) + '…' : joined;
      deletionMarkers.push({
        line: markerLine,
        count: hunk.oldLines.length,
        content,
      });
    }
  }

  return { addedRanges, deletionMarkers };
}
