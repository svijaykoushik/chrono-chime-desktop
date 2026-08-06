import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logger } from '../diagnostics/logger';

export function playAudio(filePath: string): void {
  logger.info('AudioPlayer', `playAudio() triggered for file: ${filePath}`);
  if (!existsSync(filePath)) {
    logger.error('AudioPlayer', `Audio file does not exist: ${filePath}`);
    return;
  }

  let command = '';
  const escapedPath = filePath.replace(/"/g, '\\"');
  const escapedPathPs = filePath.replace(/'/g, "''");

  if (process.platform === 'win32') {
    // Windows: Use powershell and WMPlayer.OCX to play MP3 or WAV in background.
    // Caps playback wait loop at 10 seconds.
    command = `powershell -Command "$wmp = New-Object -ComObject WMPlayer.OCX; $wmp.URL = '${escapedPathPs}'; $wmp.controls.play(); $timeout = 100; while ($wmp.playState -ne 1 -and $wmp.playState -ne 8 -and $wmp.playState -ne 0 -and $timeout -gt 0) { Start-Sleep -m 100; $timeout-- }"`;
  } else if (process.platform === 'linux') {
    // Linux: Chain paplay, pw-play, aplay, and ffplay as fallbacks.
    const isWav = filePath.toLowerCase().endsWith('.wav');
    if (isWav) {
      command = `paplay "${escapedPath}" || pw-play "${escapedPath}" || aplay "${escapedPath}" || ffplay -nodisp -autoexit "${escapedPath}"`;
    } else {
      command = `paplay "${escapedPath}" || pw-play "${escapedPath}" || ffplay -nodisp -autoexit "${escapedPath}"`;
    }
  } else {
    logger.warn('AudioPlayer', `Audio playback is not supported on this platform: ${process.platform}`);
    return;
  }

  logger.info('AudioPlayer', `System level audio player invocation initiated with command: ${command}`);

  exec(command, (error) => {
    if (error) {
      logger.error('AudioPlayer', `System level audio player invocation failed: ${error.message}`, error);
    } else {
      logger.info('AudioPlayer', 'Audio playback command execution completed');
    }
  });
}
