<script setup lang="ts">
import { LucideFilePlus } from 'lucide-vue-next';
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
    <div class="bg-slate-100 dark:bg-slate-800 p-6 rounded-full">
        <LucideFilePlus class="text-slate-400" :size="48" />
    </div>
    <h2 class="text-2xl font-bold text-slate-700 dark:text-slate-300">Módulo de Receitas</h2>
    <p class="text-slate-500 dark:text-slate-400 max-w-md">Em Breve: Gerador automático de receitas e documentos médicos.</p>
    <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Em Construção</span>
  </div>
</template>