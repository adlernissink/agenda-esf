import { ref } from 'vue';

// Definição do tipo de notificação
export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// Estado global (compartilhado por toda a aplicação)
const toasts = ref<Toast[]>([]);
let nextId = 1;

// Função que qualquer componente pode chamar
export const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = nextId++;
    toasts.value.push({ id, message, type });

    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
  };

  return { toasts, showToast };
};