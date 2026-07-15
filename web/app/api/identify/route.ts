import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ACCESS_KEY = "5aa990706d6b3744528ee64cc86ae342";
const ACCESS_SECRET = "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU";
const HOST = "https://identify-eu-west-1.acrcloud.com";

// ACRCloud recommends < 1MB files. We'll cap at 1MB.
const MAX_SAMPLE_SIZE = 1 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Read the audio file, cap at MAX_SAMPLE_SIZE
    let audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    if (audioBuffer.length > MAX_SAMPLE_SIZE) {
      audioBuffer = audioBuffer.subarray(0, MAX_SAMPLE_SIZE);
    }

    const sampleBytes = audioBuffer.length;

    // Determine mime type from filename
    const filename = audioFile.name || "sample.audio";
    const ext = filename.split(".").pop()?.toLowerCase() || "webm";
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      flac: "audio/flac",
      aac: "audio/aac",
      wma: "audio/x-ms-wma",
      webm: "audio/webm",
    };
    const mimeType = mimeMap[ext] || "audio/mpeg";

    // Build ACRCloud signature
    const httpMethod = "POST";
    const httpUri = "/v1/identify";
    const dataType = "audio";
    const signatureVersion = "1";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const stringToSign = httpMethod + "\n" + httpUri + "\n" + ACCESS_KEY + "\n" + dataType + "\n" + signatureVersion + "\n" + timestamp;

    const signature = crypto
      .createHmac("sha1", ACCESS_SECRET)
      .update(Buffer.from(stringToSign, "utf-8"))
      .digest("base64");

    // Build multipart form for ACRCloud
    const acrFormData = new FormData();
    acrFormData.append("access_key", ACCESS_KEY);
    acrFormData.append("sample_bytes", sampleBytes.toString());
    acrFormData.append("timestamp", timestamp);
    acrFormData.append("signature", signature);
    acrFormData.append("data_type", dataType);
    acrFormData.append("signature_version", signatureVersion);
    acrFormData.append(
      "sample",
      new Blob([audioBuffer], { type: mimeType }),
      filename
    );

    // Send to ACRCloud
    const response = await fetch(`${HOST}/v1/identify`, {
      method: "POST",
      body: acrFormData,
    });

    const result = await response.json();

    // Log for debugging
    console.log("ACRCloud:", {
      code: result.status?.code,
      msg: result.status?.msg,
      sampleBytes,
      mimeType,
      hasMusic: !!(result.metadata?.music?.length),
      hasHumming: !!(result.metadata?.humming?.length),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("ACRCloud error:", error);
    return NextResponse.json(
      { error: "Failed to identify audio", details: String(error) },
      { status: 500 }
    );
  }
}
