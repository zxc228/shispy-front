import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE || 'http://95.165.31.225:55555/'
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      // разрешаем все поддомены trycloudflare + сам домен
      allowedHosts: ['.trycloudflare.com'],
      // стабилизируем HMR через Cloudflare Tunnel (HTTPS)
      hmr: {
        clientPort: 443,
        protocol: 'wss',
      },
      proxy: {
        // Socket.IO default engine path; proxy WS to game server
        '/socket.io': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        // Real-time game server (Socket.IO) via same-origin path
        '/game': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/auth': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        '/lobby': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        '/users': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        '/wallet': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        '/treasury': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
