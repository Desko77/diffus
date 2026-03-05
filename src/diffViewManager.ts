import * as vscode from "vscode";
import { SnapshotContentProvider } from "./snapshotContentProvider";
import * as path from "path";

export class DiffViewManager {
  /** Track which files have open diff tabs to avoid duplicates */
  private openDiffs: Set<string> = new Set();

  async openDiff(filePath: string, sessionId: string): Promise<void> {
    const snapshotUri = SnapshotContentProvider.buildUri(filePath, sessionId);
    const currentUri = vscode.Uri.file(filePath);
    const fileName = path.basename(filePath);

    await vscode.commands.executeCommand(
      "vscode.diff",
      snapshotUri,
      currentUri,
      `Diffus: ${fileName} (snapshot ↔ current)`,
    );

    this.openDiffs.add(filePath);
  }

  async closeDiff(filePath: string): Promise<void> {
    if (!this.openDiffs.has(filePath)) {
      return;
    }

    // Find and close the diff tab for this file
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (
          tab.input instanceof vscode.TabInputTextDiff &&
          tab.input.modified.fsPath === filePath
        ) {
          await vscode.window.tabGroups.close(tab);
          break;
        }
      }
    }

    this.openDiffs.delete(filePath);
  }

  async closeAllDiffs(): Promise<void> {
    for (const filePath of this.openDiffs) {
      await this.closeDiff(filePath);
    }
    this.openDiffs.clear();
  }

  isOpen(filePath: string): boolean {
    return this.openDiffs.has(filePath);
  }

  dispose(): void {
    this.openDiffs.clear();
  }
}
