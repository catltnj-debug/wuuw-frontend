"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGetIdeas, apiPostIdea, ApiIdea } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";
const BG = "#050508";

const STATUS_COLOR: Record<string, string> = {
  open: T,
  in_project: "#F5A623",
  completed: "#888",
};

export default function IdeasPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.ideas;
  const S = COPY[lang].status;

  const STATUS_TABS = [
    { key: "", label: L.tabs.all },
    { key: "open", label: L.tabs.open },
    { key: "in_project", label: L.tabs.in_project },
    { key: "completed", label: L.tabs.completed },
  ];

  const STATUS_LABEL: Record<string, string> = {
    open: S.open,
    in_project: S.in_progress,
    completed: S.completed,
  };

  const [ideas, setIdeas] = useState<ApiIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("");
  const [search, setSearch] = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetIdeas({
        q: debSearch || undefined,
        status: statusTab || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setIdeas(res.items);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [debSearch, statusTab, page]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  async function handleSubmit() {
    if (!newTitle.trim()) { setErr(lang === "zh" ? "标题不能为空" : "Title required"); return; }
    setSubmitting(true); setErr("");
    try {
      const created = await apiPostIdea(newTitle.trim(), newDesc.trim() || undefined);
      setShowModal(false); setNewTitle(""); setNewDesc("");
      setIdeas(prev => [created, ...prev]);
      setTotal(t => t + 1);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>{L.title}</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>{L.subtitle}</p>
          </div>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}
            >
              {L.publish}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={L.searchPlaceholder}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }}
          />
          <div className="flex gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setStatusTab(tab.key); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: statusTab === tab.key ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: statusTab === tab.key ? T : "#666",
                  border: statusTab === tab.key ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#333" }}>{COPY[lang].common.loading}</div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#333" }}>{L.noIdeas}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {ideas.map(idea => (
              <Link
                key={idea.id}
                href={`/ideas/${idea.id}`}
                className="block rounded-xl p-5 transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: `${STATUS_COLOR[idea.status] ?? "#888"}18`,
                      color: STATUS_COLOR[idea.status] ?? "#888",
                    }}
                  >
                    {STATUS_LABEL[idea.status] ?? idea.status}
                  </span>
                  <span className="text-xs" style={{ color: "#444" }}>👁 {idea.views_count}</span>
                </div>

                <h3 className="text-sm font-semibold mb-2 line-clamp-2" style={{ color: "#ccc" }}>
                  {idea.title}
                </h3>

                {idea.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: "#555" }}>
                    {idea.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-xs" style={{ color: "#444" }}>@{idea.creator_username}</span>
                  <span className="text-xs" style={{ color: "#333" }}>💬 {idea.discussion_count}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-8 h-8 rounded text-xs transition-all"
                style={{
                  background: p === page ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: p === page ? T : "#666",
                  border: p === page ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-2xl p-6"
            style={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-lg font-semibold mb-5" style={{ color: "#eee" }}>{L.publish}</h2>

            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.formTitle}</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={L.formTitle}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}
              />
            </div>

            <div className="mb-5">
              <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.formDesc}</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={4}
                placeholder={L.formDesc}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}
              />
            </div>

            {err && <p className="text-xs mb-3" style={{ color: "#f56" }}>{err}</p>}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: "#666" }}
              >
                {COPY[lang].common.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: "rgba(0,245,212,0.15)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}
              >
                {submitting ? COPY[lang].common.publishing : COPY[lang].common.publish}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
