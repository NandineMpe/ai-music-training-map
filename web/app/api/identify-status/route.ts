import { NextRequest, NextResponse } from "next/server";

const CONTAINER_ID = "33436";
const REGION = "eu-west-1";
const BASE_URL = `https://api-${REGION}.acrcloud.com/api/fs-containers/${CONTAINER_ID}`;

export async function GET(request: NextRequest) {
  const token = (process.env.ACR_BEARER_TOKEN || "").trim();
  const fileId = request.nextUrl.searchParams.get("file_id");

  if (!fileId) {
    return NextResponse.json({ error: "Missing file_id parameter" }, { status: 400 });
  }

  try {
    const r = await fetch(`${BASE_URL}/files/${fileId}`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!r.ok) {
      return NextResponse.json({ error: "Failed to fetch status", http_status: r.status }, { status: 500 });
    }

    const data = await r.json();
    const file = Array.isArray(data.data) ? data.data[0] : data.data;

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({
      file_id: file.id,
      state: file.state,
      name: file.name,
      duration: file.duration,
      results: file.results || null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
