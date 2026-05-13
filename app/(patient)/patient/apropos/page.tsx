import PatientNavbar from "@/components/patient/PatientNavbar";

export default function AproposPage() {
  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar activePage="apropos" />
      <div className="pat-page-header">
        <div className="pat-ph-inner max-w-[1200px] mx-auto">
          <div className="pat-ph-sup">Qui sommes-nous</div>
          <h1 className="pat-ph-h1">À propos de MSV</h1>
          <p className="pat-ph-p">Une plateforme médicale de nouvelle génération, pensée pour les patients et les professionnels de santé.</p>
        </div>
      </div>
      <section className="pat-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <div>
            <div className="pat-section-sup">Notre mission</div>
            <h2 className="pat-section-h2">Santé accessible à tous</h2>
            <p className="pat-section-p text-justify">MSV est née d&apos;une conviction simple : l&apos;accès aux soins de qualité doit être universel. Nous développons des outils numériques qui rapprochent patients et soignants, fluidifient les échanges d&apos;information médicale et réduisent les délais de prise en charge.</p>
            <p className="pat-section-p mt-3.5 text-justify">Notre équipe pluridisciplinaire réunit des médecins, des ingénieurs et des experts en données de santé, tous animés par le même objectif : transformer positivement l&apos;expérience médicale.</p>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[
                { icon: "🌍", title: "Notre Vision", desc: "Devenir l'une des meilleures plateformes digitales de santé au service de la population." },
                { icon: "🤝", title: "Nos Valeurs", desc: "Respect, engagement, innovation, confidentialité et professionnalisme." },
                { icon: "💉", title: "Innovation Médicale", desc: "Nous intégrons des technologies modernes pour améliorer la prise en charge." },
                { icon: "🔒", title: "Sécurité des Données", desc: "Nous assurons la confidentialité totale des informations médicales." },
              ].map(s => (
                <div key={s.title} className="bg-[#f8fafb] border border-[#e2e8f0] rounded-[14px] p-4">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="font-bold text-[#0d1f3c] text-sm mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{s.title}</div>
                  <div className="text-xs text-[#4a5568]">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#0d1f3c] to-[#1a3358] rounded-[24px] p-10 text-white relative overflow-hidden">
            <div className="text-[5rem] font-black text-[#1abc9c] opacity-20 leading-none mb-4">&ldquo;</div>
            <p className="text-[1.05rem] leading-[1.8] text-white/90 mb-6">
              Chez MSV, nous croyons que chaque patient mérite un accès rapide, sécurisé et humain aux soins médicaux. Notre technologie est au service de la santé — pas l&apos;inverse.
            </p>
            <div className="text-[1.8rem] font-extrabold text-[#1abc9c]" style={{ fontFamily: "Sora, sans-serif" }}>MSV</div>
          </div>
        </div>
      </section>
      <footer className="pat-footer"><div className="pat-footer-inner"><div className="pat-footer-brand">MSV</div><div className="pat-footer-copy">© {new Date().getFullYear()} MSV – Interface Patient.</div></div></footer>
    </div>
  );
}
