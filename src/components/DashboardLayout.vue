<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { 
  LucideActivity, LucideCalendar, LucideUsers, 
  LucideBarChart2, LucideFilePlus, LucideUser, 
  LucideLogOut, LucideMenu, LucideMessageSquare 
} from 'lucide-vue-next';
import ProfileModal from './ProfileModal.vue';

const props = defineProps(['user']);
const emit = defineEmits(['logout']);

const isMobileMenuOpen = ref(false);
const activeTab = ref('agenda');
const isProfileOpen = ref(false);
const userName = ref(props.user?.email); 

onMounted(() => {
  if (props.user) {
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'user_profiles', props.user.uid), (doc) => {
      if (doc.exists() && doc.data().name) {
        userName.value = doc.data().name;
      }
    });
  }
});

const switchTab = (tabName: string) => {
  activeTab.value = tabName;
  isMobileMenuOpen.value = false;
};

// Funções para classes dinâmicas
const getNavClass = (tab: string) => {
    const base = "px-3 py-2 text-sm font-medium flex items-center gap-2 transition h-full border-b-2";
    if (activeTab.value === tab) return `${base} text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400`;
    return `${base} text-slate-500 border-transparent hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400`;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    <nav class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center gap-4 lg:gap-8">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="lg:hidden p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400">
              <LucideMenu :size="24" />
            </button>

            <span class="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 min-w-fit">Gestão eSF
            </span>

            <!-- Menu Desktop -->
            <div class="hidden lg:flex space-x-2 h-full ml-4">
              <button @click="switchTab('agenda')" :class="getNavClass('agenda')"><LucideCalendar :size="18" /> Agenda</button>
              <button @click="switchTab('pacientes')" :class="getNavClass('pacientes')"><LucideUsers :size="18" /> Pacientes</button>
              <button @click="switchTab('mural')" :class="getNavClass('mural')"><LucideMessageSquare :size="18" /> Mural</button>
              <button @click="switchTab('reports')" :class="getNavClass('reports')"><LucideBarChart2 :size="18" /> Relatórios</button>
              <button @click="switchTab('recipes')" :class="getNavClass('recipes')"><LucideFilePlus :size="18" /> Receitas</button>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <button @click="isProfileOpen = true" class="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition">
              <LucideUser :size="14" class="text-slate-500" />
              <span class="hidden md:inline max-w-[150px] truncate">{{ userName }}</span>
            </button>

            <button @click="$emit('logout')" class="text-slate-400 hover:text-red-500 transition" title="Sair">
              <LucideLogOut :size="20" />
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Menu Mobile -->
    <div v-if="isMobileMenuOpen" class="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-lg sticky top-16 z-30">
        <div class="px-4 pt-2 pb-4 space-y-1">
            <button @click="switchTab('agenda')" class="w-full text-left px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 text-slate-500 hover:bg-slate-50"><LucideCalendar :size="18" /> Agenda</button>
            <button @click="switchTab('pacientes')" class="w-full text-left px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 text-slate-500 hover:bg-slate-50"><LucideUsers :size="18" /> Pacientes</button>
            <button @click="switchTab('mural')" class="w-full text-left px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 text-slate-500 hover:bg-slate-50"><LucideMessageSquare :size="18" /> Mural</button>
            <button @click="switchTab('reports')" class="w-full text-left px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 text-slate-500 hover:bg-slate-50"><LucideBarChart2 :size="18" /> Relatórios</button>
            <button @click="switchTab('recipes')" class="w-full text-left px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 text-slate-500 hover:bg-slate-50"><LucideFilePlus :size="18" /> Receitas</button>
        </div>
    </div>

    <!-- CONTEÚDO -->
    <main class="max-w-7xl mx-auto p-4 lg:p-8">
      <slot :currentTab="activeTab"></slot>
    </main>

    <!-- MODAL DE PERFIL -->
    <ProfileModal :isOpen="isProfileOpen" :user="user" @close="isProfileOpen = false" />
    
  </div>
</template>