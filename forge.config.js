const { VitePlugin } = require('@electron-forge/plugin-vite');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { MakerZIP } = require('@electron-forge/maker-zip');

module.exports = {
  packagerConfig: {
    asar: true,
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
  makers: [new MakerZIP({}, ['darwin', 'linux', 'win32'])],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
  ],
};
