"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiGetNotifications, apiMarkAllRead, apiMarkOneRead, type ApiNotification } from "@/lib/api";

const T = "#00F5D4";

const TYPE_ICON: Record<string, string> = {
  upload_complete: "☁",
  cert_generated:  "🔐",
  collab_invite:   "📩",
  collab_approved: "✅",
  collab_rejected: "✕",
  task_assigned:   "📦",
  version_created: "🔖",
};

const TYPE_COLOR: Record<string, string> = {
  upload_complete: T,
  cert_generated:  "#BF5FFF",
  collab_invite:   "#F5A623",
  collab_approved: T,
  collab_rejected: "#ff6b6b",
  task_assigned:   "#F5A623",
  version_created: "#BF5FFF",
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const data = await apiGetNotifications(p);
      setItems(data.items);
      setTotal(data.total);
      setUnread(data.unread_count);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  async function handleMarkAll() {
    setMarking(true);
    try {
      await apiMarkAllRead();
      await fetchPage(page);
    } finally {
      setMarking(false);
    }
  }

  async function handleMarkOne(id: number) {
    try {
      await apiMarkOneRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(c => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
        <p style={{ color: "#555" }}>请先登录以查看通知</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>通知</h1>
            <p className="text-sm mt-0.5" style={{ color: "#555" }}>
              {loading ? "加载中…" : `共 ${total} 条${unread > 0 ? `，${unread} 条未读` : ""}`}
            </p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAll} disabled={marking}
              className="text-xs px-4 py-2 rounded-full border transition-all"
              style={{ borderColor: "rgba(0,245,212,0.3)", color: marking ? "#444" : T }}>
              {marking ? "标记中…" : "全部已读"}
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse h-20"
                style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#3a3a3a" }}>
            <div className="text-5xl mb-4">🔔</div>
            <p>暂无通知</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                style={{
                  background: n.is_read ? "rgba(255,255,255,0.02)" : "rgba(0,245,212,0.04)",
                  border: `1px solid ${n.is_read ? "rgba(255,255,255,0.06)" : "rgba(0,245,212,0.12)"}`,
                }}
                onClick={() => !n.is_read && handleMarkOne(n.id)}>

                {/* Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: `${TYPE_COLOR[n.type] ?? "#666"}14` }}>
                  {TYPE_ICON[n.type] ?? "●"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium leading-snug truncate"
                      style={{ color: n.is_read ? "#888" : "#ddd" }}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: T }} />
                    )}
                  </div>
                  <p className="text-xs leading-relaxed mb-2 whitespace-pre-line"
                    style={{ color: n.is_read ? "#444" : "#666" }}>
                    {n.content}
                  </p>
                  <p className="text-xs" style={{ color: "#333" }}>
                    {new Date(n.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => fetchPage(page - 1)} disabled={page <= 1}
              className="px-4 py-2 rounded-xl text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page <= 1 ? "#333" : "#777" }}>
              ← 上一页
            </button>
            <span className="text-xs" style={{ color: "#555" }}>{page} / {totalPages}</span>
            <button onClick={() => fetchPage(page + 1)} disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page >= totalPages ? "#333" : "#777" }}>
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
