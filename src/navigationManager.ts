import * as vscode from 'vscode';
import { HunkManager } from './hunkManager';

export class NavigationManager {
  private currentIndex = 0;

  constructor(private hunkManager: HunkManager) {}

  async nextFile(): Promise<void> {
    const files = this.hunkManager.getChangedFiles();
    if (files.length === 0) {
      return;
    }

    this.currentIndex = (this.currentIndex + 1) % files.length;
    await this.openFile(files[this.currentIndex]);
  }

  async prevFile(): Promise<void> {
    const files = this.hunkManager.getChangedFiles();
    if (files.length === 0) {
      return;
    }

    this.currentIndex = (this.currentIndex - 1 + files.length) % files.length;
    await this.openFile(files[this.currentIndex]);
  }

  /** Open a file and position the cursor at the given 1-based line */
  async navigateToHunk(filePath: string, line: number): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(doc);
      const position = new vscode.Position(Math.max(0, line - 1), 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    } catch {
      // File might have been deleted
    }
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    } catch {
      // File might have been deleted
    }
  }

  getCounterText(): string {
    const files = this.hunkManager.getChangedFiles();
    if (files.length === 0) {
      return '';
    }

    // Adjust index if it's out of bounds
    if (this.currentIndex >= files.length) {
      this.currentIndex = 0;
    }

    return `${this.currentIndex + 1} / ${files.length} files`;
  }

  /** Reset index when current file matches a changed file */
  syncToActiveEditor(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    const files = this.hunkManager.getChangedFiles();
    const idx = files.indexOf(editor.document.uri.fsPath);
    if (idx >= 0) {
      this.currentIndex = idx;
    }
  }
}
