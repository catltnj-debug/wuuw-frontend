"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGetProjects, apiPostProject, ApiProject } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const T = "#00F5D4";
const BG = "#050508";

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "planning", label: "规划中" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
];

const STATUS_COLOR: Record<string, string> = {
  planning: "#888",
  active: T,
  completed: "#F5A623",
  cancelled: "#444",
};
const STATUS_LABEL: Record<string, string> = {
  planning: "规划中", active: "进行中", completed: "已完成", cancelled: "已取消",
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("");
  const [search, setSearch] = useState("");
  const [deb, setDeb] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", github_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetProjects({ q: deb || undefined, status: statusTab || undefined, page });
      setProjects(res.items);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [deb, statusTab, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate() {
    if (!form.title.trim()) { setErr("项目名称不能为空"); return; }
    setSubmitting(true); setErr("");
    try {
      const p = await apiPostProject({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
      });
      setShowModal(false);
      setForm({ title: "", description: "", github_url: "" });
      setProjects(prev => [p, ...prev]);
      setTotal(t => t + 1);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "创建失败");
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>Projects</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>多人协作、股份协议、里程碑管理</p>
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}
            >
              + 新建项目
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索项目…"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }}
          />
          <div className="flex gap-1">
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => { setStatusTab(tab.key); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: statusTab === tab.key ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: statusTab === tab.key ? T : "#666",
                  border: statusTab === tab.key ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#333" }}>加载中…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#333" }}>暂无项目</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="block rounded-xl p-5 transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${STATUS_COLOR[p.status] ?? "#888"}18`, color: STATUS_COLOR[p.status] ?? "#888" }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#444" }}>{p.project_no}</span>
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#ccc" }}>{p.title}</h3>
                {p.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: "#555" }}>{p.description}</p>
                )}
                <div className="flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
                  <span className="text-xs" style={{ color: "#444" }}>@{p.creator_username}</span>
                  <span className="text-xs" style={{ color: "#333" }}>
                    👥 {p.members.length} 人 · {p.milestones.filter(m => m.completed).length}/{p.milestones.length} 里程碑
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded text-xs"
                style={{
                  background: p === page ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: p === page ? T : "#666",
                  border: p === page ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)",
                }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6"
            style={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: "#eee" }}>新建项目</h2>
            {[
              { label: "项目名称 *", key: "title", placeholder: "简洁有力的项目名" },
              { label: "简介", key: "description", placeholder: "项目目标与背景…" },
              { label: "GitHub 链接", key: "github_url", placeholder: "https://github.com/…" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="mb-4">
                <label className="text-xs mb-1 block" style={{ color: "#666" }}>{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}
                />
              </div>
            ))}
            {err && <p className="text-xs mb-3" style={{ color: "#f56" }}>{err}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#666" }}>取消</button>
              <button onClick={handleCreate} disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(0,245,212,0.15)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}>
                {submitting ? "创建中…" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
