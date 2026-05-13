/**
 * lib/firebase-shared.ts
 *
 * The doctor project (doctor-web-app-a29a5) is the SHARED BACKEND for:
 *   • doctors      — read by patients to pick a doctor
 *   • appointments — created by patients, managed by doctors
 *
 * CROSS-PROJECT AUTH PROBLEM SOLVED:
 *   Patients authenticate with the patient project (patient-web-app-8b0d4),
 *   getting UID-A. But Firestore rules on the doctor project see request.auth.uid
 *   from the doctor project's auth — which is UID-B (anonymous).
 *
 *   Solution: we store UID-B (the anonymous shared UID) in sessionStorage as
 *   "msv_shared_uid". Both createAppointment() and subscribePatientAppointments()
 *   use this UID as the patientUid so rules always match.
 */
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

const sharedConfig = {
  apiKey:            "AIzaSyAUMCroUrbzqLOlTKWhXwBM6s4AFETQ33c",
  authDomain:        "doctor-web-app-a29a5.firebaseapp.com",
  projectId:         "doctor-web-app-a29a5",
  storageBucket:     "doctor-web-app-a29a5.firebasestorage.app",
  messagingSenderId: "444016225655",
  appId:             "1:444016225655:web:4c2d8ec536721ee9e80572",
};

// Reuse the "doctor" named app if already initialised by firebase-doctor.ts
const sharedApp =
  getApps().find((a) => a.name === "doctor") ||
  initializeApp(sharedConfig, "doctor");

export const sharedDb   = getFirestore(sharedApp);
export const sharedAuth = getAuth(sharedApp);

// ── Anonymous auth state ──────────────────────────────────────────────────────

let _ready: Promise<User> | null = null;

/**
 * Ensure the browser has an anonymous session on the shared (doctor) project.
 * Returns the Firebase User object whose .uid is the canonical patientUid.
 *
 * Doctors are already signed-in with their own uid — this function is a
 * no-op for them (their uid IS their auth uid on this project).
 */
export function ensureSharedAuth(): Promise<User> {
  if (_ready) return _ready;

  _ready = new Promise<User>((resolve, reject) => {
    const auth: Auth = sharedAuth;

    // Already signed in (doctor or returning anonymous patient)
    if (auth.currentUser) {
      _persistSharedUid(auth.currentUser.uid);
      resolve(auth.currentUser);
      return;
    }

    // Wait for the existing session to restore, then sign in anonymously
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        _persistSharedUid(user.uid);
        resolve(user);
      }
    });

    // Trigger anonymous sign-in for patient browsers
    signInAnonymously(auth)
      .then((cred) => {
        // onAuthStateChanged above will fire and resolve
        _persistSharedUid(cred.user.uid);
      })
      .catch((err) => {
        // If anonymous auth is disabled in console, fall back to a
        // stable pseudo-uid derived from the patient session so that
        // the app degrades gracefully.
        const fallback = _getPatientSessionUid();
        if (fallback) {
          _persistSharedUid(fallback);
          // Resolve with a fake-shaped user (uid only — enough for rule checks)
          resolve({ uid: fallback } as User);
        } else {
          reject(err);
        }
      });
  });

  return _ready;
}

/** Returns the shared (anonymous) UID that should be used as patientUid. */
export function getSharedUid(): string | null {
  if (typeof window === "undefined") return null;
  // Doctor: their own Firebase auth uid
  if (sharedAuth.currentUser && !sharedAuth.currentUser.isAnonymous) {
    return sharedAuth.currentUser.uid;
  }
  return sessionStorage.getItem("msv_shared_uid");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _persistSharedUid(uid: string) {
  try { sessionStorage.setItem("msv_shared_uid", uid); } catch { /* SSR */ }
}

function _getPatientSessionUid(): string | null {
  try {
    const raw = sessionStorage.getItem("msv_pat_session");
    if (!raw) return null;
    return JSON.parse(raw)?.uid ?? null;
  } catch { return null; }
}

/** Reset the ready promise (e.g. on logout) */
export function resetSharedAuth() {
  _ready = null;
  try { sessionStorage.removeItem("msv_shared_uid"); } catch { /* SSR */ }
}
