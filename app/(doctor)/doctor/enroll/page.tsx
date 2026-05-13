"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { doctorAuth, doctorDb } from "@/lib/firebase-doctor";
import { toast } from "sonner";

const SPECIALTIES = [
  "Médecin généraliste","Gynécologue-obstétricien(ne)","Pédiatre","Cardiologue",
  "Dermatologue","Neurologue","Ophtalmologue","Orthopédiste","Psychiatre",
  "Radiologue","Chirurgien général","Urologue","Endocrinologue","Néphrologue",
  "Gastro-entérologue","Pneumologue","Oncologue","Rhumatologue",
];

const COUNTRIES = [
  { flag:"🇨🇲", code:"+237", name:"Cameroun" },
  { flag:"🇫🇷", code:"+33",  name:"France" },
  { flag:"🇧🇪", code:"+32",  name:"Belgique" },
  { flag:"🇸🇳", code:"+221", name:"Sénégal" },
  { flag:"🇨🇮", code:"+225", name:"Côte d'Ivoire" },
  { flag:"🇲🇦", code:"+212", name:"Maroc" },
  { flag:"🇩🇿", code:"+213", name:"Algérie" },
  { flag:"🇬🇧", code:"+44",  name:"Royaume-Uni" },
  { flag:"🇺🇸", code:"+1",   name:"États-Unis" },
];

export default function DoctorEnroll() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "form">("role");
  const [loading, setLoading] = useState(false);
  const [countryIdx, setCountryIdx] = useState(0);
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  const [specIdx, setSpecIdx] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "",
    phone: "", dob: "", idNum: "", onmc: "",
  });

  const country = COUNTRIES[countryIdx];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.phone || !form.dob || !sex || !form.idNum || !form.onmc || specIdx === null) {
      toast.error("Veuillez remplir tous les champs."); return;
    }
    setLoading(true);
    try {
      // Step 1: Check if doctor is pre-approved
      const approvalRef = doc(doctorDb, "approved_doctors", form.email);
      const approvalSnap = await getDoc(approvalRef);
      if (!approvalSnap.exists()) {
        toast.error("Cet email n'est pas autorisé. Contactez l'administrateur.");
        setLoading(false);
        return;
      }

      // Step 2: Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(doctorAuth, form.email, form.password);
      const uid = cred.user.uid;

      // Step 3: Create doctor profile in Firestore
      const profile = {
        uid, name: form.name, email: form.email,
        phone: `${country.code} ${form.phone}`,
        dob: form.dob, sex, idNum: form.idNum, onmc: form.onmc,
        specIdx, specialty: SPECIALTIES[specIdx],
        role: "DOCTOR", createdAt: serverTimestamp(),
      };
      await setDoc(doc(doctorDb, "doctors", uid), profile);
      sessionStorage.setItem("msv_doc_session", JSON.stringify(profile));
      toast.success("Compte créé !");
      router.push("/doctor/welcome");
    } catch (err: unknown) {
      toast.error("Inscription : " + (err instanceof Error ? err.message : "Erreur"));
    } finally { setLoading(false); }
  }

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="doc-wave-bg"><div className="doc-wave doc-wave-1"/><div className="doc-wave doc-wave-2"/></div>
        <div className="doc-page justify-center" style={{ fontFamily: "Nunito, sans-serif" }}>
          <button onClick={() => router.push("/doctor/login")} className="flex items-center gap-2 text-[#1a4db5] font-semibold mb-5 bg-none border-none cursor-pointer self-start">
            ← Retour
          </button>
          <div className="mb-7 w-full">
            <h2 className="text-[1.7rem] font-extrabold text-[#1e2a38]" style={{ fontFamily: "Nunito, sans-serif" }}>Créer un compte</h2>
          </div>
          <button
            onClick={() => setStep("form")}
            className="w-full bg-white rounded-[20px] p-5 flex items-center gap-4 cursor-pointer border-2 border-transparent shadow-md hover:border-[#1a4db5] hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-[52px] h-[52px] rounded-[14px] bg-[#e8eef9] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a4db5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <path d="M6 3v5"/><path d="M18 3v5"/><path d="M6 8a6 6 0 0 0 12 0"/>
                <path d="M12 14v3"/><path d="M12 17a4 4 0 0 0 4 4"/>
                <circle cx="18" cy="21" r="2" fill="#1a4db5" stroke="none" opacity="0.3"/><circle cx="18" cy="21" r="2"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-[1.1rem] text-[#1e2a38]">Médecin</div>
              <div className="text-[0.83rem] text-[#9ab0bb]">Accès aux patients et examens</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#bfcfef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: "Nunito, sans-serif" }}>
      <div className="doc-wave-bg"><div className="doc-wave doc-wave-1"/><div className="doc-wave doc-wave-2"/></div>
      <div className="relative z-10 max-w-[420px] mx-auto px-9 py-9">
        <button onClick={() => setStep("role")} className="flex items-center gap-2 text-[#1a4db5] font-semibold mb-5 bg-none border-none cursor-pointer">
          ← Retour
        </button>
        <div className="mb-6">
          <h2 className="text-[1.7rem] font-extrabold text-[#1e2a38]">Inscription Médecin</h2>
          <p className="text-[0.88rem] text-[#9ab0bb] mt-1">Renseignez vos informations personnelles</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name / Email / Password */}
          <div className="bg-white rounded-[16px] shadow-md overflow-hidden">
            {[
              { id: "name", placeholder: "Nom complet", type: "text", icon: "person" },
              { id: "email", placeholder: "Adresse e-mail", type: "email", icon: "email" },
              { id: "password", placeholder: "Mot de passe", type: "password", icon: "lock" },
            ].map((f, i) => (
              <div key={f.id} className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? "border-t border-[#e4ecf7]" : ""}`}>
                <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon === "person" && <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>}
                  {f.icon === "email" && <><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 8l10 6 10-6"/></>}
                  {f.icon === "lock" && <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>}
                </svg>
                <input type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.id]} onChange={e => setForm({ ...form, [f.id]: e.target.value })} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem]" style={{ fontFamily: "Nunito, sans-serif" }} required />
              </div>
            ))}
          </div>

          {/* Phone */}
          <div className="bg-white rounded-[16px] shadow-md overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
              <select value={countryIdx} onChange={e => setCountryIdx(Number(e.target.value))} className="border-none outline-none bg-transparent text-[#1a4db5] font-bold text-sm cursor-pointer" style={{ fontFamily: "Nunito, sans-serif" }}>
                {COUNTRIES.map((c, i) => <option key={i} value={i}>{c.flag} {c.code}</option>)}
              </select>
              <div className="w-px h-5 bg-[#e4ecf7] mx-0.5 flex-shrink-0" />
              <input type="tel" placeholder="Numéro de téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem]" style={{ fontFamily: "Nunito, sans-serif" }} required />
            </div>
          </div>

          {/* DOB + Sex */}
          <div className="bg-white rounded-[16px] shadow-md overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#e4ecf7]">
              <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem]" required />
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/><path d="M12 14c-5 0-8 2.5-8 4v1h16v-1c0-1.5-3-4-8-4z"/>
              </svg>
              <select value={sex ?? ""} onChange={e => setSex(e.target.value as "M" | "F")} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem] cursor-pointer" style={{ fontFamily: "Nunito, sans-serif" }} required>
                <option value="">Sexe</option>
                <option value="M">♂ Homme</option>
                <option value="F">♀ Femme</option>
              </select>
            </div>
          </div>

          {/* ID + ONMC */}
          {[
            { id: "idNum", placeholder: "Numéro d'identifiant (ID)" },
            { id: "onmc", placeholder: "Numéro ONMC" },
          ].map(f => (
            <div key={f.id} className="bg-white rounded-[16px] shadow-md overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-4">
                <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>
                </svg>
                <input placeholder={f.placeholder} value={(form as Record<string, string>)[f.id]} onChange={e => setForm({ ...form, [f.id]: e.target.value })} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem]" style={{ fontFamily: "Nunito, sans-serif" }} required />
              </div>
            </div>
          ))}

          {/* Specialty */}
          <div className="bg-white rounded-[16px] shadow-md overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <svg className="w-5 h-5 text-[#9ab0bb] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z"/><path d="M9 3v5h5M12 12v6M9 15h6"/>
              </svg>
              <select value={specIdx ?? ""} onChange={e => setSpecIdx(e.target.value === "" ? null : Number(e.target.value))} className="flex-1 border-none outline-none bg-transparent text-[#5a6a74] text-[0.97rem] cursor-pointer" style={{ fontFamily: "Nunito, sans-serif" }} required>
                <option value="">Spécialité médicale (Rôle)</option>
                {SPECIALTIES.map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="doc-btn-primary w-full mb-8">
            <span>{loading ? "Création…" : "Créer mon compte"}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
