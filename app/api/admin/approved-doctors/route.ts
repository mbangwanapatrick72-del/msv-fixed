import { NextResponse, NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST: Add a new approved doctor email
// Usage: POST /api/admin/approved-doctors
// Body: { email: "doctor@example.com" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Add to approved_doctors collection
    await adminDb.collection("approved_doctors").doc(email).set({
      email,
      approvedAt: new Date().toISOString(),
      status: "approved",
    });

    return NextResponse.json(
      { success: true, message: `${email} added to approved doctors`, email },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding approved doctor:", error);
    return NextResponse.json(
      { error: "Failed to add approved doctor" },
      { status: 500 }
    );
  }
}

// GET: List all approved doctors
// Usage: GET /api/admin/approved-doctors
export async function GET() {
  try {
    const snapshot = await adminDb.collection("approved_doctors").get();
    const approvedDoctors = snapshot.docs.map((doc) => ({
      email: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { success: true, count: approvedDoctors.length, doctors: approvedDoctors },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching approved doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch approved doctors" },
      { status: 500 }
    );
  }
}

// DELETE: Remove an approved doctor email
// Usage: DELETE /api/admin/approved-doctors?email=doctor@example.com
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    await adminDb.collection("approved_doctors").doc(email).delete();

    return NextResponse.json(
      { success: true, message: `${email} removed from approved doctors` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing approved doctor:", error);
    return NextResponse.json(
      { error: "Failed to remove approved doctor" },
      { status: 500 }
    );
  }
}
