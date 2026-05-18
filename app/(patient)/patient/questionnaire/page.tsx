"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { patientDb } from "@/lib/firebase-patient";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","inconnu"];
const HISTORY_OPTIONS = ["Diabète","Hypertension","Asthme","Problèmes cardiaques","Cancer","Autre","Aucun"];

function calcAge(dob: string): string {
  if (!dob) return "";
  const d = new Date(dob + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age + " ans" : "";
}

function calcBMI(weight: string, height: string) {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h || h <= 0) return { val: "—", label: "", cls: "" };
  const bmi = (w / (h * h)).toFixed(1);
  const n = parseFloat(bmi);
  if (n < 18.5) return { val: bmi, label: "Insuffisance pondérale", cls: "text-yellow-600" };
  if (n < 25)   return { val: bmi, label: "Poids normal",           cls: "text-green-600" };
  if (n < 30)   return { val: bmi, label: "Surpoids",               cls: "text-orange-500" };
  return           { val: bmi, label: "Obésité",                 cls: "text-red-500" };
}

export default function PatientQuestionnaire() {
  const router = useRouter();
  const [session, setSession] = useState<{uid:string;email:string;name:string;dob?:string}|null>(null);

  const [form, setForm] = useState({
    fullname: "", nickname: "", email: "", dob: "", address: "",
    weight: "", height: "",
    allergies: "", bloodgroup: "",
    history: [] as string[], historyOther: "",
    emergencyName: "", emergencyPhone: "",
    q1: "", q2: "", q3: "", q4: "", q5: "",
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("msv_pat_session");
    if (!raw) { router.push("/patient/login"); return; }
    const u = JSON.parse(raw);
    setSession(u);
    setForm((f) => ({
      ...f,
      fullname: u.name ?? "",
      email: u.email ?? "",
      dob: u.dob ?? "",
    }));
  }, [router]);

  const REQUIRED_KEYS: (keyof typeof form)[] = useMemo(() => [
    "fullname","email","dob","address","weight","height",
    "allergies","bloodgroup","emergencyName","emergencyPhone",
    "q1","q2","q3","q4","q5",
  ], []);

  const age = useMemo(() => calcAge(form.dob), [form.dob]);
  const bmi = useMemo(() => calcBMI(form.weight, form.height), [form.weight, form.height]);

  const filled = useMemo(() => {
    return REQUIRED_KEYS.filter((k) => {
      const v = form[k];
      if (Array.isArray(v)) return v.length > 0;
      return String(v).trim() !== "";
    }).length;
  }, [form, REQUIRED_KEYS]);

  const pct = useMemo(() => Math.round((filled / REQUIRED_KEYS.length) * 100), [filled, REQUIRED_KEYS.length]);

  const toggleHistory = useCallback((val: string) => {
    setForm((f) => {
      if (val === "Aucun") return { ...f, history: f.history.includes("Aucun") ? [] : ["Aucun"] };
      const without = f.history.filter((h) => h !== "Aucun");
      return {
        ...f,
        history: without.includes(val) ? without.filter((h) => h !== val) : [...without, val],
      };
    });
  }, []);

  const handleFieldChange = useCallback((field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSubmit() {
    if (filled < REQUIRED_KEYS.length) {
      toast.error("Veuillez compléter tous les champs obligatoires.");
      return;
    }
    if (!session) return;
    const payload = {
      uid: session.uid,
      email: session.email,
      fullName: form.fullname,
      age,
      address: form.address,
      bmi: bmi.val,
      allergies: form.allergies,
      bloodGroup: form.bloodgroup,
      medicalHistory: form.history.join(", "),
      medicalHistoryDetails: form.historyOther,
      emergencyContactName: form.emergencyName,
      emergencyContactPhone: form.emergencyPhone,
      currentMedication: form.q4,
      healthStatus: form.q1,
      currentPain: form.q2,
      symptoms: form.q3,
      remarks: form.q5,
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(patientDb, "patients", session.uid), payload, { merge: true });
      localStorage.setItem(`msv_pat_qdata_${session.email.toLowerCase()}`, JSON.stringify({ ...form, age, bmiVal: bmi.val }));
      toast.success("Questionnaire enregistré !");
      router.push("/patient/choose-doctor");
    } catch (e) {
      toast.error("Erreur sauvegarde. Veuillez réessayer.");
    }
  }

  const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div className="form-field">
      <label>{label}{req && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafb]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Header */}
      <div className="pat-page-header">
        <div className="pat-ph-inner">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-[#a8e6da] bg-white/10 px-3 py-1 rounded-full mb-3">
            Première connexion
          </div>
          <h1 className="pat-ph-h1">Bienvenue, {session?.name?.split(" ")[0] ?? "—"} 👋</h1>
          <p className="pat-ph-p">Veuillez compléter votre profil et le questionnaire de santé avant d&apos;accéder à votre espace.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-0 bg-white z-50 border-b border-[#e2e8f0] px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between text-xs text-[#8a97a8] mb-1.5">
            <span>Progression</span>
            <span>{filled} / {REQUIRED_KEYS.length} champs complétés</span>
          </div>
          <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div className="h-full bg-[#1abc9c] rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Section 1 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">👤 Informations personnelles</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom complet" req>
                <input value={form.fullname} onChange={e=>handleFieldChange("fullname",e.target.value)} placeholder="Prénom Nom"/>
              </Field>
              <Field label="Surnom / Prénom usuel">
                <input value={form.nickname} onChange={e=>handleFieldChange("nickname",e.target.value)} placeholder="Optionnel"/>
              </Field>
            </div>
            <Field label="Adresse e-mail" req>
              <input value={form.email} readOnly className="bg-[#f8fafb] cursor-not-allowed"/>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date de naissance" req>
                <input type="date" value={form.dob} onChange={e=>handleFieldChange("dob",e.target.value)} placeholder="Sélectionnez votre date de naissance"/>
              </Field>
              <Field label="Âge">
                <input value={age} readOnly className="bg-[#f8fafb] cursor-not-allowed"/>
              </Field>
            </div>
            <Field label="Adresse" req>
              <input value={form.address} onChange={e=>handleFieldChange("address",e.target.value)} placeholder="Numéro, rue, ville, pays"/>
            </Field>
          </div>
        </div>

        {/* Section 2 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">⚖️ Mesures physiques</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Poids (kg)" req>
                <input type="number" min="1" max="500" value={form.weight} onChange={e=>handleFieldChange("weight",e.target.value)} placeholder="Ex : 70"/>
              </Field>
              <Field label="Taille (cm)" req>
                <input type="number" min="1" max="300" value={form.height} onChange={e=>handleFieldChange("height",e.target.value)} placeholder="Ex : 170"/>
              </Field>
            </div>
            {bmi.val !== "—" && (
              <div className="flex items-center gap-3 p-3 bg-[#f8fafb] rounded-lg">
                <span className="text-sm text-[#4a5568]">IMC :</span>
                <span className="font-bold text-[#0d1f3c]">{bmi.val}</span>
                <span className={`text-xs font-semibold ${bmi.cls}`}>{bmi.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">🩺 Informations médicales</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <Field label="Allergies connues" req>
              <input value={form.allergies} onChange={e=>handleFieldChange("allergies",e.target.value)} placeholder="Ex : pénicilline, arachides… (ou Aucune)"/>
            </Field>
            <Field label="Groupe sanguin" req>
              <select value={form.bloodgroup} onChange={e=>handleFieldChange("bloodgroup",e.target.value)}>
                <option value="">— Sélectionnez —</option>
                {BLOOD_GROUPS.map(g=><option key={g} value={g}>{g === "inconnu" ? "Je ne sais pas" : g}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Section 4 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">📋 Antécédents médicaux</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <Field label="Antécédents médicaux" req>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {HISTORY_OPTIONS.map(opt=>(
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#4a5568]">
                    <input type="checkbox" checked={form.history.includes(opt)} onChange={()=>toggleHistory(opt)} className="accent-[#1abc9c]"/>
                    {opt}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Précisions (optionnel)">
              <input value={form.historyOther} onChange={e=>handleFieldChange("historyOther",e.target.value)} placeholder="Précisez d'éventuels antécédents supplémentaires"/>
            </Field>
          </div>
        </div>

        {/* Section 5 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">🚨 Contact d&apos;urgence</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <Field label="Personne à contacter" req>
              <input value={form.emergencyName} onChange={e=>handleFieldChange("emergencyName",e.target.value)} placeholder="Nom complet"/>
            </Field>
            <Field label="Numéro de téléphone" req>
              <input type="tel" value={form.emergencyPhone} onChange={e=>handleFieldChange("emergencyPhone",e.target.value)} placeholder="Ex : +237 6 00 00 00 00"/>
            </Field>
          </div>
        </div>

        {/* Section 6 */}
        <div>
          <div className="text-sm font-bold text-[#1abc9c] uppercase tracking-wide mb-3">📝 Questionnaire de santé</div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] space-y-4">
            <Field label="Comment évaluez-vous votre état de santé général ?" req>
              <select value={form.q1} onChange={e=>handleFieldChange("q1",e.target.value)}>
                <option value="">— Sélectionnez —</option>
                <option value="tres-bon">Très bon</option>
                <option value="bon">Bon</option>
                <option value="moyen">Moyen</option>
                <option value="mauvais">Mauvais</option>
              </select>
            </Field>
            <Field label="Avez-vous des douleurs actuellement ?" req>
              <select value={form.q2} onChange={e=>handleFieldChange("q2",e.target.value)}>
                <option value="">— Sélectionnez —</option>
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </Field>
            <Field label='Décrivez vos symptômes actuels (ou "Aucun")' req>
              <textarea rows={3} value={form.q3} onChange={e=>handleFieldChange("q3",e.target.value)} placeholder="Ex : maux de tête depuis 3 jours, fatigue…" style={{resize:"vertical",minHeight:90}}/>
            </Field>
            <Field label="Prenez-vous des médicaments en ce moment ?" req>
              <select value={form.q4} onChange={e=>handleFieldChange("q4",e.target.value)}>
                <option value="">— Sélectionnez —</option>
                <option value="non">Non</option>
                <option value="traitement">Oui, traitement régulier</option>
                <option value="auto">Oui, automédication</option>
              </select>
            </Field>
            <Field label='Remarques complémentaires (ou "RAS")' req>
              <textarea rows={2} value={form.q5} onChange={e=>handleFieldChange("q5",e.target.value)} placeholder="Informations supplémentaires pour votre médecin…" style={{resize:"vertical",minHeight:70}}/>
            </Field>
          </div>
        </div>
      </div>

      {/* Footer submit bar */}
      <div className="sticky bottom-0 bg-white border-t border-[#e2e8f0] px-6 py-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-sm text-[#8a97a8]">{filled} / {REQUIRED_KEYS.length} champs obligatoires complétés</p>
          <button
            onClick={handleSubmit}
            disabled={filled < REQUIRED_KEYS.length}
            className="px-8 py-3 bg-[#1abc9c] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#159f84] transition-colors"
          >
            Continuer vers mon espace →
          </button>
        </div>
      </div>
    </div>
  );
}
