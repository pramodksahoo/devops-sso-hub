import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Get API base URL from environment, fallback to localhost
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3002/api'
  const authBffUrl = env.VITE_AUTH_BFF_URL || 'http://localhost:3002'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PORT || '3000'),
      proxy: {
        // Proxy API requests to the Auth BFF service
        '/api': {
          target: authBffUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      // Define global constants that can be replaced at build time
      define: {
        __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/config': path.resolve(__dirname, './src/config'),
        '@/lib': path.resolve(__dirname, './src/lib'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/contexts': path.resolve(__dirname, './src/contexts'),
        '@/types': path.resolve(__dirname, './src/types'),
      },
    },
    // Ensure all VITE_ prefixed environment variables are exposed to the client
    envPrefix: 'VITE_',
    
    // Development optimizations
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  }
})
