"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { patientAuth } from "@/lib/firebase-patient";
import { PatientAuthContext } from "./patient-auth-context";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(patientAuth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <PatientAuthContext.Provider value={{ user, loading }}>
      {children}
    </PatientAuthContext.Provider>
  );
}
