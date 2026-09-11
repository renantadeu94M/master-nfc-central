import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `host: true` expõe o dev server na rede local — sem isso não dá pra abrir
// no celular, e o Web NFC só existe no Chrome Android. Ver README: em rede
// local o navegador trata http://<ip>:5174 como origem insegura e bloqueia a
// API; pra testar gravação de verdade é preciso HTTPS (GitHub Pages, em
// produção) ou port-forward do Chrome DevTools, que herda o "localhost é
// seguro".
//
// `base` só muda no build: GitHub Pages de projeto (não de usuário) serve o
// site em github.io/<repo>/, não na raiz do domínio — sem isso os assets
// (JS/CSS em /assets/...) pediam a raiz errada e a página abria em branco.
// Em dev fica em "/" pra não forçar visitar /master-nfc-central/ toda vez que
// alguém sobe o servidor local.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/master-nfc-central/' : '/',
  server: {
    port: Number(process.env.PORT) || 5174,
    host: true,
    open: true
  }
}))
