import PatientNavbar from "@/components/patient/PatientNavbar";

export default function FonctionnalitesPage() {
  const patientFeatures = [
    { icon: "🔐", title: "Espace patient sécurisé", desc: "Connexion par identifiant unique, données chiffrées, accès contrôlé à votre profil médical." },
    { icon: "📱", title: "Interface intuitive", desc: "Une navigation simple et claire, accessible depuis ordinateur, tablette ou smartphone." },
    { icon: "📄", title: "Questionnaire de santé", desc: "Remplissez votre bilan de santé en ligne avant votre consultation pour gagner du temps." },
    { icon: "📈", title: "Suivi longitudinal", desc: "Consultez l'évolution de vos indicateurs de santé sur des graphiques interactifs." },
  ];
  const doctorFeatures = [
    { icon: "🩺", title: "Tableau de bord médecin", desc: "Vision globale de votre patientèle, rendez-vous du jour, alertes et indicateurs clés." },
    { icon: "✏️", title: "Rédaction d'ordonnances", desc: "Créez et transmettez des ordonnances électroniques certifiées en quelques secondes." },
    { icon: "📂", title: "Gestion des dossiers", desc: "Consultez et mettez à jour les dossiers patients avec historique complet et annotations." },
    { icon: "📡", title: "Monitoring à distance", desc: "Recevez en temps réel les données de santé transmises par vos patients pour un suivi proactif." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar activePage="fonctionnalites" />
      <div className="pat-page-header">
        <div className="pat-ph-inner max-w-[1200px] mx-auto">
          <div className="pat-ph-sup">Comment ça marche</div>
          <h1 className="pat-ph-h1">Fonctionnalités</h1>
          <p className="pat-ph-p">Des outils pensés pour les patients comme pour les professionnels de santé.</p>
        </div>
      </div>
      <section className="pat-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <div>
            <div className="pat-section-sup">Pour les patients</div>
            <h2 className="pat-section-h2 mb-6">Votre santé, à portée de main</h2>
            <div className="flex flex-col gap-5">
              {patientFeatures.map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-[12px] bg-[#e8f8f5] flex items-center justify-center text-xl flex-shrink-0">{f.icon}</div>
                  <div>
                    <div className="font-bold text-[#0d1f3c] text-[0.97rem] mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{f.title}</div>
                    <div className="text-[0.86rem] text-[#4a5568] leading-[1.6]">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="pat-section-sup">Pour les médecins</div>
            <h2 className="pat-section-h2 mb-6">Des outils de gestion avancés</h2>
            <div className="flex flex-col gap-5">
              {doctorFeatures.map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-[12px] bg-[#e8eef9] flex items-center justify-center text-xl flex-shrink-0">{f.icon}</div>
                  <div>
                    <div className="font-bold text-[#0d1f3c] text-[0.97rem] mb-1" style={{ fontFamily: "Sora, sans-serif" }}>{f.title}</div>
                    <div className="text-[0.86rem] text-[#4a5568] leading-[1.6]">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <footer className="pat-footer">
        <div className="pat-footer-inner">
          <div className="pat-footer-brand">MSV</div>
          <div className="pat-footer-copy">© {new Date().getFullYear()} MSV – Interface Patient.</div>
        </div>
      </footer>
    </div>
  );
}
