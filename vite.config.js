import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clinviaBaseUrl = (env.VITE_CLINVIA_API_URL || 'https://clinvia.studiokristian.com')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        '/clinvia-proxy': {
          target: clinviaBaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/clinvia-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Accept', 'application/json')
              proxyReq.setHeader('Origin', 'http://localhost:5174')

              if (env.VITE_CLINVIA_API_KEY) {
                proxyReq.setHeader('X-API-Key', env.VITE_CLINVIA_API_KEY)
              }
            })
          }
        }
      }
    }
  }
})
