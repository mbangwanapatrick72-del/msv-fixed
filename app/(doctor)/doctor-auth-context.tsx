"use client";
import { createContext, useContext } from "react";
import { User } from "firebase/auth";

export interface DoctorAuthContextType {
  user: User | null;
  loading: boolean;
}

export const DoctorAuthContext = createContext<DoctorAuthContextType>({
  user: null,
  loading: true,
});

export const useDoctorAuth = () => useContext(DoctorAuthContext);
