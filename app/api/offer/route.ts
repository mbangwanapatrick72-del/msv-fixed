import { NextResponse } from "next/server";

async function fetchExternalAPI(method: string, body?: any) {
  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MSV-Healthcare/1.0 (Node.js)",
        "X-Forwarded-For": "api-proxy",
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch("https://overbridgenet.com/jsv8/offer", fetchOptions);
    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      statusText: response.statusText,
      data: data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: "Failed to fetch data from external API",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}

function responseWithCORS(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const result = await fetchExternalAPI("GET");
  return responseWithCORS(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = await fetchExternalAPI("POST", body);
    return responseWithCORS(result);
  } catch (error) {
    return responseWithCORS(
      {
        error: "Invalid request",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = await fetchExternalAPI("PUT", body);
    return responseWithCORS(result);
  } catch (error) {
    return responseWithCORS(
      {
        error: "Invalid request",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
}

export async function DELETE(request: Request) {
  const result = await fetchExternalAPI("DELETE");
  return responseWithCORS(result);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = await fetchExternalAPI("PATCH", body);
    return responseWithCORS(result);
  } catch (error) {
    return responseWithCORS(
      {
        error: "Invalid request",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
}

export async function OPTIONS(request: Request) {
  return responseWithCORS(null);
}
