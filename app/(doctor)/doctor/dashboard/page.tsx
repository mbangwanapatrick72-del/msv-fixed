"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doctorAuth } from "@/lib/firebase-doctor";
import {
  subscribeDoctorAppointments,
  subscribeDoctorPatients,
  confirmAppointment,
  rejectAppointment,
  deleteAppointmentRecord,
  addPatientManual,
  updatePatientRecord,
  deletePatientRecord,
  type Appointment,
  type AppointmentStatus,
  type PatientRecord,
} from "@/lib/appointments";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "dashboard" | "appointments" | "patients" | "settings";

interface DocData {
  uid: string; name?: string; email?: string; phone?: string;
  dob?: string; sex?: string; idNum?: string; onmc?: string;
  specIdx?: number; specialty?: string; photoURL?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALTIES = [
  "Médecin généraliste","Gynécologue-obstétricien(ne)","Pédiatre","Cardiologue",
  "Dermatologue","Neurologue","Ophtalmologue","Orthopédiste","Psychiatre",
  "Radiologue","Chirurgien général","Urologue","Endocrinologue","Néphrologue",
  "Gastro-entérologue","Pneumologue","Oncologue","Rhumatologue",
];
const APPT_TYPES = ["CONSULTATION","FOLLOW-UP","EMERGENCY","THERAPY","TELECONSULTATION"];

const STATUS_CFG: Record<AppointmentStatus, {
  label: string; dot: string; bg: string; text: string; border: string;
}> = {
  pending:   { label:"En attente", dot:"bg-[#f39c12]", bg:"bg-[#fff8e1]", text:"text-[#f39c12]", border:"border-l-[#f39c12]" },
  confirmed: { label:"Confirmé",   dot:"bg-[#27ae60]", bg:"bg-[#e8f8f5]", text:"text-[#27ae60]", border:"border-l-[#27ae60]" },
  rejected:  { label:"Refusé",     dot:"bg-[#e74c3c]", bg:"bg-[#fdecea]", text:"text-[#e74c3c]", border:"border-l-transparent" },
  cancelled: { label:"Annulé",     dot:"bg-[#95a5a6]", bg:"bg-[#f5f5f5]", text:"text-[#7f8c8d]", border:"border-l-transparent" },
};

const TYPE_ICON: Record<string, string> = {
  CONSULTATION:"📅","FOLLOW-UP":"🔬",EMERGENCY:"🚨",THERAPY:"💆",TELECONSULTATION:"🖥️",
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  selection:   { label: "Sélection", color: "bg-[#e8f8f5] text-[#1abc9c]" },
  appointment: { label: "RDV",       color: "bg-[#eef2f9] text-[#1a4db5]" },
  manual:      { label: "Manuel",    color: "bg-[#f5f5f5] text-[#7f8c8d]" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ini(name: string) {
  return name.split(" ").map(w => w[0]||"").join("").substring(0,2).toUpperCase() || "DR";
}
function dobFmt(dob?: string) {
  if (!dob) return "—";
  const p = dob.split("-");
  return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : dob;
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d+"T00:00:00").toLocaleDateString("fr-FR",{
    weekday:"short", day:"numeric", month:"short",
  });
}
function fmtDateTime(d: string, t: string) {
  return `${fmtDate(d)} à ${t}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const router = useRouter();
  const [view,    setView]    = useState<View>("dashboard");
  const [docData, setDocData] = useState<DocData | null>(null);

  // Real-time data
  const [patients,   setPatients]   = useState<PatientRecord[]>([]);
  const [allAppts,   setAllAppts]   = useState<Appointment[]>([]);
  const [pLoading,   setPLoading]   = useState(true);
  const [aLoading,   setALoading]   = useState(true);
  const [connected,  setConnected]  = useState(true);

  // Notification tracking
  const prevPendingRef = useRef(0);
  const isFirstApptLoad = useRef(true);
  const isFirstPatLoad  = useRef(true);

  // Appointment action modal
  const [apptModal,  setApptModal]  = useState<{
    open: boolean; appt: Appointment | null; action: "confirm"|"reject"|"delete";
  } | null>(null);
  const [apptNote,   setApptNote]   = useState("");
  const [apptActing, setApptActing] = useState(false);

  // Patient CRUD modal
  const [patModal,   setPatModal]   = useState<{
    open: boolean; mode: "add"|"edit"; id?: string;
  } | null>(null);
  const [patForm,    setPatForm]    = useState<Record<string,string>>({});
  const [patSaving,  setPatSaving]  = useState(false);

  // Filters
  const [apptFilter, setApptFilter] = useState<"all"|AppointmentStatus>("all");
  const [apptSearch, setApptSearch] = useState("");
  const [patSearch,  setPatSearch]  = useState("");

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("msv_doc_session");
    if (!raw) { router.push("/doctor/login"); return; }
    setDocData(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(doctorAuth, (user) => {
      if (!user) router.push("/doctor/login");
    });
    return unsub;
  }, [router]);

  // ── Real-time: PATIENTS via subscribeDoctorPatients ───────────────────────
  // This listener fires whenever:
  //   • A patient selects this doctor (upsertPatientRecord from choose-doctor)
  //   • A patient books an appointment (upsertPatientRecord from profil)
  //   • A doctor manually adds / edits / deletes a patient
  useEffect(() => {
    if (!docData?.uid) return;
    setPLoading(true);
    const unsub = subscribeDoctorPatients(
      docData.uid,
      (list) => {
        setPatients(list);
        setPLoading(false);
        setConnected(true);

        if (!isFirstPatLoad.current && list.length > 0) {
          const newest = list[0];
          if (newest.source !== "manual") {
            toast.info(
              `👤 ${newest.patientName} a rejoint votre liste de patients.`,
              { duration: 5000 }
            );
          }
        }
        isFirstPatLoad.current = false;
      }
    );
    return unsub;
  }, [docData?.uid]);

  // ── Real-time: APPOINTMENTS via subscribeDoctorAppointments ──────────────
  // Uses only a single-field where("doctorId") + orderBy("createdAt")
  // so NO composite index is required. Sorting is done client-side.
  useEffect(() => {
    if (!docData?.uid) return;
    setALoading(true);
    const unsub = subscribeDoctorAppointments(
      docData.uid,
      (list) => {
        setAllAppts(list);
        setALoading(false);
        setConnected(true);

        const pending = list.filter(a => a.status === "pending").length;

        if (!isFirstApptLoad.current && pending > prevPendingRef.current) {
          const diff = pending - prevPendingRef.current;
          toast.info(
            `📅 ${diff} nouveau${diff > 1 ? "x" : ""} rendez-vous en attente !`,
            { duration: 6000 }
          );
        }
        prevPendingRef.current = pending;
        isFirstApptLoad.current = false;
      }
    );
    return unsub;
  }, [docData?.uid]);

  // ── Network status ────────────────────────────────────────────────────────
  useEffect(() => {
    const onOffline = () => setConnected(false);
    const onOnline  = () => setConnected(true);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
    };
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await signOut(doctorAuth).catch(() => {});
    sessionStorage.removeItem("msv_doc_session");
    router.push("/doctor/login");
  }

  // ── Appointment actions ───────────────────────────────────────────────────
  async function handleApptAction() {
    if (!apptModal?.appt) return;
    setApptActing(true);
    try {
      if (apptModal.action === "confirm") {
        await confirmAppointment(apptModal.appt.id, apptNote);
        toast.success("Rendez-vous confirmé. Le patient est notifié en temps réel.");
      } else if (apptModal.action === "reject") {
        await rejectAppointment(apptModal.appt.id, apptNote);
        toast.success("Rendez-vous refusé.");
      } else {
        await deleteAppointmentRecord(apptModal.appt.id);
        toast.success("Rendez-vous supprimé.");
      }
      setApptModal(null);
      setApptNote("");
    } catch { toast.error("Erreur. Réessayez."); }
    finally { setApptActing(false); }
  }

  // ── Patient CRUD ──────────────────────────────────────────────────────────
  async function savePatient() {
    if (!docData?.uid || !patForm.name?.trim()) {
      toast.error("Le nom est requis."); return;
    }
    setPatSaving(true);
    try {
      if (patModal?.mode === "add") {
        await addPatientManual(docData.uid, {
          name:         patForm.name.trim(),
          age:          patForm.age ? parseInt(patForm.age) : undefined,
          note:         patForm.note,
          patientEmail: patForm.patientEmail,
        });
        toast.success("Patient ajouté.");
      } else if (patModal?.id) {
        await updatePatientRecord(patModal.id, {
          patientName:  patForm.name.trim(),
          patientEmail: patForm.patientEmail,
          age:          patForm.age ? parseInt(patForm.age) : undefined,
          note:         patForm.note,
        });
        toast.success("Patient mis à jour.");
      }
      setPatModal(null);
    } catch { toast.error("Erreur. Réessayez."); }
    finally { setPatSaving(false); }
  }

  async function doDeletePatient(id: string) {
    if (!confirm("Supprimer ce patient ?")) return;
    try {
      await deletePatientRecord(id);
      toast.success("Patient supprimé.");
    } catch { toast.error("Erreur suppression."); }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  if (!docData) return null;

  const nm       = docData.name ?? "";
  const spec     = docData.specialty ?? (docData.specIdx != null ? SPECIALTIES[docData.specIdx] : "—");
  const initials = ini(nm);
  const today    = new Date().toISOString().split("T")[0];

  const todayStr = (() => {
    const s = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const pendingCount   = allAppts.filter(a => a.status === "pending").length;
  const todayAppts     = allAppts.filter(a => a.date === today);
  const confirmedToday = todayAppts.filter(a => a.status === "confirmed").length;

  const filteredAppts = allAppts.filter(a => {
    const matchStatus = apptFilter === "all" || a.status === apptFilter;
    const matchSearch = !apptSearch ||
      a.patientName.toLowerCase().includes(apptSearch.toLowerCase()) ||
      a.type.toLowerCase().includes(apptSearch.toLowerCase()) ||
      a.date.includes(apptSearch);
    return matchStatus && matchSearch;
  });

  const filteredPatients = patients.filter(p =>
    !patSearch ||
    p.patientName.toLowerCase().includes(patSearch.toLowerCase()) ||
    p.patientEmail.toLowerCase().includes(patSearch.toLowerCase())
  );

  // Count appointments per patient for the patients tab
  const apptCountByUid = allAppts.reduce<Record<string, number>>((acc, a) => {
    acc[a.patientUid] = (acc[a.patientUid] ?? 0) + 1;
    return acc;
  }, {});

  // ── Sidebar nav ───────────────────────────────────────────────────────────
  const NAV = [
    { id:"dashboard"    as View, label:"Dashboard", badge:0,
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="17" height="17"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
    { id:"appointments" as View, label:"Rendez-vous", badge:pendingCount,
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="17" height="17"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg> },
    { id:"patients"     as View, label:"Patients", badge:0,
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="17" height="17"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id:"settings"     as View, label:"Profil", badge:0,
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="17" height="17"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  ];

  return (
    <div className="doc-dashboard" style={{ fontFamily:"Nunito, sans-serif" }}>

      {/* ── Offline banner ────────────────────────────────────────────────── */}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-[9999] bg-[#e74c3c] text-white text-center text-sm font-bold py-2">
          📡 Connexion perdue — les données ne sont plus synchronisées en temps réel
        </div>
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="doc-sidebar">
        <div className="px-5 pb-8">
          <div className="doc-brand-name">MS<em>V</em></div>
          <div className="text-[0.7rem] text-[#9ab0bb] mt-0.5">Médecine à Distance</div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#27ae60]" : "bg-[#e74c3c]"}`}
              style={connected ? { animation:"pulse 2s infinite" } : {}} />
            <span className="text-[0.65rem] text-[#9ab0bb] font-semibold">
              {connected ? "En direct" : "Hors ligne"}
            </span>
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

        <nav className="flex-1 flex flex-col gap-0.5 px-2.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`doc-nav-item relative ${view===n.id?"active":""}`}>
              {n.icon}
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#e74c3c] text-white text-[0.65rem] font-bold flex items-center justify-center">
                  {n.badge}
                </span>
              )}
            </button>
          ))}
          <div className="flex-1 min-h-4" />
        </nav>

        <div className="px-2.5 pb-2.5">
          <button onClick={handleLogout} className="doc-nav-item" style={{color:"#e74c3c"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="17" height="17">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative" style={{minWidth:0}}>

        {/* Topbar */}
        <div className="doc-topbar">
          <div className="text-[1.25rem] font-extrabold text-[#1e2a38]">
            {{dashboard:"Dashboard",appointments:"Rendez-vous",patients:"Dossiers Patients",settings:"Mon Profil"}[view]}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[0.83rem] text-[#1a4db5] font-bold">{todayStr}</div>
            {pendingCount > 0 && view !== "appointments" && (
              <button onClick={() => setView("appointments")}
                className="flex items-center gap-1.5 bg-[#fff8e1] border border-[#f39c12]/30 text-[#f39c12] font-bold text-xs px-3 py-1.5 rounded-full hover:bg-[#fdecd0] transition-colors">
                ⏳ {pendingCount} en attente
              </button>
            )}
          </div>
        </div>

        {/* ══ DASHBOARD ════════════════════════════════════════════════════ */}
        {view === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-5"
            style={{display:"grid",gridTemplateColumns:"1fr 260px",gridTemplateRows:"auto auto auto 1fr",gap:18,alignContent:"start"}}>

            {/* Welcome */}
            <div className="bg-white rounded-[18px] p-6 flex items-center justify-between shadow-sm" style={{gridColumn:1,gridRow:1}}>
              <div>
                <h2 className="text-[1.5rem] font-extrabold text-[#1a4db5] mb-1.5">
                  Bienvenue, Dr. {nm.split(" ")[0]} 👋
                </h2>
                <p className="text-[0.86rem] text-[#7f8fa6] leading-[1.6]">
                  <strong className="text-[#1e2a38]">{confirmedToday}</strong> RDV confirmé{confirmedToday>1?"s":""} aujourd&apos;hui
                  {pendingCount > 0 && (
                    <> · <span className="text-[#f39c12] font-bold">{pendingCount} en attente</span></>
                  )}
                </p>
              </div>
              <div className="text-[4.5rem] opacity-15 select-none flex-shrink-0">🩺</div>
            </div>

            {/* Stat cards */}
            <div style={{gridColumn:1,gridRow:2,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {[
                {icon:"👥", val:patients.length,                                      lbl:"Patients",        color:"#1a4db5"},
                {icon:"📅", val:todayAppts.length,                                    lbl:"RDV aujourd'hui", color:"#27ae60"},
                {icon:"⏳", val:pendingCount,                                          lbl:"En attente",      color:"#f39c12"},
                {icon:"✅", val:allAppts.filter(a=>a.status==="confirmed").length,    lbl:"Confirmés",       color:"#1abc9c"},
              ].map(s => (
                <div key={s.lbl} className="bg-white rounded-[14px] p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => s.lbl==="Patients" ? setView("patients") : setView("appointments")}>
                  <div className="text-2xl">{s.icon}</div>
                  <div>
                    <div className="text-[1.5rem] font-extrabold" style={{color:s.color}}>{s.val}</div>
                    <div className="text-[0.72rem] text-[#9ab0bb] font-bold uppercase tracking-wide">{s.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's appointments */}
            <div className="bg-white rounded-[18px] p-5 shadow-sm" style={{gridColumn:1,gridRow:3}}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[0.9rem] font-extrabold text-[#1e2a38]">Rendez-vous du jour</div>
                <button onClick={() => setView("appointments")}
                  className="text-xs text-[#1a4db5] font-bold hover:underline">Voir tout →</button>
              </div>

              {aLoading ? (
                <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 bg-[#f5f7fa] rounded-xl animate-pulse"/>)}</div>
              ) : todayAppts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2 opacity-30">📅</div>
                  <p className="text-sm text-[#9ab0bb]">Aucun rendez-vous aujourd&apos;hui</p>
                </div>
              ) : todayAppts.slice(0,5).map(a => {
                const cfg = STATUS_CFG[a.status];
                return (
                  <div key={a.id} className={`flex items-center gap-2.5 py-2.5 border-b border-[#f0f5fc] last:border-b-0 border-l-4 pl-2.5 -ml-2.5 ${cfg.border}`}>
                    <div className="w-[34px] h-[34px] rounded-full bg-[#eef2f9] flex items-center justify-center text-[0.78rem] font-extrabold text-[#1a4db5] flex-shrink-0">
                      {ini(a.patientName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.86rem] font-bold text-[#1e2a38] truncate">{a.patientName}</div>
                      <div className="text-[0.69rem] font-bold text-[#9ab0bb] uppercase">{a.type} · {a.time}</div>
                    </div>
                    <span className={`${cfg.bg} ${cfg.text} text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap`}>
                      {cfg.label}
                    </span>
                    {a.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => { setApptModal({open:true,appt:a,action:"confirm"}); setApptNote(""); }}
                          className="w-7 h-7 rounded-full bg-[#e8f8f5] text-[#27ae60] font-bold flex items-center justify-center hover:bg-[#27ae60] hover:text-white transition-colors">✓</button>
                        <button onClick={() => { setApptModal({open:true,appt:a,action:"reject"}); setApptNote(""); }}
                          className="w-7 h-7 rounded-full bg-[#fdecea] text-[#e74c3c] font-bold flex items-center justify-center hover:bg-[#e74c3c] hover:text-white transition-colors">✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4" style={{gridColumn:2,gridRow:"1/5"}}>
              {/* Profile card */}
              <div className="bg-white rounded-[18px] p-4 shadow-sm text-center">
                <div className="text-[0.68rem] font-extrabold text-[#9ab0bb] uppercase tracking-[.1em] text-left mb-3">Profil</div>
                <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#bfcfef] to-[#1a4db5] mx-auto mb-2.5 flex items-center justify-center text-[1.65rem] font-extrabold text-white">
                  {initials}
                </div>
                <div className="text-[0.97rem] font-extrabold text-[#1e2a38]">Dr. {nm||"—"}</div>
                <div className="text-[0.74rem] text-[#9ab0bb] font-semibold mt-0.5">{spec}</div>
                <div className="flex justify-around mt-4 pt-3.5 border-t border-[#f0f5fc]">
                  {[["Patients",String(patients.length)],["Total RDV",String(allAppts.length)]].map(([l,v])=>(
                    <div key={l}>
                      <div className="text-[0.65rem] text-[#9ab0bb] font-bold mb-0.5">{l}</div>
                      <div className="text-[1.25rem] font-extrabold text-[#1e2a38]">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent patients */}
              {patients.length > 0 && (
                <div className="bg-white rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[0.8rem] font-extrabold text-[#1e2a38]">Patients récents</div>
                    <button onClick={() => setView("patients")} className="text-xs text-[#1a4db5] font-bold hover:underline">Tous →</button>
                  </div>
                  <div className="space-y-2">
                    {patients.slice(0,4).map(p => (
                      <div key={p.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#f0f5fc] last:border-b-0">
                        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#bfcfef] to-[#1a4db5] flex items-center justify-center text-white text-[0.72rem] font-extrabold flex-shrink-0">
                          {ini(p.patientName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.82rem] font-bold text-[#1e2a38] truncate">{p.patientName}</div>
                          <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${SOURCE_BADGE[p.source]?.color ?? "bg-[#f5f5f5] text-[#7f8c8d]"}`}>
                            {SOURCE_BADGE[p.source]?.label ?? p.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending alert */}
              {pendingCount > 0 && (
                <div className="bg-[#fff8e1] border border-[#f39c12]/30 rounded-[18px] p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⏳</span>
                    <div className="font-extrabold text-[0.88rem] text-[#1e2a38]">{pendingCount} en attente</div>
                  </div>
                  <p className="text-[0.75rem] text-[#7f8fa6] mb-3">
                    Des patients attendent votre réponse.
                  </p>
                  <button onClick={() => setView("appointments")}
                    className="w-full py-2 bg-[#f39c12] text-white font-bold text-[0.8rem] rounded-xl hover:opacity-90 transition-opacity">
                    Répondre aux demandes →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ APPOINTMENTS VIEW ════════════════════════════════════════════ */}
        {view === "appointments" && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <input value={apptSearch} onChange={e => setApptSearch(e.target.value)}
                placeholder="Rechercher patient, type, date…"
                className="px-4 py-2.5 border border-[#e4ecf7] rounded-xl text-sm outline-none focus:border-[#1a4db5] w-56"
                style={{fontFamily:"Nunito,sans-serif"}} />
              <div className="flex gap-2 flex-wrap">
                {(["all","pending","confirmed","rejected","cancelled"] as const).map(f => (
                  <button key={f} onClick={() => setApptFilter(f)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      apptFilter===f
                        ? "bg-[#1a4db5] text-white border-[#1a4db5]"
                        : "bg-white text-[#7f8fa6] border-[#e4ecf7] hover:border-[#1a4db5]"
                    }`}>
                    {f==="all" ? "Tous" : STATUS_CFG[f as AppointmentStatus]?.label ?? f}
                    {f==="pending" && pendingCount>0 && (
                      <span className="ml-1.5 bg-[#e74c3c] text-white rounded-full px-1.5 text-[0.6rem]">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {aLoading ? (
              <div className="flex flex-col gap-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-white rounded-[14px] animate-pulse shadow-sm"/>)}</div>
            ) : filteredAppts.length===0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-3 opacity-30">📅</div>
                <h3 className="text-[1rem] font-extrabold text-[#1e2a38] mb-1">Aucun rendez-vous</h3>
                <p className="text-[0.84rem] text-[#9ab0bb]">
                  {apptFilter!=="all" ? "Aucun résultat pour ce filtre." : "Les rendez-vous des patients apparaîtront ici en temps réel."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredAppts.map(a => {
                  const cfg = STATUS_CFG[a.status];
                  const isPast = a.date < today;
                  return (
                    <div key={a.id}
                      className={`bg-white rounded-[14px] p-4 shadow-sm flex items-start gap-4 border-l-4 ${cfg.border}`}>
                      {/* Date block */}
                      <div className="flex-shrink-0 w-[54px] h-[54px] rounded-[12px] flex flex-col items-center justify-center"
                        style={{background: a.status==="confirmed" ? "#e8f8f5" : "#eef2f9"}}>
                        <div className="text-[0.65rem] font-bold text-[#9ab0bb] uppercase">
                          {new Date(a.date+"T00:00:00").toLocaleDateString("fr-FR",{month:"short"})}
                        </div>
                        <div className="text-[1.25rem] font-extrabold"
                          style={{color: a.status==="confirmed" ? "#1abc9c" : "#1a4db5"}}>
                          {new Date(a.date+"T00:00:00").getDate()}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-base">{TYPE_ICON[a.type]??"📅"}</span>
                          <div className="font-extrabold text-[#1e2a38] text-[0.93rem] truncate">{a.patientName}</div>
                          {isPast && <span className="text-[0.65rem] text-[#9ab0bb] bg-[#f5f5f5] px-2 py-0.5 rounded-full">Passé</span>}
                        </div>
                        <div className="text-[0.78rem] text-[#7f8fa6]">
                          {a.type} · {fmtDateTime(a.date, a.time)}
                        </div>
                        {a.patientEmail && (
                          <div className="text-[0.75rem] text-[#9ab0bb]">{a.patientEmail}</div>
                        )}
                        {a.note && (
                          <div className="text-[0.78rem] text-[#4a5568] mt-1 italic bg-[#f8fafb] px-2.5 py-1.5 rounded-lg">
                            Patient : {a.note}
                          </div>
                        )}
                        {a.doctorNote && (
                          <div className="text-[0.78rem] font-semibold mt-1 px-2.5 py-1.5 rounded-lg"
                            style={{background: a.status==="confirmed"?"#e8f8f5":"#fdecea", color: a.status==="confirmed"?"#1abc9c":"#e74c3c"}}>
                            Votre réponse : {a.doctorNote}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`${cfg.bg} ${cfg.text} text-[0.72rem] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap`}>
                          {cfg.label}
                        </span>
                        <div className="flex gap-1.5">
                          {a.status === "pending" && (
                            <>
                              <button onClick={() => { setApptModal({open:true,appt:a,action:"confirm"}); setApptNote(""); }}
                                className="px-3 py-1.5 bg-[#e8f8f5] text-[#27ae60] rounded-lg text-xs font-extrabold hover:bg-[#27ae60] hover:text-white transition-colors">
                                Confirmer
                              </button>
                              <button onClick={() => { setApptModal({open:true,appt:a,action:"reject"}); setApptNote(""); }}
                                className="px-3 py-1.5 bg-[#fdecea] text-[#e74c3c] rounded-lg text-xs font-extrabold hover:bg-[#e74c3c] hover:text-white transition-colors">
                                Refuser
                              </button>
                            </>
                          )}
                          <button onClick={() => { setApptModal({open:true,appt:a,action:"delete"}); setApptNote(""); }}
                            className="px-2.5 py-1.5 bg-[#f5f5f5] text-[#9ab0bb] rounded-lg text-xs hover:bg-[#fdecea] hover:text-[#e74c3c] transition-colors">
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PATIENTS VIEW ════════════════════════════════════════════════ */}
        {view === "patients" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <input value={patSearch} onChange={e => setPatSearch(e.target.value)}
                placeholder="Rechercher un patient…"
                className="px-4 py-2.5 border border-[#e4ecf7] rounded-xl text-sm outline-none focus:border-[#1a4db5] w-56"
                style={{fontFamily:"Nunito,sans-serif"}} />
              <button onClick={() => { setPatModal({open:true,mode:"add"}); setPatForm({}); }}
                className="flex items-center gap-2 bg-[#1a4db5] text-white border-none rounded-[12px] px-4 py-2.5 text-[0.88rem] font-bold cursor-pointer hover:bg-[#13399a] shadow-md transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="15" height="15">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ajouter manuellement
              </button>
              {/* Legend */}
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {Object.entries(SOURCE_BADGE).map(([key,cfg]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-[#7f8fa6]">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                    {key==="selection" && "Sélection docteur"}
                    {key==="appointment" && "Via RDV"}
                    {key==="manual" && "Ajout manuel"}
                  </div>
                ))}
              </div>
            </div>

            {pLoading ? (
              <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
                {[1,2,3,4].map(i=><div key={i} className="h-40 bg-white rounded-[14px] animate-pulse shadow-sm"/>)}
              </div>
            ) : filteredPatients.length===0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-3 opacity-30">👥</div>
                <h3 className="text-[1rem] font-extrabold text-[#1e2a38] mb-1">Aucun patient</h3>
                <p className="text-[0.84rem] text-[#9ab0bb] max-w-xs">
                  Les patients qui vous sélectionnent ou prennent rendez-vous apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
                {filteredPatients.map(p => {
                  const apptCount = apptCountByUid[p.patientSharedUid] ?? 0;
                  const srcCfg = SOURCE_BADGE[p.source] ?? SOURCE_BADGE.manual;
                  return (
                    <div key={p.id} className="bg-white rounded-[16px] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#bfcfef] to-[#1a4db5] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                          {ini(p.patientName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-[0.9rem] text-[#1e2a38] truncate">{p.patientName}</div>
                          <div className="text-[0.72rem] text-[#9ab0bb] truncate">{p.patientEmail || "—"}</div>
                        </div>
                        <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${srcCfg.color}`}>
                          {srcCfg.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                        <div className="bg-[#f8fafb] rounded-[8px] py-1.5">
                          <div className="text-[1rem] font-extrabold text-[#1a4db5]">{apptCount}</div>
                          <div className="text-[0.62rem] text-[#9ab0bb] font-semibold">RDV</div>
                        </div>
                        <div className="bg-[#f8fafb] rounded-[8px] py-1.5">
                          <div className="text-[0.75rem] font-bold text-[#1e2a38]">
                            {p.lastApptDate ? new Date(p.lastApptDate+"T00:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"}) : "—"}
                          </div>
                          <div className="text-[0.62rem] text-[#9ab0bb] font-semibold">Dernier RDV</div>
                        </div>
                      </div>

                      {p.note && (
                        <div className="text-[0.72rem] text-[#4a5568] italic bg-[#f8fafb] px-2.5 py-1.5 rounded-lg mb-3 line-clamp-2">
                          {p.note}
                        </div>
                      )}

                      <div className="flex gap-1.5">
                        <button onClick={() => {
                          setPatModal({open:true,mode:"edit",id:p.id});
                          setPatForm({name:p.patientName,age:String(p.age??""),note:p.note??"",patientEmail:p.patientEmail??""});
                        }}
                          className="flex-1 py-1.5 bg-[#eef2f9] text-[#1a4db5] rounded-lg text-xs font-bold hover:bg-[#dde6f5] transition-colors">
                          Modifier
                        </button>
                        <button onClick={() => doDeletePatient(p.id)}
                          className="flex-1 py-1.5 bg-[#fdecea] text-[#e74c3c] rounded-lg text-xs font-bold hover:bg-[#f8d7da] transition-colors">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PROFILE VIEW ════════════════════════════════════════════════ */}
        {view === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-[18px] p-7 shadow-sm max-w-[520px]">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#f0f5fc]">
                <div className="w-[74px] h-[74px] rounded-full bg-gradient-to-br from-[#bfcfef] to-[#1a4db5] flex items-center justify-center text-[1.8rem] font-extrabold text-white flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <div className="text-[1.2rem] font-extrabold text-[#1e2a38]">Dr. {nm||"—"}</div>
                  <div className="text-[0.84rem] text-[#1a4db5] font-bold">{spec}</div>
                </div>
              </div>
              {[
                ["Nom complet",       nm||"—"],
                ["E-mail",            docData.email   ??"—"],
                ["Téléphone",         docData.phone   ??"—"],
                ["Date de naissance", dobFmt(docData.dob)],
                ["Sexe",              docData.sex==="M"?"Homme":docData.sex==="F"?"Femme":"—"],
                ["Identifiant",       docData.idNum   ??"—"],
                ["N° ONMC",           docData.onmc    ??"—"],
                ["Spécialité",        spec],
              ].map(([lbl,val]) => (
                <div key={lbl} className="flex items-start gap-3 py-2.5 border-b border-[#f0f5fc] last:border-b-0">
                  <div className="flex-1">
                    <div className="text-[0.68rem] text-[#9ab0bb] font-bold uppercase tracking-[.06em] mb-0.5">{lbl}</div>
                    <div className="text-[0.92rem] font-bold text-[#1e2a38]">{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ══ APPOINTMENT ACTION MODAL ═══════════════════════════════════════ */}
      {apptModal?.open && apptModal.appt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target===e.currentTarget) setApptModal(null); }}>
          <div className="bg-white rounded-[22px] p-7 w-full max-w-[420px] shadow-2xl" style={{animation:"fadeUp .25s ease both"}}>
            <h3 className="text-[1.1rem] font-extrabold text-[#1e2a38] mb-1">
              {apptModal.action==="confirm" ? "✅ Confirmer le rendez-vous" :
               apptModal.action==="reject"  ? "❌ Refuser le rendez-vous"  :
               "🗑 Supprimer le rendez-vous"}
            </h3>
            <div className="bg-[#f8fafb] rounded-[12px] p-4 my-4 text-sm space-y-1">
              <div><span className="font-bold text-[#1e2a38]">Patient : </span>{apptModal.appt.patientName}</div>
              <div><span className="font-bold text-[#1e2a38]">Date : </span>{fmtDateTime(apptModal.appt.date, apptModal.appt.time)}</div>
              <div><span className="font-bold text-[#1e2a38]">Type : </span>{apptModal.appt.type}</div>
              {apptModal.appt.note && <div className="text-[#4a5568] italic">Note : {apptModal.appt.note}</div>}
            </div>
            {apptModal.action !== "delete" && (
              <div className="mb-5">
                <label className="block text-[0.8rem] font-bold text-[#7f8fa6] uppercase tracking-wide mb-1.5">
                  {apptModal.action==="confirm" ? "Message au patient (optionnel)" : "Raison du refus (optionnel)"}
                </label>
                <textarea value={apptNote} onChange={e => setApptNote(e.target.value)} rows={3}
                  placeholder={apptModal.action==="confirm"
                    ? "Ex : Confirmé. Présentez-vous 10 min à l'avance."
                    : "Ex : Créneau indisponible. Veuillez choisir une autre date."}
                  className="w-full p-3 border-[1.5px] border-[#e4ecf7] rounded-[10px] text-[#1e2a38] text-sm outline-none focus:border-[#1a4db5] resize-none"
                  style={{fontFamily:"Nunito,sans-serif"}} />
              </div>
            )}
            {apptModal.action === "delete" && (
              <p className="text-sm text-[#7f8fa6] mb-5">Cette action est irréversible.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setApptModal(null)}
                className="flex-1 py-3 border-[1.5px] border-[#e4ecf7] rounded-[12px] text-[#7f8fa6] font-semibold text-sm hover:bg-[#f8fafb]"
                style={{fontFamily:"Nunito,sans-serif"}}>
                Annuler
              </button>
              <button onClick={handleApptAction} disabled={apptActing}
                className={`flex-[2] py-3 border-none rounded-[12px] text-white font-extrabold text-sm transition-colors disabled:opacity-60 ${
                  apptModal.action==="confirm" ? "bg-[#27ae60] hover:bg-[#229954]" :
                  apptModal.action==="reject"  ? "bg-[#e74c3c] hover:bg-[#c0392b]" :
                  "bg-[#7f8c8d] hover:bg-[#636e72]"
                }`} style={{fontFamily:"Nunito,sans-serif"}}>
                {apptActing ? "Traitement…" :
                 apptModal.action==="confirm" ? "Confirmer ✓" :
                 apptModal.action==="reject"  ? "Refuser ✕"  : "Supprimer 🗑"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PATIENT CRUD MODAL ══════════════════════════════════════════════ */}
      {patModal?.open && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target===e.currentTarget) setPatModal(null); }}>
          <div className="bg-white rounded-[20px] p-7 w-[90%] max-w-[400px] shadow-2xl" style={{animation:"fadeUp .25s ease both"}}>
            <h3 className="text-[1.1rem] font-extrabold text-[#1e2a38] mb-5">
              {patModal.mode==="add" ? "Nouveau patient" : "Modifier le patient"}
            </h3>
            <div className="space-y-3">
              {[
                {id:"name",         label:"Nom complet *",   type:"text",   ph:"Nom du patient"},
                {id:"age",          label:"Âge",             type:"number", ph:"Âge"},
                {id:"patientEmail", label:"E-mail patient",  type:"email",  ph:"email@example.com"},
                {id:"note",         label:"Notes médicales", type:"text",   ph:"Optionnel"},
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-[0.78rem] font-bold text-[#9ab0bb] uppercase tracking-wide mb-1.5">{f.label}</label>
                  <input type={f.type} value={patForm[f.id]??""} onChange={e => setPatForm({...patForm,[f.id]:e.target.value})}
                    placeholder={f.ph}
                    className="w-full px-3.5 py-3 border-[1.5px] border-[#e4ecf7] rounded-[10px] text-[#1e2a38] text-[0.93rem] outline-none focus:border-[#1a4db5]"
                    style={{fontFamily:"Nunito,sans-serif"}} />
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setPatModal(null)}
                className="flex-1 py-3 border-[1.5px] border-[#e4ecf7] rounded-[12px] bg-white text-[#7f8fa6] font-bold text-[0.93rem] hover:bg-[#f8f9fc]"
                style={{fontFamily:"Nunito,sans-serif"}}>
                Annuler
              </button>
              <button onClick={savePatient} disabled={patSaving}
                className="flex-[2] py-3 border-none rounded-[12px] bg-[#1a4db5] text-white font-extrabold text-[0.93rem] hover:bg-[#13399a] transition-colors disabled:opacity-60"
                style={{fontFamily:"Nunito,sans-serif"}}>
                {patSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
