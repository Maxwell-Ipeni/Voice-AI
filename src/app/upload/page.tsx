"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import { saveFileToConvex, getFilesFromConvex, updateTranscriptionInConvex, deleteFileFromConvex } from "@/utils/convex";
import { Id } from "@/utils/convex";
import axios from "axios";

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

export default function UploadPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFileFromConvex(fileId as Id<"files">);
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold fade-blue-text">
            Audio Transcription
          </h1>
          <p className="text-gray-500 mt-2">Upload audio files to transcribe</p>
        </div>

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
            <p className="text-center text-blue-600 mt-4">
              Uploading...
            </p>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No files uploaded yet
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file._id}
                className="blue-card rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
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

                {expandedId === file._id && file.transcription && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-sm font-medium text-gray-600 mb-2">Transcription:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{file.transcription}</p>
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
    return (
      <span className="text-sm text-green-600 font-medium">
        Ready
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="text-sm text-yellow-600 font-medium">
        Pending
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-sm text-red-600 font-medium">
        Failed
      </span>
    );
  }
  return null;
}
