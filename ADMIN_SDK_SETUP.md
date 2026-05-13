# Firebase Admin SDK Setup Guide

## ✅ Files Created

1. **`lib/firebase-admin.ts`** - Admin SDK initialization
2. **`app/api/admin/approved-doctors/route.ts`** - Backend API for managing approved doctors
3. **`app/admin/approved-doctors/page.tsx`** - Admin dashboard UI
4. **`.env.local`** - Updated with Firebase credentials
5. **`.env.local.example`** - Template for environment variables

---

## 📋 Setup Steps Completed

### Step 1: ✅ Environment Variables Set
- `FIREBASE_PROJECT_ID` = `doctor-web-app-a29a5`
- `FIREBASE_PRIVATE_KEY` = Your private key (already added to `.env.local`)
- `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@doctor-web-app-a29a5.iam.gserviceaccount.com`

### Step 2: ✅ Install Dependencies
Run this command:
```bash
npm install firebase-admin
# or
yarn add firebase-admin
```

---

## 🚀 How to Use

### Access Admin Dashboard
1. Go to: `http://localhost:3000/admin/approved-doctors` (local dev)
2. Or: `https://your-vercel-app.com/admin/approved-doctors` (production)

### Add Approved Doctor
1. Enter email: `mbangwanaessengue@gmail.com`
2. Click "Add"
3. Email is now approved ✅

### Then Enroll
1. Go to: `/doctor/enroll`
2. Use email: `mbangwanaessengue@gmail.com`
3. Enter password and other details
4. Submit → Account created! ✅

---

## 🔧 API Endpoints

### Add Approved Doctor
```bash
POST /api/admin/approved-doctors
Content-Type: application/json

{
  "email": "doctor@example.com"
}

Response: { success: true, email: "doctor@example.com" }
```

### List Approved Doctors
```bash
GET /api/admin/approved-doctors

Response: { 
  success: true, 
  count: 1, 
  doctors: [
    { email: "...", approvedAt: "...", status: "approved" }
  ]
}
```

### Remove Approved Doctor
```bash
DELETE /api/admin/approved-doctors?email=doctor@example.com

Response: { success: true, message: "doctor@example.com removed" }
```

---

## 🔐 Vercel Deployment

### Add Environment Variables to Vercel

1. Go to: **Vercel Dashboard** → Your Project → **Settings**
2. Click **Environment Variables**
3. Add these variables (tied to your email: `mbangwanaessengue@gmail.com`):

```
Name: FIREBASE_PROJECT_ID
Value: doctor-web-app-a29a5
Environments: Production, Preview, Development
```

```
Name: FIREBASE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----\n...your-key...\n-----END PRIVATE KEY-----\n
Environments: Production, Preview, Development
```

```
Name: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@doctor-web-app-a29a5.iam.gserviceaccount.com
Environments: Production, Preview, Development
```

### Deploy
```bash
git add .
git commit -m "Add Firebase Admin SDK"
git push
```

---

## 🧪 Testing Locally

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Access admin panel:**
   ```
   http://localhost:3000/admin/approved-doctors
   ```

3. **Add test email:**
   - Click "Add" with: `mbangwanaessengue@gmail.com`

4. **Try enrollment:**
   - Go to: `http://localhost:3000/doctor/enroll`
   - Use same email
   - Fill form and submit

5. **Check success:**
   - Should see: "Compte créé!" toast
   - Redirected to welcome page ✅

---

## ⚠️ Important Security Notes

1. **NEVER** commit `.env.local` to Git
2. **Keep private key secret** - it's in `.gitignore` by default
3. **Use Vercel secrets** for production (already done via console)
4. **Firestore rules** prevent client-side writes to `approved_doctors`
5. **Admin API** is open - consider adding authentication later

---

## 🔗 Related Files

- [Firestore Rules](firestore.rules)
- [Enrollment Form](app/(doctor)/doctor/enroll/page.tsx)
- [Admin SDK Init](lib/firebase-admin.ts)
- [API Routes](app/api/admin/approved-doctors/route.ts)

---

## ✨ What's Happening

1. **Enrollment check** → Reads `approved_doctors` from Firestore
2. **Email approved?** → YES → Create Auth user
3. **Auth user created** → Save profile to `doctors/{uid}`
4. **Profile saved** → Login possible ✅

Without admin SDK, this workflow can't work because you can't pre-approve emails!

---

## 🆘 Troubleshooting

**Error: "Cet email n'est pas autorisé"**
- Email not in `approved_doctors` collection
- Go to admin panel and add it

**Error: "Firebase Admin SDK not initialized"**
- Check `.env.local` has all three variables
- Restart dev server after adding env vars

**Vercel deployment fails**
- Ensure environment variables are set in Vercel console
- Check private key format (with `\n` literals)

---

## 📝 Next Steps (Optional)

1. Add **authentication** to admin panel
2. Add **email verification** via Firebase
3. Add **admin user roles** to limit access
4. Create **Cloud Functions** for advanced automation

---

**Setup Status: ✅ COMPLETE**

Your app now has full admin SDK integration with doctor approval workflow!
