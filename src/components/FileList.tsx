"use client";

import { useEffect, useState } from "react";
import { getFilesFromConvex } from "@/utils/convex";
import Link from "next/link";

interface FileRecord {
  _id: string;
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

export default function FileList() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        const data = await getFilesFromConvex();
        setFiles(data);
      } catch (err) {
        console.error("Failed to load files:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No files uploaded yet.</p>
        <Link
          href="/upload"
          className="text-blue-600 hover:underline"
        >
          Upload your first file
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div
          key={file._id}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(file.uploadedAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB • {file.contentType}
              </p>
            </div>
            <div className="ml-4">
              <StatusBadge status={file.transcriptionStatus} />
            </div>
          </div>
          {file.transcription && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Transcription:</p>
              <p className="text-sm text-gray-600 line-clamp-3">{file.transcription}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Transcribed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Failed
      </span>
    );
  }
  return null;
}
