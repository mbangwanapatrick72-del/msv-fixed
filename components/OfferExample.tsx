"use client";

import { useEffect, useState } from "react";
import { getOfferData, OfferResponse } from "@/lib/offer-api";

/**
 * Example component showing how to use the CORS proxy API
 * Replace this with your actual component
 */
export default function OfferExample() {
  const [data, setData] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOffer() {
      try {
        setLoading(true);
        setError(null);
        const response = await getOfferData();
        setData(response);

        // Check if external API returned an error
        if (response.status !== 200) {
          setError(
            `External API Error: ${response.status} ${response.statusText}`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to fetch offer: ${message}`);
        console.error("Error fetching offer:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOffer();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>CORS Proxy API Example</h2>

      {loading && <p>⏳ Loading offer data...</p>}

      {error && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "#ffebee",
            borderLeft: "4px solid #f44336",
            marginBottom: "10px",
          }}
        >
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <p>
            <strong>Status:</strong> {data.status} {data.statusText}
          </p>
          <p>
            <strong>Timestamp:</strong> {data.timestamp}
          </p>

          {data.error && (
            <div style={{ color: "red", marginTop: "10px" }}>
              <strong>Error Details:</strong> {data.error}
              {data.details && <p>{data.details}</p>}
            </div>
          )}

          {data.data ? (
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "4px",
              }}
            >
              <strong>Data from overbridgenet.com:</strong>
              <pre>{JSON.stringify(data.data, null, 2)}</pre>
            </div>
          ) : (
            <p style={{ color: "#666" }}>
              No data received from external API
            </p>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#e3f2fd",
          borderRadius: "4px",
        }}
      >
        <strong>ℹ️ How this works:</strong>
        <ul>
          <li>✅ No more CORS errors!</li>
          <li>
            🔄 Browser calls <code>/api/offer</code> (same domain)
          </li>
          <li>
            🔄 Server calls <code>overbridgenet.com</code> (no CORS blocking)
          </li>
          <li>📊 Data returns to browser safely</li>
        </ul>
      </div>
    </div>
  );
}
