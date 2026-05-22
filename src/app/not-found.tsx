'use client';

import Link from "next/link";

const T = "#00F5D4";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "#050508" }}>
      <div className="font-bold mb-4 select-none"
        style={{ fontSize: 120, color: "rgba(0,245,212,0.07)", letterSpacing: "-0.05em", lineHeight: 1 }}>
        404
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
        style={{ background: "rgba(0,245,212,0.08)", border: "1px solid rgba(0,245,212,0.2)" }}>
        <span style={{ color: T, fontSize: 22 }}>◎</span>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#ddd" }}>Page not found</h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "#444" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/"
        className="px-7 py-2.5 rounded-full text-sm font-semibold transition-all"
        style={{ background: T, color: "#050508", boxShadow: "0 0 20px rgba(0,245,212,0.25)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px rgba(0,245,212,0.45)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,245,212,0.25)"; }}>
        Back to Home
      </Link>
    </div>
  );
}
