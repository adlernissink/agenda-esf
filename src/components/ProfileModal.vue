<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideX, LucideMoon, LucideHistory } from 'lucide-vue-next';
import ChangelogModal from './ChangelogModal.vue'; 

const props = defineProps<{
  isOpen: boolean;
  user: any;
}>();

const emit = defineEmits(['close']);

const isLoading = ref(false);
const form = ref({ name: '', role: '' });
const isDarkMode = ref(false);
const isChangelogOpen = ref(false);

// --- FECHAR COM ESC (NOVO) ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen && !isChangelogOpen.value) {
    emit('close');
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);

  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'enabled' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  }

  if (props.user) {
    const userSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_profiles', props.user.uid));
    if (userSnap.exists()) {
      form.value = userSnap.data() as any;
    }
  }
});

onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'enabled');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'disabled');
  }
};

const handleSaveProfile = async () => {
  if (!props.user) return;
  isLoading.value = true;
  try {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_profiles', props.user.uid), form.value, { merge: true });
    alert("Perfil atualizado!");
  } catch (e: any) {
    alert("Erro: " + e.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-slate-800 dark:text-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
      
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
        <h3 class="font-bold text-xl">Meu Perfil</h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600"><LucideX /></button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto">
        <!-- FORMULÁRIO -->
        <form @submit.prevent="handleSaveProfile" class="space-y-4">
          <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Exibição</label>
              <input v-model="form.name" type="text" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Ex: Adler">
          </div>
          <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Função</label>
              <input v-model="form.role" type="text" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Ex: Médico de Família">
          </div>

          <!-- DARK MODE TOGGLE -->
          <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
             <div class="flex items-center gap-2">
                <div class="bg-slate-200 dark:bg-slate-600 p-2 rounded-lg text-slate-600 dark:text-slate-300">
                   <LucideMoon :size="18" />
                </div>
                <span class="font-bold text-sm text-slate-700 dark:text-slate-200">Modo Escuro</span>
             </div>
             <button type="button" @click="toggleDarkMode" :class="['w-11 h-6 rounded-full transition-colors relative', isDarkMode ? 'bg-blue-600' : 'bg-slate-300']">
                <div :class="['absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform', isDarkMode ? 'translate-x-5' : 'translate-x-0']"></div>
             </button>
          </div>

          <button type="submit" :disabled="isLoading" class="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 transition text-sm">
             {{ isLoading ? 'Salvando...' : 'Atualizar Dados' }}
          </button>
        </form>

        <!-- BOTÃO VER CHANGELOG -->
        <button 
            @click="isChangelogOpen = true"
            class="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 py-2 text-xs font-bold uppercase transition border border-dashed border-slate-300 rounded-xl"
        >
            <LucideHistory :size="14" /> Ver Histórico de Versões
        </button>
      </div>
    </div>

    <!-- MODAL DE CHANGELOG -->
    <ChangelogModal :isOpen="isChangelogOpen" @close="isChangelogOpen = false" />
  </div>
</template>