<script setup lang="ts">
import { useToast } from '../utils/toast';
import { LucideCheckCircle, LucideAlertCircle, LucideInfo, LucideAlertTriangle } from 'lucide-vue-next';

// Pega a lista de toasts do nosso utilitário
const { toasts } = useToast();

// Ícones para cada tipo
const icons = {
  success: LucideCheckCircle,
  error: LucideAlertCircle,
  warning: LucideAlertTriangle,
  info: LucideInfo
};

// Cores para cada tipo
const classes = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-orange-500 text-white',
  info: 'bg-blue-600 text-white'
};
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        :class="['pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-slate-200 dark:shadow-slate-900/50 min-w-[300px] max-w-md transform transition-all duration-300', classes[toast.type]]"
      >
        <component :is="icons[toast.type]" :size="20" />
        <p class="text-sm font-bold flex-1">{{ toast.message }}</p>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
/* Animação suave de entrada e saída */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>