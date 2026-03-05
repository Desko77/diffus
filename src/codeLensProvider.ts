import * as vscode from 'vscode';
import { HunkManager } from './hunkManager';

export class DiffusCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(private hunkManager: HunkManager) {
    this.hunkManager.onDidChange(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const filePath = document.uri.fsPath;
    const hunks = this.hunkManager.getAllHunksForFile(filePath);

    if (hunks.length === 0) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const sortedHunks = [...hunks].sort((a, b) => a.newStart - b.newStart);

    // File-level actions at the top
    const firstRange = new vscode.Range(0, 0, 0, 0);

    codeLenses.push(
      new vscode.CodeLens(firstRange, {
        title: '$(diff) Show Diff',
        command: 'diffus.showDiff',
      }),
    );

    if (sortedHunks.length > 1) {
      codeLenses.push(
        new vscode.CodeLens(firstRange, {
          title: `$(check-all) Accept All (${sortedHunks.length})`,
          command: 'diffus.acceptAllFile',
        }),
      );
      codeLenses.push(
        new vscode.CodeLens(firstRange, {
          title: `$(discard) Reject All (${sortedHunks.length})`,
          command: 'diffus.rejectAllFile',
        }),
      );
    }

    for (const hunk of sortedHunks) {
      const lensLine = Math.max(0, hunk.newStart - 1);
      const range = new vscode.Range(lensLine, 0, lensLine, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '$(check) Accept',
          command: 'diffus.acceptHunk',
          arguments: [hunk.id],
        }),
      );

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '$(x) Reject',
          command: 'diffus.rejectHunk',
          arguments: [hunk.id],
        }),
      );
    }

    return codeLenses;
  }

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
