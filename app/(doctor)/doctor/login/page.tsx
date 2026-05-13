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
import { doctorAuth, doctorDb } from "@/lib/firebase-doctor";
import { toast } from "sonner";

export default function DoctorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Email et mot de passe requis."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(doctorAuth, email, password);
      const snap = await getDoc(doc(doctorDb, "doctors", cred.user.uid));
      const data = snap.exists() ? snap.data() : { email, role: "DOCTOR" };
      sessionStorage.setItem("msv_doc_session", JSON.stringify({ uid: cred.user.uid, ...data }));
      toast.success("Connexion réussie.");
      router.push("/doctor/dashboard");
    } catch (err: unknown) {
      toast.error("Connexion échouée : " + (err instanceof Error ? err.message : "Erreur"));
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(doctorAuth, provider);
      const user = result.user;
      const ref = doc(doctorDb, "doctors", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { uid: user.uid, name: user.displayName ?? "", email: user.email ?? "", role: "DOCTOR", createdAt: serverTimestamp() });
        sessionStorage.setItem("msv_doc_session", JSON.stringify({ uid: user.uid, name: user.displayName, email: user.email, role: "DOCTOR" }));
        router.push("/doctor/enroll");
      } else {
        sessionStorage.setItem("msv_doc_session", JSON.stringify({ uid: user.uid, ...snap.data() }));
        router.push("/doctor/dashboard");
      }
      toast.success("Connexion Google réussie.");
    } catch (err: unknown) {
      toast.error("Google Auth : " + (err instanceof Error ? err.message : "Erreur"));
    }
  }

  async function handleForgotPassword() {
    if (!email) { toast.error("Entrez votre email d'abord."); return; }
    try {
      await sendPasswordResetEmail(doctorAuth, email);
      toast.success("Email de réinitialisation envoyé.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Wave background */}
      <div className="doc-wave-bg">
        <div className="doc-wave doc-wave-1" />
        <div className="doc-wave doc-wave-2" />
      </div>

      <div className="doc-page justify-center" style={{ fontFamily: "Nunito, sans-serif" }}>
        {/* Logo */}
        <div className="doc-logo-wrap mb-7">
          <div className="text-[2.8rem] font-extrabold tracking-wider" style={{ fontFamily: "Nunito, sans-serif", color: "#1a4db5" }}>
            MS<span style={{ color: "#e74c3c" }}>V</span>
          </div>
          <div className="text-xs text-[#9ab0bb] mt-1 font-semibold">Médecine à Distance</div>
        </div>

        <h1 className="text-[1.5rem] font-light text-[#5a6a74] mb-6 tracking-wide">Connexion</h1>

        {/* Email */}
        <div className="doc-input-group w-full">
          <div className="doc-input-field">
            <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 8l10 6 10-6"/>
            </svg>
            <input type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin(e)} />
          </div>
          <div className="doc-input-field">
            <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            <input type={showPw ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin(e)} />
            <button onClick={() => setShowPw(!showPw)} className="text-[#9ab0bb] hover:text-[#1a4db5] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <ellipse cx="12" cy="12" rx="10" ry="6"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading} className="doc-btn-primary w-full">
          <span>{loading ? "Connexion…" : "Connexion"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>

        <button
          onClick={handleGoogle}
          className="w-full py-4 border-none rounded-[16px] bg-white text-[#1a4db5] border border-[#1a4db5] font-bold text-[1.05rem] cursor-pointer flex items-center justify-center gap-2.5 mb-4 shadow-sm hover:bg-[#f0f5fd] transition-colors"
          style={{ fontFamily: "Nunito, sans-serif" }}
        >
          <span>Sign in with Google</span>
        </button>

        <div className="flex gap-1.5 items-center mb-6">
          <button onClick={handleForgotPassword} className="text-[0.85rem] text-[#9ab0bb] hover:text-[#1a4db5] bg-none border-none cursor-pointer font-medium">
            Mot de passe oublié ?
          </button>
          <span className="text-[#9ab0bb] text-sm">|</span>
          <Link href="/doctor/register" className="text-[0.85rem] text-[#9ab0bb] hover:text-[#1a4db5]">
            Créer un compte
          </Link>
        </div>

        {/* Lang */}
        <div className="w-full">
          <button className="w-full py-3.5 px-5 border-none rounded-[16px] bg-white text-[#5a6a74] cursor-pointer flex items-center justify-center gap-2.5 shadow-sm text-[0.95rem]" style={{ fontFamily: "Nunito, sans-serif" }}>
            <span>🇫🇷</span><span>Français</span>
          </button>
        </div>
      </div>
    </div>
  );
}
