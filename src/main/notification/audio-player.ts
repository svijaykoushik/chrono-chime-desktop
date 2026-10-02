import { readFile } from 'node:fs/promises';
import type { AudioBufferSourceNode, AudioContext } from 'node-web-audio-api';
import type { AudioData } from 'audio-decode';
import { logger } from '../diagnostics/logger';

interface ActivePlayback {
  context: AudioContext;
  source: AudioBufferSourceNode;
  cleanup?: Promise<void>;
}

const activePlaybacks = new Set<ActivePlayback>();

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function closeContext(context: AudioContext): Promise<void> {
  try {
    await context.close();
  } catch (error) {
    logger.error('AudioPlayer', 'Failed to close audio context', asError(error));
  }
}

function cleanupPlayback(playback: ActivePlayback, stop: boolean): Promise<void> {
  if (playback.cleanup) return playback.cleanup;

  playback.cleanup = (async () => {
    if (stop) {
      try {
        playback.source.stop();
      } catch {
        // The source may already have ended.
      }
    }
    try {
      playback.source.disconnect();
    } catch {
      // Disconnection can fail after the audio graph has already closed.
    }
    await closeContext(playback.context);
    activePlaybacks.delete(playback);
  })();

  return playback.cleanup;
}

async function readAudioFile(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT' && /\.wav$/i.test(filePath)) {
      return readFile(filePath.replace(/\.wav$/i, '.mp3'));
    }
    throw error;
  }
}

function validateDecodedAudio(decoded: AudioData): number {
  const firstChannel = decoded.channelData[0];
  if (!firstChannel || firstChannel.length === 0 || !Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0) {
    throw new Error('Decoded audio has no playable samples');
  }
  if (decoded.channelData.some((channel) => channel.length !== firstChannel.length)) {
    throw new Error('Decoded audio channels have inconsistent lengths');
  }
  return firstChannel.length;
}

export async function playAudio(filePath: string): Promise<void> {
  logger.info('AudioPlayer', `playAudio() triggered for file: ${filePath}`);

  const [audioBytes, { default: decode }, { AudioContext }] = await Promise.all([
    readAudioFile(filePath),
    import('audio-decode'),
    import('node-web-audio-api'),
  ]);
  const decoded = await decode(audioBytes);
  const frameCount = validateDecodedAudio(decoded);
  const context = new AudioContext({ latencyHint: 'playback' });
  let playback: ActivePlayback | undefined;

  try {
    const buffer = context.createBuffer(decoded.channelData.length, frameCount, decoded.sampleRate);
    decoded.channelData.forEach((channel, index) => buffer.copyToChannel(Float32Array.from(channel), index));

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    playback = { context, source };
    activePlaybacks.add(playback);
    source.addEventListener('ended', () => {
      void cleanupPlayback(playback!, false);
    }, { once: true });
    source.start();
    logger.info('AudioPlayer', `Audio playback started for file: ${filePath}`);
  } catch (error) {
    if (playback) {
      await cleanupPlayback(playback, true);
    } else {
      await closeContext(context);
    }
    throw error;
  }
}

export async function disposeAudioPlayer(): Promise<void> {
  await Promise.all(Array.from(activePlaybacks, (playback) => cleanupPlayback(playback, true)));
}
