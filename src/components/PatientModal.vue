<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { 
  LucideX, LucideSave, LucideEdit3, LucidePill, 
  LucideFileText, LucideUser, LucideHistory 
} from 'lucide-vue-next';
import { useToast } from '../utils/toast'; 

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

// ESTADO
const mode = ref<'view' | 'edit'>('view'); 
const isLoading = ref(false);

const form = ref({
  name: '',
  dob: '',
  acs: '',
  tags: [] as string[],
  meds: '',
  obs: '' 
});

const tagStyles: Record<string, string> = { 
    'HAS': 'bg-red-100 text-red-700 border-red-200', 
    'DM': 'bg-blue-100 text-blue-700 border-blue-200', 
    'GESTANTE': 'bg-pink-100 text-pink-700 border-pink-200', 
    'SM': 'bg-purple-100 text-purple-700 border-purple-200', 
    'ACAMADO': 'bg-slate-200 text-slate-700 border-slate-300', 
    'TABAGISTA': 'bg-orange-100 text-orange-700 border-orange-200' 
};

// --- COMPUTEDS ---
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

const clonePatientData = (patient: any) => {
    return { 
        ...patient, 
        tags: [...(patient.tags || [])] 
    };
};

watch(() => props.patientToEdit, (newVal) => {
  if (newVal) {
    mode.value = 'view';
    form.value = clonePatientData(newVal); 
  } else {
    mode.value = 'edit';
    form.value = { name: '', dob: '', acs: '', tags: [], meds: '', obs: '' };
  }
}, { immediate: true });

// --- AÇÕES ---

const cancelEdit = () => {
    if (props.patientToEdit) {
        form.value = clonePatientData(props.patientToEdit);
        mode.value = 'view';
    } else {
        emit('close'); 
    }
};

// --- FECHAR COM ESC (NOVO) ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    // Se estiver editando, cancela a edição primeiro
    if (mode.value === 'edit' && props.patientToEdit) {
        cancelEdit();
    } else {
        emit('close');
    }
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

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
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
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

      <!-- CORPO -->
      <div class="overflow-y-auto p-6 space-y-6">
        
        <!-- MODO VISUALIZAÇÃO -->
        <div v-if="mode === 'view'" class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                    <span class="block text-xs font-bold text-slate-400 uppercase">Idade / Nasc.</span>
                    <div class="font-medium text-slate-700 dark:text-slate-200">
                        {{ age }} <span class="text-xs text-slate-400">({{ new Date(form.dob + 'T00:00:00').toLocaleDateString('pt-BR') }})</span>
                    </div>
                </div>
                <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                    <span class="block text-xs font-bold text-slate-400 uppercase">Microárea</span>
                    <div class="font-medium text-slate-700 dark:text-slate-200">{{ form.acs }}</div>
                </div>
            </div>

            <div v-if="form.tags && form.tags.length > 0">
                <span class="block text-xs font-bold text-slate-400 uppercase mb-2">Condições Clínicas</span>
                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in form.tags" :key="tag" :class="['text-[10px] px-2 py-1 rounded-lg font-bold border', tagStyles[tag] || 'bg-gray-100 text-gray-600']">
                        {{ tag }}
                    </span>
                </div>
            </div>

            <div class="space-y-3">
                <div v-if="form.meds">
                    <div class="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
                        <LucidePill :size="14" />
                        <span class="text-xs font-bold uppercase">Uso Contínuo</span>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-blue-100 dark:border-blue-900/50 whitespace-pre-wrap">{{ form.meds }}</div>
                </div>

                <div v-if="form.obs">
                    <div class="flex items-center gap-2 mb-1 text-slate-500">
                        <LucideFileText :size="14" />
                        <span class="text-xs font-bold uppercase">Observações</span>
                    </div>
                    <div class="text-sm text-slate-600 dark:text-slate-400 italic">{{ form.obs }}</div>
                </div>
            </div>

            <div class="border-t border-slate-100 dark:border-slate-700 pt-4">
                <div class="flex items-center gap-2 mb-3 text-slate-400">
                    <LucideHistory :size="14" />
                    <span class="text-xs font-bold uppercase">Histórico de Consultas</span>
                </div>
                
                <div v-if="patientHistory.length === 0" class="text-center py-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    Nenhuma consulta registrada.
                </div>

                <div v-else class="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <div v-for="appt in patientHistory" :key="appt.id" class="flex justify-between items-center p-3 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl shadow-sm">
                        <div>
                            <div class="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{{ new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR') }}</span>
                                <span>{{ appt.type }}</span>
                            </div>
                            <div v-if="appt.notes" class="text-[10px] text-slate-400 mt-1 line-clamp-1">{{ appt.notes }}</div>
                        </div>
                        <div class="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded-lg">
                            {{ appt.professional }}
                        </div>
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
                        <option value="Microárea 1">ANGÉLICA</option>
                        <option value="Microárea 2">JOCILENE</option>
                        <option value="Microárea 3">FABIANA</option>
                        <option value="Microárea 4">MONALISA</option>
                        <option value="Microárea 5">JAILTON</option>
                        <option value="Microárea 6">MARIA ROSA</option>
                    </select>
                </div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Condições Clínicas</label>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="HAS" class="rounded text-blue-600"> HAS</label>
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="DM" class="rounded text-blue-600"> Diabetes</label>
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="GESTANTE" class="rounded text-pink-500"> Gestante</label>
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="SM" class="rounded text-purple-600"> Saúde Mental</label>
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="ACAMADO" class="rounded text-slate-600"> Acamado</label>
                    <label class="flex items-center gap-2"><input type="checkbox" v-model="form.tags" value="TABAGISTA" class="rounded text-slate-600"> Tabagista</label>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Medicações</label>
                <textarea v-model="form.meds" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none text-sm" rows="2"></textarea>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observações / Prontuário</label>
                <textarea v-model="form.obs" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none text-sm" rows="2" placeholder="Alergias, histórico..."></textarea>
            </div>
        </form>
      </div>

      <!-- RODAPÉ FIXO -->
      <div class="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <button 
            v-if="mode === 'view'"
            @click="mode = 'edit'"
            class="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"
        >
            <LucideEdit3 :size="18" /> Editar Dados
        </button>

        <div v-else class="flex gap-3">
            <button 
                @click="cancelEdit"
                class="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
                Cancelar
            </button>
            <button 
                @click="handleSave"
                :disabled="isLoading"
                class="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none"
            >
                <LucideSave v-if="!isLoading" :size="18" />
                {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
        </div>
      </div>
    </div>
  </div>
</template>