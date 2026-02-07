import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // IMPORTANTE: Substitua 'nome-do-seu-repositorio' pelo nome real do seu repo no GitHub
  // Se o repo se chama "gestao-esf", coloque: base: '/gestao-esf/'
  // Se for um site de usuário (adler.github.io), deixe base: '/'
  base: '/agenda-esf/', 
})