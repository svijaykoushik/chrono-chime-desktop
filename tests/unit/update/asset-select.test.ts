import { describe, expect, test } from 'vitest';
import { selectAsset, UpdateAsset } from '../../../src/main/update/asset-select';

describe('selectAsset', () => {
  const assets: UpdateAsset[] = [
    { name: 'chronochime-1.0.0.deb', browser_download_url: 'https://example.com/deb', size: 100 },
    { name: 'ChronoChime-Setup-1.0.0.exe', browser_download_url: 'https://example.com/setup-exe', size: 200 },
    { name: 'chronochime-1.0.0.exe', browser_download_url: 'https://example.com/plain-exe', size: 150 },
    { name: 'chronochime-1.0.0.dmg', browser_download_url: 'https://example.com/dmg', size: 300 },
  ];

  test('win32 selects Setup.exe when available', () => {
    const result = selectAsset(assets, 'win32');
    expect(result).toBe('https://example.com/setup-exe');
  });

  test('win32 falls back to any .exe if Setup.exe is missing', () => {
    const plainAssets = [
      { name: 'chronochime-1.0.0.exe', browser_download_url: 'https://example.com/plain-exe', size: 150 },
    ];
    const result = selectAsset(plainAssets, 'win32');
    expect(result).toBe('https://example.com/plain-exe');
  });

  test('win32 returns null if no .exe', () => {
    const noExeAssets = [
      { name: 'chronochime-1.0.0.deb', browser_download_url: 'https://example.com/deb', size: 100 },
    ];
    const result = selectAsset(noExeAssets, 'win32');
    expect(result).toBeNull();
  });

  test('linux selects .deb asset', () => {
    const result = selectAsset(assets, 'linux');
    expect(result).toBe('https://example.com/deb');
  });

  test('linux returns null if no .deb', () => {
    const noDebAssets = [
      { name: 'ChronoChime-Setup-1.0.0.exe', browser_download_url: 'https://example.com/setup-exe', size: 200 },
    ];
    const result = selectAsset(noDebAssets, 'linux');
    expect(result).toBeNull();
  });

  test('other platforms return null', () => {
    const result = selectAsset(assets, 'darwin');
    expect(result).toBeNull();
  });
});
