import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { settingsSchema, type Settings } from '../shared/contract';

const systemTz = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const defaults = (): Settings => ({
  quietHours: { enabled: false, start: '22:00', end: '06:00' },
  timezone: systemTz(),
  theme: 'system',
  launchAtLogin: false,
  updateChannel: 'stable',
});

/** Small durable settings store backed by a JSON file in userData. */
export class SettingsStore {
  private current: Settings;

  constructor(private readonly path: string) {
    this.current = this.load();
  }

  private load(): Settings {
    if (!existsSync(this.path)) return defaults();
    try {
      return settingsSchema.parse({ ...defaults(), ...JSON.parse(readFileSync(this.path, 'utf8')) });
    } catch {
      return defaults();
    }
  }

  get(): Settings {
    return this.current;
  }

  update(patch: Partial<Settings>): Settings {
    this.current = settingsSchema.parse({ ...this.current, ...patch });
    writeFileSync(this.path, JSON.stringify(this.current, null, 2), 'utf8');
    return this.current;
  }
}
