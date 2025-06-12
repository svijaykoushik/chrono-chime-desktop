const { join } = require('path');

module.exports = {
  packagerConfig: {
    appCopyright: 'Copyright © 2023 Vijaykoushik, S. All rights reserved.',
    asar: true,
    icon: 'chrono-chime-icon.ico',
    name: 'ChronoChime',
    win32metadata: {
      CompanyName: 'Vijaykoushik, S.',
      ProductName: 'ChronoChime',
      FileDescription:
        'ChronoChime: Customizable time companion with soothing chimes, seamless background operation',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'Vijaykoushik, S.',
        name: 'ChronoChime',
        description:
          'ChronoChime: Customizable time companion with soothing chimes, seamless background operation',
        iconUrl:
          'https://raw.githubusercontent.com/svijaykoushik/chrono-chime-desktop/main/chrono-chime-icon.ico',
        setupIcon: join(__dirname, 'chrono-chime_package.ico'),
        title: 'ChronoChime',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          bin: 'ChronoChime',
          categories: ['Utility', 'Office', 'Game'],
          icon: join(__dirname, 'chrono-chime-icon-512.png'),
          maintainer: 'Vijaykoushik, S.',
          productName: 'ChronoChime',
          homepage: 'https://chrono-chime.web.app',
          genericName: 'ChronoChime - Time Management Assistant',
          description:
            'ChronoChime: Customizable time companion with soothing chimes, seamless background operation',
          name: 'ChronoChime',
          productDescription:
            'ChronoChime is a flexible desktop application designed to streamline time management and boost productivity. With customizable intervals and chimes, seamless background operation, automatic startup options, and one-click chime control, ChronoChime empowers users to tailor their experience and stay on track effortlessly.',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          bin: 'ChronoChime',
          categories: ['Utility', 'Office', 'Game'],
          description:
            'ChronoChime: Customizable time companion with soothing chimes, seamless background operation',
          genericName: 'ChronoChime - Time Management Assistant',
          homepage: 'https://chrono-chime.web.app',
          icon: join(__dirname, 'chrono-chime-icon-512.png'),
          name: 'ChronoChime',
          productDescription:
            'ChronoChime is a flexible desktop application designed to streamline time management and boost productivity. With customizable intervals and chimes, seamless background operation, automatic startup options, and one-click chime control, ChronoChime empowers users to tailor their experience and stay on track effortlessly.',
          productName: 'ChronoChime',
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'main.ts',
            config: 'vite.main.config.ts',
            target: 'main',
          },
          {
            entry: 'preload.ts',
            config: 'vite.preload.config.ts',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'svijaykoushik',
          name: 'chrono-chime-desktop',
        },
        draft: true,
      },
    },
  ],
};
