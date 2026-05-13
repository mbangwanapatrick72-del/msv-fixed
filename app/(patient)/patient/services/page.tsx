"use client";
import PatientNavbar from "@/components/patient/PatientNavbar";

export default function ServicesPage() {
  const services: { icon: string; title: string; desc: string }[] = [
    { icon: "📋", title: "Dossier Médical Électronique", desc: "Centralisez tous vos antécédents, ordonnances et résultats d'analyses dans un espace sécurisé et consultable en temps réel." },
    { icon: "📅", title: "Prise de Rendez-vous en Ligne", desc: "Planifiez vos consultations directement depuis l'interface, avec confirmation instantanée et rappels automatiques." },
    { icon: "💬", title: "Téléconsultation", desc: "Rejoignez une consultation vidéo sécurisée avec votre médecin depuis votre domicile, sans déplacement." },
    { icon: "💊", title: "Gestion des Ordonnances", desc: "Recevez et transmettez vos ordonnances électroniques directement aux pharmacies partenaires." },
    { icon: "📊", title: "Suivi & Monitoring", desc: "Visualisez l'évolution de vos constantes de santé : tension, glycémie, poids, sur des graphiques clairs." },
    { icon: "🔔", title: "Alertes & Rappels", desc: "Recevez des notifications pour vos rendez-vous, prises de médicaments et renouvellements d'ordonnances." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar activePage="services" />
      <div className="pat-page-header">
        <div className="pat-ph-inner max-w-[1200px] mx-auto">
          <div className="pat-ph-sup">Ce que nous proposons</div>
          <h1 className="pat-ph-h1">Nos Services</h1>
          <p className="pat-ph-p">Des solutions médicales numériques complètes pour accompagner votre parcours de soins.</p>
        </div>
      </div>
      <section className="pat-section">
        <div className="srv-grid">
          {services.map(s => (
            <div key={s.title} className="srv-card">
              <div className="srv-icon">{s.icon}</div>
              <div className="srv-title">{s.title}</div>
              <div className="srv-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
      <footer className="pat-footer"><div className="pat-footer-inner"><div className="pat-footer-brand">MSV</div><div className="pat-footer-copy">© {new Date().getFullYear()} MSV – Interface Patient.</div></div></footer>
    </div>
  );
}
