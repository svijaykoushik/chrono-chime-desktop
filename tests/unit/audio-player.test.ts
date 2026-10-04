import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { AudioContext } from 'node-web-audio-api';
import { disposeAudioPlayer, playAudio } from '../../src/main/notification/audio-player';

const audioMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  decode: vi.fn(),
  AudioContext: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ readFile: audioMocks.readFile }));
vi.mock('audio-decode', () => ({ default: audioMocks.decode }));
vi.mock('node-web-audio-api', () => ({ AudioContext: audioMocks.AudioContext }));
vi.mock('../../src/main/diagnostics/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('audio-player', () => {
  let context: {
    destination: object;
    createBuffer: ReturnType<typeof vi.fn>;
    createBufferSource: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let audioBuffer: { copyToChannel: ReturnType<typeof vi.fn> };
  let source: {
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    audioBuffer = { copyToChannel: vi.fn() };
    source = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
    };
    context = {
      destination: {},
      createBuffer: vi.fn(() => audioBuffer),
      createBufferSource: vi.fn(() => source),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(AudioContext).mockImplementation(() => context as unknown as AudioContext);
    vi.mocked(readFile).mockResolvedValue(Buffer.from('encoded audio'));
    audioMocks.decode.mockResolvedValue({
      channelData: [Float32Array.of(0.25, -0.25), Float32Array.of(0.5, -0.5)],
      sampleRate: 44100,
    });
  });

  afterEach(async () => {
    await disposeAudioPlayer();
  });

  it('decodes channels, starts playback, then releases the context when playback ends', async () => {
    await expect(playAudio('/sounds/chime.mp3')).resolves.toBeUndefined();

    expect(readFile).toHaveBeenCalledWith('/sounds/chime.mp3');
    expect(audioMocks.decode).toHaveBeenCalledWith(Buffer.from('encoded audio'));
    expect(context.createBuffer).toHaveBeenCalledWith(2, 2, 44100);
    expect(audioBuffer.copyToChannel).toHaveBeenNthCalledWith(1, Float32Array.of(0.25, -0.25), 0);
    expect(audioBuffer.copyToChannel).toHaveBeenNthCalledWith(2, Float32Array.of(0.5, -0.5), 1);
    expect(source.connect).toHaveBeenCalledWith(context.destination);
    expect(source.start).toHaveBeenCalledOnce();
    expect(context.close).not.toHaveBeenCalled();

    const ended = source.addEventListener.mock.calls[0]?.[1] as EventListener;
    ended(new Event('ended'));
    await vi.waitFor(() => expect(context.close).toHaveBeenCalledOnce());
    expect(source.disconnect).toHaveBeenCalledOnce();
  });

  it('falls back from a missing legacy WAV path to its MP3 alias', async () => {
    const missing = Object.assign(new Error('missing WAV'), { code: 'ENOENT' });
    vi.mocked(readFile).mockRejectedValueOnce(missing).mockResolvedValueOnce(Buffer.from('mp3 audio'));

    await playAudio('/sounds/notification2.wav');

    expect(readFile).toHaveBeenNthCalledWith(1, '/sounds/notification2.wav');
    expect(readFile).toHaveBeenNthCalledWith(2, '/sounds/notification2.mp3');
    expect(audioMocks.decode).toHaveBeenCalledWith(Buffer.from('mp3 audio'));
  });

  it('does not try the WAV alias for permission or other read errors', async () => {
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    vi.mocked(readFile).mockRejectedValue(denied);

    await expect(playAudio('/sounds/custom.wav')).rejects.toBe(denied);
    expect(readFile).toHaveBeenCalledOnce();
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('rejects malformed decoded audio before opening an audio device', async () => {
    audioMocks.decode.mockResolvedValue({ channelData: [], sampleRate: 44100 });

    await expect(playAudio('/sounds/bad.mp3')).rejects.toThrow();
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('closes and disconnects resources if starting playback throws', async () => {
    const startError = new Error('device unavailable');
    source.start.mockImplementation(() => {
      throw startError;
    });

    await expect(playAudio('/sounds/chime.mp3')).rejects.toBe(startError);
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('does not create a child process for paths containing shell syntax', async () => {
    await playAudio('/sounds/$(touch unexpected).mp3');

    expect(source.start).toHaveBeenCalledOnce();
  });
});
