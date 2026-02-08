<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideSearch, LucideCopy, LucideFileText, LucideCheck, LucideUser } from 'lucide-vue-next';
import { useToast } from '../utils/toast';

const { showToast } = useToast();

// DADOS
const patients = ref<any[]>([]);
const searchQuery = ref('');
const selectedPatient = ref<any>(null);
const selectedDocType = ref<'lme' | 'report' | 'apac'>('report');
const generatedText = ref('');
const showSuggestions = ref(false);

// CARREGAR PACIENTES
onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// AUTOCOMPLETE DE PACIENTE
const filteredPatients = computed(() => {
  if (searchQuery.value.length < 2) return [];
  const q = searchQuery.value.toLowerCase();
  return patients.value.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5);
});

const selectPatient = (p: any) => {
    selectedPatient.value = p;
    searchQuery.value = p.name;
    showSuggestions.value = false;
    generateText(); // Gera o texto assim que seleciona
};

// --- A MÁGICA: OS MODELOS DE TEXTO ---
const generateText = () => {
    if (!selectedPatient.value) return;
    const p = selectedPatient.value;
    
    // Formata Data de Nasc.
    const dob = new Date(p.dob + 'T00:00:00').toLocaleDateString('pt-BR');
    
    // Lista de Remédios Formatada
    const medsList = (p.activeMeds || [])
        .map((m: any) => `• ${m.name} ${m.dosage} --- ${m.posology} (${m.amount} un/mês)`)
        .join('\n');

    const conditions = (p.tags || []).join(', ');

    if (selectedDocType.value === 'report') {
        generatedText.value = `RELATÓRIO MÉDICO\n\n` +
        `Paciente: ${p.name}\n` +
        `Data de Nasc: ${dob} (${calculateAge(p.dob)} anos)\n` +
        `Acompanhamento por: ${conditions}\n\n` +
        `Atesto para os devidos fins que o paciente acima faz acompanhamento regular nesta unidade de saúde, fazendo uso contínuo das seguintes medicações:\n\n` +
        `${medsList || '(Nenhuma medicação cadastrada)'}\n\n` +
        `Paciente clinicamente estável, mantendo adesão ao tratamento.\n\n` +
        `Lagarto-SE, ${new Date().toLocaleDateString('pt-BR')}\n` +
        `Dr. Adler Nissink`;
    } 
    else if (selectedDocType.value === 'lme') {
        generatedText.value = `DADOS PARA LME (Componente Especializado)\n\n` +
        `NOME: ${p.name}\n` +
        `CNS: [INSERIR CNS]\n` +
        `NASCIMENTO: ${dob}\n` +
        `DIAGNÓSTICO (CID): [INSERIR CID]\n\n` +
        `MEDICAMENTOS SOLICITADOS:\n` +
        `${medsList}\n\n` +
        `ANAMNESE:\n` +
        `Paciente com diagnóstico de [DOENÇA], em tratamento regular. Apresenta boa resposta terapêutica. Solicito renovação para continuidade do tratamento por 3 meses.`;
    }
    else if (selectedDocType.value === 'apac') {
        generatedText.value = `DADOS PARA APAC (Procedimentos)\n\n` +
        `PACIENTE: ${p.name}\n` +
        `DATA NASC: ${dob}\n` +
        `MÃE: [NOME DA MÃE]\n` +
        `ENDEREÇO: Microárea ${p.acs}\n\n` +
        `PROCEDIMENTO PRINCIPAL:\n` +
        `[CÓDIGO] - [NOME DO PROCEDIMENTO]\n\n` +
        `JUSTIFICATIVA:\n` +
        `Paciente necessita do procedimento para continuidade da assistência terapêutica.`;
    }
};

// Utilitário de Idade
const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

// Monitorar mudanças para regenerar texto
watch([selectedDocType, selectedPatient], () => {
    generateText();
});

// Ação de Copiar
const copyToClipboard = () => {
    if (!generatedText.value) return;
    navigator.clipboard.writeText(generatedText.value);
    showToast("Texto copiado para a área de transferência!", "success");
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
    
    <!-- COLUNA ESQUERDA: CONTROLES -->
    <div class="lg:col-span-1 space-y-6">
        
        <!-- Busca de Paciente -->
        <div class="relative bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">1. Selecione o Paciente</label>
            <div class="relative">
                <LucideSearch class="absolute left-3 top-3 text-slate-400" :size="18" />
                <input 
                    v-model="searchQuery" 
                    @focus="showSuggestions = true"
                    type="text" 
                    placeholder="Buscar paciente..." 
                    class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                <!-- Lista de Sugestões -->
                <div v-if="showSuggestions && filteredPatients.length > 0" class="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-xl rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-600 max-h-48 overflow-y-auto mt-1">
                    <div 
                        v-for="p in filteredPatients" :key="p.id"
                        @click="selectPatient(p)"
                        class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer border-b border-slate-50 dark:border-slate-600 last:border-0 flex items-center gap-3"
                    >
                        <div class="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600"><LucideUser :size="16" /></div>
                        <div>
                            <div class="font-bold text-sm text-slate-700 dark:text-white">{{ p.name }}</div>
                            <div class="text-xs text-slate-400">{{ p.acs }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Seleção de Tipo -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-3">2. Tipo de Documento</label>
            <div class="space-y-2">
                <button 
                    @click="selectedDocType = 'report'"
                    :class="['w-full text-left px-4 py-3 rounded-xl text-sm font-bold border transition flex items-center justify-between', selectedDocType === 'report' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-slate-100 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300']"
                >
                    Relatório Médico <LucideCheck v-if="selectedDocType === 'report'" :size="16" />
                </button>
                
                <button 
                    @click="selectedDocType = 'lme'"
                    :class="['w-full text-left px-4 py-3 rounded-xl text-sm font-bold border transition flex items-center justify-between', selectedDocType === 'lme' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-slate-100 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300']"
                >
                    LME (Alto Custo) <LucideCheck v-if="selectedDocType === 'lme'" :size="16" />
                </button>

                <button 
                    @click="selectedDocType = 'apac'"
                    :class="['w-full text-left px-4 py-3 rounded-xl text-sm font-bold border transition flex items-center justify-between', selectedDocType === 'apac' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-slate-100 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300']"
                >
                    APAC (Procedimento) <LucideCheck v-if="selectedDocType === 'apac'" :size="16" />
                </button>
            </div>
        </div>

    </div>

    <!-- COLUNA DIREITA: PREVIEW E CÓPIA -->
    <div class="lg:col-span-2 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
            <h3 class="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                <LucideFileText class="text-blue-500" :size="20" /> Visualização do Texto
            </h3>
            <button 
                @click="copyToClipboard"
                :disabled="!generatedText"
                class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <LucideCopy :size="14" /> Copiar Texto
            </button>
        </div>

        <div class="flex-1 p-4 bg-slate-50 dark:bg-slate-900/50">
            <textarea 
                v-model="generatedText"
                class="w-full h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-700 dark:text-slate-300 outline-none resize-none focus:ring-2 focus:ring-blue-500"
                placeholder="Selecione um paciente para gerar o documento..."
            ></textarea>
        </div>

        <div class="p-3 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-700">
            Dica: Você pode editar o texto acima antes de copiar.
        </div>

    </div>

  </div>
</template>