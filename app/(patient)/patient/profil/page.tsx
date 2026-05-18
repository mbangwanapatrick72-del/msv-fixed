"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { patientAuth } from "@/lib/firebase-patient";
import { ensureSharedAuth, resetSharedAuth } from "@/lib/firebase-shared";
import {
  subscribePatientAppointments,
  createAppointment,
  cancelAppointment,
  upsertPatientRecord,
  fetchDoctors,
  type Appointment,
  type AppointmentType,
  type DoctorProfile,
} from "@/lib/appointments";
import { toast } from "sonner";

type Tab = "overview" | "profil-info" | "monitoring" | "rendezvous";
type QData = Record<string, string>;

const Q1_MAP: Record<string, string> = { "tres-bon": "Très bon", bon: "Bon", moyen: "Moyen", mauvais: "Mauvais" };
const Q4_MAP: Record<string, string> = { non: "Non", traitement: "Oui, traitement régulier", auto: "Oui, automédication" };
const APPT_TYPES: AppointmentType[] = ["CONSULTATION", "FOLLOW-UP", "EMERGENCY", "THERAPY", "TELECONSULTATION"];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:   { label: "En attente",  bg: "bg-[#fff8e1]", text: "text-[#f39c12]", border: "border-[#e2e8f0]" },
  confirmed: { label: "Confirmé",    bg: "bg-[#e8f8f5]", text: "text-[#1abc9c]", border: "border-[#1abc9c]" },
  rejected:  { label: "Refusé",      bg: "bg-[#fdecea]", text: "text-[#e74c3c]", border: "border-[#e2e8f0]" },
  cancelled: { label: "Annulé",      bg: "bg-[#f1f1f1]", text: "text-[#888]",    border: "border-[#e2e8f0]" },
};

const TYPE_ICON: Record<string, string> = {
  CONSULTATION: "📅", "FOLLOW-UP": "🔬", EMERGENCY: "🚨", THERAPY: "💆", TELECONSULTATION: "🖥️",
};

function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function PatientProfil() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [session, setSession] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [qData, setQData] = useState<QData | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Appointments
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [apptLoading, setApptLoading] = useState(true);

  // Book appointment modal
  const [showBook, setShowBook] = useState(false);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [bookForm, setBookForm] = useState({ doctorId: "", date: "", time: "", type: "CONSULTATION" as AppointmentType, note: "" });
  const [booking, setBooking] = useState(false);

  // Cancel confirm modal
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Chart refs
  const canvasRefs = {
    tension:  useRef<HTMLCanvasElement>(null),
    bpm:      useRef<HTMLCanvasElement>(null),
    glycemie: useRef<HTMLCanvasElement>(null),
    poids:    useRef<HTMLCanvasElement>(null),
  };

  // ── Init session ─────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("msv_pat_session");
    if (!raw) { router.push("/patient/login"); return; }
    const u = JSON.parse(raw);
    setSession(u);
    const q = localStorage.getItem(`msv_pat_qdata_${u.email.toLowerCase()}`);
    if (q) setQData(JSON.parse(q));
    const d = localStorage.getItem(`msv_pat_doctor_${u.email.toLowerCase()}`);
    if (d) setDoctor(JSON.parse(d));
    const p = localStorage.getItem(`msv_pat_photo_${u.email}`);
    if (p) setPhoto(p);
  }, [router]);

  // ── Real-time appointment subscription ───────────────────────────────────
  useEffect(() => {
    if (!session?.uid) return;
    let unsub: (() => void) | undefined;

    ensureSharedAuth().then(() => {
      // subscribePatientAppointments filters by the actual patient UID (session.uid)
      // to ensure each patient only sees their own appointments (data isolation)
      unsub = subscribePatientAppointments(session.uid, (list) => {
        setAppts(list);
        setApptLoading(false);
      });
    }).catch(() => setApptLoading(false));

    return () => { if (unsub) unsub(); };
  }, [session?.uid]);

  // ── Charts on monitoring tab ──────────────────────────────────────────────
  useEffect(() => {
    if (tab === "monitoring") setTimeout(drawCharts, 120);
  }, [tab]);

  function drawChart(canvas: HTMLCanvasElement | null, data: number[], color: string, yMin: number, yMax: number) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth || 300;
    const H = 140;
    canvas.width = W; canvas.height = H;
    const pad = { t: 10, r: 14, b: 28, l: 36 };
    const iW = W - pad.l - pad.r; const iH = H - pad.t - pad.b;
    const step = iW / (data.length - 1);
    const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (iH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }
    const pts = data.map((v, i) => ({ x: pad.l + i * step, y: pad.t + iH - ((v - yMin) / (yMax - yMin)) * iH }));
    ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + iH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.t + iH); ctx.closePath();
    const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + iH);
    g.addColorStop(0, color + "33"); g.addColorStop(1, color + "04");
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    });
    ctx.fillStyle = "#8a97a8"; ctx.font = "11px DM Sans, sans-serif"; ctx.textAlign = "center";
    DAYS.forEach((d, i) => ctx.fillText(d, pad.l + i * step, H - 6));
  }

  function drawCharts() {
    drawChart(canvasRefs.tension.current, [118, 122, 119, 125, 121, 118, 120], "#1abc9c", 100, 140);
    drawChart(canvasRefs.bpm.current, [70, 74, 72, 78, 75, 71, 72], "#e74c3c", 55, 95);
    drawChart(canvasRefs.glycemie.current, [5.2, 5.6, 5.1, 5.8, 5.4, 5.2, 5.3], "#3498db", 4.5, 6.5);
    drawChart(canvasRefs.poids.current, [70.2, 70.1, 70.3, 70.0, 70.1, 70.2, 70.0], "#9b59b6", 69, 71.5);
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhoto(url);
      if (session) localStorage.setItem(`msv_pat_photo_${session.email}`, url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await signOut(patientAuth).catch(() => {});
    resetSharedAuth();
    sessionStorage.removeItem("msv_pat_session");
    router.push("/patient/home");
  }

  // ── Book appointment ──────────────────────────────────────────────────────
  async function openBookModal() {
    setBookForm({ doctorId: doctor?.id ?? "", date: "", time: "", type: "CONSULTATION", note: "" });
    setShowBook(true);
    if (doctors.length === 0) {
      const list = await fetchDoctors().catch(() => []);
      setDoctors(list);
    }
  }

  async function submitBooking() {
    if (!session || !bookForm.doctorId || !bookForm.date || !bookForm.time) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    // Date must be today or future
    const today = new Date().toISOString().split("T")[0];
    if (bookForm.date < today) { toast.error("La date doit être aujourd'hui ou dans le futur."); return; }

    const selectedDoc = doctors.find(d => d.id === bookForm.doctorId);
    if (!selectedDoc) { toast.error("Médecin introuvable."); return; }

    setBooking(true);
    try {
      // Book the appointment in Firestore
      await createAppointment({
        doctorId:     selectedDoc.id,
        doctorName:   selectedDoc.name,
        doctorSpec:   selectedDoc.specialty,
        patientName:  session.name,
        patientEmail: session.email,
        date:  bookForm.date,
        time:  bookForm.time,
        type:  bookForm.type,
        note:  bookForm.note,
      });

      // Also upsert the patient record so the doctor sees this patient
      // in their patients list immediately (fire-and-forget — don't block UX)
      upsertPatientRecord({
        doctorId:     selectedDoc.id,
        doctorName:   selectedDoc.name,
        patientName:  session.name,
        patientEmail: session.email,
        source:       "appointment",
        lastApptDate: bookForm.date,
        lastApptType: bookForm.type,
      }).catch(() => { /* non-blocking */ });

      // Persist doctor choice locally
      localStorage.setItem(`msv_pat_doctor_${session.email.toLowerCase()}`, JSON.stringify(selectedDoc));
      setDoctor(selectedDoc);
      setShowBook(false);
      setTab("rendezvous");
      toast.success("Rendez-vous demandé ! Le médecin vous confirmera bientôt.");
    } catch (err: unknown) {
      toast.error("Erreur lors de la réservation : " + (err instanceof Error ? err.message : "Réessayez."));
    } finally {
      setBooking(false);
    }
  }

  // ── Cancel appointment ────────────────────────────────────────────────────
  async function confirmCancel() {
    if (!cancelId) return;
    try {
      await cancelAppointment(cancelId);
      setCancelId(null);
      toast.success("Rendez-vous annulé.");
    } catch {
      toast.error("Impossible d'annuler. Réessayez.");
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const name    = session?.name ?? "—";
  const initial = name[0]?.toUpperCase() ?? "—";
  const q       = qData ?? {};
  // Map wq- prefixed keys used in display to the actual keys saved by questionnaire form
  const KEY_MAP: Record<string, string> = {
    "wq-fullname": "fullname", "wq-nickname": "nickname", "wq-email": "email",
    "wq-dob": "dob", "wq-address": "address", "wq-weight": "weight",
    "wq-height": "height", "wq-allergies": "allergies", "wq-bloodgroup": "bloodgroup",
    "wq-history": "history", "wq-history-other": "historyOther",
    "wq-emergency-name": "emergencyName", "wq-emergency-phone": "emergencyPhone",
    "wq-q1": "q1", "wq-q2": "q2", "wq-q3": "q3", "wq-q4": "q4", "wq-q5": "q5",
  };
  const pf = (id: string) => {
    const realKey = KEY_MAP[id] ?? id;
    const v = q[realKey] ?? "";
    if (!String(v).trim()) return "—";
    if (realKey === "q1") return Q1_MAP[String(v)] ?? String(v);
    if (realKey === "q4") return Q4_MAP[String(v)] ?? String(v);
    if (Array.isArray(v)) return v.join(", ") || "—";
    return String(v);
  };

  const nextAppt = appts.find(a => a.status === "confirmed" && a.date >= new Date().toISOString().split("T")[0]);
  const pendingCount = appts.filter(a => a.status === "pending").length;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",    label: "📋 Aperçu" },
    { id: "profil-info", label: "👤 Mon profil" },
    { id: "monitoring",  label: "📊 Monitoring" },
    { id: "rendezvous",  label: `📅 Rendez-vous${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafb]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page header */}
      <div className="pat-page-header">
        <div className="pat-ph-inner flex items-center justify-between max-w-[1200px] mx-auto">
          <div>
            <div className="pat-ph-sup">Espace personnel</div>
            <h1 className="pat-ph-h1">Bonjour, {name.split(" ")[0]}</h1>
          </div>
          <button onClick={handleLogout}
            className="bg-white/10 border border-white/30 text-white px-5 py-2 rounded-[10px] text-sm font-semibold hover:bg-white/20 transition-colors">
            Déconnexion →
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-9 py-8">
        <div className="grid grid-cols-[280px_1fr] gap-8 items-start">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="bg-white border border-[#e2e8f0] rounded-[18px] p-7 shadow-sm sticky top-4">
            <div className="text-center mb-6">
              <div className="relative w-20 mx-auto mb-3.5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1abc9c] to-[#0d1f3c] flex items-center justify-center text-[1.9rem] font-extrabold text-white overflow-hidden" style={{ fontFamily: "Sora, sans-serif" }}>
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initial}
                </div>
              </div>
              <div className="font-bold text-[1.05rem] text-[#0d1f3c]" style={{ fontFamily: "Sora, sans-serif" }}>{name}</div>
              <div className="text-[0.82rem] text-[#8a97a8] mt-1">{session?.email}</div>
              {doctor && (
                <div className="mt-3 text-[0.78rem] text-[#1abc9c] font-semibold bg-[#e8f8f5] rounded-full px-3 py-1 inline-block">
                  🩺 {doctor.name}
                </div>
              )}
            </div>
            <hr className="border-[#e2e8f0] mb-4" />
            <nav className="flex flex-col gap-1">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-[0.88rem] font-semibold text-left transition-all ${
                    tab === t.id ? "bg-[#e8f8f5] text-[#1abc9c] font-bold" : "text-[#4a5568] hover:bg-[#f8fafb]"
                  }`}>
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
              <button onClick={openBookModal}
                className="w-full py-2.5 bg-[#1abc9c] text-white font-bold rounded-xl text-sm hover:bg-[#159f84] transition-colors">
                + Prendre rendez-vous
              </button>
            </div>
          </div>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div>

            {/* OVERVIEW */}
            {tab === "overview" && (
              <div>
                <h2 className="text-[1.3rem] font-bold text-[#0d1f3c] mb-5" style={{ fontFamily: "Sora, sans-serif" }}>Aperçu de votre santé</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: "❤️", val: "72", lbl: "BPM (fréq. cardiaque)" },
                    { icon: "🩸", val: "120/80", lbl: "Tension artérielle" },
                    { icon: "⚖️", val: q["weight"] ? q["weight"] + " kg" : "—", lbl: "Poids" },
                  ].map((s) => (
                    <div key={s.lbl} className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 text-center">
                      <div className="text-[1.8rem] mb-1.5">{s.icon}</div>
                      <div className="text-[1.4rem] font-extrabold text-[#1abc9c]" style={{ fontFamily: "Sora, sans-serif" }}>{s.val}</div>
                      <div className="text-[0.78rem] text-[#8a97a8]">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Next appointment */}
                <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 mb-4">
                  <div className="font-bold text-[#0d1f3c] mb-3" style={{ fontFamily: "Sora, sans-serif" }}>Prochain rendez-vous</div>
                  {nextAppt ? (
                    <div className="flex items-center gap-4 p-3.5 bg-[#e8f8f5] rounded-[10px]">
                      <div className="text-[1.8rem]">{TYPE_ICON[nextAppt.type] ?? "📅"}</div>
                      <div className="flex-1">
                        <div className="font-bold text-[#0d1f3c]">{nextAppt.doctorName}</div>
                        <div className="text-[0.84rem] text-[#4a5568] mt-0.5">
                          {fmtDate(nextAppt.date)} à {nextAppt.time} — {nextAppt.type}
                        </div>
                      </div>
                      <span className="text-[0.78rem] bg-[#1abc9c] text-white px-3 py-1 rounded-full font-bold">Confirmé</span>
                    </div>
                  ) : (
                    <div className="text-sm text-[#8a97a8] flex items-center gap-3 p-3 bg-[#f8fafb] rounded-[10px]">
                      <span className="text-xl opacity-50">📅</span>
                      Aucun rendez-vous confirmé.
                      <button onClick={openBookModal} className="ml-auto text-[#1abc9c] font-bold hover:underline text-sm">Réserver →</button>
                    </div>
                  )}
                </div>

                {/* Pending notifications */}
                {pendingCount > 0 && (
                  <div className="bg-[#fff8e1] border border-[#f39c12]/30 rounded-[14px] p-4 mb-4 flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div className="flex-1">
                      <div className="font-bold text-[#0d1f3c] text-sm">
                        {pendingCount} rendez-vous en attente de confirmation
                      </div>
                      <div className="text-xs text-[#4a5568]">Le médecin répondra bientôt à vos demandes.</div>
                    </div>
                    <button onClick={() => setTab("rendezvous")} className="text-[#f39c12] font-bold text-sm hover:underline">Voir →</button>
                  </div>
                )}

                {/* Medication reminders */}
                <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5">
                  <div className="font-bold text-[#0d1f3c] mb-3.5" style={{ fontFamily: "Sora, sans-serif" }}>Rappels médicaments</div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { drug: "Metformine 500mg", dose: "1 comprimé matin et soir", time: "08h00" },
                      { drug: "Amlodipine 5mg",   dose: "1 comprimé le soir",       time: "20h00" },
                    ].map((r) => (
                      <div key={r.drug} className="flex items-center gap-3 p-2.5 px-3.5 bg-[#f8fafb] rounded-[9px]">
                        <span className="text-xl">💊</span>
                        <div className="flex-1 text-sm"><span className="font-semibold">{r.drug}</span> · {r.dose}</div>
                        <span className="text-[0.75rem] bg-[#e8f8f5] text-[#1abc9c] px-2.5 py-1 rounded-full font-bold">{r.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PROFIL INFO */}
            {tab === "profil-info" && (
              <div>
                <h2 className="text-[1.3rem] font-bold text-[#0d1f3c] mb-1.5" style={{ fontFamily: "Sora, sans-serif" }}>Mon profil</h2>
                <p className="text-[0.88rem] text-[#4a5568] mb-6">Informations personnelles et médicales.</p>
                <div className="flex items-center gap-6 bg-white border border-[#e2e8f0] rounded-[16px] p-6 mb-5">
                  <div className="relative flex-shrink-0">
                    <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-[#1abc9c] to-[#0d1f3c] flex items-center justify-center text-[2rem] font-extrabold text-white overflow-hidden">
                      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initial}
                    </div>
                    <button onClick={() => document.getElementById("pi-photo-input")?.click()}
                      className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-[#1abc9c] border-2 border-white text-white text-base font-bold flex items-center justify-center hover:bg-[#159f84] transition-colors">+</button>
                    <input id="pi-photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  <div>
                    <div className="font-bold text-[1.15rem] text-[#0d1f3c]" style={{ fontFamily: "Sora, sans-serif" }}>{pf("wq-fullname")}</div>
                    <div className="text-[0.84rem] text-[#8a97a8] mt-0.5">{session?.email}</div>
                    <div className="text-[0.82rem] text-[#1abc9c] font-semibold mt-1">{q["age"] ?? "—"}</div>
                  </div>
                </div>
                {[
                  { title: "👤 Informations personnelles", rows: [["Nom complet",pf("wq-fullname")],["Surnom",pf("wq-nickname")],["E-mail",pf("wq-email")],["Date de naissance",pf("wq-dob")],["Âge",q["age"]??"—"],["Adresse",pf("wq-address")]] },
                  { title: "⚖️ Mesures physiques", rows: [["Poids",q["weight"]?q["weight"]+" kg":"—"],["Taille",q["height"]?q["height"]+" cm":"—"],["IMC",q["bmiVal"]??"—"]] },
                  { title: "🩺 Informations médicales", rows: [["Allergies",pf("wq-allergies")],["Groupe sanguin",pf("wq-bloodgroup")]] },
                  { title: "📋 Antécédents médicaux", rows: [["Antécédents",pf("wq-history")],["Précisions",pf("wq-history-other")]] },
                  { title: "🚨 Contact d'urgence", rows: [["Personne à contacter",pf("wq-emergency-name")],["Téléphone",pf("wq-emergency-phone")]] },
                  { title: "📝 Questionnaire", rows: [["État de santé",pf("wq-q1")],["Douleurs actuelles",q["q2"]??"—"],["Symptômes",pf("wq-q3")],["Médicaments",pf("wq-q4")],["Remarques",pf("wq-q5")]] },
                ].map((section) => (
                  <div key={section.title} className="mb-5">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#1abc9c] mb-2.5">{section.title}</div>
                    <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        {section.rows.map(([lbl, val]) => (
                          <div key={lbl} className={["Adresse","Allergies","Antécédents","Précisions","Symptômes","Médicaments","Remarques"].includes(lbl) ? "col-span-2" : ""}>
                            <div className="text-[0.72rem] font-bold uppercase tracking-wide text-[#8a97a8] mb-1">{lbl}</div>
                            <div className="text-[0.92rem] font-semibold text-[#1a2332]">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MONITORING */}
            {tab === "monitoring" && (
              <div>
                <h2 className="text-[1.3rem] font-bold text-[#0d1f3c] mb-1.5" style={{ fontFamily: "Sora, sans-serif" }}>Monitoring de santé</h2>
                <p className="text-[0.88rem] text-[#4a5568] mb-6">Évolution de vos constantes vitales sur les 7 derniers jours.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "🩸 Tension artérielle (mmHg)", ref: canvasRefs.tension },
                    { label: "❤️ Fréquence cardiaque (BPM)", ref: canvasRefs.bpm },
                    { label: "🩺 Glycémie (mmol/L)", ref: canvasRefs.glycemie },
                    { label: "⚖️ Poids (kg)", ref: canvasRefs.poids },
                  ].map((c) => (
                    <div key={c.label} className="bg-white border border-[#e2e8f0] rounded-[14px] p-5">
                      <div className="font-bold text-[#0d1f3c] mb-4" style={{ fontFamily: "Sora, sans-serif" }}>{c.label}</div>
                      <canvas ref={c.ref} height={140} className="w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RENDEZ-VOUS */}
            {tab === "rendezvous" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[1.3rem] font-bold text-[#0d1f3c]" style={{ fontFamily: "Sora, sans-serif" }}>Mes rendez-vous</h2>
                  <button onClick={openBookModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1abc9c] text-white font-bold rounded-xl text-sm hover:bg-[#159f84] transition-colors">
                    + Nouveau rendez-vous
                  </button>
                </div>

                {apptLoading ? (
                  <div className="flex flex-col gap-3">
                    {[1,2,3].map(i=>(
                      <div key={i} className="h-[76px] bg-white border border-[#e2e8f0] rounded-[14px] animate-pulse"/>
                    ))}
                  </div>
                ) : appts.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-5xl mb-4 opacity-30">📅</div>
                    <h3 className="font-bold text-[#0d1f3c] mb-2" style={{ fontFamily: "Sora, sans-serif" }}>Aucun rendez-vous</h3>
                    <p className="text-sm text-[#8a97a8] mb-6">Prenez votre premier rendez-vous avec un médecin MSV.</p>
                    <button onClick={openBookModal} className="btn-teal-filled">+ Prendre rendez-vous</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {appts.map((a) => {
                      const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.pending;
                      const canCancel = a.status === "pending" || a.status === "confirmed";
                      return (
                        <div key={a.id} className={`bg-white border-2 ${cfg.border} rounded-[14px] p-5 flex items-start gap-4`}>
                          <div className="w-[50px] h-[50px] rounded-[12px] bg-[#e8f8f5] flex items-center justify-center text-[1.3rem] flex-shrink-0">
                            {TYPE_ICON[a.type] ?? "📅"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#0d1f3c]">{a.doctorName}</div>
                            <div className="text-[0.82rem] text-[#4a5568]">{a.doctorSpec}</div>
                            <div className="text-[0.82rem] text-[#4a5568] mt-1">
                              {fmtDate(a.date)} à {a.time} — <span className="font-semibold">{a.type}</span>
                            </div>
                            {a.note && (
                              <div className="text-[0.78rem] text-[#8a97a8] mt-1 italic">Note : {a.note}</div>
                            )}
                            {a.doctorNote && a.status !== "pending" && (
                              <div className={`text-[0.78rem] mt-1.5 font-semibold px-2.5 py-1 rounded-lg inline-block ${a.status === "confirmed" ? "bg-[#e8f8f5] text-[#1abc9c]" : "bg-[#fdecea] text-[#e74c3c]"}`}>
                                Médecin : {a.doctorNote}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`${cfg.bg} ${cfg.text} px-3 py-1 rounded-full text-[0.78rem] font-bold whitespace-nowrap`}>
                              {cfg.label}
                            </span>
                            {canCancel && (
                              <button onClick={() => setCancelId(a.id)}
                                className="text-[0.75rem] text-[#e74c3c] hover:underline font-semibold">
                                Annuler
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══ BOOK APPOINTMENT MODAL ══════════════════════════════════════════ */}
      {showBook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowBook(false); }}>
          <div className="bg-white rounded-[22px] p-8 w-full max-w-[480px] shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ animation: "pageIn .3s ease both" }}>
            <h3 className="text-[1.2rem] font-extrabold text-[#0d1f3c] mb-5" style={{ fontFamily: "Sora, sans-serif" }}>
              📅 Prendre un rendez-vous
            </h3>

            <div className="space-y-4">
              {/* Doctor */}
              <div>
                <label className="block text-[0.8rem] font-bold text-[#4a5568] uppercase tracking-wide mb-1.5">Médecin *</label>
                <select value={bookForm.doctorId} onChange={e => setBookForm({...bookForm, doctorId: e.target.value})}
                  className="w-full p-3 border-[1.5px] border-[#e2e8f0] rounded-[10px] text-[#1a2332] text-sm outline-none focus:border-[#1abc9c] bg-white cursor-pointer">
                  <option value="">— Sélectionnez un médecin —</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} – {d.specialty}</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[0.8rem] font-bold text-[#4a5568] uppercase tracking-wide mb-1.5">Date *</label>
                <input type="date" value={bookForm.date} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setBookForm({...bookForm, date: e.target.value})}
                  className="w-full p-3 border-[1.5px] border-[#e2e8f0] rounded-[10px] text-[#1a2332] text-sm outline-none focus:border-[#1abc9c]" />
              </div>

              {/* Time */}
              <div>
                <label className="block text-[0.8rem] font-bold text-[#4a5568] uppercase tracking-wide mb-1.5">Heure *</label>
                <input type="time" value={bookForm.time} onChange={e => setBookForm({...bookForm, time: e.target.value})}
                  className="w-full p-3 border-[1.5px] border-[#e2e8f0] rounded-[10px] text-[#1a2332] text-sm outline-none focus:border-[#1abc9c]" />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[0.8rem] font-bold text-[#4a5568] uppercase tracking-wide mb-1.5">Type de consultation *</label>
                <div className="grid grid-cols-2 gap-2">
                  {APPT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setBookForm({...bookForm, type: t})}
                      className={`flex items-center gap-2 p-3 rounded-[10px] border-[1.5px] text-sm font-semibold text-left transition-colors ${
                        bookForm.type === t ? "border-[#1abc9c] bg-[#e8f8f5] text-[#0d1f3c]" : "border-[#e2e8f0] text-[#4a5568] hover:border-[#a8e6da]"
                      }`}>
                      <span>{TYPE_ICON[t]}</span>{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[0.8rem] font-bold text-[#4a5568] uppercase tracking-wide mb-1.5">Note pour le médecin</label>
                <textarea value={bookForm.note} onChange={e => setBookForm({...bookForm, note: e.target.value})}
                  rows={3} placeholder="Décrivez brièvement vos symptômes ou votre motif de consultation…"
                  className="w-full p-3 border-[1.5px] border-[#e2e8f0] rounded-[10px] text-[#1a2332] text-sm outline-none focus:border-[#1abc9c] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBook(false)}
                className="flex-1 py-3 border-[1.5px] border-[#e2e8f0] rounded-[12px] text-[#4a5568] font-semibold text-sm hover:bg-[#f8fafb]">
                Annuler
              </button>
              <button onClick={submitBooking} disabled={booking}
                className="flex-[2] py-3 bg-[#1abc9c] text-white font-bold rounded-[12px] text-sm hover:bg-[#159f84] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {booking ? "Envoi…" : "Demander le rendez-vous →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CANCEL CONFIRM MODAL ════════════════════════════════════════════ */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setCancelId(null); }}>
          <div className="bg-white rounded-[18px] p-7 max-w-[360px] w-full shadow-2xl" style={{ animation: "pageIn .3s ease both" }}>
            <div className="text-3xl text-center mb-4">⚠️</div>
            <h3 className="text-center font-extrabold text-[#0d1f3c] mb-2">Annuler le rendez-vous ?</h3>
            <p className="text-sm text-[#4a5568] text-center mb-6">Cette action ne peut pas être annulée. Le médecin sera notifié.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)}
                className="flex-1 py-2.5 border border-[#e2e8f0] rounded-xl text-[#4a5568] font-semibold text-sm hover:bg-[#f8fafb]">
                Non, garder
              </button>
              <button onClick={confirmCancel}
                className="flex-1 py-2.5 bg-[#e74c3c] text-white font-bold rounded-xl text-sm hover:bg-[#c0392b] transition-colors">
                Oui, annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
