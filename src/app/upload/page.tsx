"use client";

import { UploadDropzone } from "@/utils/uploadthing";

export default function UploadPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-10">
      <h1 className="text-2xl font-bold">Upload Audio or Video</h1>

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
