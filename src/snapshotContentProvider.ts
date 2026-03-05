import * as vscode from 'vscode';
import { SnapshotManager } from './snapshotManager';

export const SNAPSHOT_SCHEME = 'diffus-snapshot';

/**
 * Provides snapshot content for the left side of the diff editor.
 * URI format: diffus-snapshot:///filePath?session=sessionId
 */
export class SnapshotContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private snapshotManager: SnapshotManager) {}

  provideTextDocumentContent(uri: vscode.Uri): string {
    const filePath = uri.path;
    const sessionId = new URLSearchParams(uri.query).get('session') ?? '';
    return this.snapshotManager.getSnapshotOrEmpty(sessionId, filePath);
  }

  /** Call this when a snapshot is updated so the diff tab refreshes. */
  fireDidChange(filePath: string, sessionId: string): void {
    const uri = SnapshotContentProvider.buildUri(filePath, sessionId);
    this._onDidChange.fire(uri);
  }

  static buildUri(filePath: string, sessionId: string): vscode.Uri {
    return vscode.Uri.from({
      scheme: SNAPSHOT_SCHEME,
      path: filePath,
      query: `session=${encodeURIComponent(sessionId)}`,
    });
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
