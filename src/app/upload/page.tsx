"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import { saveFileToConvex, getFilesFromConvex, updateTranscriptionInConvex } from "@/utils/convex";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const handleBulkTranscribe = async () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f._id));
    for (const file of selectedFiles) {
      if (file.transcriptionStatus !== "completed") {
        await handleTranscribe(file._id, file.ufsUrl);
      }
    }
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f._id)));
    }
  };

  const selectedPendingCount = files.filter(
    (f) => selectedIds.has(f._id) && f.transcriptionStatus !== "completed"
  ).length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Audio Transcription
          </h1>
          <p className="text-gray-400 mt-2">Upload audio files and transcribe them anytime</p>
        </div>

        <div className="bg-[#12121a] rounded-2xl border border-gray-800 p-6 mb-8">
          <UploadDropzone
            endpoint="mediaUpload"
            appearance={{
              container: {
                background: "transparent",
                border: "2px dashed #3f3f5a",
                borderRadius: "16px",
              },
              label: {
                color: "#9ca3af",
              },
              button: {
                background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                borderRadius: "10px",
                color: "white",
                fontWeight: "600",
              },
              allowedContent: {
                color: "#6b7280",
              },
            }}
            onClientUploadComplete={handleUploadComplete}
            onUploadBegin={() => setUploading(true)}
            onUploadError={(error: Error) => console.error(error)}
          />
          {uploading && (
            <p className="text-center text-cyan-400 mt-4 animate-pulse">
              Uploading...
            </p>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <span className="text-white font-medium">
                {selectedPendingCount} file{selectedPendingCount !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={handleBulkTranscribe}
                disabled={selectedPendingCount === 0}
                className="bg-white text-purple-900 px-5 py-2 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Transcribe All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-white/80 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#12121a] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-gray-500">No files uploaded yet</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-300">
                Your Files ({files.length})
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {selectedIds.size === files.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="space-y-3 pb-24">
              {files.map((file) => (
                <FileRow
                  key={file._id}
                  file={file}
                  selected={selectedIds.has(file._id)}
                  transcribing={transcribingIds.has(file._id)}
                  expanded={expandedId === file._id}
                  onToggleSelect={() => toggleSelect(file._id)}
                  onTranscribe={() => handleTranscribe(file._id, file.ufsUrl)}
                  onToggleExpand={() => setExpandedId(expandedId === file._id ? null : file._id)}
                  formatSize={formatSize}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FileRow({
  file,
  selected,
  transcribing,
  expanded,
  onToggleSelect,
  onTranscribe,
  onToggleExpand,
  formatSize,
}: {
  file: FileRecord;
  selected: boolean;
  transcribing: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onTranscribe: () => void;
  onToggleExpand: () => void;
  formatSize: (bytes: number) => string;
}) {
  return (
    <div
      className={`group bg-[#12121a] rounded-xl border transition-all duration-200 ${
        selected
          ? "border-cyan-500/50 ring-1 ring-cyan-500/20"
          : "border-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{file.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">
              {new Date(file.uploadedAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusIndicator status={file.transcriptionStatus} />
          {file.transcriptionStatus !== "completed" && (
            <button
              onClick={onTranscribe}
              disabled={transcribing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-sm font-medium hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {transcribing ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing
                </span>
              ) : (
                "Transcribe"
              )}
            </button>
          )}
          {file.transcriptionStatus === "completed" && (
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {expanded && file.transcription && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Transcription
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(file.transcription || "")}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {file.transcription}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        Ready
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        Pending
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <span className="w-2 h-2 rounded-full bg-gray-500" />
      Unknown
    </span>
  );
}
