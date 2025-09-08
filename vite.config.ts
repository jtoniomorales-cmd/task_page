import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [RubyPlugin(), react()],
})
