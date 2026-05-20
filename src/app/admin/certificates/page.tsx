"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiAdminCerts } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const T = "#00F5D4";

export default function AdminCertificatesPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const zh = lang === "zh";

  const [certs, setCerts] = useState<{ id: number; cert_no: string; asset_no: string | null; asset_title: string | null; file_hash: string; issued_at: string | null }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deb, setDeb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await apiAdminCerts({ q: deb || undefined, page });
      setCerts(r.items); setTotal(r.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [isLoggedIn, deb, page]);

  useEffect(() => { load(); }, [load]);

  if (error) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#f56" }}>{error}</p>
    </div>
  );

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-xs" style={{ color: "#555" }}>← {zh ? "后台" : "Admin"}</Link>
          <h1 className="text-xl font-bold" style={{ color: "#eee" }}>{zh ? "证书管理" : "Certificates"}</h1>
          <span className="text-xs ml-auto" style={{ color: "#555" }}>{zh ? `共 ${total} 张` : `${total} certificates`}</span>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={zh ? "搜索证书编号/哈希…" : "Search cert no or hash…"}
          className="w-full px-4 py-2.5 rounded-xl text-sm mb-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc", outline: "none" }} />

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
        ) : certs.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#444" }}>
            <div className="text-3xl mb-2">📜</div>
            <p className="text-sm">{zh ? "暂无证书" : "No certificates"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: "rgba(191,95,255,0.1)", color: "#BF5FFF" }}>
                  📜
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium" style={{ color: "#BF5FFF" }}>{c.cert_no}</span>
                    {c.asset_no && <span className="text-xs font-mono" style={{ color: "#555" }}>{c.asset_no}</span>}
                  </div>
                  {c.asset_title && <p className="text-xs truncate mt-0.5" style={{ color: "#888" }}>{c.asset_title}</p>}
                  <p className="text-xs mt-0.5 font-mono truncate" style={{ color: "#444" }}>{c.file_hash}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {c.issued_at && (
                    <p className="text-xs" style={{ color: "#555" }}>
                      {new Date(c.issued_at).toLocaleDateString(zh ? "zh-CN" : "en-US")}
                    </p>
                  )}
                  {c.asset_no && (
                    <Link href={`/verify/${c.cert_no}`} className="text-xs underline mt-0.5 block" style={{ color: T }}>
                      {zh ? "验证" : "Verify"}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded text-xs"
                style={{ background: p === page ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)", color: p === page ? T : "#666", border: p === page ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)" }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
