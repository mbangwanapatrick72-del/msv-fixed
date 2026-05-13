// lib/firebase-patient.ts
// Firebase project: patient-web-app-8b0d4 (INGRID 1)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const patientFirebaseConfig = {
  apiKey: "AIzaSyCdkWJIFyqhjidmfcAZTXoBydmQsFbyTcs",
  authDomain: "patient-web-app-8b0d4.firebaseapp.com",
  projectId: "patient-web-app-8b0d4",
  storageBucket: "patient-web-app-8b0d4.firebasestorage.app",
  messagingSenderId: "671892206401",
  appId: "1:671892206401:web:b04c0f9c30340d94e1e7c0",
};

const patientApp =
  getApps().find((a) => a.name === "patient") ||
  initializeApp(patientFirebaseConfig, "patient");

export const patientAuth = getAuth(patientApp);
export const patientDb = getFirestore(patientApp);
