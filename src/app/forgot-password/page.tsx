"use client";

import { useState } from "react";
import Link from "next/link";

const T = "#00F5D4";
const API = "http://localhost:8001";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Request failed");
      }
      setSent(true);
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
          <p className="text-xs" style={{ color: "#555" }}>Password Recovery</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,245,212,0.1)", border: "1px solid rgba(0,245,212,0.25)" }}>
              <span style={{ color: T, fontSize: 24 }}>✉</span>
            </div>
            <h2 className="font-semibold mb-2" style={{ color: "#ddd" }}>Check your email</h2>
            <p className="text-xs mb-6" style={{ color: "#555" }}>
              If that email is registered, we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <Link href="/" className="text-xs" style={{ color: T }}>Back to Home</Link>
          </div>
        ) : (
          <>
            <h2 className="font-semibold mb-1" style={{ color: "#ddd" }}>Forgot your password?</h2>
            <p className="text-xs mb-5" style={{ color: "#555" }}>
              Enter your email address and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                style={inputStyle}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              {error && (
                <div className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: loading ? "rgba(0,245,212,0.4)" : T, color: "#050508", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/" className="text-xs" style={{ color: "#555" }}>
                ← Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
