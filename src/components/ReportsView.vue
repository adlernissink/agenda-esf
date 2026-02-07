<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucidePieChart, LucideMap } from 'lucide-vue-next';

const appointments = ref<any[]>([]);
const patients = ref<any[]>([]);

onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), (snap) => {
    appointments.value = snap.docs.map(d => d.data());
  });
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// ESTATÍSTICAS COMPUTADAS
const stats = computed(() => {
  // 1. Tipos de Consulta
  const typeCounts: Record<string, number> = {};
  appointments.value.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
  const sortedTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);

  // 2. Por Microárea (ACS)
  const acsCounts: Record<string, number> = {};
  appointments.value.forEach(a => {
    const pat = patients.value.find(p => p.id === a.patientId);
    const key = (pat && pat.acs) ? pat.acs : 'Sem ACS/Outros';
    acsCounts[key] = (acsCounts[key] || 0) + 1;
  });
  const sortedAcs = Object.entries(acsCounts).sort((a,b) => b[1] - a[1]);

  return { sortedTypes, sortedAcs };
});

const totalAppts = computed(() => appointments.value.length);
const totalPatients = computed(() => patients.value.length);
const dailyAvg = computed(() => totalAppts.value > 0 ? (totalAppts.value / 20).toFixed(1) : '0'); // Estimativa simples
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-6">Relatórios e Estatísticas</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p class="text-slate-500 text-xs font-bold uppercase">Total Agendamentos</p>
            <h3 class="text-4xl font-bold text-blue-600 mt-2">{{ totalAppts }}</h3>
            <p class="text-slate-400 text-xs mt-1">Geral</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p class="text-slate-500 text-xs font-bold uppercase">Pacientes Cadastrados</p>
            <h3 class="text-4xl font-bold text-emerald-600 mt-2">{{ totalPatients }}</h3>
            <p class="text-slate-400 text-xs mt-1">Base total</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p class="text-slate-500 text-xs font-bold uppercase">Média Diária (Est.)</p>
            <h3 class="text-4xl font-bold text-orange-600 mt-2">{{ dailyAvg }}</h3>
            <p class="text-slate-400 text-xs mt-1">Baseada em 20 dias/mês</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <LucidePieChart class="text-blue-500" /> Distribuição por Tipo
            </h3>
            <div class="space-y-4">
                <div v-for="[type, count] in stats.sortedTypes" :key="type">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-700 dark:text-slate-300">{{ type }}</span>
                        <span class="text-slate-500">{{ count }} ({{ ((count / totalAppts) * 100).toFixed(1) }}%)</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000" :style="{ width: ((count / totalAppts) * 100) + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 class="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <LucideMap class="text-emerald-500" /> Demanda por Microárea
            </h3>
            <div class="space-y-4">
                <div v-for="[acs, count] in stats.sortedAcs" :key="acs">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-700 dark:text-slate-300">{{ acs }}</span>
                        <span class="text-slate-500">{{ count }}</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div class="bg-emerald-500 h-2 rounded-full transition-all duration-1000" :style="{ width: ((count / totalAppts) * 100) + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>