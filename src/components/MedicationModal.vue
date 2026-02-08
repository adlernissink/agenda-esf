<script setup lang="ts">
import { ref, watch } from 'vue';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideX, LucideSave, LucidePill } from 'lucide-vue-next';
import { useToast } from '../utils/toast';

// Recebemos: se está aberto e se tem um remédio para editar
const props = defineProps<{
  isOpen: boolean;
  medicationToEdit?: any;
}>();

const emit = defineEmits(['close', 'saved']);
const { showToast } = useToast();
const isLoading = ref(false);

// O formulário do remédio
const form = ref({
  name: '',
  dosage: '',        // Ex: 500mg, 50mg/ml
  presentation: '',  // Ex: Comprimido, Xarope, Ampola
  type: 'Comum'      // O padrão é receita branca comum
});

// Opções para o select (Dropdown)
const prescriptionTypes = [
    { label: 'Comum (Branca 1 via)', value: 'Comum' },
    { label: 'Controle Especial (Branca C - 2 vias)', value: 'C' },
    { label: 'Notificação B (Azul)', value: 'B' },
    { label: 'Notificação A (Amarela)', value: 'A' }
];

// Monitorar abertura para preencher ou limpar
watch(() => props.medicationToEdit, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }; // Modo Edição
  } else {
    // Modo Novo: Limpa tudo
    form.value = { name: '', dosage: '', presentation: '', type: 'Comum' };
  }
});

const handleSave = async () => {
  if(!form.value.name) return showToast("Nome é obrigatório", "warning");

  isLoading.value = true;
  try {
    // Definimos a coleção 'medications' aqui. Se não existir, o Firebase cria.
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'medications');

    if (props.medicationToEdit) {
      // EDITAR
      await updateDoc(doc(collectionRef, props.medicationToEdit.id), form.value);
      showToast("Medicamento atualizado!", "success");
    } else {
      // CRIAR NOVO
      await addDoc(collectionRef, {
        ...form.value,
        createdAt: new Date().toISOString()
      });
      showToast("Medicamento cadastrado!", "success");
    }
    emit('saved');
    emit('close');
  } catch (e: any) {
    showToast("Erro: " + e.message, "error");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-slate-800 dark:text-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
      
      <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between">
        <h3 class="font-bold text-xl flex items-center gap-2">
            <LucidePill class="text-blue-500" /> 
            {{ medicationToEdit ? 'Editar Medicamento' : 'Novo Medicamento' }}
        </h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600"><LucideX /></button>
      </div>

      <form @submit.prevent="handleSave" class="p-6 space-y-4">
        
        <!-- Nome -->
        <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Genérico</label>
            <input v-model="form.name" type="text" placeholder="Ex: Losartana Potássica" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" required>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- Dosagem -->
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dosagem</label>
                <input v-model="form.dosage" type="text" placeholder="Ex: 50mg" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none">
            </div>
            <!-- Apresentação -->
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Apresentação</label>
                <select v-model="form.presentation" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none">
                    <option value="">Selecione...</option>
                    <option value="Comprimido">Comprimido</option>
                    <option value="Cápsula">Cápsula</option>
                    <option value="Xarope">Xarope</option>
                    <option value="Suspensão">Suspensão</option>
                    <option value="Gotas">Gotas</option>
                    <option value="Injetável">Injetável</option>
                    <option value="Pomada">Pomada</option>
                    <option value="Creme">Creme</option>
                </select>
            </div>
        </div>

        <!-- Tipo de Receita -->
        <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Receituário</label>
            <select v-model="form.type" class="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2 outline-none">
                <option v-for="type in prescriptionTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                </option>
            </select>
            
            <!-- Dica visual sobre a cor -->
            <p v-if="form.type === 'A'" class="text-[10px] mt-1 text-yellow-600 font-bold">⚠️ Receita Amarela</p>
            <p v-if="form.type === 'B'" class="text-[10px] mt-1 text-blue-600 font-bold">ℹ️ Receita Azul</p>
        </div>

        <button type="submit" :disabled="isLoading" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 mt-4">
            <LucideSave v-if="!isLoading" :size="18" />
            {{ isLoading ? 'Salvando...' : 'Salvar no Catálogo' }}
        </button>

      </form>
    </div>
  </div>
</template>