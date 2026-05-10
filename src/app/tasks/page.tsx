"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGetAllTasks, apiClaimTask, type ApiDiscTask } from "@/lib/api";

const T = "#00F5D4";

const STATUS_OPTIONS = [
  { value: "open",        label: "待认领" },
  { value: "claimed",     label: "已认领" },
  { value: "in_progress", label: "进行中" },
  { value: "done",        label: "已完成" },
];

const ZONE_COLOR: Record<string, string> = {
  requirement: "#F5A623",
  data:        T,
  review:      "#BF5FFF",
};

const ZONE_LABEL: Record<string, string> = {
  requirement: "需求区",
  data:        "数据区",
  review:      "评测区",
};

export default function TasksPage() {
  const { isLoggedIn } = useAuth();
  const [tasks, setTasks] = useState<ApiDiscTask[]>([]);
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  function load(s: string, p: number) {
    setLoading(true);
    apiGetAllTasks(s, p)
      .then(d => { setTasks(d.items); setTotal(d.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(status, page); }, [status, page]);

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  async function handleClaim(taskId: number) {
    setClaimingId(taskId);
    try {
      await apiClaimTask(taskId);
      load(status, page);
    } catch (e) {
      alert(e instanceof Error ? e.message : "抢单失败");
    } finally {
      setClaimingId(null);
    }
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── 标题 ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>任务市场</h1>
          <p className="text-sm" style={{ color: "#555" }}>认领社区生成的改进任务，完成后获得经验值</p>
        </div>

        {/* ── 状态筛选 ── */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "rgba(255,255,255,0.03)" }}>
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: status === opt.value ? "rgba(0,245,212,0.1)" : "transparent",
                color: status === opt.value ? T : "#555",
                border: status === opt.value ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── 任务列表 ── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#3a3a3a" }}>
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">暂无任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isLoggedIn={isLoggedIn}
                claiming={claimingId === task.id}
                onClaim={() => handleClaim(task.id)}
              />
            ))}
          </div>
        )}

        {/* ── 分页 ── */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page === 1 ? "#333" : "#777" }}>
              上一页
            </button>
            <span className="px-3 py-1.5 text-xs" style={{ color: "#555" }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page >= totalPages ? "#333" : "#777" }}>
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isLoggedIn, claiming, onClaim }: {
  task: ApiDiscTask;
  isLoggedIn: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const zoneColor = ZONE_COLOR[task.zone_type] ?? "#777";
  const zoneLabel = ZONE_LABEL[task.zone_type] ?? task.zone_name;

  return (
    <div className="p-4 rounded-2xl flex items-start gap-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* 区域标签 */}
      <div className="flex-shrink-0 mt-0.5">
        <span className="text-xs px-2 py-1 rounded-lg font-medium"
          style={{ background: `${zoneColor}12`, color: zoneColor }}>
          {zoneLabel}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1 truncate" style={{ color: "#ddd" }}>{task.title}</p>
        {task.description && (
          <p className="text-xs mb-2 line-clamp-2" style={{ color: "#666" }}>{task.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs" style={{ color: "#444" }}>
          <Link href={`/assets/${task.asset_id}`}
            className="transition-colors"
            style={{ color: "#555" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}>
            {task.asset_title}
          </Link>
          <span>·</span>
          <span>{new Date(task.created_at).toLocaleDateString("zh-CN")}</span>
          {task.assignee && (
            <>
              <span>·</span>
              <span>认领人：{task.assignee}</span>
            </>
          )}
        </div>
      </div>

      {/* 操作 */}
      <div className="flex-shrink-0">
        {task.status === "open" ? (
          isLoggedIn ? (
            <button onClick={onClaim} disabled={claiming}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: claiming ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
              {claiming ? "抢单中…" : "抢单"}
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(0,245,212,0.08)", color: T }}>
              待认领
            </span>
          )
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}>
            {task.status === "done" ? "已完成" : task.status === "claimed" ? "已认领" : "进行中"}
          </span>
        )}
      </div>
    </div>
  );
}
