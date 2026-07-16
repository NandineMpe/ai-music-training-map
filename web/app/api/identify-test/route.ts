import { NextResponse } from "next/server";

const CONTAINER_ID = "33436";
const REGION = "eu-west-1";
const BASE_URL = `https://api-${REGION}.acrcloud.com/api/fs-containers/${CONTAINER_ID}`;

export async function GET() {
  const token = process.env.ACR_BEARER_TOKEN || "";

  // Debug info
  const debug = {
    token_length: token.length,
    token_first_20: token.substring(0, 20),
    token_last_10: token.substring(token.length - 10),
    has_newline: token.includes("\n") || token.includes("\r"),
    container_id: CONTAINER_ID,
    base_url: BASE_URL,
  };

  // Try to list files in the container
  try {
    const trimmedToken = token.trim();
    const r = await fetch(`${BASE_URL}/files?per_page=1`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${trimmedToken}`,
      },
    });

    const body = await r.text();

    return NextResponse.json({
      debug,
      acr_status: r.status,
      acr_response: body.substring(0, 500),
    });
  } catch (error) {
    return NextResponse.json({
      debug,
      error: String(error),
    });
  }
}
