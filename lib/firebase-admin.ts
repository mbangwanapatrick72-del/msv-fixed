// lib/firebase-admin.ts
// Firebase Admin SDK initialization for doctor-web-app-a29a5

import * as admin from "firebase-admin";

const adminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(adminConfig as admin.ServiceAccount),
    projectId: adminConfig.projectId,
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
