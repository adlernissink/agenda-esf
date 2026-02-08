<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideAlertCircle, LucideCheckCircle, LucideClock, LucideSearch, LucideRefreshCw } from 'lucide-vue-next';
import { useToast } from '../utils/toast';

const { showToast } = useToast();
const patients = ref<any[]>([]);
const searchQuery = ref('');
const isLoading = ref<string | null>(null); // Guarda o ID do paciente sendo atualizado

// Carregar Pacientes
onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// --- O CÉREBRO DA OPERAÇÃO ---
const queue = computed(() => {
  const today = new Date();
  today.setHours(0,0,0,0);

  // 1. Filtrar apenas pacientes com remédios ativos
  const candidates = patients.value.filter(p => p.activeMeds && p.activeMeds.length > 0);

  // 2. Processar cada paciente para descobrir sua urgência
  const processed = candidates.map(p => {
    let worstDiff = 9999; // Começa alto
    let status = 'ok';
    
    // Analisa cada remédio
    const medsStatus = p.activeMeds.map((med: any) => {
        const lastDate = new Date(med.lastPrescription + 'T00:00:00');
        const duration = parseInt(med.duration || 30);
        
        // Data de Vencimento
        const renewalDate = new Date(lastDate);
        renewalDate.setDate(lastDate.getDate() + duration);
        
        // Diferença em dias
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < worstDiff) worstDiff = diffDays;

        return { ...med, diffDays, renewalDate };
    });

    // Define status baseado no PIOR remédio
    if (worstDiff < 0) status = 'expired';
    else if (worstDiff <= 7) status = 'urgent';
    else status = 'ok';

    return { 
        ...p, 
        status, 
        daysRemaining: worstDiff,
        medsDetails: medsStatus
    };
  });

  // 3. Filtrar Busca e Ordenar por Urgência (Menor dias restantes primeiro)
  return processed
    .filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
});

// Separar em grupos para a tela
const expiredList = computed(() => queue.value.filter(p => p.status === 'expired'));
const urgentList = computed(() => queue.value.filter(p => p.status === 'urgent'));

// --- AÇÃO: RENOVAR ---
const renewAllMeds = async (patient: any) => {
    if(!confirm(`Confirmar que você gerou as receitas para ${patient.name}? Isso atualizará a data de todos os remédios para HOJE.`)) return;

    isLoading.value = patient.id;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
        // Cria nova lista com datas atualizadas
        const updatedMeds = patient.activeMeds.map((med: any) => ({
            ...med,
            lastPrescription: todayStr
        }));

        // Salva no Firebase
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', patient.id), {
            activeMeds: updatedMeds
        });

        showToast(`Receitas de ${patient.name} renovadas!`, "success");
    } catch (e: any) {
        showToast("Erro: " + e.message, "error");
    } finally {
        isLoading.value = null;
    }
};
</script>

<template>
  <div class="space-y-8">
    
    <!-- Cabeçalho e Busca -->
    <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h3 class="text-xl font-bold text-slate-800 dark:text-white">Fila de Renovação</h3>
            <p class="text-slate-500 text-sm">Pacientes organizados por prioridade de vencimento.</p>
        </div>
        <div class="relative w-full md:w-64">
            <LucideSearch class="absolute left-3 top-3 text-slate-400" :size="18" />
            <input v-model="searchQuery" type="text" placeholder="Buscar paciente..." class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
        </div>
    </div>

    <!-- Seção 1: VENCIDOS (Vermelho) -->
    <div v-if="expiredList.length > 0" class="space-y-4">
        <div class="flex items-center gap-2 text-red-600 font-bold uppercase text-xs tracking-wider">
            <LucideAlertCircle :size="16" /> Vencidos ({{ expiredList.length }})
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <!-- CORREÇÃO AQUI: border-l-red-500 -->
            <div v-for="patient in expiredList" :key="patient.id" class="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-l-red-500 shadow-sm border-y border-r border-slate-200 dark:border-slate-700 p-4 relative group">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white truncate">{{ patient.name }}</h4>
                        <p class="text-xs text-red-500 font-bold">Venceu há {{ Math.abs(patient.daysRemaining) }} dias</p>
                    </div>
                    <div class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{{ patient.acs }}</div>
                </div>

                <!-- Lista Resumida de Remédios -->
                <div class="space-y-1 mb-4">
                    <div v-for="(med, idx) in patient.activeMeds" :key="idx" class="text-xs text-slate-600 dark:text-slate-300 flex justify-between">
                        <span>• {{ med.name }} {{ med.dosage }}</span>
                        <!-- Mostra ícone de alerta se esse remédio específico venceu -->
                        <span v-if="patient.medsDetails[idx].diffDays < 0" class="text-red-500 font-bold">!</span>
                    </div>
                </div>

                <button 
                    @click="renewAllMeds(patient)" 
                    :disabled="isLoading === patient.id"
                    class="w-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 py-2 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-2"
                >
                    <LucideRefreshCw :size="14" :class="{ 'animate-spin': isLoading === patient.id }" />
                    {{ isLoading === patient.id ? 'Salvando...' : 'Confirmar Renovação' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Seção 2: URGENTES (Amarelo) -->
    <div v-if="urgentList.length > 0" class="space-y-4">
        <div class="flex items-center gap-2 text-orange-600 font-bold uppercase text-xs tracking-wider">
            <LucideClock :size="16" /> Próximos 7 Dias ({{ urgentList.length }})
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <!-- CORREÇÃO AQUI: border-l-orange-400 -->
            <div v-for="patient in urgentList" :key="patient.id" class="bg-white dark:bg-slate-800 rounded-2xl border-l-4 border-l-orange-400 shadow-sm border-y border-r border-slate-200 dark:border-slate-700 p-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white truncate">{{ patient.name }}</h4>
                        <p class="text-xs text-orange-500 font-bold">Vence em {{ patient.daysRemaining }} dias</p>
                    </div>
                    <div class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{{ patient.acs }}</div>
                </div>

                <div class="space-y-1 mb-4">
                    <div v-for="med in patient.activeMeds" :key="med.name" class="text-xs text-slate-600 dark:text-slate-300">
                        • {{ med.name }} {{ med.dosage }}
                    </div>
                </div>

                <button 
                    @click="renewAllMeds(patient)"
                    :disabled="isLoading === patient.id"
                    class="w-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition flex items-center justify-center gap-2"
                >
                    <LucideRefreshCw :size="14" :class="{ 'animate-spin': isLoading === patient.id }" />
                    {{ isLoading === patient.id ? 'Salvando...' : 'Antecipar Renovação' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Mensagem de "Tudo Limpo" -->
    <div v-if="expiredList.length === 0 && urgentList.length === 0" class="text-center py-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
        <div class="bg-white dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <LucideCheckCircle class="text-emerald-500" :size="32" />
        </div>
        <h3 class="text-lg font-bold text-emerald-800 dark:text-emerald-200">Tudo em dia!</h3>
        <p class="text-emerald-600 dark:text-emerald-400 text-sm">Nenhuma renovação pendente para esta semana.</p>
    </div>

  </div>
</template>