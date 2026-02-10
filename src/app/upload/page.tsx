"use client";

import { UploadDropzone } from "@/utils/uploadthing";

export default function UploadPage() {
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
          alert("Upload complete!");
          console.log(res);
        }}
        onUploadError={(error: Error) => {
          alert(`ERROR: ${error.message}`);
        }}
      />
    </main>
  );
}
