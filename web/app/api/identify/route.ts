import { NextRequest, NextResponse } from "next/server";

// ACRCloud File Scanning API (AI Music Detection)
const CONTAINER_ID = "33436";
const REGION = "eu-west-1";
const BEARER_TOKEN = (process.env.ACR_BEARER_TOKEN || "").trim();

const BASE_URL = `https://api-${REGION}.acrcloud.com/api/fs-containers/${CONTAINER_ID}`;

const MAX_POLL_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 2000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const filename = audioFile.name || "upload.webm";

    // Step 1: Upload file to FS container
    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([new Uint8Array(audioBuffer)], { type: audioFile.type || "audio/mpeg" }), filename);
    uploadForm.append("data_type", "audio");

    const uploadRes = await fetch(`${BASE_URL}/files`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${BEARER_TOKEN}`,
      },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Upload failed:", uploadRes.status, errText);
      return NextResponse.json(
        { error: "Failed to upload audio for analysis", details: errText },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.data?.id;

    if (!fileId) {
      return NextResponse.json(
        { error: "Upload succeeded but no file ID returned", details: JSON.stringify(uploadData) },
        { status: 500 }
      );
    }

    // Step 2: Poll for results (short poll, frontend will continue polling via /api/identify-status)
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const resultRes = await fetch(`${BASE_URL}/files/${fileId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${BEARER_TOKEN}`,
        },
      });

      if (!resultRes.ok) continue;

      const resultData = await resultRes.json();
      const file = Array.isArray(resultData.data) ? resultData.data[0] : resultData.data;

      if (!file) continue;

      // state: 0=processing, 1=ready, -1=no results
      if (file.state === 1) {
        return NextResponse.json({
          status: { code: 0, msg: "Success" },
          file_id: fileId,
          name: file.name,
          duration: file.duration,
          results: file.results || {},
        });
      } else if (file.state === -1) {
        return NextResponse.json({
          status: { code: 1001, msg: "No results" },
          file_id: fileId,
        });
      }
    }

    // Still processing — return file_id so frontend can poll
    return NextResponse.json({
      status: { code: 2, msg: "Processing" },
      file_id: fileId,
    });

  } catch (error) {
    console.error("AI Detection error:", error);
    return NextResponse.json(
      { error: "Failed to analyze audio", details: String(error) },
      { status: 500 }
    );
  }
}
