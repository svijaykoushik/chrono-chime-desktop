import { shell } from 'electron';
import AdmZip from 'adm-zip';
import { logsDir } from './logger';

/**
 * Zips all files in the logs directory to a user-specified path.
 * Following the shipping plan, this is a pure operation that doesn't
 * touch the UI (the UI is handled by the IPC handler).
 */
export type ExportLogsFn = (savePath: string) => Promise<void>;

export async function exportLogs(savePath: string): Promise<void> {
  const dir = logsDir();
  const zip = new AdmZip();

  // Add the logs directory contents to the zip
  // We add the folder itself so that when extracted, the logs are inside a folder
  zip.addLocalFolder(dir);

  await zip.writeZipPromise(savePath);
}

/**
 * Opens the logs directory in the system's default file explorer.
 */
export async function openLogsDir(): Promise<void> {
  const dir = logsDir();
  await shell.openPath(dir);
}
