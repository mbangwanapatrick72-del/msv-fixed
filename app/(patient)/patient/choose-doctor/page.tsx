"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDoctors, upsertPatientRecord, type DoctorProfile } from "@/lib/appointments";
import { toast } from "sonner";

const GRAD_PALETTE = [
  "linear-gradient(135deg,#1abc9c,#0d6e57)",
  "linear-gradient(135deg,#e74c3c,#922b21)",
  "linear-gradient(135deg,#3498db,#1a5276)",
  "linear-gradient(135deg,#9b59b6,#5b2c6f)",
  "linear-gradient(135deg,#e91e8c,#8e1060)",
  "linear-gradient(135deg,#f39c12,#9a6010)",
  "linear-gradient(135deg,#00bcd4,#006064)",
  "linear-gradient(135deg,#ff7043,#bf360c)",
];

function initials(name: string) {
  const parts = name.replace(/^Dr\.?\s*/i, "").split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "DR";
}

export default function ChooseDoctor() {
  const router  = useRouter();
  const [doctors,  setDoctors]  = useState<DoctorProfile[]>([]);
  const [selected, setSelected] = useState<DoctorProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [session,  setSession]  = useState<{
    uid: string; email: string; name: string;
  } | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("msv_pat_session");
    if (!raw) { router.push("/patient/login"); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  // ── Fetch real doctors from Firestore ───────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchDoctors()
      .then((docs) => {
        setDoctors(docs);
        // Restore previously chosen doctor
        const saved = localStorage.getItem(
          `msv_pat_doctor_${session.email.toLowerCase()}`
        );
        if (saved) {
          try {
            const savedDoc = JSON.parse(saved) as DoctorProfile;
            const found = docs.find((d) => d.id === savedDoc.id);
            if (found) setSelected(found);
          } catch { /* ignore */ }
        }
      })
      .catch(() =>
        toast.error(
          "Impossible de charger la liste des médecins. Vérifiez votre connexion."
        )
      )
      .finally(() => setLoading(false));
  }, [session]);

  // ── Confirm selection ───────────────────────────────────────────────────
  async function confirm() {
    if (!selected || !session) return;
    setSaving(true);
    try {
      // 1. Persist locally for fast UX
      localStorage.setItem(
        `msv_pat_doctor_${session.email.toLowerCase()}`,
        JSON.stringify(selected)
      );

      // 2. Write to Firestore so doctor sees this patient immediately
      //    upsertPatientRecord signs in anonymously (ensureSharedAuth) and
      //    creates/updates a record in sharedDb.patients
      await upsertPatientRecord({
        doctorId:     selected.id,
        doctorName:   selected.name,
        patientName:  session.name,
        patientEmail: session.email,
        source:       "selection",
      });

      toast.success(`${selected.name} sélectionné(e) comme votre médecin.`);
      router.push("/patient/profil");
    } catch (err) {
      console.error("Failed to register patient with doctor:", err);
      // Degrade gracefully — we still navigate even if Firestore write failed
      toast.warning("Sélection enregistrée localement. Synchronisation en cours…");
      router.push("/patient/profil");
    } finally {
      setSaving(false);
    }
  }

  // ── Skeleton loader ─────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm border-2 border-transparent">
      <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
      <div className="w-24 h-3 bg-gray-200 animate-pulse rounded" />
      <div className="w-16 h-2.5 bg-gray-100 animate-pulse rounded" />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#f8fafb] flex flex-col"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* Header */}
      <div className="pat-page-header">
        <div className="pat-ph-inner max-w-[1200px] mx-auto text-center">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-[#a8e6da] bg-white/10 px-3 py-1 rounded-full mb-3">
            🩺 Dernière étape
          </div>
          <h1 className="pat-ph-h1">
            Choisissez votre{" "}
            <span className="text-[#1abc9c]">médecin</span>
          </h1>
          <p className="pat-ph-p mx-auto">
            Sélectionnez un professionnel enregistré sur MSV. Votre dossier
            sera immédiatement visible sur son tableau de bord.
          </p>
        </div>
      </div>

      {/* Doctor grid */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {!loading && doctors.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-5xl mb-4 opacity-40">🩺</div>
            <h3
              className="text-lg font-bold text-[#0d1f3c] mb-2"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Aucun médecin disponible pour l&apos;instant
            </h3>
            <p className="text-sm text-[#8a97a8] max-w-xs">
              Les médecins apparaîtront ici après leur inscription sur MSV.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
            : doctors.map((doctor, idx) => {
                const isSelected = selected?.id === doctor.id;
                const grad = GRAD_PALETTE[idx % GRAD_PALETTE.length];
                return (
                  <button
                    key={doctor.id}
                    onClick={() =>
                      setSelected((prev) =>
                        prev?.id === doctor.id ? null : doctor
                      )
                    }
                    className={`relative bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm border-2 cursor-pointer transition-all duration-200 text-left w-full ${
                      isSelected
                        ? "border-[#1abc9c] shadow-md -translate-y-0.5"
                        : "border-transparent hover:border-[#a8e6da] hover:-translate-y-0.5"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#1abc9c] flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                    )}

                    {/* Avatar */}
                    {doctor.photoURL ? (
                      <img
                        src={doctor.photoURL}
                        alt={doctor.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-xl flex-shrink-0"
                        style={{
                          background: grad,
                          fontFamily: "Sora, sans-serif",
                        }}
                      >
                        {initials(doctor.name)}
                      </div>
                    )}

                    <div className="text-center">
                      <div
                        className="text-[0.88rem] font-bold text-[#0d1f3c] leading-tight"
                        style={{ fontFamily: "Sora, sans-serif" }}
                      >
                        {doctor.name}
                      </div>
                      <div className="text-[0.75rem] text-[#8a97a8] mt-1">
                        {doctor.specialty}
                      </div>
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-white border-t border-[#e2e8f0] px-6 py-4 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p
            className={`text-sm font-semibold transition-colors ${
              selected ? "text-[#1abc9c]" : "text-[#8a97a8]"
            }`}
          >
            {selected
              ? `${selected.name} – sélectionné(e)`
              : "Sélectionnez un médecin pour continuer"}
          </p>
          <button
            onClick={confirm}
            disabled={!selected || saving}
            className="px-8 py-3 bg-[#1abc9c] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#159f84] transition-colors min-w-[160px]"
          >
            {saving ? "Enregistrement…" : "Confirmer →"}
          </button>
        </div>
      </div>
    </div>
  );
}
