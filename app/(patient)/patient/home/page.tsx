"use client";

import Link from "next/link";
import PatientNavbar from "@/components/patient/PatientNavbar";

export default function PatientHome() {
  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar activePage="home" />

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-9 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-66px)] relative">
        {/* Radial glow */}
        <div
          className="absolute top-20 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(26,188,156,.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#1abc9c] bg-[#e8f8f5] px-3.5 py-1.5 rounded-full mb-6">
            Plateforme Médicale Innovante
          </span>
          <h1
            className="text-[2.9rem] leading-[1.18] text-[#0d1f3c] mb-5 font-light"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Obtenez Rapidement
            <strong className="block font-extrabold">
              Des Services Medicaux
            </strong>
          </h1>
          <p className="text-base leading-[1.75] text-[#4a5568] mb-10 max-w-[540px] text-justify">
            Dans le monde actuel qui évolue à un rythme effréné, l&apos;accès à
            des services médicaux rapides et efficaces est d&apos;une importance
            capitale. Chez MSV, nous comprenons les défis auxquels sont
            confrontés les patients et les professionnels de santé. C&apos;est
            pourquoi nous nous engageons à fournir des solutions innovantes qui
            facilitent l&apos;accès aux soins médicaux.
          </p>
          <Link href="/patient/services">
            <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-[10px] bg-[#1abc9c] text-white font-bold text-[0.95rem] border-none cursor-pointer shadow-[0_6px_24px_rgba(26,188,156,.38)] transition-all duration-200 hover:bg-[#159f84] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(26,188,156,.48)]">
              · Accédez aux Services <span>→</span>
            </button>
          </Link>
        </div>

        {/* Hero visual card stack */}
        <div className="flex justify-center items-center">
          <div className="relative w-[340px] h-[380px]">
            {/* Dot background circle */}
            <div className="absolute w-[90px] h-[90px] bg-[#e8f8f5] rounded-full top-0 right-2.5 flex items-center justify-center text-3xl z-0">
              🏥
            </div>
            {/* Main card */}
            <div className="absolute w-[280px] bg-[#0d1f3c] rounded-[18px] p-6 shadow-[0_4px_24px_rgba(13,31,60,.09)] top-8 left-8 text-white z-10">
              <div className="text-[0.72rem] font-semibold tracking-widest uppercase text-[#a8e6da] mb-3">
                Dossier Patient
              </div>
              <div
                className="font-bold text-[1.15rem] mb-1"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Dr. Aminata Diallo
              </div>
              <div className="text-[0.82rem] text-[#a8e6da] mb-5">
                Médecine Générale · MSV
              </div>
              <div className="flex gap-4">
                {[
                  { val: "248", lbl: "Patients" },
                  { val: "96%", lbl: "Satisfaction" },
                  { val: "12", lbl: "Années exp." },
                ].map((s) => (
                  <div key={s.lbl} className="text-center">
                    <div
                      className="text-[1.4rem] font-extrabold text-[#1abc9c]"
                      style={{ fontFamily: "Sora, sans-serif" }}
                    >
                      {s.val}
                    </div>
                    <div className="text-[0.7rem] text-[#aabccc] mt-0.5">
                      {s.lbl}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating accent card */}
            <div className="absolute w-[200px] bg-[#1abc9c] rounded-[18px] p-6 shadow-[0_4px_24px_rgba(13,31,60,.09)] bottom-5 right-0 text-white z-20 animate-[float-card_3.5s_ease-in-out_infinite]">
              <div className="text-[1.8rem] mb-2">✅</div>
              <div
                className="text-[1.6rem] font-extrabold"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                +2.4k
              </div>
              <div className="text-[0.75rem] opacity-85 mt-0.5">
                Consultations/mois
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="bg-[#f8fafb] border-y border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-9 py-7 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "🔒",
              title: "Données sécurisées",
              sub: "Chiffrement de bout en bout",
            },
            {
              icon: "⚡",
              title: "Accès instantané",
              sub: "Disponible 24h/24, 7j/7",
            },
            {
              icon: "🩺",
              title: "Réseau médical",
              sub: "+500 professionnels de santé",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3.5">
              <span className="text-[1.8rem]">{item.icon}</span>
              <div>
                <div
                  className="text-[0.9rem] font-bold text-[#0d1f3c]"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  {item.title}
                </div>
                <div className="text-[0.81rem] text-[#8a97a8]">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services preview */}
      <section className="pat-section">
        <div className="section-header mb-12">
          <div className="pat-section-sup">Nos Services</div>
          <h2 className="pat-section-h2">Ce que MSV vous offre</h2>
          <p className="pat-section-p max-w-xl">
            Des solutions complètes pour simplifier votre parcours de soins et
            améliorer la qualité de votre suivi médical.
          </p>
        </div>
        <div className="srv-grid">
          {[
            {
              icon: "📋",
              title: "Dossier Médical Électronique",
              d: "Accédez à votre historique médical complet en toute sécurité, depuis n'importe quel appareil.",
            },
            {
              icon: "📅",
              title: "Prise de Rendez-vous",
              d: "Planifiez vos consultations en ligne avec vos médecins préférés, sans attente téléphonique.",
            },
            {
              icon: "💬",
              title: "Téléconsultation",
              d: "Consultez un médecin par vidéo depuis chez vous pour des soins rapides et adaptés.",
            },
          ].map((s) => (
            <div key={s.title} className="srv-card">
              <div className="srv-icon">{s.icon}</div>
              <div className="srv-title">{s.title}</div>
              <div className="srv-desc">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-9">
          <Link href="/patient/services">
            <button className="btn-teal-filled">Voir tous les services →</button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pat-footer">
        <div className="pat-footer-inner">
          <div className="pat-footer-brand">MSV</div>
          <div className="pat-footer-copy">
            © {new Date().getFullYear()} MSV – Interface Patient. Tous droits
            réservés.
          </div>
          <div className="pat-footer-links">
            <Link href="/patient/services">Services</Link>
            <Link href="/patient/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
