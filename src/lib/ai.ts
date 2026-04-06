export interface ConversationSegment {
  id: string;
  speaker: string;
  role: string;
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  topic: string;
  startIndex: number;
  endIndex: number;
}

export interface AnalysisMetrics {
  customerSatisfactionScore: number;
  issueResolutionStatus: "resolved" | "unresolved" | "pending";
  totalSegments: number;
  positiveSegments: number;
  neutralSegments: number;
  negativeSegments: number;
}

export interface ConversationAnalysis {
  segments: ConversationSegment[];
  metrics: AnalysisMetrics;
  overallSummary: string;
  speakers: { name: string; role: string }[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 5,
  baseDelay = 3000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || "";
        
        if (errorMessage.includes("Rate limit")) {
          const waitTime = baseDelay * Math.pow(1.5, attempt);
          console.log(`Rate limited, retrying in ${Math.round(waitTime/1000)}s...`);
          await sleep(waitTime);
          continue;
        }
      }

      if (!response.ok && response.status >= 500) {
        const delay = baseDelay * Math.pow(1.5, attempt);
        console.log(`Server error ${response.status}, retrying in ${Math.round(delay/1000)}s...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = baseDelay * Math.pow(1.5, attempt);
      console.log(`Request failed: ${lastError.message}, retrying in ${Math.round(delay/1000)}s...`);
      await sleep(delay);
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

function parseJsonResponse(text: string): ConversationAnalysis | null {
  const patterns = [
    /\{[\s\S]*\}/,
    /```json\s*([\s\S]*?)\s*```/,
    /```([\s\S]*?)```/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[0].replace(/```json/, "").replace(/```/, "").trim());
        if (parsed.segments || parsed.metrics || parsed.speakers) {
          if (parsed.segments) {
            parsed.segments = parsed.segments.map((seg: Partial<ConversationSegment>) => ({
              id: seg.id || `seg-${Math.random()}`,
              speaker: seg.speaker || "Unknown",
              role: seg.role || "Unknown",
              content: seg.content || "",
              sentiment: (seg.sentiment?.toLowerCase() || "neutral") as "positive" | "neutral" | "negative",
              topic: seg.topic || "General",
              startIndex: seg.startIndex || 0,
              endIndex: seg.endIndex || 1,
            }));
          }
          return parsed as ConversationAnalysis;
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

export async function analyzeConversation(
  transcription: string,
  signal?: AbortSignal
): Promise<ConversationAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);
  
  const abortSignal = signal ? 
    (() => { 
      signal.addEventListener('abort', () => controller.abort()); 
      return controller.signal; 
    })() : 
    controller.signal;

  try {
    const response = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a conversation analyzer. Analyze the following transcript and provide a detailed breakdown in JSON format. Return ONLY valid JSON, no explanation.`
          },
          {
            role: "user",
            content: `Analyze this transcript:\n${transcription}\n\nProvide JSON with: segments (id, speaker, role, content, sentiment, topic, startIndex, endIndex), metrics (customerSatisfactionScore 0-100, issueResolutionStatus resolved/unresolved/pending, totalSegments, positiveSegments, neutralSegments, negativeSegments), overallSummary, speakers (name, role). Return ONLY valid JSON.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    }, 5, 3000);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";

    const parsed = parseJsonResponse(text);
    if (parsed) {
      return parsed;
    }
    
    throw new Error("Failed to parse AI response as valid JSON");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Analysis timed out - please try with a smaller transcript");
    }
    throw error;
  }
}

export async function analyzeConversationChunked(
  transcription: string,
  signal?: AbortSignal
): Promise<ConversationAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const CHUNK_SIZE = 8000;
  const chunks: string[] = [];
  const lines = transcription.split("\n\n");
  let currentChunk = "";
  
  for (const line of lines) {
    if ((currentChunk + "\n\n" + line).length > CHUNK_SIZE) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + line : line;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  if (chunks.length === 0) {
    throw new Error("No content to analyze");
  }

  const allSegments: ConversationSegment[] = [];
  const allSpeakers: { name: string; role: string }[] = [];
  let totalPositive = 0, totalNeutral = 0, totalNegative = 0;
  const allSummaries: string[] = [];
  let totalScore = 0;
  let scoreCount = 0;
  let resolutionStatus: "resolved" | "unresolved" | "pending" = "pending";

  for (let i = 0; i < chunks.length; i++) {
    const response = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a conversation analyzer. Analyze transcripts and provide JSON only.`
          },
          {
            role: "user",
            content: `Analyze this transcript chunk (part ${i + 1} of ${chunks.length}):\n${chunks[i]}\n\nProvide JSON with: segments (id, speaker, role, content, sentiment, topic, startIndex, endIndex), metrics (customerSatisfactionScore 0-100, issueResolutionStatus resolved/unresolved/pending, totalSegments, positiveSegments, neutralSegments, negativeSegments), overallSummary (1-2 sentences), speakers (name, role). Return ONLY valid JSON.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    }, 5, 3000);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "";
    const parsed = parseJsonResponse(text);
    
    if (parsed) {
      if (parsed.segments) {
        parsed.segments.forEach((seg: ConversationSegment, idx: number) => {
          allSegments.push({
            ...seg,
            id: `chunk${i}-${idx}`,
            startIndex: allSegments.length,
            endIndex: allSegments.length + 1,
            sentiment: (seg.sentiment?.toLowerCase() || "neutral") as "positive" | "neutral" | "negative"
          });
        });
      }
      
      if (parsed.metrics) {
        totalPositive += parsed.metrics.positiveSegments || 0;
        totalNeutral += parsed.metrics.neutralSegments || 0;
        totalNegative += parsed.metrics.negativeSegments || 0;
        if (parsed.metrics.customerSatisfactionScore) {
          totalScore += parsed.metrics.customerSatisfactionScore;
          scoreCount++;
        }
        if (parsed.metrics.issueResolutionStatus === "resolved") resolutionStatus = "resolved";
        else if (parsed.metrics.issueResolutionStatus === "unresolved" && resolutionStatus !== "resolved") resolutionStatus = "unresolved";
      }
      
      if (parsed.overallSummary) {
        allSummaries.push(parsed.overallSummary);
      }
      
      if (parsed.speakers) {
        for (const sp of parsed.speakers) {
          if (!allSpeakers.find(s => s.name === sp.name)) {
            allSpeakers.push(sp);
          }
        }
      }
    }
  }

  const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;
  const finalSummary = allSummaries.length > 0 
    ? allSummaries.slice(0, 3).join(" ") 
    : "Analysis completed from multiple chunks.";

  return {
    segments: allSegments,
    metrics: {
      customerSatisfactionScore: avgScore,
      issueResolutionStatus: resolutionStatus,
      totalSegments: allSegments.length,
      positiveSegments: totalPositive,
      neutralSegments: totalNeutral,
      negativeSegments: totalNegative,
    },
    overallSummary: finalSummary,
    speakers: allSpeakers.length > 0 ? allSpeakers : [{ name: "Unknown", role: "Unknown" }],
  };
}