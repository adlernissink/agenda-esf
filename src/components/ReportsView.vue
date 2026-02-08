<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { 
  LucidePieChart, LucideMap, LucideFilter, LucideAlertTriangle, 
  LucideUsers, LucideCalendarClock, LucideDownload, LucideTable, LucideBarChart3 
} from 'lucide-vue-next';

const appointments = ref<any[]>([]);
const patients = ref<any[]>([]);
const activeTab = ref<'stats' | 'filters' | 'followup'>('stats');

// --- ESTADO DOS FILTROS AVANÇADOS ---
const filterConditions = ref<string[]>([]);
const filterAgeMin = ref<number | ''>('');
const filterAgeMax = ref<number | ''>('');
const filterAcs = ref('todos');
const filterMedType = ref('todos');
const filterViewMode = ref<'table' | 'charts'>('table'); // Alternar entre Tabela e Gráficos

const availableConditions = [
    'HAS', 'DM', 'GESTANTE', 'SM', 'ACAMADO', 'TABAGISTA',
    'OBESIDADE', 'FIBROMIALGIA', 'TEA', 'DPOC', 'AVC', 'ASMA'
];

onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), (snap) => {
    appointments.value = snap.docs.map(d => d.data());
  });
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// --- HELPERS ---
const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

// Lista de ACS dinâmica (baseada nos pacientes cadastrados)
const availableAcs = computed(() => {
    const acsSet = new Set<string>();
    patients.value.forEach(p => {
        if(p.acs) acsSet.add(p.acs);
    });
    return Array.from(acsSet).sort();
});

// --- LÓGICA DE FILTRAGEM ROBUSTA ---
const filteredPatients = computed(() => {
  // Se não houver filtros, mostra todos (ou nenhum? Vamos mostrar todos para facilitar a exploração)
  
  return patients.value.filter(p => {
    // 1. Condições (E lógico)
    const patientTags = p.tags || [];
    if (filterConditions.value.length > 0) {
        const matchesConditions = filterConditions.value.every(cond => patientTags.includes(cond));
        if (!matchesConditions) return false;
    }

    // 2. Microárea
    if (filterAcs.value !== 'todos' && p.acs !== filterAcs.value) return false;

    // 3. Idade
    const age = calculateAge(p.dob);
    if (filterAgeMin.value !== '' && age < filterAgeMin.value) return false;
    if (filterAgeMax.value !== '' && age > filterAgeMax.value) return false;

    // 4. Tipo de Medicação
    if (filterMedType.value !== 'todos') {
        const meds = p.activeMeds || [];
        if (filterMedType.value === 'active_any') {
            if (meds.length === 0) return false; // Tem que ter algum remédio
        } else {
            // Tem que ter remédio do tipo específico (A, B, C...)
            const hasType = meds.some((m: any) => m.type === filterMedType.value);
            if (!hasType) return false;
        }
    }

    return true;
  });
});

// --- ESTATÍSTICAS DA SELEÇÃO (Para os gráficos do filtro) ---
const filteredStats = computed(() => {
    const acsCounts: Record<string, number> = {};
    const conditionCounts: Record<string, number> = {};
    
    // Inicializa contadores
    availableConditions.forEach(c => conditionCounts[c] = 0);

    filteredPatients.value.forEach(p => {
        // Por ACS
        const acs = p.acs || 'Sem ACS';
        acsCounts[acs] = (acsCounts[acs] || 0) + 1;

        // Por Condição
        (p.tags || []).forEach((t: string) => {
            if (conditionCounts[t] !== undefined) conditionCounts[t]++;
        });
    });

    return {
        sortedAcs: Object.entries(acsCounts).sort((a,b) => b[1] - a[1]),
        sortedConditions: Object.entries(conditionCounts).sort((a,b) => b[1] - a[1])
    };
});

// --- EXPORTAR CSV ---
const exportCsv = () => {
    const headers = ['Nome', 'Nascimento', 'Idade', 'Microárea', 'Condições', 'Medicações'];
    const rows = filteredPatients.value.map(p => {
        const age = calculateAge(p.dob);
        const meds = (p.activeMeds || []).map((m: any) => `${m.name} (${m.dosage})`).join('; ');
        const tags = (p.tags || []).join(', ');
        // Aspas para evitar quebra com vírgulas no conteúdo
        return [
            `"${p.name}"`,
            p.dob,
            age,
            `"${p.acs}"`,
            `"${tags}"`,
            `"${meds}"`
        ].join(',');
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // \uFEFF para UTF-8 no Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_esf_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// --- ESTATÍSTICAS GERAIS (Aba 1) ---
const stats = computed(() => {
  const typeCounts: Record<string, number> = {};
  appointments.value.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
  const sortedTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);

  const acsCounts: Record<string, number> = {};
  patients.value.forEach(p => {
    const key = p.acs || 'Sem ACS';
    acsCounts[key] = (acsCounts[key] || 0) + 1;
  });
  const sortedAcs = Object.entries(acsCounts).sort((a,b) => b[1] - a[1]);

  return { sortedTypes, sortedAcs };
});

const totalAppts = computed(() => appointments.value.length);
const totalPatients = computed(() => patients.value.length);
const patientsWithMeds = computed(() => patients.value.filter(p => p.activeMeds && p.activeMeds.length > 0).length);

// --- BUSCA ATIVA (Aba 3) ---
const followupList = computed(() => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return patients.value.filter(p => {
    if (!p.tags || p.tags.length === 0) return false;
    
    const patientAppts = appointments.value
        .filter(a => a.patientId === p.id)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    
    const lastAppt = patientAppts[0];
    if (!lastAppt) return true;
    const lastDate = new Date(lastAppt.date);
    return lastDate < sixMonthsAgo;
  }).map(p => {
      const patientAppts = appointments.value
        .filter(a => a.patientId === p.id)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      
      return {
          ...p,
          lastVisit: patientAppts[0] ? new Date(patientAppts[0].date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Nunca'
      };
  });
});

const toggleFilter = (cond: string) => {
    if (filterConditions.value.includes(cond)) {
        filterConditions.value = filterConditions.value.filter(c => c !== cond);
    } else {
        filterConditions.value.push(cond);
    }
};

const getTabClass = (tab: string) => {
    const base = "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer";
    if (activeTab.value === tab) return `${base} bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-600`;
    return `${base} text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800`;
};
</script>

<template>
  <div class="space-y-6">
    
    <!-- Cabeçalho e Abas -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Relatórios e Estatísticas</h2>
        
        <div class="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl">
            <button @click="activeTab = 'stats'" :class="getTabClass('stats')">
                <LucidePieChart :size="16" /> Visão Geral
            </button>
            <button @click="activeTab = 'filters'" :class="getTabClass('filters')">
                <LucideFilter :size="16" /> Filtros Inteligentes
            </button>
            <button @click="activeTab = 'followup'" :class="getTabClass('followup')">
                <LucideAlertTriangle :size="16" /> Busca Ativa
            </button>
        </div>
    </div>

    <!-- === ABA 1: VISÃO GERAL === -->
    <div v-if="activeTab === 'stats'" class="space-y-6">
        <!-- Cards KPI -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LucideUsers class="text-blue-600 w-24 h-24" />
                </div>
                <p class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Pacientes</p>
                <h3 class="text-4xl font-bold text-slate-800 dark:text-white mt-2">{{ totalPatients }}</h3>
                <p class="text-slate-400 text-xs mt-1">Cadastrados na base</p>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LucideCalendarClock class="text-emerald-600 w-24 h-24" />
                </div>
                <p class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Agendamentos</p>
                <h3 class="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{{ totalAppts }}</h3>
                <p class="text-slate-400 text-xs mt-1">Histórico completo</p>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LucideDownload class="text-orange-600 w-24 h-24" />
                </div>
                <p class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Uso de Medicação</p>
                <h3 class="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">{{ patientsWithMeds }}</h3>
                <p class="text-slate-400 text-xs mt-1">Pacientes com receitas ativas</p>
            </div>
        </div>

        <!-- Gráficos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 class="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <LucidePieChart class="text-blue-500" :size="20" /> Distribuição por Tipo de Consulta
                </h3>
                <div class="space-y-4">
                    <div v-for="[type, count] in stats.sortedTypes" :key="type">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium text-slate-700 dark:text-slate-300">{{ type }}</span>
                            <span class="text-slate-500">{{ count }} ({{ totalAppts > 0 ? ((count / totalAppts) * 100).toFixed(1) : 0 }}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000" :style="{ width: totalAppts > 0 ? ((count / totalAppts) * 100) + '%' : '0%' }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 class="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <LucideMap class="text-emerald-500" :size="20" /> Pacientes por Microárea
                </h3>
                <div class="space-y-4">
                    <div v-for="[acs, count] in stats.sortedAcs" :key="acs">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium text-slate-700 dark:text-slate-300">{{ acs }}</span>
                            <span class="text-slate-500">{{ count }}</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div class="bg-emerald-500 h-2 rounded-full transition-all duration-1000" :style="{ width: totalPatients > 0 ? ((count / totalPatients) * 100) + '%' : '0%' }"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- === ABA 2: FILTROS INTELIGENTES === -->
    <div v-if="activeTab === 'filters'" class="space-y-6">
        
        <!-- Painel de Controle dos Filtros -->
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            
            <!-- Linha 1: Condições Clínicas -->
            <div>
                <h3 class="text-xs font-bold text-slate-500 uppercase mb-3">Condições (Multi-seleção)</h3>
                <div class="flex flex-wrap gap-2">
                    <button 
                        v-for="cond in availableConditions" :key="cond"
                        @click="toggleFilter(cond)"
                        :class="['px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2', 
                            filterConditions.includes(cond) 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300']"
                    >
                        {{ cond }}
                    </button>
                </div>
            </div>

            <!-- Linha 2: Demografia e Medicação -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                
                <!-- Microárea -->
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Microárea</label>
                    <select v-model="filterAcs" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm outline-none text-slate-700 dark:text-white">
                        <option value="todos">Todas</option>
                        <option v-for="acs in availableAcs" :key="acs" :value="acs">{{ acs }}</option>
                    </select>
                </div>

                <!-- Tipo de Receita -->
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Uso de Medicação</label>
                    <select v-model="filterMedType" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm outline-none text-slate-700 dark:text-white">
                        <option value="todos">Indiferente</option>
                        <option value="active_any">Uso Contínuo (Qualquer)</option>
                        <option value="A">Receita Amarela (A)</option>
                        <option value="B">Receita Azul (B)</option>
                        <option value="C">Controle Especial (C)</option>
                    </select>
                </div>

                <!-- Idade Min/Max -->
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Idade Mínima</label>
                    <input v-model="filterAgeMin" type="number" placeholder="Ex: 60" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm outline-none text-slate-700 dark:text-white">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Idade Máxima</label>
                    <input v-model="filterAgeMax" type="number" placeholder="Ex: 100" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm outline-none text-slate-700 dark:text-white">
                </div>
            </div>
        </div>

        <!-- Resultados e Ações -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-700/30">
                <span class="font-bold text-sm text-slate-700 dark:text-slate-200">
                    Resultados: {{ filteredPatients.length }} pacientes encontrados
                </span>
                
                <div class="flex items-center gap-2">
                    <!-- Toggle Visualização -->
                    <div class="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                        <button @click="filterViewMode = 'table'" :class="['p-1.5 rounded-md transition', filterViewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-slate-400']" title="Lista"><LucideTable :size="16" /></button>
                        <button @click="filterViewMode = 'charts'" :class="['p-1.5 rounded-md transition', filterViewMode === 'charts' ? 'bg-blue-100 text-blue-600' : 'text-slate-400']" title="Gráficos"><LucideBarChart3 :size="16" /></button>
                    </div>

                    <button @click="exportCsv" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2">
                        <LucideDownload :size="16" /> Exportar Planilha
                    </button>
                </div>
            </div>
            
            <!-- MODO TABELA -->
            <div v-if="filterViewMode === 'table'" class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs font-bold">
                        <tr>
                            <th class="px-6 py-3">Nome</th>
                            <th class="px-6 py-3">Idade</th>
                            <th class="px-6 py-3">Microárea</th>
                            <th class="px-6 py-3">Condições</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                        <tr v-for="p in filteredPatients" :key="p.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td class="px-6 py-3 font-medium text-slate-800 dark:text-white">{{ p.name }}</td>
                            <td class="px-6 py-3 text-slate-500 dark:text-slate-400">{{ calculateAge(p.dob) }} anos</td>
                            <td class="px-6 py-3 text-slate-500 dark:text-slate-400">{{ p.acs }}</td>
                            <td class="px-6 py-3">
                                <div class="flex gap-1 flex-wrap">
                                    <span v-for="tag in p.tags" :key="tag" class="text-[10px] bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-500">{{ tag }}</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="filteredPatients.length === 0">
                            <td colspan="4" class="p-8 text-center text-slate-400">Nenhum resultado com estes filtros.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- MODO GRÁFICOS (Da Seleção Atual) -->
            <div v-else class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50">
                <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 class="font-bold text-slate-700 dark:text-white mb-4 text-sm">Distribuição por Microárea (Nesta Seleção)</h4>
                    <div class="space-y-2">
                        <div v-for="[acs, count] in filteredStats.sortedAcs" :key="acs">
                            <div class="flex justify-between text-xs mb-1">
                                <span>{{ acs }}</span> <span>{{ count }}</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                <div class="bg-blue-500 h-1.5 rounded-full" :style="{ width: ((count / filteredPatients.length) * 100) + '%' }"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 class="font-bold text-slate-700 dark:text-white mb-4 text-sm">Comorbidades Associadas</h4>
                    <div class="space-y-2">
                        <div v-for="[cond, count] in filteredStats.sortedConditions" :key="cond">
                            <div class="flex justify-between text-xs mb-1">
                                <span>{{ cond }}</span> <span>{{ count }}</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                <div class="bg-purple-500 h-1.5 rounded-full" :style="{ width: ((count / filteredPatients.length) * 100) + '%' }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- === ABA 3: BUSCA ATIVA === -->
    <div v-if="activeTab === 'followup'" class="space-y-6">
        <div class="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex gap-4 items-start">
            <LucideAlertTriangle class="text-orange-500 shrink-0" :size="24" />
            <div>
                <h3 class="font-bold text-orange-800 dark:text-orange-200">Atenção Necessária</h3>
                <p class="text-sm text-orange-600 dark:text-orange-300 mt-1">
                    Lista de pacientes com condições crônicas que não registram consulta há mais de 6 meses (180 dias). 
                    Necessário busca ativa.
                </p>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs font-bold">
                        <tr>
                            <th class="px-6 py-3">Paciente</th>
                            <th class="px-6 py-3">Microárea</th>
                            <th class="px-6 py-3">Última Consulta</th>
                            <th class="px-6 py-3">Condições</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                        <tr v-for="p in followupList" :key="p.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td class="px-6 py-3 font-bold text-slate-800 dark:text-white">{{ p.name }}</td>
                            <td class="px-6 py-3 text-slate-500 dark:text-slate-400">{{ p.acs }}</td>
                            <td class="px-6 py-3">
                                <span class="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">
                                    {{ p.lastVisit }}
                                </span>
                            </td>
                            <td class="px-6 py-3">
                                <div class="flex gap-1 flex-wrap">
                                    <span v-for="tag in p.tags" :key="tag" class="text-[10px] bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-500">{{ tag }}</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div v-if="followupList.length === 0" class="p-8 text-center text-emerald-500 font-bold">
                Nenhum paciente em abandono encontrado. Parabéns à equipe!
            </div>
        </div>
    </div>

  </div>
</template>