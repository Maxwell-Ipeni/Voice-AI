"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import { saveFileToConvex, getFilesFromConvex, updateTranscriptionInConvex, deleteFileFromConvex } from "@/utils/convex";
import { Id } from "@/utils/convex";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface FileRecord {
  _id: Id<"files">;
  _creationTime: number;
  name: string;
  url: string;
  ufsUrl: string;
  size: number;
  contentType: string;
  uploadedAt: number;
  transcription?: string;
  transcriptionStatus?: "pending" | "completed" | "failed";
}

interface TranscriptionResponse {
  url: string;
  transcription: string;
}

interface AnalysisResponse {
  analysis: {
    segments: {
      id: string;
      speaker: string;
      role: string;
      content: string;
      sentiment: "positive" | "neutral" | "negative";
      topic: string;
    }[];
    metrics: {
      customerSatisfactionScore: number;
      issueResolutionStatus: "resolved" | "unresolved" | "pending";
      totalSegments: number;
      positiveSegments: number;
      neutralSegments: number;
      negativeSegments: number;
    };
    overallSummary: string;
    speakers: { name: string; role: string }[];
  };
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResponse["analysis"]>>({});

  const loadFiles = useCallback(async () => {
    try {
      const data = await getFilesFromConvex();
      setFiles(data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadComplete = async (res: Array<{
    name: string;
    url: string;
    ufsUrl: string;
    size: number;
    type: string;
  }> | undefined) => {
    if (!res?.length) return;
    setUploading(true);
    try {
      for (const file of res) {
        await saveFileToConvex({
          name: file.name,
          url: file.url,
          ufsUrl: file.ufsUrl,
          size: file.size,
          contentType: file.type,
        });
      }
      await loadFiles();
    } catch (err) {
      console.error("Failed to save files:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleTranscribe = async (fileId: string, ufsUrl: string) => {
    setTranscribingIds((prev) => new Set(prev).add(fileId));
    try {
      const response = await axios.post<TranscriptionResponse>("/api/transcribe", {
        url: ufsUrl,
      });
      await updateTranscriptionInConvex(fileId as Id<"files">, response.data.transcription);
      await loadFiles();
    } catch (err) {
      console.error("Transcription failed:", err);
    } finally {
      setTranscribingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleAnalyze = async (fileId: string, transcription: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(fileId));
    try {
      const response = await axios.post<AnalysisResponse>("/api/analyze", {
        transcription,
      });
      setAnalysisResults((prev) => ({
        ...prev,
        [fileId]: response.data.analysis,
      }));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        alert(`Analysis failed: ${err.response.data.error}`);
      } else {
        console.error("Analysis failed:", err);
        alert("Analysis failed. Please try again.");
      }
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFileFromConvex(fileId as Id<"files">);
      setAnalysisResults((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      await loadFiles();
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const handleDownloadTranscription = (file: FileRecord) => {
    if (!file.transcription) return;
    const blob = new Blob([file.transcription], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}_transcription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-gray-500 mb-6">Please sign in to access the transcription service</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="blue-card rounded-xl p-6 mb-6">
          <UploadDropzone
            endpoint="mediaUpload"
            appearance={{
              container: {
                background: "transparent",
                border: "2px dashed #93c5fd",
                borderRadius: "12px",
              },
              label: {
                color: "#1e3a5f",
              },
              button: {
                background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
                borderRadius: "8px",
                color: "white",
                fontWeight: "600",
              },
              allowedContent: {
                color: "#64748b",
              },
            }}
            onClientUploadComplete={handleUploadComplete}
            onUploadBegin={() => setUploading(true)}
            onUploadError={(error: Error) => console.error(error)}
          />
          {uploading && (
            <p className="text-center text-blue-600 mt-4">Uploading...</p>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No files uploaded yet</div>
          ) : (
            files.map((file) => (
              <div key={file._id} className="blue-card rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <audio controls src={file.ufsUrl} className="h-8 w-32" />
                    <StatusIndicator status={file.transcriptionStatus} />
                    {file.transcriptionStatus !== "completed" && (
                      <button
                        onClick={() => handleTranscribe(file._id, file.ufsUrl)}
                        disabled={transcribingIds.has(file._id)}
                        className="px-4 py-2 fade-blue-button text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {transcribingIds.has(file._id) ? "Processing..." : "Transcribe"}
                      </button>
                    )}
                    {file.transcriptionStatus === "completed" && (
                      <>
                        <button
                          onClick={() => handleDownloadTranscription(file)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                        >
                          Download
                        </button>
                        {!analysisResults[file._id] && (
                          <button
                            onClick={() => handleAnalyze(file._id, file.transcription!)}
                            disabled={analyzingIds.has(file._id)}
                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 disabled:opacity-50"
                          >
                            {analyzingIds.has(file._id) ? "Analyzing..." : "Analyze"}
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedId(expandedId === file._id ? null : file._id)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                        >
                          {expandedId === file._id ? "Hide" : "View"}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(file._id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedId === file._id && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    {file.transcription && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-600">Transcription:</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(file.transcription!)}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
                          {file.transcription}
                        </p>
                      </div>
                    )}
                    {analysisResults[file._id] && (
                      <AnalysisDisplay analysis={analysisResults[file._id]} />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status?: string }) {
  if (status === "completed") {
    return <span className="text-sm text-green-600 font-medium">Ready</span>;
  }
  if (status === "pending") {
    return <span className="text-sm text-yellow-600 font-medium">Pending</span>;
  }
  if (status === "failed") {
    return <span className="text-sm text-red-600 font-medium">Failed</span>;
  }
  return null;
}

function AnalysisDisplay({ analysis }: { analysis: AnalysisResponse["analysis"] }) {
  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-green-100 text-green-700";
    if (sentiment === "negative") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-lg font-semibold mb-4">Conversation Analysis</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Satisfaction Score</p>
          <p className={`text-2xl font-bold ${getScoreColor(analysis.metrics.customerSatisfactionScore)}`}>
            {analysis.metrics.customerSatisfactionScore}%
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Issue Resolution</p>
          <p className={`text-lg font-semibold ${analysis.metrics.issueResolutionStatus === "resolved" ? "text-green-600" : analysis.metrics.issueResolutionStatus === "pending" ? "text-yellow-600" : "text-red-600"}`}>
            {analysis.metrics.issueResolutionStatus.charAt(0).toUpperCase() + analysis.metrics.issueResolutionStatus.slice(1)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Positive Segments</p>
          <p className="text-2xl font-bold text-green-600">{analysis.metrics.positiveSegments}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Negative Segments</p>
          <p className="text-2xl font-bold text-red-600">{analysis.metrics.negativeSegments}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Overall Summary</h4>
        <p className="text-gray-700">{analysis.overallSummary}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Speakers</h4>
        <div className="flex gap-2">
          {analysis.speakers.map((speaker, i) => (
            <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {speaker.name} ({speaker.role})
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">Segment Details</h4>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {analysis.segments.map((segment, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-800">
                  {segment.speaker} <span className="text-gray-500 text-sm">({segment.role})</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(segment.sentiment)}`}>
                  {segment.sentiment}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{segment.content}</p>
              <span className="text-xs text-gray-400">Topic: {segment.topic}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}