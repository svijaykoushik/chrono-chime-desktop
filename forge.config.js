const path = require('path');
const fs = require('fs');
const os = require('os');
const { VitePlugin } = require('@electron-forge/plugin-vite');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerDeb } = require('@electron-forge/maker-deb');

function normalizeLinuxPermissions(targetDir) {
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.chmodSync(fullPath, 0o755);
      normalizeLinuxPermissions(fullPath);
    } else if (entry.isFile()) {
      if (entry.name === 'chrome-sandbox') {
        fs.chmodSync(fullPath, 0o4755);
      } else if (
        entry.name === 'chronochime' ||
        entry.name === 'chrome_crashpad_handler' ||
        entry.name.endsWith('.so') ||
        entry.name.includes('.so.') ||
        entry.name.endsWith('.node')
      ) {
        fs.chmodSync(fullPath, 0o755);
      } else {
        fs.chmodSync(fullPath, 0o644);
      }
    }
  }
}

class SafeMakerDeb extends MakerDeb {
  async make(args) {
    // When packaging on filesystems that do not support POSIX permission bits
    // (such as NTFS/fuseblk mounts) or under restrictive umasks, stage the build
    // directory in os.tmpdir() where standard Linux permissions can be enforced.
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronochime-deb-'));
    try {
      fs.cpSync(args.dir, tempDir, { recursive: true });
      normalizeLinuxPermissions(tempDir);
      return await super.make({ ...args, dir: tempDir });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = {
  packagerConfig: {
    asar: true,
    // Lowercase binary name so the Linux .deb (package name "chronochime")
    // finds its executable; also a conventional Linux binary name.
    executableName: 'chronochime',
    icon: './assets/icons/chrono-chime-icon',
    // The Vite plugin bundles our code, but externalized native modules
    // (better-sqlite3, node-web-audio-api) and runtime assets must still ship.
    // Keep only these roots; prune drops devDependencies from node_modules.
    prune: true,
    ignore: (filePath) => {
      if (filePath === '') return false;
      const keep = ['/package.json', '/.vite', '/node_modules', '/assets'];
      return !keep.some(
        (root) => filePath === root || filePath.startsWith(`${root}/`) || root.startsWith(`${filePath}/`),
      );
    },
  },
  rebuildConfig: {},
  // ChronoChime targets Windows and Linux only.
  makers: [
    // Windows installer (.exe / .nupkg) — build on Windows, or on Linux with mono + wine.
    new MakerSquirrel({
      name: 'ChronoChime',
      setupIcon: './assets/icons/chrono-chime-icon.ico',
      authors: 'Vijaykoushik, S',
    }),
    // Linux Debian package (.deb) — requires `dpkg` and `fakeroot` on the build host.
    new SafeMakerDeb(
      {
        options: {
          name: 'chronochime',
          productName: 'ChronoChime',
          genericName: 'Reminder',
          maintainer: 'Vijaykoushik, S',
          homepage: 'https://github.com/svijaykoushik/chrono-chime-desktop',
          categories: ['Utility'],
          icon: './assets/icons/chrono-chime-icon-512.png',
          scripts: {
            postinst: path.join(__dirname, 'scripts/debian/postinst'),
          },
        },
      },
      ['linux'],
    ),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
        { name: 'crash_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};
