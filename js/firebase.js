import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

export { db, collection, addDoc, getDocs };