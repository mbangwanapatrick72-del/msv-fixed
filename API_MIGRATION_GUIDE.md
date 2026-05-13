# Migration Guide: Direct API Calls → Proxy

## Overview

If you have code that's currently calling the external API directly:

```typescript
// ❌ BLOCKED by antivirus + CORS
fetch("https://overbridgenet.com/jsv8/offer", { method: "POST" })
```

It MUST be changed to use the proxy:

```typescript
// ✅ WORKS - routed through backend
fetch("/api/offer", { method: "POST" })
```

---

## Why This Matters

**Direct calls fail because:**
- 🚫 CORS blocks browser requests
- 🚫 Antivirus/Ad blocker flags suspicious endpoints
- 🚫 Error 499 = security filter blocking the request

**Proxy calls work because:**
- ✅ Server-to-server (no CORS)
- ✅ Security filters don't apply to backend
- ✅ Appears as same-domain request to browser

---

## Migration Examples

### Example 1: Simple GET Request

**Before (❌ BLOCKED):**
```typescript
fetch("https://overbridgenet.com/jsv8/offer")
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

**After (✅ WORKS):**
```typescript
import { getOfferData } from "@/lib/offer-api";

getOfferData()
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

---

### Example 2: POST Request with Payload

**Before (❌ BLOCKED):**
```typescript
fetch("https://overbridgenet.com/jsv8/offer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: 123, action: "purchase" })
})
  .then(r => r.json())
  .then(d => console.log(d))
```

**After (✅ WORKS):**
```typescript
import { postOfferData } from "@/lib/offer-api";

postOfferData({ userId: 123, action: "purchase" })
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

---

### Example 3: Component with Direct API Call

**Before (❌ BLOCKED):**
```typescript
"use client";

import { useEffect, useState } from "react";

export default function OfferWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ❌ This call gets blocked!
    fetch("https://overbridgenet.com/jsv8/offer", {
      method: "POST",
      body: JSON.stringify({ offer_id: 1 })
    })
      .then(r => r.json())
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!data) return <p>Loading...</p>;
  return <div>{JSON.stringify(data)}</div>;
}
```

**After (✅ WORKS):**
```typescript
"use client";

import { useEffect, useState } from "react";
import { postOfferData } from "@/lib/offer-api";

export default function OfferWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ✅ This call works!
    postOfferData({ offer_id: 1 })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!data) return <p>Loading...</p>;
  return <div>{JSON.stringify(data)}</div>;
}
```

---

### Example 4: Component Using `useEffect` and Loading States

**Before (❌ BLOCKED):**
```typescript
"use client";

import { useEffect, useState } from "react";

export default function OfferComponent() {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await fetch("https://overbridgenet.com/jsv8/offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: "xyz" })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        setOffer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, []);

  if (loading) return <div>Loading offer...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>Offer: {JSON.stringify(offer)}</div>;
}
```

**After (✅ WORKS):**
```typescript
"use client";

import { useEffect, useState } from "react";
import { postOfferData, OfferResponse } from "@/lib/offer-api";

export default function OfferComponent() {
  const [offer, setOffer] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const data = await postOfferData({ session: "xyz" });
        setOffer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, []);

  if (loading) return <div>Loading offer...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>Offer: {JSON.stringify(offer)}</div>;
}
```

---

## API Functions Available

### `getOfferData()`
GET request to external API

```typescript
import { getOfferData } from "@/lib/offer-api";

const response = await getOfferData();
// {
//   status: 403,
//   statusText: "Forbidden",
//   data: null,
//   timestamp: "2026-04-27T..."
// }
```

### `postOfferData(payload)`
POST request with payload

```typescript
import { postOfferData } from "@/lib/offer-api";

const response = await postOfferData({
  userId: 123,
  action: "view_offer"
});
```

### `proxyRequest(method, payload?)`
Generic request for any HTTP method

```typescript
import { proxyRequest } from "@/lib/offer-api";

// PUT request
const put = await proxyRequest("PUT", { id: 1, status: "active" });

// DELETE request
const del = await proxyRequest("DELETE");

// PATCH request
const patch = await proxyRequest("PATCH", { name: "Updated" });
```

---

## Checklist: Finding & Fixing Direct Calls

1. **Search your codebase** for `overbridgenet.com`:
   ```bash
   grep -r "overbridgenet" app/
   grep -r "overbridgenet" components/
   grep -r "overbridgenet" lib/
   ```

2. **Look for direct `fetch()` calls** to external domains:
   ```bash
   grep -r "fetch.*http" app/ components/ lib/
   ```

3. **Check for any scripts** in your HTML that might load external code:
   ```bash
   grep -r "script" app/layout.tsx
   grep -r "<script" app/layout.tsx
   ```

4. **Update any found calls** to use the proxy

5. **Test in browser** to verify no 499 errors

---

## Testing the Proxy

### In Browser Console:
```javascript
// Test GET
fetch("/api/offer")
  .then(r => r.json())
  .then(d => console.log("✅ GET works:", d))

// Test POST
fetch("/api/offer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ test: true })
})
  .then(r => r.json())
  .then(d => console.log("✅ POST works:", d))
```

Should see NO CORS errors! ✅

---

## Common Issues

### Issue: Still seeing error 499

**Possible causes:**
1. Code is still calling the external URL directly
2. Script tag loading external code
3. Third-party library making the call

**Solution:**
- Search for ALL instances of the external domain
- Update to use `/api/offer` instead
- Check `package.json` dependencies
- Look for `<script>` tags in layout

### Issue: Proxy returns 403 from external API

**This is NOT a CORS error** — your proxy is working! The external API is rejecting the request.

**Solution:**
- Contact external API provider for access requirements
- You may need: API key, authentication token, or IP whitelist

---

## Next Steps

1. ✅ Rebuild your app: `npm run build`
2. ✅ Deploy to Vercel: `npx vercel --prod`
3. ✅ Test in production: https://msv-fixed.vercel.app
4. ✅ Check browser console - no more error 499!

---

*Last updated: April 27, 2026*
