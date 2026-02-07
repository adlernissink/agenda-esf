<script setup lang="ts">
import { ref } from 'vue';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 
import { LucideShieldCheck } from 'lucide-vue-next';
import { appVersions } from '../data/changelog'; // Importar dados
import ChangelogModal from './ChangelogModal.vue'; // Importar Modal

// Pega a versão mais recente para mostrar no texto
const currentVersion = appVersions[0].version;

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const isChangelogOpen = ref(false); // Controle do Modal

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
  } catch (err: any) {
    errorMessage.value = "Falha no login: " + err.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-white dark:bg-slate-900 z-[100] flex items-center justify-center p-4 transition-colors duration-300">
    <div class="max-w-md w-full space-y-8 bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl relative">
      
      <div class="text-center">
        <div class="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
           <LucideShieldCheck class="text-white" :size="32" />
        </div>
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">eSF 010</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Acesso restrito à equipe de saúde</p>
        
        <!-- Botão de Versão Clicável -->
        <button 
          @click="isChangelogOpen = true"
          class="mt-4 text-xs text-blue-500 font-mono hover:underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
        >
          v{{ currentVersion }} (Changelog)
        </button>
      </div>

      <form @submit.prevent="handleLogin" class="mt-8 space-y-4">
        <input 
          v-model="email"
          type="email" 
          required 
          class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-slate-400 dark:placeholder-slate-500" 
          placeholder="E-mail funcional"
        >
        <input 
          v-model="password"
          type="password" 
          required 
          class="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-slate-400 dark:placeholder-slate-500" 
          placeholder="Senha"
        >
        <button 
          type="submit" 
          :disabled="isLoading"
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-200 dark:shadow-none"
        >
          {{ isLoading ? 'Entrando...' : 'Entrar no Sistema' }}
        </button>
      </form>
      
      <p v-if="errorMessage" class="text-red-500 text-xs text-center mt-4 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800">
        {{ errorMessage }}
      </p>
    </div>

    <!-- MODAL DE CHANGELOG -->
    <ChangelogModal :isOpen="isChangelogOpen" @close="isChangelogOpen = false" />
  </div>
</template>