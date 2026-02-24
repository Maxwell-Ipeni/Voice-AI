import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

interface TranscriptionResponse {
  url: string;
  transcription: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<TranscriptionResponse | { error: string; details?: string }>> {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Valid audio URL is required" }, { status: 400 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "AssemblyAI API key not configured" }, { status: 500 });
    }

    const cleanUrl = url.split("?")[0];

    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    const transcript = await client.transcripts.transcribe({
      audio: cleanUrl,
      speech_models: ["universal-2"],
    });

    return NextResponse.json({
      url: cleanUrl,
      transcription: transcript.text || "",
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Transcription request failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
