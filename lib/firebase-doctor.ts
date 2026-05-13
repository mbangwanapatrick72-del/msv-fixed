// lib/firebase-doctor.ts
// Firebase project: doctor-web-app-a29a5 (INGRID 2)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const doctorFirebaseConfig = {
  apiKey: "AIzaSyAUMCroUrbzqLOlTKWhXwBM6s4AFETQ33c",
  authDomain: "doctor-web-app-a29a5.firebaseapp.com",
  projectId: "doctor-web-app-a29a5",
  storageBucket: "doctor-web-app-a29a5.firebasestorage.app",
  messagingSenderId: "444016225655",
  appId: "1:444016225655:web:4c2d8ec536721ee9e80572",
};

const doctorApp =
  getApps().find((a) => a.name === "doctor") ||
  initializeApp(doctorFirebaseConfig, "doctor");

export const doctorAuth = getAuth(doctorApp);
export const doctorDb = getFirestore(doctorApp);
export const doctorStorage = getStorage(doctorApp);
