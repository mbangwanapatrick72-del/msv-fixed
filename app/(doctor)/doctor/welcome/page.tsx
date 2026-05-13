"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SPECIALTIES = [
  "Médecin généraliste","Gynécologue-obstétricien(ne)","Pédiatre","Cardiologue",
  "Dermatologue","Neurologue","Ophtalmologue","Orthopédiste","Psychiatre",
  "Radiologue","Chirurgien général","Urologue","Endocrinologue","Néphrologue",
  "Gastro-entérologue","Pneumologue","Oncologue","Rhumatologue",
];

export default function DoctorWelcome() {
  const router = useRouter();
  const [doc, setDoc] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const raw = sessionStorage.getItem("msv_doc_session");
    if (!raw) { router.push("/doctor/login"); return; }
    setDoc(JSON.parse(raw));
  }, [router]);

  const specIdx = typeof doc.specIdx === "number" ? doc.specIdx : null;
  const spec = specIdx !== null ? SPECIALTIES[specIdx] : "—";
  const name = String(doc.name ?? "—");
  const dobRaw = String(doc.dob ?? "");
  const dobFmt = dobRaw ? (() => { const p = dobRaw.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dobRaw; })() : "—";

  const rows = [
    { label: "Adresse e-mail", val: String(doc.email ?? "—") },
    { label: "Téléphone", val: String(doc.phone ?? "—") },
    { label: "Date de naissance", val: dobFmt },
    { label: "Sexe", val: doc.sex === "M" ? "Homme" : doc.sex === "F" ? "Femme" : "—" },
    { label: "Numéro d'identifiant", val: String(doc.idNum ?? "—") },
    { label: "Numéro ONMC", val: String(doc.onmc ?? "—") },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-start justify-center" style={{ fontFamily: "Nunito, sans-serif" }}>
      <div className="doc-wave-bg"><div className="doc-wave doc-wave-1"/><div className="doc-wave doc-wave-2"/></div>

      <div className="relative z-10 w-full max-w-[420px] px-9 pt-12 pb-24 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="bg-white rounded-[24px] px-6 py-5 shadow-[0_6px_28px_rgba(26,77,181,.18)] mb-9 inline-flex flex-col items-center">
          <div className="text-[2.8rem] font-extrabold tracking-wider text-[#1a4db5]" style={{ fontFamily: "Nunito, sans-serif" }}>
            MS<span className="text-[#e74c3c]">V</span>
          </div>
        </div>

        {/* Doctor badge */}
        <div className="w-[84px] h-[84px] rounded-full bg-[#e8eef9] flex items-center justify-center mb-7 shadow-[0_6px_24px_rgba(26,77,181,.18)]" style={{ animation: "popIn .6s cubic-bezier(.34,1.56,.64,1) .1s both" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a4db5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="42" height="42">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>

        <p className="text-[1rem] font-bold text-[#9ab0bb] uppercase tracking-[.12em] mb-2">Bienvenue</p>
        <h2 className="text-[2.1rem] font-extrabold text-[#1e2a38] tracking-tight mb-3.5 leading-[1.15]">
          Dr. {name}
        </h2>
        <div className="inline-flex items-center gap-1.5 bg-[#e8eef9] text-[#1a4db5] text-[0.85rem] font-bold px-4 py-1.5 rounded-full mb-9">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z"/><path d="M9 3v5h5M12 12v6M9 15h6"/>
          </svg>
          {spec}
        </div>

        {/* Info card */}
        <div className="w-full bg-white rounded-[16px] shadow-[0_4px_20px_rgba(26,77,181,.09)] p-5 text-left mb-6">
          <div className="text-[0.72rem] font-extrabold text-[#9ab0bb] uppercase tracking-[.1em] mb-3.5">Informations du compte</div>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-2.5 border-b border-[#f0f5fc] last:border-b-0">
              <div className="flex-1">
                <div className="text-[0.78rem] text-[#9ab0bb] mb-0.5">{r.label}</div>
                <div className="text-[0.93rem] font-bold text-[#1e2a38]">{r.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/doctor/dashboard")}
          className="doc-btn-primary w-full"
        >
          <span>Accéder à mon espace</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
