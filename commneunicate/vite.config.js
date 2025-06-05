import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/models': 'http://localhost:3000', // Proxy requests for model to the Express server
    },
  },
  
})

