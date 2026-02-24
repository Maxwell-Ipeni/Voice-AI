"use client";

import { useState } from "react";
import { UploadDropzone } from "@/utils/uploadthing";
import axios from "axios";

interface UploadedFile {
  ufsUrl: string;
  name: string;
}

interface TranscriptionResponse {
  url: string;
  transcription: string;
}

interface ApiError {
  error: string;
  details?: string;
}

export default function UploadPage() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>("");

  const handleTranscribe = async () => {
    if (!uploadedFile) return;

    setIsTranscribing(true);
    setError("");
    setTranscription("");

    try {
      const response = await axios.post<TranscriptionResponse>("/api/transcribe", {
        url: uploadedFile.ufsUrl,
      });

      setTranscription(response.data.transcription);
    } catch (err) {
      const message = axios.isAxiosError<ApiError>(err)
        ? err.response?.data?.error || "Transcription failed"
        : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const clearStates = () => {
    setTranscription("");
    setError("");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-600">Upload Files</h1>
        <p className="text-gray-400 mb-4">Upload audio or video files</p>
      </div>

      <div className="w-full max-w-md bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
        <h2 className="font-semibold text-gray-700 mb-3">Maximum File Sizes</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>Audio: 16MB per file (max 2 files)</li>
          <li>Video: 256MB per file (max 1 file)</li>
        </ul>
      </div>

      <UploadDropzone
        endpoint="mediaUpload"
        onClientUploadComplete={(res) => {
          if (res?.[0]) {
            setUploadedFile({
              ufsUrl: res[0].ufsUrl,
              name: res[0].name,
            });
            clearStates();
          }
        }}
        onUploadError={(uploadError: Error) => {
          setError(`ERROR: ${uploadError.message}`);
        }}
      />

      {uploadedFile && (
        <FileCard
          file={uploadedFile}
          isTranscribing={isTranscribing}
          onTranscribe={handleTranscribe}
        />
      )}

      {error && <ErrorAlert message={error} />}

      {transcription && <TranscriptionResult text={transcription} />}
    </main>
  );
}

function FileCard({ 
  file, 
  isTranscribing, 
  onTranscribe 
}: { 
  file: UploadedFile; 
  isTranscribing: boolean; 
  onTranscribe: () => void;
}) {
  return (
    <div className="w-full max-w-md mt-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Uploaded:</span> {file.name}
        </p>
        <p className="text-xs text-gray-500 mb-4 break-all">{file.ufsUrl}</p>
        <button
          onClick={onTranscribe}
          disabled={isTranscribing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {isTranscribing ? "Transcribing..." : "Transcribe"}
        </button>
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="w-full max-w-md mt-4">
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function TranscriptionResult({ text }: { text: string }) {
  return (
    <div className="w-full max-w-md mt-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">Transcription</h3>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
