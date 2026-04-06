"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white border-b border-blue-100 px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold fade-blue-text">
          Voice Transcription
        </Link>
        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <span className="text-gray-400">Loading...</span>
          ) : session ? (
            <>
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <Link
                href="/upload"
                className="px-4 py-2 fade-blue-button text-white rounded-lg text-sm font-medium"
              >
                Upload
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 fade-blue-button text-white rounded-lg text-sm font-medium"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}