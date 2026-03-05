import * as vscode from 'vscode';

export function copyPathForClaude(uri: vscode.Uri, uris?: vscode.Uri[]): void {
  const targets = uris && uris.length > 0 ? uris : [uri];
  const lines = targets.map((u) => '@' + vscode.workspace.asRelativePath(u, false));
  vscode.env.clipboard.writeText(lines.join('\n'));
}
