"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const T = "#00F5D4";
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token.");
  }, [token]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push("/"), 2500);
      return () => clearTimeout(t);
    }
  }, [success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Reset failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e0e0e0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#050508" }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "#0d0d12", border: "1px solid rgba(0,245,212,0.15)" }}>
        <div className="text-center mb-6">
          <div className="text-xl font-bold tracking-widest mb-1" style={{ color: T }}>WuuW</div>
          <p className="text-xs" style={{ color: "#555" }}>Set New Password</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,245,212,0.1)", border: "1px solid rgba(0,245,212,0.25)" }}>
              <span style={{ color: T, fontSize: 26 }}>✓</span>
            </div>
            <h2 className="font-semibold mb-2" style={{ color: "#ddd" }}>Password reset!</h2>
            <p className="text-xs" style={{ color: "#555" }}>Redirecting to home in a moment…</p>
          </div>
        ) : (
          <>
            <h2 className="font-semibold mb-1" style={{ color: "#ddd" }}>Reset your password</h2>
            <p className="text-xs mb-5" style={{ color: "#555" }}>Enter a new password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input style={inputStyle} type="password" placeholder="New password" value={password}
                onChange={e => setPassword(e.target.value)} required autoFocus />
              <input style={inputStyle} type="password" placeholder="Confirm new password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required />
              {error && (
                <div className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || !token}
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: loading ? "rgba(0,245,212,0.4)" : T, color: "#050508", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-xs" style={{ color: "#555" }}>
                Request a new link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ background: "#050508", minHeight: "100vh" }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
