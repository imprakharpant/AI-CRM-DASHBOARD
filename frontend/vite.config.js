import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite 8's app builder currently emits an invalid Windows absolute index.html path.
  builder: null,
})
