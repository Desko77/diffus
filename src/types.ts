export enum TrackingState {
  Idle = 'idle',
  Tracking = 'tracking',
  StoppedWithPending = 'stoppedWithPending',
}

export interface DiffHunk {
  id: string;
  sessionId: string;
  oldStart: number; // 1-based line in original file
  oldLines: string[];
  newStart: number; // 1-based line in current file
  newLines: string[];
}

export interface FileChangeState {
  filePath: string;
  hunks: DiffHunk[];
  sessionId: string;
}

export interface TrackingSession {
  id: string;
  snapshots: Map<string, string>; // filePath -> content at snapshot time
}
