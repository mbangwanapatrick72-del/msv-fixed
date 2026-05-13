"use client";
import PatientNavbar from "@/components/patient/PatientNavbar";
import { toast } from "sonner";

export default function ContactPage() {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Message envoyé ! Nous vous répondrons sous 24h.");
    (e.target as HTMLFormElement).reset();
  }
  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar activePage="contact" />
      <div className="pat-page-header">
        <div className="pat-ph-inner max-w-[1200px] mx-auto">
          <div className="pat-ph-sup">Nous joindre</div>
          <h1 className="pat-ph-h1">Contact</h1>
          <p className="pat-ph-p">Une question, une demande de partenariat ou un problème technique ? Notre équipe vous répond rapidement.</p>
        </div>
      </div>
      <section className="pat-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="pat-section-h2 mb-6">Envoyez-nous un message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Nom complet", type: "text", ph: "Votre nom" },
                { label: "Adresse e-mail", type: "email", ph: "votre@email.com" },
              ].map(f => (
                <div key={f.label} className="form-field">
                  <label>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} required />
                </div>
              ))}
              <div className="form-field">
                <label>Sujet</label>
                <select>
                  <option>Information générale</option>
                  <option>Support technique</option>
                  <option>Partenariat médical</option>
                  <option>Autre</option>
                </select>
              </div>
              <div className="form-field">
                <label>Message</label>
                <textarea rows={5} placeholder="Décrivez votre demande…" required style={{ resize: "vertical" }} />
              </div>
              <button type="submit" className="form-submit">Envoyer le message →</button>
            </form>
          </div>
          <div>
            <h2 className="pat-section-h2 mb-6">Informations de contact</h2>
            <div className="space-y-4">
              {[
                { icon: "📧", label: "E-mail", val: "contact@msv-health.com" },
                { icon: "📞", label: "Téléphone", val: "+237 6 00 00 00 00" },
                { icon: "📍", label: "Adresse", val: "Douala, Cameroun" },
                { icon: "🕐", label: "Horaires", val: "Lun–Ven, 9h–18h" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-4 p-4 bg-[#f8fafb] border border-[#e2e8f0] rounded-[12px]">
                  <div className="w-10 h-10 bg-[#e8f8f5] rounded-[10px] flex items-center justify-center text-xl">{c.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-[#8a97a8] uppercase tracking-wide">{c.label}</div>
                    <div className="text-sm font-semibold text-[#0d1f3c] mt-0.5">{c.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <footer className="pat-footer"><div className="pat-footer-inner"><div className="pat-footer-brand">MSV</div><div className="pat-footer-copy">© {new Date().getFullYear()} MSV.</div></div></footer>
    </div>
  );
}
