
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxdkXP48MtLOZwcNicQnBNQrXjjVf4C6E",
  authDomain: "edugm-unitools-donations.firebaseapp.com",
  projectId: "edugm-unitools-donations",
  storageBucket: "edugm-unitools-donations.firebasestorage.app",
  messagingSenderId: "359466843038",
  appId: "1:359466843038:web:d39f7ed498c1c3836f348f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
};
