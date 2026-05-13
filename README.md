# MSV Healthcare — Real-Time Communication Fix

## What was fixed in this version

### Root cause
The doctor dashboard was not updating because:
1. **`choose-doctor` only saved to `localStorage`** — never wrote to Firestore, so the doctor never saw the patient
2. **The `patients` collection used `doctorId == request.auth.uid` for creates** — blocked patients from writing their own record
3. **`subscribeDoctorAppointments` used a multi-field composite query** (`doctorId + date + time`) that silently failed without a deployed index
4. **No `PatientRecord` type existed** — patients from the patient UI and manual patients were treated as separate entities

---

## Architecture of the fix

### New data flow (fully real-time)

```
Patient selects doctor
  → choose-doctor/page.tsx calls upsertPatientRecord(source="selection")
  → writes to sharedDb.patients/{doctorId}_{sharedUid}
  → doctor dashboard subscribeDoctorPatients() onSnapshot fires instantly ✓

Patient books appointment
  → profil/page.tsx calls createAppointment()
  → writes to sharedDb.appointments/{id}
  → also calls upsertPatientRecord(source="appointment", lastApptDate=...)
  → doctor dashboard subscribeDoctorAppointments() onSnapshot fires instantly ✓
  → pending badge increments, toast notification shown ✓

Doctor confirms/rejects
  → confirmAppointment() or rejectAppointment()
  → updates sharedDb.appointments/{id}.status
  → patient profil subscribePatientAppointments() onSnapshot fires instantly ✓
```

### Files changed

| File | Change |
|------|--------|
| `lib/appointments.ts` | Added `upsertPatientRecord`, `subscribeDoctorPatients`, `addPatientManual`, `updatePatientRecord`, `deletePatientRecord`, `PatientRecord` type. Fixed `subscribeDoctorAppointments` to use single-field query (no index needed). |
| `app/(patient)/patient/choose-doctor/page.tsx` | Now calls `upsertPatientRecord` on doctor selection → patient appears on doctor dashboard immediately |
| `app/(patient)/patient/profil/page.tsx` | Now calls `upsertPatientRecord` after booking → updates `lastApptDate` on doctor's patient list |
| `app/(doctor)/doctor/dashboard/page.tsx` | Uses `subscribeDoctorPatients` (real-time onSnapshot) instead of one-shot getDocs. Patients tab shows source badges, appointment count, last appointment date. Live indicator in sidebar. |
| `firestore.rules` | Updated `patients` collection rules to allow patients to create/read their own record |
| `firestore.indexes.json` | Updated to match actual queries (`doctorId+createdAt`, `doctorId+updatedAt`, `patientUid+date+time`) |

---

## Deploy

### 1. Enable Anonymous Authentication (REQUIRED — do this first)
Firebase Console → **doctor-web-app-a29a5** → Authentication → Sign-in method → Anonymous → **Enable**

### 2. Deploy Firestore rules + indexes (doctor project)
```bash
firebase use doctor-web-app-a29a5
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Install and run locally
```bash
npm install --legacy-peer-deps
npm run dev
```

### 4. Deploy to Vercel
```bash
npx vercel --prod
```

---

## Firestore collections (doctor project: doctor-web-app-a29a5)

### `patients/{doctorId}_{sharedUid}`
```json
{
  "doctorId": "uid-of-doctor",
  "patientSharedUid": "anonymous-uid-of-patient",
  "patientName": "Jean Dupont",
  "patientEmail": "jean@example.com",
  "source": "selection | appointment | manual",
  "lastApptDate": "2025-05-10",
  "lastApptType": "CONSULTATION",
  "patientCode": "PAT-001",
  "note": "...",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `appointments/{id}`
```json
{
  "doctorId": "uid-of-doctor",
  "doctorName": "Dr. Aminata Diallo",
  "patientUid": "anonymous-uid-of-patient",
  "patientName": "Jean Dupont",
  "date": "2025-05-10",
  "time": "10:00",
  "type": "CONSULTATION",
  "status": "pending | confirmed | rejected | cancelled",
  "doctorNote": "...",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```
