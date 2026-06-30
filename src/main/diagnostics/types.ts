export interface CrashInfo {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}
