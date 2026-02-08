<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideSearch, LucidePlus, LucideTrash2, LucidePill, LucidePen, LucideFilter } from 'lucide-vue-next';
import MedicationModal from './MedicationModal.vue';
import { useToast } from '../utils/toast';

const { showToast } = useToast();
const medications = ref<any[]>([]);
const searchQuery = ref('');
const selectedType = ref('todos'); 
const isModalOpen = ref(false);
const editingMed = ref<any>(null);

onMounted(() => {
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'medications'), (snap) => {
    medications.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// FILTRO DUPLO (Nome + Tipo)
const filteredMeds = computed(() => {
  const q = searchQuery.value.toLowerCase();
  
  return medications.value.filter(m => {
    // 1. Verifica se o nome bate
    const matchesName = m.name.toLowerCase().includes(q);
    
    // 2. Verifica se o tipo bate (ou se está marcado "todos")
    const matchesType = selectedType.value === 'todos' || m.type === selectedType.value;

    // Retorna verdadeiro apenas se AMBOS baterem
    return matchesName && matchesType;
  }).sort((a, b) => a.name.localeCompare(b.name));
});

const getTypeBadge = (type: string) => {
    switch(type) {
        case 'A': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'B': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'C': return 'bg-slate-100 text-slate-700 border-slate-200';
        default: return 'bg-white border-slate-200 text-slate-500';
    }
};

const openModal = (med: any = null) => {
    editingMed.value = med;
    isModalOpen.value = true;
};

const handleDelete = async (id: string) => {
    if(confirm("Remover este medicamento do catálogo?")) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'medications', id));
            showToast("Medicamento removido.", "info");
        } catch(e: any) {
            showToast("Erro: " + e.message, "error");
        }
    }
};
</script>

<template>
  <div class="space-y-6">
    
    <!-- Barra de Ferramentas -->
    <div class="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        
        <!-- Área de Filtros (Busca + Select) -->
        <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto flex-1">
            <div class="relative w-full md:w-80">
                <LucideSearch class="absolute left-3 top-3 text-slate-400" :size="18" />
                <input v-model="searchQuery" type="text" placeholder="Buscar medicamento..." class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition">
            </div>

            <!-- Select de Tipo -->
            <div class="relative w-full md:w-48">
                <LucideFilter class="absolute left-3 top-3 text-slate-400" :size="18" />
                <select v-model="selectedType" class="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition">
                    <option value="todos">Todos os Tipos</option>
                    <option value="Comum">Comum (Branca)</option>
                    <option value="C">Controle (Branca C)</option>
                    <option value="B">Notificação B (Azul)</option>
                    <option value="A">Notificação A (Amarela)</option>
                </select>
            </div>
        </div>
        
        <button @click="openModal(null)" class="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none">
            <LucidePlus :size="18" /> Adicionar
        </button>
    </div>

    <!-- Lista -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div v-for="med in filteredMeds" :key="med.id" class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition group relative overflow-hidden">
            
            <div :class="['absolute left-0 top-0 bottom-0 w-1', (getTypeBadge(med.type).split(' ')[0] || '').replace('bg-', 'bg-')]"></div>

            <div class="flex justify-between items-start pl-2">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-blue-500 shrink-0">
                        <LucidePill :size="20" />
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white line-clamp-1" :title="med.name">{{ med.name }}</h4>
                        <p class="text-xs text-slate-500">{{ med.dosage }} <span v-if="med.presentation">• {{ med.presentation }}</span></p>
                    </div>
                </div>
                
                <span :class="['text-[10px] font-bold px-2 py-1 rounded border', getTypeBadge(med.type)]">
                    {{ med.type === 'Comum' ? 'Comum' : 'Tipo ' + med.type }}
                </span>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button @click="openModal(med)" class="text-slate-400 hover:text-blue-600 p-1 bg-slate-50 dark:bg-slate-700 rounded-lg transition" title="Editar">
                    <LucidePen :size="16" />
                </button>
                <button @click="handleDelete(med.id)" class="text-slate-400 hover:text-red-600 p-1 bg-slate-50 dark:bg-slate-700 rounded-lg transition" title="Excluir">
                    <LucideTrash2 :size="16" />
                </button>
            </div>
        </div>

        <div v-if="filteredMeds.length === 0" class="col-span-full text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            Nenhum medicamento encontrado com estes filtros.
        </div>

    </div>

    <MedicationModal 
        :isOpen="isModalOpen" 
        :medicationToEdit="editingMed"
        @close="isModalOpen = false"
        @saved="isModalOpen = false"
    />

  </div>
</template>