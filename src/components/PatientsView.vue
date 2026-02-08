<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideSearch, LucideUserPlus, LucideTrash2 } from 'lucide-vue-next';
import PatientModal from './PatientModal.vue';
import { useToast } from '../utils/toast'; 
import { TAG_STYLES, MICROAREAS } from '../config/settings'; 

const { showToast } = useToast(); 

// 1. ESTADO
const patients = ref<any[]>([]); 
const appointments = ref<any[]>([]); 
const searchQuery = ref('');     
const selectedAcs = ref('todos'); 
const searchDob = ref(''); 
const isModalOpen = ref(false);
const editingPatient = ref<any>(null); 

// 2. BUSCAR DADOS
onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), (snap) => {
    appointments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// 3. HELPER: Calcular Última Consulta
const getLastAppointment = (patientId: string) => {
  const patientAppos = appointments.value.filter(a => a.patientId === patientId);
  if (patientAppos.length === 0) return 'Nunca';
  patientAppos.sort((a, b) => {
    const dateA = a.date + (a.time || '');
    const dateB = b.date + (b.time || '');
    return dateB.localeCompare(dateA);
  });
  return new Date(patientAppos[0].date + 'T00:00:00').toLocaleDateString('pt-BR');
};

// 4. FILTROS
const filteredPatients = computed(() => {
  let result = patients.value;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(query));
  }
  if (selectedAcs.value !== 'todos') {
    result = result.filter(p => p.acs === selectedAcs.value);
  }
  if (searchDob.value) {
    result = result.filter(p => p.dob === searchDob.value);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
});

// 5. AÇÕES
const handleDelete = async (id: string) => {
  if (confirm("TEM CERTEZA? Isso excluirá o paciente permanentemente.")) {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', id));
      showToast("Paciente excluído com sucesso!", "success"); 
    } catch (error: any) {
      showToast("Erro ao excluir: " + error.message, "error"); 
    }
  }
};

const openModal = (patient: any = null) => {
  if (patient) {
    const patientId = patient.id; // CONSTANTE SEGURA
    const rawPatient = patients.value.find(p => p.id === patientId);
    editingPatient.value = rawPatient || patient;
  } else {
    editingPatient.value = null; 
  }
  isModalOpen.value = true;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Painel de Pacientes</h2>
      <button 
        @click="openModal(null)" 
        class="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center gap-2"
      >
        <LucideUserPlus :size="20" /> Novo Paciente
      </button>
    </div>

    <!-- Barra de Filtros -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4">
      <div class="relative md:col-span-5">
        <LucideSearch class="absolute left-3 top-3 text-slate-400" :size="18" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por nome..." class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <select v-model="selectedAcs" class="md:col-span-4 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm p-2 outline-none">
        <option value="todos">Todos os ACS</option>
        <option v-for="area in MICROAREAS" :key="area" :value="(area.split('-')[0] || '').trim()">{{ area }}</option>
      </select>
      <div class="relative md:col-span-3">
         <input v-model="searchDob" type="date" class="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500">
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto">
      <table class="w-full text-left min-w-[800px]">
        <thead class="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs uppercase font-bold">
          <tr>
            <th class="px-6 py-4">Nome e Condições</th>
            <th class="px-6 py-4">ACS/Microárea</th>
            <th class="px-6 py-4">Nascimento</th>
            <th class="px-6 py-4">Última Consulta</th>
            <th class="px-6 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
          <tr v-for="patient in filteredPatients" :key="patient.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
            <td class="px-6 py-4">
              <div @click="openModal(patient)" class="font-bold text-slate-800 dark:text-white cursor-pointer hover:text-blue-600">{{ patient.name }}</div>
              <div class="mt-1 flex gap-1 flex-wrap">
                <span v-for="tag in patient.tags" :key="tag" :class="['text-[10px] px-1.5 py-0.5 rounded font-bold', TAG_STYLES[tag] || 'bg-gray-100']">{{ tag }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400">{{ patient.acs }}</td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400">{{ new Date(patient.dob + 'T00:00:00').toLocaleDateString('pt-BR') }}</td>
            <td class="px-6 py-4 text-slate-400 dark:text-slate-500 font-mono text-xs">{{ getLastAppointment(patient.id) }}</td>
            <td class="px-6 py-4 text-right flex justify-end gap-2">
              <button @click="handleDelete(patient.id)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><LucideTrash2 :size="18" /></button>
            </td>
          </tr>
          <tr v-if="filteredPatients.length === 0">
            <td colspan="5" class="p-8 text-center text-slate-400">Nenhum paciente encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal (KEY = Força reconstrução ao mudar paciente) -->
    <PatientModal 
      :key="editingPatient?.id"
      :isOpen="isModalOpen" 
      :patientToEdit="editingPatient"
      :appointments="appointments" 
      @close="isModalOpen = false"
      @saved="isModalOpen = false"
    />
  </div>
</template>