"use client";
import { createContext, useContext } from "react";
import { User } from "firebase/auth";

export interface PatientAuthContextType {
  user: User | null;
  loading: boolean;
}

export const PatientAuthContext = createContext<PatientAuthContextType>({
  user: null,
  loading: true,
});

export const usePatientAuth = () => useContext(PatientAuthContext);
