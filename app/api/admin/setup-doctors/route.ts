import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Security: Check for a simple auth token or IP restriction in production
    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer setup-token-123") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctors = [
      {
        email: "rossignolessengue@gmail.com",
        password: "rossingnolessengue@",
        name: "Dr. Rossignol Essengue",
        onmc: "CM-00001",
        specialty: "Médecin généraliste",
        specIdx: 0,
        phone: "+237 6 12 34 5678",
        dob: "1985-06-15",
        sex: "M",
        idNum: "CM123456789",
        country: "Cameroun",
      },
      {
        email: "anaisessengue@gmail.com",
        password: "anaisessengue@",
        name: "Dr. Anais Essengue",
        onmc: "CM-00002",
        specialty: "Gynécologue-obstétricien(ne)",
        specIdx: 1,
        phone: "+237 6 98 76 5432",
        dob: "1988-03-22",
        sex: "F",
        idNum: "CM987654321",
        country: "Cameroun",
      },
    ];

    const results = [];

    for (const doctor of doctors) {
      try {
        // Step 1: Update approved_doctors with ONMC
        await adminDb
          .collection("approved_doctors")
          .doc(doctor.email)
          .set(
            {
              email: doctor.email,
              onmc: doctor.onmc,
              approvedAt: new Date(),
              status: "approved",
            },
            { merge: true }
          );

        // Step 2: Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
          email: doctor.email,
          password: doctor.password,
        });

        // Step 3: Create complete doctor profile
        await adminDb.collection("doctors").doc(userRecord.uid).set({
          uid: userRecord.uid,
          name: doctor.name,
          email: doctor.email,
          onmc: doctor.onmc,
          phone: doctor.phone,
          dob: doctor.dob,
          sex: doctor.sex,
          idNum: doctor.idNum,
          specialty: doctor.specialty,
          specIdx: doctor.specIdx,
          country: doctor.country,
          role: "DOCTOR",
          createdAt: new Date(),
          status: "approved",
          isAvailable: true,
        });

        results.push({
          email: doctor.email,
          status: "success",
          uid: userRecord.uid,
          message: "Doctor account created successfully",
        });
      } catch (err) {
        results.push({
          email: doctor.email,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Doctor setup completed",
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
