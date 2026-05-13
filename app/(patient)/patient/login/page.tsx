"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { patientAuth, patientDb } from "@/lib/firebase-patient";
import { toast } from "sonner";

export default function PatientLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Entrez email et mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(patientAuth, email, password);
      const user = cred.user;
      const sessionUser = {
        uid: user.uid,
        email: user.email,
        name: user.displayName ?? "",
      };
      sessionStorage.setItem("msv_pat_session", JSON.stringify(sessionUser));

      // Check if questionnaire exists in Firestore
      const pSnap = await getDoc(doc(patientDb, "patients", user.uid));
      if (pSnap.exists()) {
        router.push("/patient/profil");
      } else {
        // Try local storage fallback
        const qData = localStorage.getItem(
          `msv_pat_qdata_${email.toLowerCase()}`
        );
        if (qData) {
          router.push("/patient/profil");
        } else {
          router.push("/patient/questionnaire");
        }
      }
      toast.success("Connexion réussie.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error("Erreur connexion : " + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(patientAuth, provider);
      const user = result.user;
      // Ensure user doc exists
      const ref = doc(patientDb, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName ?? "",
          role: "patient",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      sessionStorage.setItem(
        "msv_pat_session",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName ?? "",
        })
      );
      const pSnap = await getDoc(doc(patientDb, "patients", user.uid));
      router.push(pSnap.exists() ? "/patient/profil" : "/patient/questionnaire");
      toast.success("Connexion Google réussie.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error("Erreur Google Auth : " + msg);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Entrez votre e-mail d'abord.");
      return;
    }
    try {
      await sendPasswordResetEmail(patientAuth, email);
      toast.success("E-mail de réinitialisation envoyé.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error("Reset mot de passe : " + msg);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#f8fafb] p-10"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="w-full max-w-[420px]">
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
            Connexion patient
          </h2>
          <p className="text-[0.88rem] text-[#4a5568] mt-1.5">
            Accédez à votre espace santé personnel
          </p>
        </div>

        <div className="auth-card">
          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label>Adresse e-mail</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-field mb-6">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="form-submit" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="text-right mt-2.5 text-[0.82rem]">
            <button
              onClick={handleForgotPassword}
              className="text-[#1abc9c] font-bold bg-none border-none cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </p>

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
            Pas encore de compte ?{" "}
            <Link
              href="/patient/register"
              className="text-[#1abc9c] font-bold hover:underline"
            >
              S&apos;enregistrer
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
