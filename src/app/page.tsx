import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">File Upload App</h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
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
