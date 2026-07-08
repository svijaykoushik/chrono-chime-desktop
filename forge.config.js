const { VitePlugin } = require('@electron-forge/plugin-vite');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerDeb } = require('@electron-forge/maker-deb');

module.exports = {
  packagerConfig: {
    asar: true,
    // Lowercase binary name so the Linux .deb (package name "chronochime")
    // finds its executable; also a conventional Linux binary name.
    executableName: 'chronochime',
    icon: './assets/icons/chrono-chime-icon',
    // The Vite plugin bundles our code, but externalized native modules
    // (better-sqlite3) and runtime assets (icons, sounds) must still ship.
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
    new MakerDeb(
      {
        options: {
          name: 'chronochime',
          productName: 'ChronoChime',
          genericName: 'Reminder',
          maintainer: 'Vijaykoushik, S',
          homepage: 'https://github.com/svijaykoushik/chrono-chime-desktop',
          categories: ['Utility'],
          icon: './assets/icons/chrono-chime-icon-512.png',
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
