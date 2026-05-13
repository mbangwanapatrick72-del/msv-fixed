"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doctorAuth } from "@/lib/firebase-doctor";
import { DoctorAuthContext } from "./doctor-auth-context";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(doctorAuth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);
  return (
    <DoctorAuthContext.Provider value={{ user, loading }}>
      {children}
    </DoctorAuthContext.Provider>
  );
}
