<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { collection, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { 
  LucideX, LucideSave, LucideEdit3, 
  LucideFileText, LucideUser, LucideHistory, LucidePlus, LucideTrash2 
} from 'lucide-vue-next';
import { useToast } from '../utils/toast'; 
import { sendNotification } from '../utils/notificationService';

// IMPORTAÇÃO DA CONFIGURAÇÃO CENTRAL (A Mágica)
import { MICROAREAS, CONDITIONS, TAG_STYLES } from '../config/settings';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  patientToEdit?: any; 
  appointments?: any[]; 
}>(), {
  appointments: () => [], 
  patientToEdit: undefined
});

const emit = defineEmits(['close', 'saved']);
const { showToast } = useToast(); 

// --- ESTADO GERAL ---
const mode = ref<'view' | 'edit'>('view'); 
const activeTab = ref<'info' | 'prescriptions'>('info'); 
const isLoading = ref(false);
const medicationsCatalog = ref<any[]>([]); 

// --- DADOS DO PACIENTE ---
const form = ref({
  name: '',
  dob: '',
  acs: '',
  tags: [] as string[],
  obs: '',
  activeMeds: [] as any[] 
});

// --- DADOS DO NOVO REMÉDIO ---
const newMed = ref({
  name: '',
  dosage: '',
  type: 'Comum',
  posology: '',
  amount: 30,
  duration: 30, 
  lastPrescription: new Date().toISOString().split('T')[0] 
});
const medSearchQuery = ref('');
const showMedSuggestions = ref(false);

// --- SETUP INICIAL ---
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'medications'), (snap) => {
    medicationsCatalog.value = snap.docs.map(d => d.data());
  });
});

onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

// --- HELPERS E COMPUTEDS ---
const age = computed(() => {
  if (!form.value.dob) return '';
  const today = new Date();
  const birthDate = new Date(form.value.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age + ' anos';
});

const patientHistory = computed(() => {
  if (!props.patientToEdit || !props.patientToEdit.id) return [];
  if (!props.appointments) return [];
  const pid = String(props.patientToEdit.id);
  return props.appointments
    .filter(a => String(a.patientId) === pid)
    .sort((a, b) => {
        const dateA = (a.date || '') + (a.time || '');
        const dateB = (b.date || '') + (b.time || '');
        return dateB.localeCompare(dateA);
    });
});

const filteredCatalog = computed(() => {
  if (medSearchQuery.value.length < 2) return [];
  const q = medSearchQuery.value.toLowerCase();
  return medicationsCatalog.value.filter(m => m.name.toLowerCase().includes(q)).slice(0, 5);
});

const getRenewalDate = (lastDate: string, duration: number) => {
    const date = new Date(lastDate + 'T00:00:00'); 
    date.setDate(date.getDate() + parseInt(String(duration)));
    return date;
};

const getDaysUntilRenewal = (lastDate: string, duration: number) => {
    const renewalDate = getRenewalDate(lastDate, duration);
    const today = new Date();
    today.setHours(0,0,0,0); 
    renewalDate.setHours(0,0,0,0);
    const diffTime = renewalDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// --- AÇÕES DO FORMULÁRIO DE REMÉDIOS ---
const selectCatalogMed = (med: any) => {
    newMed.value.name = med.name;
    newMed.value.dosage = med.dosage;
    newMed.value.type = med.type;
    medSearchQuery.value = med.name; 
    showMedSuggestions.value = false;
};

const addMedication = () => {
    if (!newMed.value.name) return showToast("Nome do medicamento é obrigatório", "warning");
    form.value.activeMeds.push({ ...newMed.value });
    newMed.value = { 
        name: '', dosage: '', type: 'Comum', posology: '', 
        amount: 30, duration: 30, 
        lastPrescription: new Date().toISOString().split('T')[0] 
    };
    medSearchQuery.value = '';
    showToast("Medicação adicionada à lista (Lembre de Salvar)", "success");
};

const removeMedication = (index: number) => {
    form.value.activeMeds.splice(index, 1);
};

const renewMedication = (index: number) => {
    form.value.activeMeds[index].lastPrescription = new Date().toISOString().split('T')[0];
    showToast("Data renovada para hoje! Clique em Salvar para confirmar.", "info");
};

// --- CONTROLE DE MODO E DADOS ---
const clonePatientData = (patient: any) => {
    return { 
        ...patient, 
        tags: [...(patient.tags || [])],
        activeMeds: patient.activeMeds ? [...patient.activeMeds] : [] 
    };
};

watch(() => props.patientToEdit, (newVal) => {
  if (newVal) {
    mode.value = 'view';
    activeTab.value = 'info'; 
    form.value = clonePatientData(newVal); 
  } else {
    mode.value = 'edit'; 
    activeTab.value = 'info';
    form.value = { name: '', dob: '', acs: '', tags: [], obs: '', activeMeds: [] };
  }
}, { immediate: true });

const cancelEdit = () => {
    if (props.patientToEdit) {
        form.value = clonePatientData(props.patientToEdit);
        mode.value = 'view';
    } else {
        emit('close'); 
    }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    if (mode.value === 'edit' && props.patientToEdit) {
        cancelEdit();
    } else {
        emit('close');
    }
  }
};

const handleSave = async () => {
  isLoading.value = true;
  try {
    const patientData = { ...form.value };

    if (props.patientToEdit) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'patients', props.patientToEdit.id);
      await updateDoc(docRef, patientData);
      showToast("Paciente atualizado com sucesso!", "success");
      mode.value = 'view'; 
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), {
        ...patientData,
        createdAt: new Date().toISOString()
      });
      
      await sendNotification(
        'Novo Paciente', 
        `${form.value.name} foi cadastrado(a) na Microárea ${form.value.acs}.`, 
        'patient'
      );

      showToast("Paciente cadastrado com sucesso!", "success");
      emit('saved');
      emit('close');
    }
  } catch (e: any) {
    showToast("Erro ao salvar: " + e.message, "error");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-slate-800 dark:text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col">
      
      <!-- CABEÇALHO -->
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <div class="flex justify-between items-start mb-4">
            <div>
                <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-1">
                    <LucideUser :size="12" />
                    <span v-if="!patientToEdit">Novo Cadastro</span>
                    <span v-else-if="mode === 'view'">Prontuário</span>
                    <span v-else>Editando Dados</span>
                </div>
                <h3 class="font-bold text-xl text-slate-800 dark:text-white truncate max-w-[250px]">
                    {{ form.name || 'Novo Paciente' }}
                </h3>
            </div>
            <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600"><LucideX /></button>
        </div>

        <div class="flex gap-4 border-b border-slate-200 dark:border-slate-700 -mb-6 pb-0">
            <button @click="activeTab = 'info'" :class="['pb-2 text-sm font-bold transition border-b-2', activeTab === 'info' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600']">Dados Pessoais</button>
            <button @click="activeTab = 'prescriptions'" :class="['pb-2 text-sm font-bold transition border-b-2 flex items-center gap-2', activeTab === 'prescriptions' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600']">
                Receitas <span v-if="form.activeMeds?.length" class="bg-blue-100 text-blue-600 text-[9px] px-1.5 rounded-full">{{ form.activeMeds.length }}</span>
            </button>
        </div>
      </div>

      <div class="overflow-y-auto p-6 space-y-6 flex-1">
        <!-- ABA 1 -->
        <div v-show="activeTab === 'info'" class="space-y-6">
            
            <div v-if="mode === 'view'" class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                        <span class="block text-xs font-bold text-slate-400 uppercase">Idade / Nasc.</span>
                        <div class="font-medium text-slate-700 dark:text-slate-200">{{ age }} <span class="text-xs text-slate-400">({{ new Date(form.dob + 'T00:00:00').toLocaleDateString('pt-BR') }})</span></div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                        <span class="block text-xs font-bold text-slate-400 uppercase">Microárea</span>
                        <div class="font-medium text-slate-700 dark:text-slate-200">{{ form.acs }}</div>
                    </div>
                </div>

                <div v-if="form.tags && form.tags.length > 0">
                    <span class="block text-xs font-bold text-slate-400 uppercase mb-2">Condições Clínicas</span>
                    <div class="flex flex-wrap gap-2">
                        <!-- USO DAS VARIÁVEIS GLOBAIS DE ESTILO -->
                        <span v-for="tag in form.tags" :key="tag" :class="['text-[10px] px-2 py-1 rounded-lg font-bold border', TAG_STYLES[tag] || 'bg-gray-100 text-gray-600']">{{ tag }}</span>
                    </div>
                </div>

                <div class="space-y-3">
                    <div v-if="form.obs">
                        <div class="flex items-center gap-2 mb-1 text-slate-500"><LucideFileText :size="14" /><span class="text-xs font-bold uppercase">Observações</span></div>
                        <div class="text-sm text-slate-600 dark:text-slate-400 italic">{{ form.obs }}</div>
                    </div>
                </div>

                <div class="border-t border-slate-100 dark:border-slate-700 pt-4">
                    <div class="flex items-center gap-2 mb-3 text-slate-400"><LucideHistory :size="14" /><span class="text-xs font-bold uppercase">Histórico de Consultas</span></div>
                    <div v-if="patientHistory.length === 0" class="text-center py-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">Nenhuma consulta registrada.</div>
                    <div v-else class="space-y-2 max-h-40 overflow-y-auto pr-1">
                        <div v-for="appt in patientHistory" :key="appt.id" class="flex justify-between items-center p-3 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl shadow-sm">
                            <div>
                                <div class="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                    <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{{ new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR') }}</span>
                                    <span>{{ appt.type }}</span>
                                </div>
                                <div v-if="appt.notes" class="text-[10px] text-slate-400 mt-1 line-clamp-1">{{ appt.notes }}</div>
                            </div>
                            <div class="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded-lg">{{ appt.professional }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODO EDIÇÃO -->
            <form v-else @submit.prevent="handleSave" class="space-y-4">
                <div>
                   <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                   <input v-model="form.name" type="text" required class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nascimento</label>
                        <input v-model="form.dob" type="date" required class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Microárea</label>
                        <select v-model="form.acs" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none" required>
                            <option value="">Selecione...</option>
                            <!-- USO DA LISTA GLOBAL DE MICROÁREAS -->
                            <option v-for="area in MICROAREAS" :key="area" :value="(area.split('-')[0] || '').trim()">{{ area }}</option>
                        </select>
                    </div>
                </div>
                
                <!-- CHECKBOXES DINÂMICOS -->
                <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Condições Clínicas</label>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <label v-for="cond in CONDITIONS" :key="cond" class="flex items-center gap-2 cursor-pointer hover:opacity-80">
                            <!-- O Vue é esperto: ele vê que 'form.tags' é array e 'cond' é string, então adiciona/remove -->
                            <input type="checkbox" v-model="form.tags" :value="cond" class="rounded text-blue-600 focus:ring-blue-500">
                            <!-- Pega a cor do texto e borda do estilo global -->
                            <span :class="['text-[10px] px-1.5 py-0.5 rounded font-bold']">{{ cond }}</span>
                        </label>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observações / Prontuário</label>
                    <textarea v-model="form.obs" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none text-sm" rows="2" placeholder="Alergias, histórico..."></textarea>
                </div>
            </form>
        </div>

        <!-- ABA 2: RECEITAS (Permanece igual) -->
        <div v-show="activeTab === 'prescriptions'" class="space-y-6">
            <div v-if="form.activeMeds && form.activeMeds.length > 0" class="space-y-3">
                <div v-for="(med, index) in form.activeMeds" :key="index" class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-white">{{ med.name }} {{ med.dosage }}</h4>
                            <p class="text-xs text-slate-500">{{ med.posology }} • {{ med.amount }} un</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span :class="['text-[10px] font-bold px-2 py-1 rounded', getDaysUntilRenewal(med.lastPrescription, med.duration) < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600']">
                                {{ getDaysUntilRenewal(med.lastPrescription, med.duration) < 0 ? 'Venceu' : 'Vence em ' + getDaysUntilRenewal(med.lastPrescription, med.duration) + ' dias' }}
                            </span>
                            <button v-if="mode === 'edit'" @click="removeMedication(index)" class="text-slate-400 hover:text-red-500 p-1"><LucideTrash2 :size="16" /></button>
                        </div>
                    </div>
                    <div v-if="mode === 'edit'" class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span class="text-[10px] text-slate-400">Última: {{ new Date(med.lastPrescription + 'T00:00:00').toLocaleDateString('pt-BR') }}</span>
                        <button @click="renewMedication(index)" class="ml-auto text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><LucideHistory :size="12" /> Renovar Hoje</button>
                    </div>
                </div>
            </div>
            
            <div v-else-if="mode === 'view'" class="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                Nenhuma medicação de uso contínuo cadastrada. <br> Clique em "Editar Dados" para adicionar.
            </div>

            <div v-if="mode === 'edit'" class="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-4">
                <h4 class="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2 text-sm"><LucidePlus :size="16" /> Adicionar Medicação</h4>
                <div class="space-y-3">
                    <div class="relative">
                        <input v-model="medSearchQuery" @focus="showMedSuggestions = true" type="text" placeholder="Buscar nome no catálogo..." class="w-full border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none">
                        <div v-if="showMedSuggestions && filteredCatalog.length > 0" class="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-xl rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-600 max-h-40 overflow-y-auto">
                            <div v-for="catMed in filteredCatalog" :key="catMed.id" @click="selectCatalogMed(catMed)" class="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-600 last:border-0">
                                <span class="font-bold">{{ catMed.name }}</span> <span class="text-xs text-slate-400">{{ catMed.dosage }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <input v-model="newMed.dosage" type="text" placeholder="Dosagem (ex: 50mg)" class="w-full border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none">
                        <input v-model="newMed.posology" type="text" placeholder="Posologia (ex: 1cp cedo)" class="w-full border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-[10px] uppercase text-blue-400 font-bold mb-1">Quantidade</label><input v-model="newMed.amount" type="number" class="w-full border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"></div>
                        <div><label class="block text-[10px] uppercase text-blue-400 font-bold mb-1">Duração (Dias)</label><input v-model="newMed.duration" type="number" class="w-full border-blue-200 dark:border-blue-800 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"></div>
                    </div>
                    <button @click="addMedication" type="button" class="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Confirmar Inclusão</button>
                </div>
            </div>
        </div>
      </div>

      <div class="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <button v-if="mode === 'view'" @click="mode = 'edit'" class="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"><LucideEdit3 :size="18" /> Editar Dados</button>
        <div v-else class="flex gap-3">
            <button @click="cancelEdit" class="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancelar</button>
            <button @click="handleSave" :disabled="isLoading" class="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none"><LucideSave v-if="!isLoading" :size="18" /> {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>