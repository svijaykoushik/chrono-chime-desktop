import { app } from 'electron';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * User-level "launch at login", never system-wide.
 *
 * - Windows: Electron's `setLoginItemSettings` writes a per-user registry entry.
 * - Linux: Electron has no login-item API, so we manage an XDG autostart entry
 *   at `~/.config/autostart/chronochime.desktop` (a per-user file).
 *
 * macOS is not a supported target.
 */

const linuxAutostartFile = (): string =>
  join(homedir(), '.config', 'autostart', 'chronochime.desktop');

export function getAutoStart(): boolean {
  if (process.platform === 'linux') {
    return existsSync(linuxAutostartFile());
  }
  return app.getLoginItemSettings().openAtLogin;
}

export function setAutoStart(enabled: boolean): void {
  if (process.platform === 'linux') {
    const file = linuxAutostartFile();
    if (enabled) {
      mkdirSync(dirname(file), { recursive: true });
      const entry = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=ChronoChime',
        `Exec=${process.execPath}`,
        'Terminal=false',
        'X-GNOME-Autostart-enabled=true',
        '',
      ].join('\n');
      writeFileSync(file, entry, 'utf8');
    } else if (existsSync(file)) {
      rmSync(file);
    }
    return;
  }

  app.setLoginItemSettings({ openAtLogin: enabled });
}
