import * as vscode from 'vscode';
import { HunkManager } from './hunkManager';

export class CursorTracker {
  private disposables: vscode.Disposable[] = [];
  private currentHunkId: string | undefined;

  constructor(private hunkManager: HunkManager) {
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection((e) => {
        this.updateForEditor(e.textEditor);
      }),
    );
  }

  /** Force-update the context key for the current active editor */
  update(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateForEditor(editor);
    } else {
      this.setInHunk(false);
    }
  }

  getCurrentHunkId(): string | undefined {
    return this.currentHunkId;
  }

  private updateForEditor(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const cursorLine = editor.selection.active.line + 1; // 1-based
    const hunk = this.hunkManager.getHunkAtLine(filePath, cursorLine);

    if (hunk) {
      this.currentHunkId = hunk.id;
      this.setInHunk(true);
    } else {
      this.currentHunkId = undefined;
      this.setInHunk(false);
    }
  }

  private setInHunk(value: boolean): void {
    vscode.commands.executeCommand('setContext', 'diffus.cursorInHunk', value);
  }

  dispose(): void {
    this.setInHunk(false);
    this.disposables.forEach((d) => d.dispose());
  }
}
