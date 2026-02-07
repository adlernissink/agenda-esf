<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { 
  LucideChevronLeft, LucideChevronRight, LucidePlus, 
  LucidePencil, LucideTrash2, LucideLock, 
  LucideCalendarDays, LucideCalendar, LucideMessageCircle 
} from 'lucide-vue-next';
import AppointmentModal from './AppointmentModal.vue';
import PatientModal from './PatientModal.vue';
import { useToast } from '../utils/toast';

type BlockedDaysMap = Record<string, any>;
const { showToast } = useToast();

const viewMode = ref<'day' | 'week'>('day'); 
const appointments = ref<any[]>([]);
const patients = ref<any[]>([]); 
const blockedDays = ref<BlockedDaysMap>({}); 
const activeNoteId = ref<string | null>(null);

const selectedDate = ref(new Date().toISOString().split('T')[0]);
const selectedProf = ref('todos');

const isApptModalOpen = ref(false);
const editingAppointment = ref<any>(null);
const isPatientModalOpen = ref(false);
const editingPatient = ref<any>(null);

onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), (snap) => {
    appointments.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
    patients.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'blocked_days'), (snap) => {
    const blocks: BlockedDaysMap = {};
    snap.docs.forEach(d => blocks[d.id] = d.data());
    blockedDays.value = blocks;
  });
});

const getPatientName = (id: string) => {
  const p = patients.value.find(pat => pat.id === id);
  return p ? p.name : 'Desconhecido';
};

const toggleNote = (id: string) => {
    if (activeNoteId.value && activeNoteId.value === id) {
        activeNoteId.value = null; 
    } else {
        activeNoteId.value = id; 
    }
};

const changeDate = (amount: number) => {
  const date = new Date(selectedDate.value + 'T00:00:00');
  if (viewMode.value === 'day') {
    date.setDate(date.getDate() + amount);
  } else {
    date.setDate(date.getDate() + (amount * 7)); 
  }
  selectedDate.value = date.toISOString().split('T')[0];
};

const goToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0];
};

const toggleDayBlock = async () => {
    const dateVal = selectedDate.value;
    const profVal = selectedProf.value; 

    if (!dateVal) return;

    const dayOfWeek = new Date(dateVal + 'T00:00:00').getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
        showToast("Este dia já é bloqueado automaticamente (Sexta/Fim de semana).", "warning");
        return;
    }

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'blocked_days', dateVal);
    const currentBlock = blockedDays.value[dateVal] || {};
    const targetKey = profVal === 'todos' ? 'ALL' : profVal;
    const isBlocked = !!currentBlock[targetKey];

    try {
        if (isBlocked) {
            if(confirm(`Desbloquear dia para: ${profVal === 'todos' ? 'TODOS' : profVal}?`)) {
                if (profVal === 'todos') { 
                    await deleteDoc(docRef); 
                } else {
                    const updatedBlock = { ...currentBlock };
                    delete updatedBlock[targetKey];
                    if (Object.keys(updatedBlock).length === 0) { await deleteDoc(docRef); } 
                    else { await setDoc(docRef, updatedBlock); }
                }
                showToast("Dia desbloqueado com sucesso.", "success");
            }
        } else {
            const reason = prompt(`Motivo do bloqueio para ${profVal === 'todos' ? 'TODOS' : profVal}:`, "Ausência/Feriado");
            if (reason) {
                await setDoc(docRef, { [targetKey]: reason }, { merge: true });
                showToast("Dia bloqueado com sucesso.", "success");
            }
        }
    } catch (err: any) {
        showToast("Erro ao alterar bloqueio: " + err.message, "error");
    }
};

const weekDays = computed(() => {
  const date = new Date(selectedDate.value + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const diffToMonday = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diffToMonday);
  
  const days = [];
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  
  for (let i = 0; i < 5; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    // Correção: Forçar string
    const dateStr = current.toISOString().split('T')[0] as string;
    
    let count = appointments.value.filter(a => a.date === dateStr).length;
    if (selectedProf.value !== 'todos') {
        count = appointments.value.filter(a => a.date === dateStr && a.professional === selectedProf.value).length;
    }

    const blockData = blockedDays.value[dateStr] || {};
    const isBlocked = blockData['ALL'] || (selectedProf.value !== 'todos' && blockData[selectedProf.value]);

    days.push({
        date: dateStr,
        dayName: dayNames[i],
        dayNumber: current.getDate(),
        count,
        isBlocked,
        isToday: dateStr === new Date().toISOString().split('T')[0]
    });
  }
  return days;
});

const switchToDay = (dateStr: string) => {
    selectedDate.value = dateStr;
    viewMode.value = 'day';
};

const isBlockedDay = computed(() => {
    const day = new Date(selectedDate.value + 'T00:00:00').getDay();
    const dateStr = selectedDate.value as string;
    
    if (day === 0 || day === 6 || day === 5) return { isBlocked: true, reason: 'Fim de Semana / Sexta' };
    
    const blockData = blockedDays.value[dateStr] || {};
    if (blockData['ALL']) return { isBlocked: true, reason: blockData['ALL'] };
    if (selectedProf.value !== 'todos' && blockData[selectedProf.value]) return { isBlocked: true, reason: blockData[selectedProf.value] };

    return { isBlocked: false, reason: '' };
});

const dailyAppointments = computed(() => {
  let list = appointments.value.filter(a => a.date === selectedDate.value);
  if (selectedProf.value !== 'todos') {
    list = list.filter(a => a.professional === selectedProf.value);
  }
  return list.sort((a, b) => a.time.localeCompare(b.time));
});

const morningSlots = computed(() => dailyAppointments.value.filter(a => parseInt(a.time.split(':')[0]) < 12));
const afternoonSlots = computed(() => dailyAppointments.value.filter(a => parseInt(a.time.split(':')[0]) >= 12));

const openApptModal = (appt: any = null) => { editingAppointment.value = appt; isApptModalOpen.value = true; };
const openPatientModal = (patientId: string | null) => {
    if (patientId) editingPatient.value = patients.value.find(p => p.id === patientId);
    else editingPatient.value = null;
    isPatientModalOpen.value = true;
};
const handleCreatePatientFromAppt = () => { editingPatient.value = null; isPatientModalOpen.value = true; };
const handleDelete = async (id: string) => {
  if(confirm("Excluir este agendamento?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', id));
        showToast("Agendamento excluído.", "success");
      } catch (e: any) {
        showToast("Erro ao excluir: " + e.message, "error");
      }
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Topo -->
    <div class="flex flex-col md:flex-row justify-between items-end gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Agenda da Equipe</h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm capitalize">
            {{ new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) }}
        </p>
      </div>
      
      <div class="flex flex-wrap gap-2">
        <div class="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            <button @click="viewMode = 'day'" :class="['px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition', viewMode === 'day' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500']">
                <LucideCalendar :size="14" /> Dia
            </button>
            <button @click="viewMode = 'week'" :class="['px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition', viewMode === 'week' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-slate-500']">
                <LucideCalendarDays :size="14" /> Semana
            </button>
        </div>

        <button 
          @click="toggleDayBlock" 
          :class="['px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-center shadow-sm', isBlockedDay.isBlocked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400']"
          title="Bloquear/Desbloquear este dia"
        >
            <LucideLock :size="20" />
        </button>

        <button @click="openApptModal(null)" class="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2">
            <LucidePlus :size="18" /> <span class="hidden md:inline">Novo</span>
        </button>
      </div>
    </div>

    <!-- Filtros Comuns -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <select v-model="selectedProf" class="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 outline-none w-full md:w-auto text-sm">
            <option value="todos">Todos Profissionais</option>
            <option value="Dr. Adler">Dr. Adler</option>
            <option value="Enfermeira">Enfermeira</option>
        </select>

        <div class="flex items-center gap-2 flex-1 justify-center md:justify-start">
            <button @click="changeDate(-1)" class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:text-white"><LucideChevronLeft /></button>
            <input v-model="selectedDate" type="date" class="border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 font-bold text-slate-700 outline-none text-sm">
            <button @click="changeDate(1)" class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:text-white"><LucideChevronRight /></button>
        </div>
        
        <button @click="goToToday" class="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase hover:underline">Ir para Hoje</button>
    </div>

    <!-- MODO SEMANA -->
    <div v-if="viewMode === 'week'" class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div 
            v-for="day in weekDays" :key="day.date"
            @click="!day.isBlocked && switchToDay(day.date)"
            :class="['p-4 rounded-2xl border-2 text-center transition cursor-pointer hover:shadow-md', 
                day.isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                day.isBlocked ? 'opacity-60 cursor-not-allowed bg-red-50 dark:bg-red-900/10 border-red-100' : 'hover:border-blue-400'
            ]"
        >
            <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ day.dayNumber }}</div>
            <div class="text-xs font-bold uppercase text-slate-400 mb-2">{{ day.dayName }}</div>
            
            <div v-if="day.isBlocked" class="text-red-500 text-xs font-bold flex items-center justify-center gap-1">
                <LucideLock :size="12" /> Bloqueado
            </div>
            <div v-else class="text-blue-600 dark:text-blue-400 text-sm font-bold">
                {{ day.count }} agendamentos
            </div>
        </div>
    </div>

    <!-- MODO DIA -->
    <div v-else>
        <div v-if="isBlockedDay.isBlocked" class="bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
            <LucideLock class="mx-auto text-slate-400 mb-2" :size="48" />
            <h3 class="text-xl font-bold text-slate-600 dark:text-slate-300">Agenda Bloqueada</h3>
            <p class="text-slate-500 dark:text-slate-400">Motivo: {{ isBlockedDay.reason }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Manhã -->
            <div class="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-4 min-h-[300px]">
                <h3 class="font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">Manhã</h3>
                <div class="space-y-2">
                    <div v-if="morningSlots.length === 0" class="text-center text-blue-300 py-10 text-xs">Livre</div>
                    <div v-for="appt in morningSlots" :key="appt.id" 
                        class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group flex flex-col justify-center"
                        :style="{ height: Math.max(60, appt.duration * 2.5) + 'px' }"
                    >
                        <div class="flex gap-3 items-center h-full">
                            <div class="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 rounded-lg h-full min-w-[50px]">
                                <span class="text-xs">{{ appt.time }}</span><span class="text-[9px] opacity-60">{{ appt.duration }}m</span>
                            </div>
                            <div class="flex-1 overflow-hidden flex flex-col justify-center relative">
                                <button @click.stop="openPatientModal(appt.patientId)" class="font-bold text-slate-800 dark:text-white truncate text-sm text-left hover:text-blue-600 hover:underline">{{ getPatientName(appt.patientId) }}</button>
                                
                                <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <span>{{ appt.type }}</span>
                                    <span class="text-slate-300 dark:text-slate-600">•</span>
                                    <span class="text-slate-400 dark:text-slate-500">{{ appt.professional }}</span>
                                    
                                    <button v-if="appt.notes" @click.stop="toggleNote(String(appt.id))" class="ml-2 text-orange-500 hover:text-orange-600 transition" title="Ver observação">
                                        <LucideMessageCircle :size="14" :class="{ 'fill-orange-500': activeNoteId === String(appt.id) }" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 pl-2 shadow-sm rounded">
                            <button @click.stop="openApptModal(appt)" class="p-1 text-slate-400 hover:text-yellow-600"><LucidePencil :size="16" /></button>
                            <button @click.stop="handleDelete(appt.id)" class="p-1 text-slate-400 hover:text-red-600"><LucideTrash2 :size="16" /></button>
                        </div>
                        <div :class="['absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', appt.professional === 'Enfermeira' ? 'bg-green-400' : 'bg-blue-500']"></div>

                        <div v-if="activeNoteId === String(appt.id)" class="absolute left-4 top-full mt-2 z-50 w-64 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl border border-slate-200 dark:border-slate-600 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div class="font-bold text-orange-500 mb-1 flex items-center gap-1">
                                <LucideMessageCircle :size="12" /> Observação
                            </div>
                            {{ appt.notes }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tarde (Mesma Lógica) -->
            <div class="bg-orange-50/50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/50 p-4 min-h-[300px]">
                <h3 class="font-bold text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">Tarde</h3>
                <div class="space-y-2">
                    <div v-if="afternoonSlots.length === 0" class="text-center text-orange-300 py-10 text-xs">Livre</div>
                    <div v-for="appt in afternoonSlots" :key="appt.id" 
                        class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group flex flex-col justify-center"
                        :style="{ height: Math.max(60, appt.duration * 2.5) + 'px' }"
                    >
                        <div class="flex gap-3 items-center h-full">
                            <div class="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 rounded-lg h-full min-w-[50px]">
                                <span class="text-xs">{{ appt.time }}</span><span class="text-[9px] opacity-60">{{ appt.duration }}m</span>
                            </div>
                            <div class="flex-1 overflow-hidden flex flex-col justify-center relative">
                                <button @click.stop="openPatientModal(appt.patientId)" class="font-bold text-slate-800 dark:text-white truncate text-sm text-left hover:text-blue-600 hover:underline">{{ getPatientName(appt.patientId) }}</button>
                                
                                <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <span>{{ appt.type }}</span>
                                    <span class="text-slate-300 dark:text-slate-600">•</span>
                                    <span class="text-slate-400 dark:text-slate-500">{{ appt.professional }}</span>

                                    <button v-if="appt.notes" @click.stop="toggleNote(String(appt.id))" class="ml-2 text-orange-500 hover:text-orange-600 transition" title="Ver observação">
                                        <LucideMessageCircle :size="14" :class="{ 'fill-orange-500': activeNoteId === String(appt.id) }" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 pl-2 shadow-sm rounded">
                            <button @click.stop="openApptModal(appt)" class="p-1 text-slate-400 hover:text-yellow-600"><LucidePencil :size="16" /></button>
                            <button @click.stop="handleDelete(appt.id)" class="p-1 text-slate-400 hover:text-red-600"><LucideTrash2 :size="16" /></button>
                        </div>
                        <div :class="['absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', appt.professional === 'Enfermeira' ? 'bg-green-400' : 'bg-blue-500']"></div>

                        <div v-if="activeNoteId === String(appt.id)" class="absolute left-4 top-full mt-2 z-50 w-64 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl border border-slate-200 dark:border-slate-600 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div class="font-bold text-orange-500 mb-1 flex items-center gap-1">
                                <LucideMessageCircle :size="12" /> Observação
                            </div>
                            {{ appt.notes }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAIS -->
    <AppointmentModal :isOpen="isApptModalOpen" :appointmentToEdit="editingAppointment" :patients="patients" :appointments="appointments" @close="isApptModalOpen = false" @saved="isApptModalOpen = false" @create-patient="handleCreatePatientFromAppt" />
    <PatientModal :isOpen="isPatientModalOpen" :patientToEdit="editingPatient" :appointments="appointments" @close="isPatientModalOpen = false" @saved="isPatientModalOpen = false" />
  </div>
</template>