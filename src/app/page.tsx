import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex-col items-left justify-left p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">File Upload</h1>
      <p className="text-gray-600 mb-6 text-left max-w-md">
        Upload audio and video files securely.
      </p>
      <Link
        href="/upload"
        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-lg"
      >
        Go to Upload Page
      </Link>
    </main>
  );
}
