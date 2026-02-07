<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import LoginScreen from './components/LoginScreen.vue';
import DashboardLayout from './components/DashboardLayout.vue';
import AgendaView from './components/AgendaView.vue';
import PatientsView from './components/PatientsView.vue';
import ReportsView from './components/ReportsView.vue';
import RecipesView from './components/RecipesView.vue';
import NoticeBoardView from './components/NoticeBoardView.vue'; // IMPORTAR
import ToastContainer from './components/ToastContainer.vue'; 

const currentUser = ref<User | null>(null);
const isLoadingAuth = ref(true);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user;
    isLoadingAuth.value = false;
  });
});

const handleLogout = () => auth.signOut();
</script>

<template>
  <ToastContainer />

  <div v-if="isLoadingAuth" class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>

  <LoginScreen v-else-if="!currentUser" />

  <DashboardLayout 
    v-else 
    :user="currentUser" 
    @logout="handleLogout" 
    v-slot="slotProps"
  >
    <div v-if="slotProps.currentTab === 'agenda'">
      <AgendaView />
    </div>

    <div v-if="slotProps.currentTab === 'pacientes'">
      <PatientsView />
    </div>

    <!-- NOVA ABA MURAL -->
    <div v-if="slotProps.currentTab === 'mural'">
      <NoticeBoardView :user="currentUser" />
    </div>

    <div v-if="slotProps.currentTab === 'reports'">
      <ReportsView />
    </div>

    <div v-if="slotProps.currentTab === 'recipes'">
      <RecipesView />
    </div>
  </DashboardLayout>
</template>