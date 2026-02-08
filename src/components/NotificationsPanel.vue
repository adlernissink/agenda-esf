<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { LucideBell, LucideX, LucideMessageSquare, LucideCalendar, LucideUserPlus, LucidePill, LucideCheck } from 'lucide-vue-next';

// Recebe o usuário para saber quem está lendo
const props = defineProps<{ user: any }>();

const notifications = ref<any[]>([]);
const patients = ref<any[]>([]);
const isOpen = ref(false);

const getIcon = (type: string) => {
    switch(type) {
        case 'mural': return LucideMessageSquare;
        case 'agenda': return LucideCalendar;
        case 'patient': return LucideUserPlus;
        case 'alert': return LucidePill;
        default: return LucideBell;
    }
};

const getColor = (type: string) => {
    switch(type) {
        case 'mural': return 'bg-yellow-100 text-yellow-600';
        case 'agenda': return 'bg-blue-100 text-blue-600';
        case 'patient': return 'bg-emerald-100 text-emerald-600';
        case 'alert': return 'bg-red-100 text-red-600';
        default: return 'bg-slate-100 text-slate-600';
    }
};

onMounted(() => {
    // 1. Escutar Notificações (Últimas 30 para garantir histórico recente)
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), orderBy('createdAt', 'desc'), limit(30));
    onSnapshot(q, (snap) => {
        notifications.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });

    // 2. Escutar Pacientes
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), (snap) => {
        patients.value = snap.docs.map(d => d.data());
    });
});

// DISPENSAR NOTIFICAÇÃO (Marcar como Lida)
const dismissNotification = async (id: string) => {
    if (!props.user) return;
    try {
        // Adiciona o ID do usuário ao array 'readBy' no Firebase
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), {
            readBy: arrayUnion(props.user.uid)
        });
    } catch (e) {
        console.error("Erro ao dispensar", e);
    }
};

// ALERTA DE RECEITAS (Sistema - Sempre no topo)
const prescriptionAlert = computed(() => {
    let expiredCount = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    patients.value.forEach((p: any) => {
        if (p.activeMeds) {
            p.activeMeds.forEach((med: any) => {
                const last = new Date(med.lastPrescription + 'T00:00:00');
                const renewal = new Date(last);
                renewal.setDate(last.getDate() + parseInt(med.duration));
                const diffTime = renewal.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 5) expiredCount++;
            });
        }
    });

    if (expiredCount > 0) {
        return {
            id: 'sys-alert',
            title: 'Atenção às Receitas',
            message: `${expiredCount} medicações vencem em breve ou já venceram.`,
            type: 'alert',
            createdAt: new Date().toISOString()
        };
    }
    return null;
});

// LISTA FILTRADA (Apenas não lidas pelo usuário atual)
const unreadList = computed(() => {
    if (!props.user) return [];
    return notifications.value.filter(n => !n.readBy?.includes(props.user.uid));
});

// LISTA FINAL PARA EXIBIÇÃO
const displayList = computed(() => {
    const list = [...unreadList.value];
    if (prescriptionAlert.value) {
        list.unshift(prescriptionAlert.value);
    }
    return list;
});

const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} h`;
    return date.toLocaleDateString('pt-BR');
};
</script>

<template>
    <div class="relative">
        <!-- Botão do Sino -->
        <button @click="isOpen = !isOpen" class="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 transition relative">
            <LucideBell :size="20" />
            
            <!-- Bolinha Vermelha (Urgente: Receitas) -->
            <span v-if="prescriptionAlert" class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
            
            <!-- Bolinha Laranja (Novidades não lidas) -->
            <span v-else-if="unreadList.length > 0" class="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>

        <!-- Dropdown Panel -->
        <div v-if="isOpen" class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
            
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 class="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    Notificações 
                    <span v-if="unreadList.length > 0" class="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded-full">{{ unreadList.length }}</span>
                </h3>
                <button @click="isOpen = false" class="text-slate-400 hover:text-slate-600"><LucideX :size="16" /></button>
            </div>

            <div class="max-h-96 overflow-y-auto">
                <div v-if="displayList.length === 0" class="p-10 text-center">
                    <div class="inline-flex bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-3 text-slate-400">
                        <LucideBell :size="20" />
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Nenhuma notificação nova.</p>
                </div>

                <div v-for="notif in displayList" :key="notif.id" :class="['p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex gap-3 group', notif.type === 'alert' ? 'bg-red-50/50 dark:bg-red-900/10' : '']">
                    
                    <!-- Ícone -->
                    <div :class="['w-8 h-8 rounded-full flex items-center justify-center shrink-0', getColor(notif.type)]">
                        <component :is="getIcon(notif.type)" :size="14" />
                    </div>
                    
                    <!-- Conteúdo -->
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ notif.title }}</h4>
                        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{{ notif.message }}</p>
                        <span class="text-[10px] text-slate-300 dark:text-slate-500 block mt-1">{{ timeAgo(notif.createdAt) }}</span>
                    </div>

                    <!-- Botão Dispensar (Não aparece para alertas de sistema fixos) -->
                    <button 
                        v-if="notif.id !== 'sys-alert'" 
                        @click.stop="dismissNotification(notif.id)"
                        class="self-start text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="Marcar como lida"
                    >
                        <LucideCheck :size="16" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Overlay -->
        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-40 cursor-default"></div>
    </div>
</template>