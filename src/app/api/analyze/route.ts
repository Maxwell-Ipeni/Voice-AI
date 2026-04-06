import { NextRequest, NextResponse } from "next/server";
import { analyzeConversationChunked, analyzeConversation } from "@/lib/ai";

const LARGE_TRANSCRIPTION_THRESHOLD = 8000;

export async function POST(
  req: NextRequest
): Promise<NextResponse<{ analysis: unknown } | { error: string }>> {
  try {
    const { transcription } = await req.json();

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "Transcription text is required" },
        { status: 400 }
      );
    }

    const analysis = transcription.length > LARGE_TRANSCRIPTION_THRESHOLD
      ? await analyzeConversationChunked(transcription)
      : await analyzeConversation(transcription);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}