"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorRegister() {
  const router = useRouter();
  useEffect(() => { router.replace("/doctor/enroll"); }, [router]);
  return null;
}
