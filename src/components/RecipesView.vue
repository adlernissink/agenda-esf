<script setup lang="ts">
import { ref } from 'vue';
import { LucideFileText, LucidePill, LucideClipboardList } from 'lucide-vue-next';
import MedicationsView from './MedicationsView.vue'; 
import RenewalQueue from './RenewalQueue.vue'; 
import DocumentsView from './DocumentsView.vue'; // IMPORTADO

const activeSubTab = ref<'renewals' | 'catalog' | 'docs'>('renewals');

const getTabClass = (tab: string) => {
    const base = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition";
    if (activeSubTab.value === tab) {
        return `${base} bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none`;
    }
    return `${base} text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700`;
};
</script>

<template>
  <div class="space-y-6">
    
    <!-- Cabeçalho -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Receitas</h2>
            <p class="text-slate-500 text-sm">Controle de renovações e documentos.</p>
        </div>

        <div class="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button @click="activeSubTab = 'renewals'" :class="getTabClass('renewals')">
                <LucideClipboardList :size="16" /> Renovações
            </button>
            <button @click="activeSubTab = 'catalog'" :class="getTabClass('catalog')">
                <LucidePill :size="16" /> Catálogo
            </button>
            <button @click="activeSubTab = 'docs'" :class="getTabClass('docs')">
                <LucideFileText :size="16" /> Documentos
            </button>
        </div>
    </div>

    <!-- CONTEÚDO DAS ABAS -->
    
    <div v-if="activeSubTab === 'renewals'">
        <RenewalQueue />
    </div>

    <div v-if="activeSubTab === 'catalog'">
        <MedicationsView />
    </div>

    <!-- 3. Documentos (AGORA FUNCIONAL) -->
    <div v-if="activeSubTab === 'docs'">
        <DocumentsView />
    </div>

  </div>
</template>