import { defineConfig, loadEnv } from 'vite';

// StrongBow dev/build config.
// - Serves the game on :5173
// - Proxies /api to the Express AI proxy (port from VITE_PROXY_PORT / PORT, default 3847)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyPort = env.PORT || env.VITE_PROXY_PORT || '3847';
  return {
    // relative base so the production build runs from any location: a GitHub
    // Pages project subpath, an itch.io zip, a static host, or a local file.
    base: './',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${proxyPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
  };
});
