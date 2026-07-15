import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ACCESS_KEY = "5aa990706d6b3744528ee64cc86ae342";
const ACCESS_SECRET = "54VvG3x6bti00ubtWtlmQ5QZsc7qJHWICikYT1jU";
// ACRCloud hosts: identify-eu-west-1, identify-us-west-2, identify-ap-southeast-1
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

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const sampleBytes = audioBuffer.length;

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
      new Blob([audioBuffer], { type: "audio/wav" }),
      "sample.wav"
    );

    const response = await fetch(`${HOST}/v1/identify`, {
      method: "POST",
      body: acrFormData,
    });

    const result = await response.json();

    // Log for debugging (visible in Vercel function logs)
    if (result.status?.code !== 0 && result.status?.code !== 1001) {
      console.error("ACRCloud error:", JSON.stringify(result));
      console.error("Used access_key:", ACCESS_KEY);
      console.error("Timestamp:", timestamp);
      console.error("Sample bytes:", sampleBytes);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("ACRCloud identification error:", error);
    return NextResponse.json(
      { error: "Failed to identify audio", details: String(error) },
      { status: 500 }
    );
  }
}
