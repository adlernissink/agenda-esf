<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideX, LucideCalendarCheck, LucideUserPlus } from 'lucide-vue-next';
import { useToast } from '../utils/toast'; 
import { sendNotification } from '../utils/notificationService';
import { APPOINTMENT_TYPES, PROFESSIONALS } from '../config/settings';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  appointmentToEdit?: any;
  patients?: any[];      
  appointments?: any[];  
}>(), {
  patients: () => [],
  appointments: () => [],
  appointmentToEdit: undefined
});

const emit = defineEmits(['close', 'saved', 'create-patient']);
const { showToast } = useToast(); 

const isLoading = ref(false);
const searchQuery = ref(''); 
const showSuggestions = ref(false); 

const defaultProf = PROFESSIONALS[0]!;
const defaultType = APPOINTMENT_TYPES[0]!;

const form = ref({
  patientId: '',
  patientName: '', 
  professional: defaultProf, 
  type: defaultType.value, 
  duration: defaultType.duration,
  notes: '',
  date: '',
  time: ''
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const filteredPatients = computed(() => {
  if (searchQuery.value.length < 2) return [];
  const query = searchQuery.value.toLowerCase();
  return props.patients
    .filter(p => p.name.toLowerCase().includes(query))
    .slice(0, 5); 
});

const selectPatient = (patient: any) => {
  form.value.patientId = patient.id;
  form.value.patientName = patient.name;
  searchQuery.value = patient.name; 
  showSuggestions.value = false;
};

const triggerNewPatient = () => {
  emit('create-patient', searchQuery.value); 
  emit('close'); 
};

watch(() => props.appointmentToEdit, (newVal) => {
  if (newVal) {
    form.value = { ...newVal };
    const patientId = newVal?.patientId;
    
    if (patientId) {
        const pat = props.patients.find(p => p.id === patientId);
        searchQuery.value = pat ? pat.name : 'Paciente não encontrado';
        form.value.patientName = pat ? pat.name : '';
    }
  } else {
    // RESET COM VALORES PADRÃO SEGUROS
    form.value = { 
      patientId: '', patientName: '', 
      professional: defaultProf, 
      type: defaultType.value, 
      duration: defaultType.duration, 
      notes: '', date: '', time: '' 
    };
    searchQuery.value = '';
  }
});

const updateDuration = () => {
  const selected = APPOINTMENT_TYPES.find(t => t.value === form.value.type);
  if (selected) form.value.duration = selected.duration;
};

const checkConflict = () => {
  const start = new Date(`${form.value.date}T${form.value.time}`);
  const end = new Date(start.getTime() + form.value.duration * 60000);

  const conflict = props.appointments.find(a => {
    const editItem = props.appointmentToEdit;
    
    if (editItem && editItem.id && a.id === editItem.id) return false;
    
    if (a.professional !== form.value.professional || a.date !== form.value.date) return false;

    const aStart = new Date(`${a.date}T${a.time}`);
    const aEnd = new Date(aStart.getTime() + a.duration * 60000);

    return start < aEnd && end > aStart;
  });

  return conflict;
};

// --- NOVA FUNÇÃO DE VERIFICAÇÃO ---
const checkBlock = async () => {
    try {
        const dateVal = form.value.date;
        const prof = form.value.professional;
        
        const blockSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocked_days', dateVal));
        
        if (blockSnap.exists()) {
            const data = blockSnap.data();
            
            // 1. Verifica se está bloqueado para TODOS
            if (data.ALL) {
                showToast(`Data bloqueada: ${data.ALL}`, "error");
                return true; // Está bloqueado
            }

            // 2. Verifica se está bloqueado para o PROFISSIONAL ESCOLHIDO
            if (data[prof]) {
                showToast(`Agenda bloqueada para ${prof}: ${data[prof]}`, "error");
                return true; // Está bloqueado
            }
        }
        return false; // Não está bloqueado
    } catch (e) {
        console.error("Erro ao verificar bloqueio", e);
        return false; // Na dúvida, deixa passar (ou bloqueie se preferir segurança total)
    }
};

const handleSubmit = async () => {
  if (!form.value.patientId) {
    showToast("Selecione um paciente da lista.", "warning");
    return;
  }

  const today = new Date().toISOString().split('T')[0] as string;
  if (form.value.date < today) {
    showToast("Não é permitido agendar em datas passadas.", "error");
    return;
  }

  const day = new Date(form.value.date + 'T00:00:00').getDay();
  if (day === 0 || day === 6 || day === 5) {
    showToast("Não permitimos agendamentos Sextas, Sábados e Domingos.", "warning");
    return;
  }

  if (await checkBlock()) {
      return; // Para tudo se estiver bloqueado
  }

  if (checkConflict()) {
    showToast("⚠️ CONFLITO DE HORÁRIO! Já existe agendamento neste intervalo.", "error");
    return;
  }

  isLoading.value = true;
  try {
    const data = { ...form.value };
    delete (data as any).patientName; 

    const editItem = props.appointmentToEdit;

    if (editItem && editItem.id) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', editItem.id), data);
      showToast("Agendamento atualizado com sucesso!", "success");
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), {
        ...data,
        createdAt: new Date().toISOString()
      });
      
      await sendNotification(
        'Novo Agendamento', 
        `${form.value.type} para ${form.value.patientName} às ${form.value.time}`, 
        'agenda'
      );

      showToast("Agendamento criado com sucesso!", "success");
    }
    emit('saved');
  } catch (e: any) {
    showToast("Erro ao salvar: " + e.message, "error");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-slate-800 dark:text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
      
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between">
        <h3 class="font-bold text-xl">{{ appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento' }}</h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600"><LucideX /></button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        
        <div class="relative">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
            <input 
              v-model="searchQuery" 
              @focus="showSuggestions = true"
              type="text" 
              placeholder="Digite o nome..." 
              class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none"
              :disabled="!!appointmentToEdit" 
            >
            <div v-if="showSuggestions && searchQuery.length > 1" class="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-xl rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-600 max-h-48 overflow-y-auto">
                <div 
                  v-for="p in filteredPatients" :key="p.id"
                  @click="selectPatient(p)"
                  class="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-600 last:border-0"
                >
                    {{ p.name }}
                </div>
                <div 
                  @click="triggerNewPatient"
                  class="px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold cursor-pointer text-sm flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                    <LucideUserPlus :size="16" /> + Cadastrar Novo Paciente
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Profissional</label>
                <select v-model="form.professional" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none">
                    <option v-for="prof in PROFESSIONALS" :key="prof" :value="prof">{{ prof }}</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select v-model="form.type" @change="updateDuration" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none">
                    <option v-for="t in APPOINTMENT_TYPES" :key="t.value" :value="t.value">
                        {{ t.label }}
                    </option>
                </select>
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observação</label>
            <input v-model="form.notes" type="text" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <input v-model="form.date" type="date" required class="border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none">
            <input v-model="form.time" type="time" required class="border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-2 outline-none">
        </div>

        <button type="submit" :disabled="isLoading" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition flex justify-center gap-2">
            <LucideCalendarCheck v-if="!isLoading" />
            {{ isLoading ? 'Agendando...' : 'Confirmar Agendamento' }}
        </button>

      </form>
    </div>
  </div>
</template>