// Ponto único de acesso ao Firebase. As páginas importam daqui,
// nunca direto de "firebase/*".
//
// A config vem do .env (VITE_FIREBASE_*). Ela é pública por natureza
// (identifica o projeto, não autoriza nada); quem protege os dados são
// as regras em firestore.rules. Por isso o projeto precisa rodar via
// Vite (`npm run dev`), não por Live Server.

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
  console.error("Config do Firebase ausente: crie o arquivo .env (veja .env.example) e rode com `npm run dev`.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "pt-BR"; // emails do Firebase (ex.: redefinir senha) em português
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification,
  googleProvider
};
