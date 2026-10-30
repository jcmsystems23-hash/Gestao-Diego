import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpKrMskKVtwPyfYK-d3HzacmbZUzadxzg",
  authDomain: "gestao-diego.firebaseapp.com",
  projectId: "gestao-diego",
  storageBucket: "gestao-diego.firebasestorage.app",
  messagingSenderId: "213157785397",
  appId: "1:213157785397:web:b3961f1309168b9438667c",
  measurementId: "G-1DY4EJZQX6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, writeBatch, signInWithEmailAndPassword, signOut, onAuthStateChanged };
