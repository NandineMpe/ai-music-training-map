import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ACCESS_KEY = process.env.ACR_ACCESS_KEY || "";
const ACCESS_SECRET = process.env.ACR_ACCESS_SECRET || "";
const HOST = "https://identify-eu-west-1.acrcloud.com";

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

    // Read the audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const sampleBytes = audioBuffer.length;

    // Build ACRCloud signature
    const httpMethod = "POST";
    const httpUri = "/v1/identify";
    const dataType = "audio";
    const signatureVersion = "1";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const stringToSign = [
      httpMethod,
      httpUri,
      ACCESS_KEY,
      dataType,
      signatureVersion,
      timestamp,
    ].join("\n");

    const signature = crypto
      .createHmac("sha1", ACCESS_SECRET)
      .update(stringToSign)
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
      new Blob([audioBuffer], { type: "audio/wav" }),
      "sample.wav"
    );

    // Send to ACRCloud
    const response = await fetch(`${HOST}/v1/identify`, {
      method: "POST",
      body: acrFormData,
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("ACRCloud identification error:", error);
    return NextResponse.json(
      { error: "Failed to identify audio" },
      { status: 500 }
    );
  }
}
