import { NextResponse } from "next/server";
import crypto from "crypto";

const ACCESS_KEY = "OO3AnK9YWPL9EGnh";
const ACCESS_SECRET = "DANwQn2sPiMm3ZY6WMTbu6VSj3hadaGq";
const HOST = "https://identify-eu-west-1.acrcloud.com";

export async function GET() {
  // Test the credentials by sending a tiny silent audio sample
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

  // Create a minimal WAV file (silent, 1 second)
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const wavBuffer = createWav(numSamples, sampleRate);

  const acrFormData = new FormData();
  acrFormData.append("access_key", ACCESS_KEY);
  acrFormData.append("sample_bytes", wavBuffer.length.toString());
  acrFormData.append("timestamp", timestamp);
  acrFormData.append("signature", signature);
  acrFormData.append("data_type", dataType);
  acrFormData.append("signature_version", signatureVersion);
  acrFormData.append(
    "sample",
    new Blob([wavBuffer], { type: "audio/wav" }),
    "test.wav"
  );

  try {
    const response = await fetch(`${HOST}/v1/identify`, {
      method: "POST",
      body: acrFormData,
    });

    const result = await response.json();

    return NextResponse.json({
      acr_response: result,
      debug: {
        access_key: ACCESS_KEY,
        host: HOST,
        timestamp,
        sample_bytes: wavBuffer.length,
        signature_preview: signature.substring(0, 10) + "...",
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      debug: {
        access_key: ACCESS_KEY,
        host: HOST,
        timestamp,
      },
    });
  }
}

function createWav(numSamples: number, sampleRate: number): Buffer {
  const buffer = Buffer.alloc(44 + numSamples * 2);
  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  // Silence (zeros already)
  return buffer;
}
