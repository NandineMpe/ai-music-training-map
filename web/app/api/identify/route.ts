import { NextRequest, NextResponse } from "next/server";

// ACRCloud File Scanning API (AI Music Detection)
const CONTAINER_ID = "33436";
const REGION = "eu-west-1";
const BEARER_TOKEN = process.env.ACR_BEARER_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI3IiwianRpIjoiMjJjODJmNmI2ZWRmNGY2NDVkZTk4YzAwNjAzMmE0ZjM0MjQ5OWU2N2M2ZjhlZmEyMmVmM2JiOGFlOWM4ZDVhZjNjZjE3NGFhMWM1ZmY4MDgiLCJpYXQiOjE3ODQxMjk5NjQuMjQzMTY2LCJuYmYiOjE3ODQxMjk5NjQuMjQzMTcsImV4cCI6MjA5OTc0OTE2NC4yMDQxOTQsInN1YiI6IjM0OTQ5MiIsInNjb3BlcyI6WyIqIiwid3JpdGUtYWxsIiwicmVhZC1hbGwiLCJidWNrZXRzIiwid3JpdGUtYnVja2V0cyIsInJlYWQtYnVja2V0cyIsImF1ZGlvcyIsIndyaXRlLWF1ZGlvcyIsInJlYWQtYXVkaW9zIiwiY2hhbm5lbHMiLCJ3cml0ZS1jaGFubmVscyIsInJlYWQtY2hhbm5lbHMiLCJiYXNlLXByb2plY3RzIiwid3JpdGUtYmFzZS1wcm9qZWN0cyIsInJlYWQtYmFzZS1wcm9qZWN0cyIsInVjZiIsIndyaXRlLXVjZiIsInJlYWQtdWNmIiwiZGVsZXRlLXVjZiIsImJtLXByb2plY3RzIiwiYm0tY3MtcHJvamVjdHMiLCJ3cml0ZS1ibS1jcy1wcm9qZWN0cyIsInJlYWQtYm0tY3MtcHJvamVjdHMiLCJibS1iZC1wcm9qZWN0cyIsIndyaXRlLWJtLWJkLXByb2plY3RzIiwicmVhZC1ibS1iZC1wcm9qZWN0cyIsImZpbGVzY2FubmluZyIsIndyaXRlLWZpbGVzY2FubmluZyIsInJlYWQtZmlsZXNjYW5uaW5nIiwibWV0YWRhdGEiLCJyZWFkLW1ldGFkYXRhIl19.M_scy8pgSQPyNjqLndbpGRaeY-91pPNNzS9_FLYYWxaWNHY_L8mQxqDRFaCQ-VdcO-UOiHIK6UHxhGnFVeadZwBco90JdMY6wGXuwfjfUpKWc3MY-PFJGcJfKZEiy6JQbwcdaHuRnnDcv6E1WfAiL_vn5VMXCVCxVRz6W640LKh8OffUXS0Gpt0tYllYkZP9SKGBh4BEXWYQvYpcQMLnXBUIJKof-qRvUgxqLYVYgLJRdw9JFH7vnFS5dBUoesw5xPcN5A7Mrcr7caMMRV_ktiGNiMFZieTEqMxk-tgeOCLXfmMkz6q65LWmiYfmqaAVCRN3JkGKX3rH-QZ-Rv6e9BT3NgbKK76G6kEw1F86yI0nzHSesQoXfMxPzgpweqv_0RIy4vNjv1-0FqbEwLt5jniO-uBE1p3O0lHeMdQJLzBeEKGxdFSgaO5a6BnteXDwEVfzJUiWp1hjV28XnmOiPAu9ykVswPAMHe4TJFKoJL2DmrAafWNqbzYMSKEupUwTD7qnMf6hnMgjuMLkOuElIXVAwPB3OxXXkKuLGc1nTuyNSJ1SQMF36nUltkhx7ROnBrkslhQBXUKnufJDRwbeSVMXX4CtNgr-bNbySsRI0FLUh_qpfnFljfKqv2lIOBCC-GHq73dhC0OJb8S-kYwKBWbXCzOXyDOUw-JanxEXjDk";

const BASE_URL = `https://api-${REGION}.acrcloud.com/api/fs-containers/${CONTAINER_ID}`;

const MAX_POLL_ATTEMPTS = 30;
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
    uploadForm.append("file", new Blob([audioBuffer], { type: audioFile.type || "audio/webm" }), filename);
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

    // Step 2: Poll for results (async processing)
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
      const file = resultData.data?.[0] || resultData.data;

      if (!file) continue;

      // state: 0=processing, 1=ready, -1=no results
      if (file.state === 1) {
        // Results ready
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
      // state === 0: still processing, continue polling
    }

    // Timeout
    return NextResponse.json({
      status: { code: -1, msg: "Processing timeout — file may still be analyzing. Check back later." },
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
