// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration - direct configuration without environment variables
const firebaseConfig = {
  apiKey: "AIzaSyARvah7E7kRKD09seeiQSzTb1BIuCWUyVE",
  authDomain: "next-rep-e58cd.firebaseapp.com",
  projectId: "next-rep-e58cd",
  storageBucket: "next-rep-e58cd.firebasestorage.app",
  messagingSenderId: "6118694283",
  appId: "1:6118694283:web:fc89b6174edffe7795638e",
  measurementId: "G-2QWPTRVPQQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, app };
