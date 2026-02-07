<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { LucideX, LucideGitCommit, LucideRocket, LucideZap } from 'lucide-vue-next';
import { appVersions } from '../data/changelog';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const getIcon = (type: string) => {
    switch(type) {
        case 'major': return LucideRocket;
        case 'minor': return LucideZap;
        default: return LucideGitCommit;
    }
};

const getColor = (type: string) => {
    switch(type) {
        case 'major': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        case 'minor': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
    <div class="bg-white dark:bg-slate-800 dark:text-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
      
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0">
        <div>
            <h3 class="font-bold text-xl text-slate-800 dark:text-white">Novidades & Atualizações</h3>
            <p class="text-xs text-slate-500 mt-1">Histórico de versões do app Gestão eSF</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition text-slate-400">
            <LucideX :size="20" />
        </button>
      </div>

      <div class="p-6 overflow-y-auto space-y-8">
        <!-- CORREÇÃO: removido (ver, index), agora apenas ver -->
        <div v-for="ver in appVersions" :key="ver.version" class="relative pl-8 border-l-2 border-slate-100 dark:border-slate-700 last:border-0 pb-2">
            
            <div :class="['absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800', ver.type === 'major' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600']"></div>

            <div class="flex items-center gap-3 mb-2">
                <span :class="['px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1', getColor(ver.type)]">
                    <component :is="getIcon(ver.type)" :size="12" /> v{{ ver.version }}
                </span>
                <span class="text-xs text-slate-400">{{ ver.date }}</span>
            </div>

            <ul class="space-y-2">
                <li v-for="(change, i) in ver.changes" :key="i" class="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span class="mt-1.5 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0"></span>
                    {{ change }}
                </li>
            </ul>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center shrink-0">
        <p class="text-[10px] text-slate-400">Desenvolvido por Adler Nissink</p>
      </div>

    </div>
  </div>
</template>