import * as path from "path";
import * as vscode from "vscode";
import ignore, { Ignore } from "ignore";
import { BINARY_EXTENSIONS, IGNORE_PATTERNS, MAX_FILE_SIZE } from "./constants";

export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function shouldIgnorePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return IGNORE_PATTERNS.some((pattern) => {
    const segment = `/${pattern}/`;
    return normalized.includes(segment) || normalized.endsWith(`/${pattern}`);
  });
}

export function isFileTooLarge(size: number): boolean {
  return size > MAX_FILE_SIZE;
}

export async function loadGitignoreFilter(
  folder: vscode.WorkspaceFolder,
): Promise<Ignore> {
  const ig = ignore();
  const gitignoreFiles = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, "**/.gitignore"),
  );

  for (const fileUri of gitignoreFiles) {
    try {
      const content = Buffer.from(
        await vscode.workspace.fs.readFile(fileUri),
      ).toString("utf-8");

      const relDir = path.relative(folder.uri.fsPath, path.dirname(fileUri.fsPath));
      const normalizedDir = relDir.replace(/\\/g, "/");

      const lines = content
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "" && !line.startsWith("#"));

      if (!normalizedDir) {
        // Root .gitignore — add rules directly
        ig.add(lines);
      } else {
        // Nested .gitignore — prefix rules with relative directory
        ig.add(
          lines.map((line) => {
            const negated = line.startsWith("!");
            const pattern = negated ? line.slice(1) : line;
            const prefixed = `${normalizedDir}/${pattern}`;
            return negated ? `!${prefixed}` : prefixed;
          }),
        );
      }
    } catch {
      // .gitignore file may have been deleted between listing and reading
    }
  }

  return ig;
}

export function isGitignored(
  filter: Ignore,
  workspaceRoot: string,
  filePath: string,
): boolean {
  const relative = path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
  return filter.ignores(relative);
}
