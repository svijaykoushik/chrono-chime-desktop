export interface UpdateAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

/**
 * Pure function to select the appropriate update asset based on platform.
 * - win32 -> selects an asset ending in .exe, preferring a Squirrel Setup installer.
 * - linux -> selects an asset ending in .deb.
 * - otherwise -> returns null.
 */
export function selectAsset(assets: UpdateAsset[], platform: string): string | null {
  if (platform === 'win32') {
    const exeAssets = assets.filter((a) => a.name.toLowerCase().endsWith('.exe'));
    if (exeAssets.length === 0) return null;
    // Prefer *Setup*.exe
    const setupExe = exeAssets.find((a) => a.name.toLowerCase().includes('setup'));
    const fallbackExe = exeAssets[0];
    return setupExe ? setupExe.browser_download_url : (fallbackExe ? fallbackExe.browser_download_url : null);
  }
  if (platform === 'linux') {
    const debAsset = assets.find((a) => a.name.toLowerCase().endsWith('.deb'));
    return debAsset ? debAsset.browser_download_url : null;
  }
  return null;
}
