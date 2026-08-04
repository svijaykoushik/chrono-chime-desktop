import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { playAudio } from '../../src/main/notification/audio-player';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('../../src/main/diagnostics/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('audio-player — characterization tests', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('characterizes Linux behavior for .wav files (includes aplay fallback)', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const testPath = '/path/to/sound.wav';
    playAudio(testPath);

    expect(fs.existsSync).toHaveBeenCalledWith(testPath);
    expect(childProcess.exec).toHaveBeenCalledTimes(1);

    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain('paplay "/path/to/sound.wav"');
    expect(command).toContain('pw-play "/path/to/sound.wav"');
    expect(command).toContain('aplay "/path/to/sound.wav"');
    expect(command).toContain('ffplay -nodisp -autoexit "/path/to/sound.wav"');
  });

  it('characterizes Linux behavior for non-.wav files (excludes aplay fallback)', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const testPath = '/path/to/chime.mp3';
    playAudio(testPath);

    expect(childProcess.exec).toHaveBeenCalledTimes(1);

    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain('paplay "/path/to/chime.mp3"');
    expect(command).toContain('pw-play "/path/to/chime.mp3"');
    expect(command).not.toContain(' aplay ');
    expect(command).toContain('ffplay -nodisp -autoexit "/path/to/chime.mp3"');
  });

  it('characterizes Windows behavior using PowerShell and WMPlayer.OCX', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const testPath = 'C:\\Sounds\\alert.mp3';
    playAudio(testPath);

    expect(childProcess.exec).toHaveBeenCalledTimes(1);

    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain('powershell -Command');
    expect(command).toContain('WMPlayer.OCX');
    expect(command).toContain("C:\\Sounds\\alert.mp3");
  });

  it('handles successful exec callback execution', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(childProcess.exec).mockImplementation((_cmd: any, callback: any) => {
      if (typeof callback === 'function') {
        callback(null, 'stdout', 'stderr');
      }
      return {} as any;
    });

    expect(() => playAudio('/path/to/chime.mp3')).not.toThrow();
    expect(childProcess.exec).toHaveBeenCalledTimes(1);
  });

  it('handles exec error callback execution without crashing', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(childProcess.exec).mockImplementation((_cmd: any, callback: any) => {
      if (typeof callback === 'function') {
        callback(new Error('Command failed'), '', 'error output');
      }
      return {} as any;
    });

    expect(() => playAudio('/path/to/chime.mp3')).not.toThrow();
    expect(childProcess.exec).toHaveBeenCalledTimes(1);
  });
});

describe('audio-player — adversarial tests', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('does not invoke exec if the audio file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    playAudio('/non/existent/file.wav');

    expect(fs.existsSync).toHaveBeenCalledWith('/non/existent/file.wav');
    expect(childProcess.exec).not.toHaveBeenCalled();
  });

  it('handles empty string path gracefully', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    playAudio('');

    expect(fs.existsSync).toHaveBeenCalledWith('');
    expect(childProcess.exec).not.toHaveBeenCalled();
  });

  it('escapes paths with spaces, single quotes, and double quotes on Linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const complexPath = '/home/user/My "Custom" Sounds/alarm\'s.wav';
    playAudio(complexPath);

    expect(childProcess.exec).toHaveBeenCalledTimes(1);
    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain('/home/user/My \\"Custom\\" Sounds/alarm\'s.wav');
  });

  it('escapes single quotes in PowerShell command on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const complexPath = "C:\\User's Folder\\sound's.mp3";
    playAudio(complexPath);

    expect(childProcess.exec).toHaveBeenCalledTimes(1);
    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain("C:\\User''s Folder\\sound''s.mp3");
  });

  it('does not execute on unsupported platforms (e.g., darwin / macOS)', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    playAudio('/path/to/sound.wav');

    expect(fs.existsSync).toHaveBeenCalledWith('/path/to/sound.wav');
    expect(childProcess.exec).not.toHaveBeenCalled();
  });

  it('handles command injection attempts in file paths safely', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const maliciousPath = '/path/to/sound.wav; rm -rf /; $(whoami)';
    playAudio(maliciousPath);

    expect(childProcess.exec).toHaveBeenCalledTimes(1);
    const [command] = vi.mocked(childProcess.exec).mock.calls[0]!;
    expect(command).toContain(`"${maliciousPath}"`);
  });
});
