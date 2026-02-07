import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBznLvHmZx3ncL9YH7tHCzSqj0eeUN_q0o",
  authDomain: "esf-equipe-10.firebaseapp.com",
  projectId: "esf-equipe-10",
  storageBucket: "esf-equipe-10.firebasestorage.app",
  messagingSenderId: "387152992678",
  appId: "1:387152992678:web:fbd5831f024847b26c9767"
};

// Inicializa e EXPORTA para que outros arquivos possam usar
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'esf-equipe-10';