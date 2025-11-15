import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Módulo necessário para o alias de caminho

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Configura o alias '@/' para apontar para a pasta 'src/'
      "@": path.resolve(__dirname, "./src"),
    },
    // Adiciona as extensões que o Vite deve tentar resolver automaticamente (incluindo .jsx)
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'] 
  },
})