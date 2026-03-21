import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold fade-blue-text mb-4">
          Voice Transcription
        </h1>
        <p className="text-gray-500 mb-8">
          Upload audio files and transcribe them to text
        </p>
        <Link
          href="/upload"
          className="inline-block px-8 py-3 fade-blue-button text-white rounded-lg font-medium"
        >
          Go to Upload
        </Link>
      </div>
    </div>
  );
}
