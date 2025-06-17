import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default async () => {
  const { viteStaticCopy } = await import('vite-plugin-static-copy');
  return defineConfig({
    build: {
      sourcemap: true,
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: [
              'chrono-chime-icon-512.png',
              'chrono-chime-icon-32.png',
              'show-window.png',
              'minimize-app.png',
              'notification-disabled.png',
              'notification-enabled.png',
              'app-settings.png',
              'close-app.png',
            ], // Adjust to match your static asset folder
            dest: '.', // Copies to the root of the output dir
          },
        ],
      }),
    ],
  });
};
