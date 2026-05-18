/**
 * lib/appointments.ts
 *
 * All shared data lives in the DOCTOR Firebase project (sharedDb).
 *
 * ⚠️  COMPOSITE INDEX STRATEGY
 * Firestore requires a composite index for any query that combines
 * where() on field A with orderBy() on a different field B.
 * To avoid ALL composite index errors we:
 *   • Only use where() with NO orderBy() on Firestore queries
 *   • Sort results client-side after the snapshot arrives
 *
 * This means zero composite indexes are needed for real-time listeners.
 * The only index required is for fetchDoctors() which uses a single
 * orderBy("name") with no where() — Firestore handles that automatically.
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  type Unsubscribe,
  type QuerySnapshot,
} from "firebase/firestore";
import { sharedDb, ensureSharedAuth, getSharedUid } from "./firebase-shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled";

export type AppointmentType =
  | "CONSULTATION"
  | "FOLLOW-UP"
  | "EMERGENCY"
  | "THERAPY"
  | "TELECONSULTATION";

export interface Appointment {
  id:           string;
  doctorId:     string;
  doctorName:   string;
  doctorSpec:   string;
  patientUid:   string;
  patientName:  string;
  patientEmail: string;
  date:         string;   // "YYYY-MM-DD"
  time:         string;   // "HH:MM"
  type:         AppointmentType;
  note:         string;
  status:       AppointmentStatus;
  doctorNote:   string;
  createdAt:    Date | null;
  updatedAt:    Date | null;
}

export interface PatientRecord {
  id:               string;
  doctorId:         string;
  patientSharedUid: string;
  patientName:      string;
  patientEmail:     string;
  patientCode:      string;
  source:           "selection" | "appointment" | "manual";
  lastApptDate:     string | null;
  lastApptType:     string | null;
  age:              number | null;
  note:             string;
  createdAt:        Date | null;
  updatedAt:        Date | null;
}

export interface DoctorProfile {
  id:        string;
  name:      string;
  specialty: string;
  specIdx:   number;
  email:     string;
  phone?:    string;
  photoURL?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  "Médecin généraliste", "Gynécologue-obstétricien(ne)", "Pédiatre", "Cardiologue",
  "Dermatologue", "Neurologue", "Ophtalmologue", "Orthopédiste", "Psychiatre",
  "Radiologue", "Chirurgien général", "Urologue", "Endocrinologue", "Néphrologue",
  "Gastro-entérologue", "Pneumologue", "Oncologue", "Rhumatologue",
];

const APPT_COLL    = "appointments";
const PATIENT_COLL = "patients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppt(id: string, data: Record<string, any>): Appointment {
  return {
    id,
    doctorId:     data.doctorId     ?? "",
    doctorName:   data.doctorName   ?? "",
    doctorSpec:   data.doctorSpec   ?? "",
    patientUid:   data.patientUid   ?? "",
    patientName:  data.patientName  ?? "",
    patientEmail: data.patientEmail ?? "",
    date:         data.date         ?? "",
    time:         data.time         ?? "",
    type:         data.type         ?? "CONSULTATION",
    note:         data.note         ?? "",
    status:       data.status       ?? "pending",
    doctorNote:   data.doctorNote   ?? "",
    createdAt:    data.createdAt?.toDate?.() ?? null,
    updatedAt:    data.updatedAt?.toDate?.() ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPatient(id: string, data: Record<string, any>): PatientRecord {
  return {
    id,
    doctorId:         data.doctorId         ?? "",
    patientSharedUid: data.patientSharedUid ?? "",
    patientName:      data.patientName      ?? data.name ?? "",
    patientEmail:     data.patientEmail     ?? "",
    patientCode:      data.patientCode      ?? id.substring(0, 8).toUpperCase(),
    source:           data.source           ?? "manual",
    lastApptDate:     data.lastApptDate     ?? null,
    lastApptType:     data.lastApptType     ?? null,
    age:              data.age              ?? null,
    note:             data.note             ?? "",
    createdAt:        data.createdAt?.toDate?.() ?? null,
    updatedAt:        data.updatedAt?.toDate?.() ?? null,
  };
}

// Client-side sort helpers
function sortAppts(appts: Appointment[]): Appointment[] {
  return [...appts].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.time.localeCompare(b.time);
  });
}

function sortPatients(patients: PatientRecord[]): PatientRecord[] {
  return [...patients].sort((a, b) => {
    // Most recently updated first
    const ta = a.updatedAt?.getTime() ?? 0;
    const tb = b.updatedAt?.getTime() ?? 0;
    return tb - ta;
  });
}

// ─── Patient registration (called from patient UI) ────────────────────────────

/**
 * Upsert a patient record in the shared DB.
 * Called when a patient selects a doctor or books an appointment.
 * Document ID = "{doctorId}_{sharedUid}" — idempotent upsert via merge:true
 */
export async function upsertPatientRecord(payload: {
  doctorId:      string;
  doctorName:    string;
  patientName:   string;
  patientEmail:  string;
  source:        "selection" | "appointment";
  lastApptDate?: string | null;
  lastApptType?: string | null;
}): Promise<void> {
  const user       = await ensureSharedAuth();
  const sharedUid  = user.uid;
  const docId      = `${payload.doctorId}_${sharedUid}`;

  // Check if this is a first-time write to set patientCode + createdAt
  const existing = await getDocs(
    query(
      collection(sharedDb, PATIENT_COLL),
      where("doctorId",         "==", payload.doctorId),
      where("patientSharedUid", "==", sharedUid)
    )
  );
  const isNew = existing.empty;

  await setDoc(
    doc(sharedDb, PATIENT_COLL, docId),
    {
      doctorId:         payload.doctorId,
      patientSharedUid: sharedUid,
      patientName:      payload.patientName,
      patientEmail:     payload.patientEmail,
      source:           payload.source,
      ...(payload.lastApptDate !== undefined && {
        lastApptDate: payload.lastApptDate,
        lastApptType: payload.lastApptType ?? null,
      }),
      ...(isNew && {
        patientCode: "PAT-" + docId.substring(0, 6).toUpperCase(),
        createdAt:   serverTimestamp(),
      }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── Patient operations ───────────────────────────────────────────────────────

/**
 * Create a new appointment.
 * patientUid is always the shared anonymous UID.
 */
export async function createAppointment(
  payload: Omit<
    Appointment,
    "id" | "patientUid" | "status" | "doctorNote" | "createdAt" | "updatedAt"
  >
): Promise<string> {
  const user = await ensureSharedAuth();
  const ref  = await addDoc(collection(sharedDb, APPT_COLL), {
    ...payload,
    patientUid:  user.uid,
    status:      "pending",
    doctorNote:  "",
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
  return ref.id;
}

/**
 * Patient cancels their appointment.
 */
export async function cancelAppointment(apptId: string): Promise<void> {
  await ensureSharedAuth();
  await updateDoc(doc(sharedDb, APPT_COLL, apptId), {
    status:    "cancelled",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Real-time listener — patient's own appointments.
 *
 * Query: where("patientUid") only — NO orderBy → NO composite index needed.
 * Results sorted client-side by date + time.
 */
export function subscribePatientAppointments(
  _unused: string,
  callback: (appts: Appointment[]) => void
): Unsubscribe {
  const sharedUid = getSharedUid();
  if (!sharedUid) { callback([]); return () => {}; }

  // ← Single where() clause only — Firestore handles this with auto-indexes
  // Use getSharedUid() (the shared project anonymous UID) to ensure proper data isolation
  // Each patient browser gets its own anonymous UID on the shared project
  const q = query(
    collection(sharedDb, APPT_COLL),
    where("patientUid", "==", sharedUid)
  );

  return onSnapshot(q, (snap: QuerySnapshot) => {
    const appts = snap.docs.map(d => toAppt(d.id, d.data()));
    callback(sortAppts(appts));   // ← Sort client-side
  });
}

// ─── Doctor operations ────────────────────────────────────────────────────────

export async function confirmAppointment(
  apptId: string,
  doctorNote = ""
): Promise<void> {
  await updateDoc(doc(sharedDb, APPT_COLL, apptId), {
    status:    "confirmed",
    doctorNote,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectAppointment(
  apptId: string,
  doctorNote = ""
): Promise<void> {
  await updateDoc(doc(sharedDb, APPT_COLL, apptId), {
    status:    "rejected",
    doctorNote,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAppointmentRecord(apptId: string): Promise<void> {
  await deleteDoc(doc(sharedDb, APPT_COLL, apptId));
}

/**
 * Real-time listener — ALL appointments for a doctor.
 *
 * Query: where("doctorId") only — NO orderBy → NO composite index needed.
 * Results sorted client-side by date + time.
 */
export function subscribeDoctorAppointments(
  doctorId: string,
  callback: (appts: Appointment[]) => void
): Unsubscribe {
  // ← Single where() clause only
  const q = query(
    collection(sharedDb, APPT_COLL),
    where("doctorId", "==", doctorId)
  );

  return onSnapshot(
    q,
    (snap: QuerySnapshot) => {
      const appts = snap.docs.map(d => toAppt(d.id, d.data()));
      callback(sortAppts(appts));   // ← Sort client-side
    },
    (err) => {
      console.warn("subscribeDoctorAppointments error:", err.message);
    }
  );
}

/**
 * Real-time listener — ALL patients of a doctor.
 *
 * Query: where("doctorId") only — NO orderBy → NO composite index needed.
 * Results sorted client-side by updatedAt desc (most recent first).
 */
export function subscribeDoctorPatients(
  doctorId: string,
  callback: (patients: PatientRecord[]) => void
): Unsubscribe {
  // ← Single where() clause only
  const q = query(
    collection(sharedDb, PATIENT_COLL),
    where("doctorId", "==", doctorId)
  );

  return onSnapshot(
    q,
    (snap: QuerySnapshot) => {
      const patients = snap.docs.map(d => toPatient(d.id, d.data()));
      callback(sortPatients(patients));   // ← Sort client-side
    },
    (err) => {
      console.warn("subscribeDoctorPatients error:", err.message);
      callback([]);
    }
  );
}

/**
 * Doctor manually adds a patient record.
 */
export async function addPatientManual(
  doctorId: string,
  data: {
    name:          string;
    age?:          number;
    note?:         string;
    patientEmail?: string;
  }
): Promise<string> {
  const countSnap = await getDocs(
    query(collection(sharedDb, PATIENT_COLL), where("doctorId", "==", doctorId))
  );
  const ref = await addDoc(collection(sharedDb, PATIENT_COLL), {
    doctorId,
    patientSharedUid: "",
    patientName:      data.name,
    patientEmail:     data.patientEmail ?? "",
    patientCode:      "PAT-" + String(countSnap.size + 1).padStart(3, "0"),
    source:           "manual",
    age:              data.age  ?? null,
    note:             data.note ?? "",
    lastApptDate:     null,
    lastApptType:     null,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update a patient record (doctor side).
 */
export async function updatePatientRecord(
  patientId: string,
  data: Partial<Pick<PatientRecord, "patientName" | "patientEmail" | "age" | "note">>
): Promise<void> {
  await updateDoc(doc(sharedDb, PATIENT_COLL, patientId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a patient record (doctor side).
 */
export async function deletePatientRecord(patientId: string): Promise<void> {
  await deleteDoc(doc(sharedDb, PATIENT_COLL, patientId));
}

// ─── Doctor list ──────────────────────────────────────────────────────────────

/**
 * Fetch registered doctors for the patient's doctor-chooser page.
 * Uses orderBy("name") with no where() — Firestore handles this automatically,
 * no composite index needed.
 */
export async function fetchDoctors(): Promise<DoctorProfile[]> {
  await ensureSharedAuth();
  const snap = await getDocs(
    query(collection(sharedDb, "doctors"), orderBy("name"))
  );
  return snap.docs
    .map((d) => {
      const data    = d.data();
      const specIdx = typeof data.specIdx === "number" ? data.specIdx : -1;
      return {
        id:        d.id,
        name:      data.name      ?? "",
        specialty: data.specialty ?? (specIdx >= 0 ? SPECIALTIES[specIdx] : "Médecin"),
        specIdx,
        email:     data.email     ?? "",
        phone:     data.phone     ?? "",
        photoURL:  data.photoURL  ?? "",
      } as DoctorProfile;
    })
    .filter((d) => d.name.trim().length > 0);
}
