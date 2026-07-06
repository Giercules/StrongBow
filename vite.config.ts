import type { ServerResponse } from 'http';
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
          // When the AI proxy isn't running (e.g. `dev:client` only), answer with
          // safe fallbacks instead of spamming ECONNREFUSED in the Vite console.
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              const out = res as ServerResponse;
              if (!out?.writeHead || out.headersSent) return;
              const url = req.url ?? '';
              if (url.includes('/api/health')) {
                out.writeHead(200, { 'Content-Type': 'application/json' });
                out.end(
                  JSON.stringify({
                    ok: false,
                    offline: true,
                    providers: { openai: false, anthropic: false, xai: false },
                  })
                );
                return;
              }
              if (url.includes('/api/ai/complete')) {
                out.writeHead(200, { 'Content-Type': 'application/json' });
                out.end(JSON.stringify({ text: 'The torches flicker low.', live: false }));
                return;
              }
              out.writeHead(503, { 'Content-Type': 'application/json' });
              out.end(JSON.stringify({ ok: false, offline: true, error: String(err) }));
            });
          },
        },
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 2100,
    },
  };
});
