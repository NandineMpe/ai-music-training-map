import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ACRCloud Identification API (real-time music recognition)
const ACCESS_KEY = "5aa990706d6b3744528ee64cc86ae342";
const ACCESS_SECRET = "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU";
const HOST = "https://identify-eu-west-1.acrcloud.com";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    let audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    // Cap at 1MB for ACRCloud
    if (audioBuffer.length > 1024 * 1024) {
      audioBuffer = audioBuffer.subarray(0, 1024 * 1024);
    }

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

    const acrFormData = new FormData();
    acrFormData.append("access_key", ACCESS_KEY);
    acrFormData.append("sample_bytes", audioBuffer.length.toString());
    acrFormData.append("timestamp", timestamp);
    acrFormData.append("signature", signature);
    acrFormData.append("data_type", dataType);
    acrFormData.append("signature_version", signatureVersion);
    acrFormData.append(
      "sample",
      new Blob([new Uint8Array(audioBuffer)], { type: audioFile.type || "audio/webm" }),
      audioFile.name || "sample.webm"
    );

    const response = await fetch(`${HOST}/v1/identify`, {
      method: "POST",
      body: acrFormData,
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Identification error:", error);
    return NextResponse.json(
      { error: "Failed to identify audio", details: String(error) },
      { status: 500 }
    );
  }
}
