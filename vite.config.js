import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `host: true` expõe o dev server na rede local — sem isso não dá pra abrir
// no celular, e o Web NFC só existe no Chrome Android. Ver README: em rede
// local o navegador trata http://<ip>:5173 como origem insegura e bloqueia a
// API; pra testar gravação de verdade é preciso HTTPS (ngrok/Cloudflare) ou
// port-forward do Chrome DevTools, que herda o "localhost é seguro".
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5174,
    host: true,
    open: true
  }
})
