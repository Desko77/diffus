import * as vscode from 'vscode';
import { TrackingSession } from './types';
import { Ignore } from 'ignore';
import {
  isBinaryFile,
  shouldIgnorePath,
  isFileTooLarge,
  loadGitignoreFilter,
  isGitignored,
} from './fileUtils';

let sessionCounter = 0;

export class SnapshotManager {
  private sessions: Map<string, TrackingSession> = new Map();

  async startSession(): Promise<{
    sessionId: string;
    gitignoreFilters: Map<string, Ignore>;
  }> {
    const sessionId = `session-${++sessionCounter}-${Date.now()}`;
    const snapshots = new Map<string, string>();
    const gitignoreFilters = new Map<string, Ignore>();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return { sessionId, gitignoreFilters };
    }

    for (const folder of workspaceFolders) {
      const gitignore = await loadGitignoreFilter(folder);
      gitignoreFilters.set(folder.uri.fsPath, gitignore);

      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/*'),
        '**/node_modules/**',
      );

      for (const fileUri of files) {
        const filePath = fileUri.fsPath;
        if (isBinaryFile(filePath) || shouldIgnorePath(filePath)) {
          continue;
        }
        if (isGitignored(gitignore, folder.uri.fsPath, filePath)) {
          continue;
        }

        try {
          const stat = await vscode.workspace.fs.stat(fileUri);
          if (isFileTooLarge(stat.size)) {
            continue;
          }
          const content = await vscode.workspace.fs.readFile(fileUri);
          snapshots.set(filePath, Buffer.from(content).toString('utf-8'));
        } catch {
          // File may have been deleted between listing and reading
        }
      }
    }

    const session: TrackingSession = { id: sessionId, snapshots };
    this.sessions.set(sessionId, session);
    return { sessionId, gitignoreFilters };
  }

  getSnapshot(sessionId: string, filePath: string): string | undefined {
    return this.sessions.get(sessionId)?.snapshots.get(filePath);
  }

  /** Returns snapshot content. Undefined means file didn't exist at snapshot time. */
  getSnapshotOrEmpty(sessionId: string, filePath: string): string {
    return this.getSnapshot(sessionId, filePath) ?? '';
  }

  updateSnapshot(sessionId: string, filePath: string, content: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.snapshots.set(filePath, content);
    }
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  fileExistedInSnapshot(sessionId: string, filePath: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.snapshots.has(filePath) ?? false;
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  getSessionData(sessionId: string): { id: string; snapshots: Map<string, string> } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    return { id: session.id, snapshots: session.snapshots };
  }

  restoreSession(sessionId: string, snapshots: Map<string, string>): void {
    this.sessions.set(sessionId, { id: sessionId, snapshots });
  }

  dispose(): void {
    this.sessions.clear();
  }
}
