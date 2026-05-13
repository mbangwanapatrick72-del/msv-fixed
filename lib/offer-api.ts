/**
 * API Response interface from the proxy
 */
export interface OfferResponse {
  status?: number;
  statusText?: string;
  data?: any;
  timestamp?: string;
  error?: string;
  details?: string;
}

/**
 * Fetch offer data through the Vercel serverless proxy (GET)
 * This avoids CORS issues by routing through the backend
 */
export async function getOfferData(): Promise<OfferResponse> {
  try {
    const response = await fetch("/api/offer", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: OfferResponse = await response.json();

    if (data.status && data.status !== 200) {
      console.warn(`External API returned status ${data.status}: ${data.statusText}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching offer data:", error);
    throw error;
  }
}

/**
 * Post data through the Vercel serverless proxy (POST)
 * Sends data to the external API via your backend
 */
export async function postOfferData(payload: any): Promise<OfferResponse> {
  try {
    const response = await fetch("/api/offer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: OfferResponse = await response.json();

    if (data.status && data.status !== 200) {
      console.warn(`External API returned status ${data.status}: ${data.statusText}`);
    }

    return data;
  } catch (error) {
    console.error("Error posting offer data:", error);
    throw error;
  }
}

/**
 * Generic proxy request to external API via your backend
 * Supports any HTTP method
 */
export async function proxyRequest(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  payload?: any
): Promise<OfferResponse> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch("/api/offer", options);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: OfferResponse = await response.json();

    if (data.status && data.status !== 200) {
      console.warn(
        `External API returned status ${data.status}: ${data.statusText}`
      );
    }

    return data;
  } catch (error) {
    console.error(`Error in ${method} request:`, error);
    throw error;
  }
}
