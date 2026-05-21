"use client";

import { useEffect } from "react";
import Link from "next/link";

const T = "#00F5D4";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "#050508" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)" }}>
        <span style={{ color: "#f66", fontSize: 28 }}>⚠</span>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#ddd" }}>Something went wrong</h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "#444" }}>
        An unexpected error occurred. You can try again or return to the home page.
      </p>
      <div className="flex gap-3">
        <button onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: T, color: "#050508" }}>
          Try again
        </button>
        <Link href="/"
          className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{ border: "1px solid rgba(0,245,212,0.3)", color: T }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
