"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiAdminReports, apiAdminHandleReport, type ApiAdminReport } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const T = "#00F5D4";

const ACTIONS = [
  { key: "ignore", zh: "忽略",   en: "Ignore",  color: "#666" },
  { key: "warn",   zh: "警告",   en: "Warn",    color: "#F5A623" },
  { key: "delete", zh: "删除内容", en: "Delete",  color: "#f56" },
  { key: "ban",    zh: "封禁用户", en: "Ban",     color: "#f56" },
];

export default function AdminReportsPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const zh = lang === "zh";

  const [reports, setReports] = useState<ApiAdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<number | null>(null);
  const [noteModal, setNoteModal] = useState<{ report: ApiAdminReport; action: string } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await apiAdminReports({ status: statusFilter, page });
      setReports(r.items); setTotal(r.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [isLoggedIn, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(reportId: number, action: string, noteText?: string) {
    setActing(reportId);
    try {
      await apiAdminHandleReport(reportId, action, noteText);
      setNoteModal(null); setNote("");
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
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-xs" style={{ color: "#555" }}>← {zh ? "后台" : "Admin"}</Link>
          <h1 className="text-xl font-bold" style={{ color: "#eee" }}>{zh ? "举报处理" : "Reports"}</h1>
          <span className="text-xs ml-auto" style={{ color: "#555" }}>{zh ? `共 ${total} 条` : `${total} reports`}</span>
        </div>

        <div className="flex gap-1 mb-6">
          {["pending", "resolved", "all"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: statusFilter === s ? "rgba(0,245,212,0.1)" : "rgba(255,255,255,0.04)", color: statusFilter === s ? T : "#666", border: statusFilter === s ? "1px solid rgba(0,245,212,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
              {s === "all" ? (zh ? "全部" : "All") : s === "pending" ? (zh ? "待处理" : "Pending") : (zh ? "已处理" : "Resolved")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#444" }}>
            <div className="text-3xl mb-2">🚩</div>
            <p className="text-sm">{zh ? "暂无举报" : "No reports"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)", border: r.status === "pending" ? "1px solid rgba(245,166,35,0.15)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#888" }}>{r.content_type}</span>
                      <span className="text-xs font-mono" style={{ color: "#555" }}>#{r.content_id}</span>
                      {r.status === "resolved" && r.resolve_action && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(0,245,212,0.06)", color: T }}>{r.resolve_action}</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: "#ccc" }}>{r.reason}</p>
                    <p className="text-xs mt-1" style={{ color: "#555" }}>
                      {zh ? "举报人：" : "Reporter: "}@{r.reporter_username ?? r.reporter_id} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-1 flex-wrap flex-shrink-0">
                      {ACTIONS.map(a => (
                        <button key={a.key}
                          onClick={() => {
                            if (a.key === "ban" || a.key === "delete") {
                              setNoteModal({ report: r, action: a.key }); setNote("");
                            } else {
                              handleAction(r.id, a.key);
                            }
                          }}
                          disabled={acting === r.id}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}30` }}>
                          {zh ? a.zh : a.en}
                        </button>
                      ))}
                    </div>
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

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}>
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl" style={{ background: "#0d0d12", border: "1px solid rgba(255,80,80,0.2)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "#eee" }}>
              {noteModal.action === "ban" ? (zh ? "封禁用户" : "Ban User") : (zh ? "删除内容" : "Delete Content")}
            </h2>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder={zh ? "备注（可选）" : "Note (optional)"}
              className="w-full px-3 py-2 rounded-xl text-sm mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setNoteModal(null)} className="px-4 py-2 text-sm rounded-xl" style={{ color: "#666" }}>{zh ? "取消" : "Cancel"}</button>
              <button onClick={() => handleAction(noteModal.report.id, noteModal.action, note)} disabled={acting === noteModal.report.id}
                className="px-5 py-2 text-sm font-medium rounded-xl" style={{ background: "#f56", color: "#fff" }}>
                {acting === noteModal.report.id ? "…" : (zh ? "确认" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
