import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

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
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7Un6TVn5sp5mHnuFHP_W5M_JUHsz8WVI",
  authDomain: "alerta-golpe-a2fbc.firebaseapp.com",
  projectId: "alerta-golpe-a2fbc",
  storageBucket: "alerta-golpe-a2fbc.firebasestorage.app",
  messagingSenderId: "71242858588",
  appId: "1:71242858588:web:f9c62bb7d08df7bc20a699"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export { 
  db, 
  auth,

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

  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  googleProvider
};