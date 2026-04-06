"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold fade-blue-text mb-4">
          Voice Transcription
        </h1>
        <p className="text-gray-500 mb-8">
          Upload audio files and transcribe them to text
        </p>
        
        {status === "loading" ? (
          <p className="text-gray-400">Loading...</p>
        ) : session ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-600">Welcome, {session.user?.name || session.user?.email}</p>
            <Link
              href="/upload"
              className="inline-block px-8 py-3 fade-blue-button text-white rounded-lg font-medium"
            >
              Go to Upload
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-500">Sign in to access the transcription service</p>
            <Link
              href="/upload"
              className="inline-block px-8 py-3 fade-blue-button text-white rounded-lg font-medium"
            >
              Go to Upload
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}