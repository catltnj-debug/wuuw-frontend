"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiAdminModels, apiAdminSetModelStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const T = "#00F5D4";
const STATUS_COLOR: Record<string, string> = { active: T, draft: "#888", deleted: "#f56" };

export default function AdminModelsPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const zh = lang === "zh";

  const [models, setModels] = useState<{ id: number; asset_no: string; title: string; status: string; file_format: string; creator: string; created_at: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deb, setDeb] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await apiAdminModels({ q: deb || undefined, status: statusFilter || undefined, page });
      setModels(r.items); setTotal(r.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [isLoggedIn, deb, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: string) {
    setActing(id);
    try {
      await apiAdminSetModelStatus(id, status);
      await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
    finally { setActing(null); }
  }

  if (error) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#f56" }}>{error}</p>
    </div>
  );

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-xs" style={{ color: "#555" }}>← {zh ? "后台" : "Admin"}</Link>
          <h1 className="text-xl font-bold" style={{ color: "#eee" }}>{zh ? "模型管理" : "Models"}</h1>
          <span className="text-xs ml-auto" style={{ color: "#555" }}>{zh ? `共 ${total} 个` : `${total} models`}</span>
        </div>

        <div className="flex gap-3 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={zh ? "搜索标题/编号…" : "Search…"}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc", outline: "none" }} />
          <div className="flex gap-1">
            {["", "active", "draft", "deleted"].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: statusFilter === s ? "rgba(0,245,212,0.1)" : "rgba(255,255,255,0.04)", color: statusFilter === s ? T : "#666", border: statusFilter === s ? "1px solid rgba(0,245,212,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                {s || (zh ? "全部" : "All")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
        ) : (
          <div className="space-y-2">
            {models.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(0,245,212,0.06)", color: T }}>{m.file_format}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/assets/${m.id}`} className="text-sm font-medium hover:underline" style={{ color: "#ccc" }}>{m.title}</Link>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[m.status] ?? "#888"}18`, color: STATUS_COLOR[m.status] ?? "#888" }}>{m.status}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#555" }}>{m.asset_no} · @{m.creator} · {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {m.status !== "active" && (
                    <button onClick={() => setStatus(m.id, "active")} disabled={acting === m.id}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(0,245,212,0.1)", color: T }}>
                      {zh ? "上架" : "Publish"}
                    </button>
                  )}
                  {m.status !== "deleted" && (
                    <button onClick={() => setStatus(m.id, "deleted")} disabled={acting === m.id}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(255,80,80,0.08)", color: "#f56", border: "1px solid rgba(255,80,80,0.2)" }}>
                      {zh ? "下架" : "Remove"}
                    </button>
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
