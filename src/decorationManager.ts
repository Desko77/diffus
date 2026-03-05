import * as vscode from 'vscode';
import {
  ADDED_LINE_BG,
  ADDED_LINE_BG_OVERVIEW,
  ADDED_LINE_BORDER,
  REMOVED_LINE_BG_OVERVIEW,
  REMOVED_LINE_BORDER,
  DELETION_MARKER_TEXT_COLOR,
} from './constants';

export interface DeletionMarker {
  line: number; // 0-based
  count: number; // number of removed lines
  content: string; // removed lines joined with " | ", truncated
}

export class DecorationManager {
  private addedDecorationType: vscode.TextEditorDecorationType;
  private deletionMarkerType: vscode.TextEditorDecorationType;

  constructor() {
    this.addedDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: ADDED_LINE_BG,
      isWholeLine: true,
      overviewRulerColor: ADDED_LINE_BG_OVERVIEW,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      borderColor: ADDED_LINE_BORDER,
    });

    this.deletionMarkerType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      overviewRulerColor: REMOVED_LINE_BG_OVERVIEW,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      borderWidth: '0 0 2px 0',
      borderStyle: 'solid',
      borderColor: REMOVED_LINE_BORDER,
    });
  }

  applyDecorations(
    editor: vscode.TextEditor,
    addedRanges: vscode.Range[],
    deletionMarkers: DeletionMarker[],
  ): void {
    editor.setDecorations(this.addedDecorationType, addedRanges);

    const markerDecorations: vscode.DecorationOptions[] = deletionMarkers.map((marker) => ({
      range: new vscode.Range(marker.line, 0, marker.line, 0),
      renderOptions: {
        after: {
          contentText: `  ← ${marker.content}`,
          color: DELETION_MARKER_TEXT_COLOR,
          fontStyle: 'italic',
        },
      },
    }));

    editor.setDecorations(this.deletionMarkerType, markerDecorations);
  }

  clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(this.addedDecorationType, []);
    editor.setDecorations(this.deletionMarkerType, []);
  }

  dispose(): void {
    this.addedDecorationType.dispose();
    this.deletionMarkerType.dispose();
  }
}
