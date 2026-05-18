"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { patientAuth, patientDb } from "@/lib/firebase-patient";
import { resetSharedAuth } from "@/lib/firebase-shared";
import { toast } from "sonner";

export default function PatientRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
  });

  async function saveUserToFirestore(
    uid: string,
    email: string,
    fullName: string
  ) {
    const ref = doc(patientDb, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        email,
        fullName,
        role: "patient",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.dob) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    setLoading(true);
    try {
      // Reset shared auth to ensure fresh anonymous UID for this new patient
      // (prevents seeing appointments from other patient accounts)
      resetSharedAuth();
      const cred = await createUserWithEmailAndPassword(
        patientAuth,
        form.email,
        form.password
      );
      await updateProfile(cred.user, { displayName: form.name });
      await saveUserToFirestore(cred.user.uid, form.email, form.name);
      sessionStorage.setItem(
        "msv_pat_session",
        JSON.stringify({
          uid: cred.user.uid,
          email: form.email,
          name: form.name,
          dob: form.dob,
        })
      );
      toast.success("Compte créé ! Bienvenue.");
      router.push("/patient/questionnaire");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur inscription : " + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      // Reset shared auth to ensure fresh anonymous UID for this patient
      // (prevents seeing appointments from other patient accounts)
      resetSharedAuth();
      const result = await signInWithPopup(patientAuth, provider);
      const user = result.user;
      await saveUserToFirestore(
        user.uid,
        user.email ?? "",
        user.displayName ?? ""
      );
      sessionStorage.setItem(
        "msv_pat_session",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName ?? "",
        })
      );
      router.push("/patient/questionnaire");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error("Erreur Google : " + msg);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f8fafb] p-10"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <div
            className="text-[1.8rem] font-extrabold text-[#1abc9c] mb-1.5"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            MSV
          </div>
          <h2
            className="text-[1.5rem] font-bold text-[#0d1f3c]"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Créer un compte patient
          </h2>
          <p className="text-[0.88rem] text-[#4a5568] mt-1.5">
            Rejoignez MSV et accédez à vos services de santé
          </p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleRegister}>
            {(
              [
                { id: "name" as const, label: "Nom complet", type: "text", ph: "Prénom Nom" },
                { id: "email" as const, label: "Adresse e-mail", type: "email", ph: "votre@email.com" },
                { id: "password" as const, label: "Mot de passe", type: "password", ph: "Créer un mot de passe" },
                { id: "dob" as const, label: "Date de naissance", type: "date", ph: "" },
              ]
            ).map((f) => (
              <div key={f.id} className="form-field">
                <label>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.ph}
                  required
                  value={form[f.id]}
                  onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" className="form-submit" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <button className="btn-google" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center mt-5 text-[0.86rem] text-[#4a5568]">
            Déjà inscrit ?{" "}
            <Link
              href="/patient/login"
              className="text-[#1abc9c] font-bold hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center mt-5">
          <Link
            href="/patient/home"
            className="text-[0.85rem] text-[#8a97a8] hover:text-[#1abc9c]"
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
