import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 🔥 Firebase config REAL
const firebaseConfig = {
  apiKey: "AIzaSyDbPq8TyAKygWhpzJrexPMWGEASwDjZelA",
  authDomain: "audiobook-native.firebaseapp.com",
  projectId: "audiobook-native",
  storageBucket: "audiobook-native.appspot.com",   // ✔ corrigido
  messagingSenderId: "1097148243611",
  appId: "1:1097148243611:web:53ec9fa5184039825a303e",
  measurementId: "G-JVMKFHL669"
};

// Inicializa App UMA ÚNICA VEZ
const app = initializeApp(firebaseConfig);

// Exporta serviços padrões
export const db = getFirestore(app);
export const auth = getAuth(app);
