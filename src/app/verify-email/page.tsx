"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const T = "#00F5D4";
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`${API}/api/users/auth/verify-email/${token}`)
      .then(r => { setStatus(r.ok ? "success" : "error"); })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050508" }}>
      <div className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: "#0d0d12", border: "1px solid rgba(0,245,212,0.15)" }}>
        <div className="text-xl font-bold tracking-widest mb-6" style={{ color: T }}>WuuW</div>

        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto mb-4"
              style={{ borderColor: T, borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "#666" }}>Verifying…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,245,212,0.1)", border: "1px solid rgba(0,245,212,0.3)" }}>
              <span style={{ color: T, fontSize: 28 }}>✓</span>
            </div>
            <h2 className="font-semibold text-lg mb-2" style={{ color: "#ddd" }}>Email Verified!</h2>
            <p className="text-xs mb-6" style={{ color: "#555" }}>
              Your account is now verified. You can use all platform features.
            </p>
            <Link href="/"
              className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: T, color: "#050508" }}>
              Go to Home
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)" }}>
              <span style={{ color: "#f66", fontSize: 28 }}>✕</span>
            </div>
            <h2 className="font-semibold text-lg mb-2" style={{ color: "#ddd" }}>Verification Failed</h2>
            <p className="text-xs mb-6" style={{ color: "#555" }}>
              The link may have expired or already been used.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/"
                className="inline-block px-5 py-2 rounded-full text-sm font-medium border"
                style={{ borderColor: "rgba(0,245,212,0.3)", color: T }}>
                Back to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ background: "#050508", minHeight: "100vh" }} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
