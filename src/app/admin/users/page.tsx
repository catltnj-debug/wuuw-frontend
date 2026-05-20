"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiAdminUsers, apiAdminBanUser, type ApiAdminUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const T = "#00F5D4";

export default function AdminUsersPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const zh = lang === "zh";

  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deb, setDeb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<number | null>(null);
  const [banModal, setBanModal] = useState<ApiAdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const r = await apiAdminUsers({ q: deb || undefined, page });
      setUsers(r.items); setTotal(r.total);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [isLoggedIn, deb, page]);

  useEffect(() => { load(); }, [load]);

  async function handleBan(user: ApiAdminUser, banned: boolean) {
    setActing(user.id);
    try {
      await apiAdminBanUser(user.id, banned, banned ? (banReason || undefined) : undefined);
      setBanModal(null); setBanReason("");
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
          <h1 className="text-xl font-bold" style={{ color: "#eee" }}>{zh ? "用户管理" : "Users"}</h1>
          <span className="text-xs ml-auto" style={{ color: "#555" }}>{zh ? `共 ${total} 名` : `${total} users`}</span>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={zh ? "搜索用户名/邮箱…" : "Search username or email…"}
          className="w-full px-4 py-2.5 rounded-xl text-sm mb-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc", outline: "none" }} />

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: u.is_banned ? "1px solid rgba(255,80,80,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "rgba(0,245,212,0.1)", color: T }}>
                  {u.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "#ccc" }}>{u.username}</span>
                    {u.is_admin && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.1)", color: "#F5A623" }}>Admin</span>}
                    {u.is_banned && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,80,80,0.1)", color: "#f56" }}>{zh ? "封禁" : "Banned"}</span>}
                  </div>
                  <p className="text-xs" style={{ color: "#555" }}>{u.email} · {u.tier} · {new Date(u.created_at).toLocaleDateString()}</p>
                  {u.ban_reason && <p className="text-xs mt-0.5" style={{ color: "#f56" }}>{zh ? "原因：" : "Reason: "}{u.ban_reason}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {u.is_banned ? (
                    <button onClick={() => handleBan(u, false)} disabled={acting === u.id}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(0,245,212,0.1)", color: T }}>
                      {zh ? "解封" : "Unban"}
                    </button>
                  ) : (
                    <button onClick={() => { setBanModal(u); setBanReason(""); }}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(255,80,80,0.08)", color: "#f56", border: "1px solid rgba(255,80,80,0.2)" }}>
                      {zh ? "封禁" : "Ban"}
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

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setBanModal(null); }}>
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl" style={{ background: "#0d0d12", border: "1px solid rgba(255,80,80,0.2)" }}>
            <h2 className="font-semibold mb-4" style={{ color: "#eee" }}>{zh ? `封禁 @${banModal.username}` : `Ban @${banModal.username}`}</h2>
            <input value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder={zh ? "封禁原因（可选）" : "Reason (optional)"}
              className="w-full px-3 py-2 rounded-xl text-sm mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setBanModal(null)} className="px-4 py-2 text-sm rounded-xl" style={{ color: "#666" }}>{zh ? "取消" : "Cancel"}</button>
              <button onClick={() => handleBan(banModal, true)} disabled={acting === banModal.id}
                className="px-5 py-2 text-sm font-medium rounded-xl" style={{ background: "#f56", color: "#fff" }}>
                {acting === banModal.id ? "…" : (zh ? "确认封禁" : "Confirm Ban")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
