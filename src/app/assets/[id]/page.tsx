"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import {
  apiGetAsset, apiGetZones, apiGetDiscussions,
  apiPostDiscussion, apiReplyDiscussion, apiLikeDiscussion,
  apiSummarize, apiConfirmSummary, apiGenerateTaskFromSummary,
  apiClaimTask, apiCompleteDiscTask,
  type ApiAssetDetail, type ApiZone, type ApiZoneContent,
  type ApiDiscussion, type ApiSummary, type ApiDiscTask,
} from "@/lib/api";

const T = "#00F5D4";
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
};

const TASK_STATUS_LABEL: Record<string, string> = {
  open: "待认领", claimed: "已认领", in_progress: "进行中", done: "已完成",
};
const TASK_STATUS_COLOR: Record<string, string> = {
  open: T, claimed: "#F5A623", in_progress: "#BF5FFF", done: "#555",
};

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = Number(params.id);
  const { user, isLoggedIn } = useAuth();

  const username = user?.username;
  const [asset, setAsset] = useState<ApiAssetDetail | null>(null);
  const [zones, setZones] = useState<ApiZone[]>([]);
  const [activeZone, setActiveZone] = useState<ApiZone | null>(null);
  const [zoneContent, setZoneContent] = useState<ApiZoneContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    if (!assetId) return;
    Promise.all([apiGetAsset(assetId), apiGetZones(assetId)])
      .then(([a, z]) => {
        setAsset(a);
        setZones(z);
        if (z.length > 0) setActiveZone(z[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assetId]);

  const loadZone = useCallback(async (zone: ApiZone) => {
    setActiveZone(zone);
    setContentLoading(true);
    try {
      const content = await apiGetDiscussions(zone.id);
      setZoneContent(content);
    } catch { /* ignore */ }
    finally { setContentLoading(false); }
  }, []);

  useEffect(() => {
    if (activeZone) loadZone(activeZone);
  }, [activeZone?.id]); // eslint-disable-line

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>加载中…</p>
    </div>
  );
  if (!asset) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>资产不存在</p>
    </div>
  );

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── 产品基本信息 ── */}
        <div className="mb-8 p-5 rounded-2xl" style={cardStyle}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{ background: "rgba(0,245,212,0.08)", color: T }}>{asset.file_format}</span>
                <span className="text-xs" style={{ color: "#555" }}>{asset.asset_no}</span>
                <span className="text-xs" style={{ color: "#555" }}>{asset.current_version}</span>
              </div>
              <h1 className="text-xl font-bold mb-1" style={{ color: "#eee" }}>{asset.title}</h1>
              <p className="text-sm mb-3" style={{ color: "#666" }}>by {asset.creator}</p>
              {asset.description && (
                <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{asset.description}</p>
              )}
            </div>
            {asset.latest_certificate && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs mb-1" style={{ color: "#555" }}>版权证书</p>
                <p className="text-xs font-mono" style={{ color: "#00F5D4" }}>{asset.latest_certificate}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 讨论区 Tabs ── */}
        {zones.length > 0 && (
          <>
            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
              {zones.map(z => (
                <button key={z.id} onClick={() => loadZone(z)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: activeZone?.id === z.id ? "rgba(0,245,212,0.1)" : "transparent",
                    color: activeZone?.id === z.id ? T : "#555",
                    border: activeZone?.id === z.id ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
                  }}>
                  {z.zone_name}
                  <span className="ml-1.5 text-xs opacity-60">({z.discussion_count})</span>
                </button>
              ))}
            </div>

            {contentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : zoneContent && activeZone ? (
              <ZonePanel
                zone={activeZone}
                content={zoneContent}
                userId={user?.id}
                username={username}
                isLoggedIn={isLoggedIn}
                onRefresh={() => loadZone(activeZone)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ── 讨论区内容面板 ────────────────────────────────────────────────────────────
function ZonePanel({
  zone, content, userId, username, isLoggedIn, onRefresh,
}: {
  zone: ApiZone;
  content: ApiZoneContent;
  userId?: number;
  username?: string;
  isLoggedIn: boolean;
  onRefresh: () => void;
}) {
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState("");

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true); setErr("");
    try {
      await apiPostDiscussion(zone.id, postText.trim());
      setPostText("");
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "发帖失败"); }
    finally { setPosting(false); }
  }

  async function handleSummarize() {
    setSummarizing(true); setErr("");
    try {
      await apiSummarize(zone.id);
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "生成失败"); }
    finally { setSummarizing(false); }
  }

  return (
    <div className="space-y-6">
      {/* 发帖框 */}
      {isLoggedIn && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <textarea rows={3} value={postText} onChange={e => setPostText(e.target.value)}
            placeholder={`在${zone.zone_name}发表你的看法…`}
            className="w-full text-sm rounded-xl p-3 resize-none mb-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
          <div className="flex items-center justify-between">
            {err && <p className="text-xs" style={{ color: "#ff6b6b" }}>{err}</p>}
            <div className="flex gap-2 ml-auto">
              <button onClick={handleSummarize} disabled={summarizing}
                className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                style={{ borderColor: "rgba(0,245,212,0.3)", color: summarizing ? "#444" : T }}>
                {summarizing ? "生成中…" : "✦ AI总结"}
              </button>
              <button onClick={handlePost} disabled={!postText.trim() || posting}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: posting || !postText.trim() ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
                {posting ? "发送中…" : "发帖"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 总结区 */}
      {content.summary && (
        <SummaryPanel summary={content.summary} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} />
      )}

      {/* 任务列表 */}
      {content.tasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>本区任务</p>
          <div className="space-y-2">
            {content.tasks.map(t => (
              <TaskRow key={t.id} task={t} username={username} isLoggedIn={isLoggedIn} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* 讨论列表 */}
      {content.discussions.length === 0 ? (
        <div className="text-center py-12" style={{ color: "#3a3a3a" }}>
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm">暂无讨论，来第一个发帖吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {content.discussions.map(d => (
            <DiscussionCard key={d.id} disc={d} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 讨论卡片 ─────────────────────────────────────────────────────────────────
function DiscussionCard({
  disc, userId, isLoggedIn, onRefresh, depth = 0,
}: {
  disc: ApiDiscussion;
  userId?: number;
  isLoggedIn: boolean;
  onRefresh: () => void;
  depth?: number;
}) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replying, setReplying] = useState(false);

  async function handleLike() {
    if (!isLoggedIn || liking) return;
    setLiking(true);
    try { await apiLikeDiscussion(disc.id); onRefresh(); }
    catch { /* ignore */ }
    finally { setLiking(false); }
  }

  async function handleReply() {
    if (!replyText.trim() || replying) return;
    setReplying(true);
    try {
      await apiReplyDiscussion(disc.id, replyText.trim());
      setReplyText(""); setShowReply(false); onRefresh();
    } catch { /* ignore */ }
    finally { setReplying(false); }
  }

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div className="p-4 rounded-2xl mb-2" style={{
        background: depth > 0 ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(0,245,212,0.1)", color: T }}>
            {disc.username[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-medium" style={{ color: T }}>{disc.username}</span>
          <span className="text-xs" style={{ color: "#3a3a3a" }}>{new Date(disc.created_at).toLocaleString("zh-CN")}</span>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "#ccc" }}>{disc.content}</p>
        <div className="flex items-center gap-4">
          <button onClick={handleLike} disabled={!isLoggedIn || liking || disc.user_id === userId}
            className="flex items-center gap-1 text-xs transition-all"
            style={{ color: "#555" }}
            onMouseEnter={e => isLoggedIn && disc.user_id !== userId && ((e.currentTarget as HTMLElement).style.color = T)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#555")}>
            ♡ {disc.likes_count}
          </button>
          {isLoggedIn && depth === 0 && (
            <button onClick={() => setShowReply(!showReply)}
              className="text-xs transition-all" style={{ color: "#555" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#555")}>
              回复
            </button>
          )}
        </div>
        {showReply && (
          <div className="mt-3 flex gap-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="写下回复…" onKeyDown={e => e.key === "Enter" && handleReply()}
              className="flex-1 text-sm rounded-lg px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <button onClick={handleReply} disabled={!replyText.trim() || replying}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: T, color: "#050508" }}>
              发送
            </button>
          </div>
        )}
      </div>
      {disc.replies?.map(r => (
        <DiscussionCard key={r.id} disc={r} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── AI 总结面板 ───────────────────────────────────────────────────────────────
function SummaryPanel({ summary, userId, isLoggedIn, onRefresh }: {
  summary: ApiSummary;
  userId?: number;
  isLoggedIn: boolean;
  onRefresh: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const alreadyConfirmed = userId ? summary.confirmed_user_ids?.includes(userId) : false;

  async function handleConfirm() {
    setConfirming(true);
    try { await apiConfirmSummary(summary.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : "确认失败"); }
    finally { setConfirming(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try { await apiGenerateTaskFromSummary(summary.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : "生成失败"); }
    finally { setGenerating(false); }
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.12)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold" style={{ color: T }}>✦ AI 总结</span>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: summary.status === "confirmed" ? "rgba(0,245,212,0.1)" : "rgba(255,166,35,0.1)", color: summary.status === "confirmed" ? T : "#F5A623" }}>
          {summary.status === "confirmed" ? "已确认" : "待确认"}
        </span>
        <span className="text-xs ml-auto" style={{ color: "#555" }}>
          {summary.confirm_count} / {summary.confirm_threshold} 人确认
        </span>
      </div>
      <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: "#bbb" }}>{summary.content}</p>
      <div className="flex gap-2">
        {isLoggedIn && summary.status !== "confirmed" && !alreadyConfirmed && (
          <button onClick={handleConfirm} disabled={confirming}
            className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(0,245,212,0.1)", color: T, border: "1px solid rgba(0,245,212,0.2)" }}>
            {confirming ? "确认中…" : "✓ 确认此总结"}
          </button>
        )}
        {isLoggedIn && summary.status === "confirmed" && !summary.task_generated && (
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: T, color: "#050508" }}>
            {generating ? "生成中…" : "生成任务 →"}
          </button>
        )}
        {summary.task_generated && (
          <span className="text-xs" style={{ color: "#555" }}>✓ 任务已生成</span>
        )}
        {alreadyConfirmed && summary.status !== "confirmed" && (
          <span className="text-xs" style={{ color: "#555" }}>✓ 已确认，等待其他人</span>
        )}
      </div>
    </div>
  );
}

// ── 任务行 ────────────────────────────────────────────────────────────────────
function TaskRow({ task, username, isLoggedIn, onRefresh }: {
  task: ApiDiscTask;
  username?: string;
  isLoggedIn: boolean;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);

  async function handleClaim() {
    setActing(true);
    try { await apiClaimTask(task.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : "抢单失败"); }
    finally { setActing(false); }
  }

  async function handleComplete() {
    setActing(true);
    try { await apiCompleteDiscTask(task.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : "操作失败"); }
    finally { setActing(false); }
  }

  const isAssignee = task.assignee && username && task.assignee === username;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "#ddd" }}>{task.title}</p>
        {task.assignee && <p className="text-xs mt-0.5" style={{ color: "#555" }}>认领人：{task.assignee}</p>}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: `${TASK_STATUS_COLOR[task.status] ?? "#666"}18`, color: TASK_STATUS_COLOR[task.status] ?? "#666" }}>
        {TASK_STATUS_LABEL[task.status] ?? task.status}
      </span>
      {isLoggedIn && task.status === "open" && (
        <button onClick={handleClaim} disabled={acting}
          className="px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: T, color: "#050508" }}>
          抢单
        </button>
      )}
      {isLoggedIn && task.status === "claimed" && isAssignee && (
        <button onClick={handleComplete} disabled={acting}
          className="px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: "rgba(0,245,212,0.1)", color: T }}>
          完成
        </button>
      )}
    </div>
  );
}
