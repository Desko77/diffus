import * as vscode from "vscode";
import { HunkManager } from "./hunkManager";

export class DiffusHoverProvider implements vscode.HoverProvider {
  constructor(private hunkManager: HunkManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const hunks = this.hunkManager.getAllHunksForFile(document.uri.fsPath);
    if (hunks.length === 0) {
      return undefined;
    }

    const line1 = position.line + 1; // 1-based

    for (const hunk of hunks) {
      if (hunk.oldLines.length === 0) {
        continue;
      }

      // Hover triggers on the line before the hunk + all new lines of the hunk
      // For pure deletions (no new lines): the line before + the line at the deletion point
      const rangeStart = Math.max(1, hunk.newStart - 1);
      const rangeEnd =
        hunk.newLines.length > 0
          ? hunk.newStart + hunk.newLines.length - 1
          : hunk.newStart;

      if (line1 >= rangeStart && line1 <= rangeEnd) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(
          `**Removed ${hunk.oldLines.length} line(s):**\n\n`,
        );
        md.appendCodeblock(hunk.oldLines.join("\n"));
        return new vscode.Hover(md);
      }
    }

    return undefined;
  }
}
