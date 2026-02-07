<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { collection, onSnapshot, addDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideSend, LucideTrash2, LucideMessageSquare, LucideUser } from 'lucide-vue-next';
import { useToast } from '../utils/toast';

const props = defineProps<{
  user: any;
}>();

const { showToast } = useToast();
const posts = ref<any[]>([]);
const newPostText = ref('');
const isLoading = ref(false);
const currentUserName = ref(props.user?.email);

// Carregar Posts e Nome do Usuário
onMounted(async () => {
  // 1. Pegar o nome atualizado do perfil do usuário logado
  if (props.user) {
    const profileSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_profiles', props.user.uid));
    if (profileSnap.exists() && profileSnap.data().name) {
      currentUserName.value = profileSnap.data().name;
    }
  }

  // 2. Escutar o Feed de Posts
  onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (snap) => {
    posts.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });
});

// Ordenar posts do mais recente para o mais antigo
const sortedPosts = computed(() => {
  return posts.value.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

// Formatar data amigável
const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  
  // Se for hoje, mostra só a hora
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  // Se não, mostra data e hora
  return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Enviar Post
const handlePost = async () => {
  if (!newPostText.value.trim()) return;
  
  isLoading.value = true;
  try {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), {
      text: newPostText.value,
      authorName: currentUserName.value, // Salva o nome da época
      authorId: props.user.uid,
      createdAt: new Date().toISOString()
    });
    newPostText.value = '';
    showToast("Mensagem publicada!", "success");
  } catch (e: any) {
    showToast("Erro ao publicar: " + e.message, "error");
  } finally {
    isLoading.value = false;
  }
};

// Apagar Post (Só se for o dono)
const handleDelete = async (id: string) => {
  if (confirm("Apagar esta mensagem?")) {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', id));
      showToast("Mensagem apagada.", "info");
    } catch (e: any) {
      showToast("Erro ao apagar: " + e.message, "error");
    }
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    
    <!-- Cabeçalho -->
    <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LucideMessageSquare class="text-blue-600" /> Mural da Equipe
        </h2>
        <p class="text-slate-500 text-sm">Avisos, lembretes e comunicados internos.</p>
    </div>

    <!-- Caixa de Criação -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <form @submit.prevent="handlePost" class="flex flex-col gap-3">
            <textarea 
                v-model="newPostText"
                rows="3"
                placeholder="Deixe um recado para a equipe..."
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none text-slate-700 dark:text-slate-200"
            ></textarea>
            <div class="flex justify-between items-center">
                <span class="text-xs text-slate-400">Postando como: <strong>{{ currentUserName }}</strong></span>
                <button 
                    type="submit" 
                    :disabled="isLoading || !newPostText.trim()"
                    class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                    <LucideSend :size="16" /> {{ isLoading ? 'Enviando...' : 'Publicar' }}
                </button>
            </div>
        </form>
    </div>

    <!-- Feed de Posts -->
    <div class="space-y-4">
        <div v-if="sortedPosts.length === 0" class="text-center py-10 text-slate-400">
            Nenhum aviso no mural ainda. Seja o primeiro!
        </div>

        <transition-group name="list">
            <div 
                v-for="post in sortedPosts" 
                :key="post.id"
                :class="['p-5 rounded-2xl border shadow-sm transition flex gap-4', 
                    post.authorId === user.uid 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                ]"
            >
                <!-- Avatar (Sigla) -->
                <div class="shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300">
                    <LucideUser :size="20" />
                </div>

                <div class="flex-1 space-y-1">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-white text-sm">{{ post.authorName }}</h4>
                            <span class="text-xs text-slate-400">{{ formatDate(post.createdAt) }}</span>
                        </div>
                        
                        <!-- Botão Apagar (Só aparece para o dono) -->
                        <button 
                            v-if="post.authorId === user.uid"
                            @click="handleDelete(post.id)"
                            class="text-slate-300 hover:text-red-500 transition"
                            title="Apagar aviso"
                        >
                            <LucideTrash2 :size="16" />
                        </button>
                    </div>
                    
                    <p class="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {{ post.text }}
                    </p>
                </div>
            </div>
        </transition-group>
    </div>

  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>