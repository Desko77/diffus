import { structuredPatch } from 'diff';
import { DiffHunk } from './types';

let hunkIdCounter = 0;

export function computeHunks(
  oldContent: string,
  newContent: string,
  sessionId: string,
  filePath: string,
): DiffHunk[] {
  if (oldContent === newContent) {
    return [];
  }

  const patch = structuredPatch(filePath, filePath, oldContent, newContent, '', '', { context: 0 });

  const hunks: DiffHunk[] = [];

  for (const hunk of patch.hunks) {
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(line.substring(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.substring(1));
      }
      // Context lines (starting with ' ') are skipped since context=0
    }

    if (oldLines.length > 0 || newLines.length > 0) {
      hunks.push({
        id: `hunk-${++hunkIdCounter}`,
        sessionId,
        oldStart: hunk.oldStart,
        oldLines,
        newStart: hunk.newStart,
        newLines,
      });
    }
  }

  return hunks;
}
