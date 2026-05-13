"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";
import {
  apiGetIdea, apiGetIdeaZones, apiPatchIdeaStatus,
  apiGetDiscussions, apiPostDiscussion, apiReplyDiscussion,
  apiLikeDiscussion, apiSummarize, apiConfirmSummary,
  apiTranslate, apiUploadVoice,
  type ApiIdea, type ApiIdeaZone, type ApiZoneContent,
  type ApiDiscussion, type ApiSummary,
} from "@/lib/api";

const LANG_FLAG: Record<string, string> = {
  zh: "🇨🇳", en: "🇺🇸", ja: "🇯🇵", es: "🇪🇸", pt: "🇵🇹",
  ko: "🇰🇷", fr: "🇫🇷", de: "🇩🇪", ar: "🇸🇦", ru: "🇷🇺",
};
const LANG_NAME: Record<string, string> = {
  zh: "中文", en: "English", ja: "日本語", es: "Español", pt: "Português",
  ko: "한국어", fr: "Français", de: "Deutsch", ar: "العربية", ru: "Русский",
};
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function VoiceRecorder({ onReady }: { onReady: (blob: Blob, dur: number) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b); onReady(b, seconds);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(200);
      setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { alert("无法访问麦克风，请检查权限设置"); }
  }

  function stop() { mrRef.current?.stop(); if (timerRef.current) clearInterval(timerRef.current); setRecording(false); }
  function clear() { setBlob(null); setSeconds(0); }

  if (blob) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background: "rgba(0,245,212,0.06)", border: "1px solid rgba(0,245,212,0.2)" }}>
        <span style={{ color: T }}>🎙️ {fmtDuration(seconds)}</span>
        <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(0,245,212,0.3)" }}>
          <div className="h-full rounded-full" style={{ background: T, width: "60%", opacity: 0.7 }} />
        </div>
        <button onClick={clear} className="text-xs" style={{ color: "#555" }}>✕</button>
      </div>
    );
  }
  return (
    <button onClick={recording ? stop : start}
      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border transition-all"
      style={{ borderColor: recording ? "#f56" : "rgba(0,245,212,0.3)", color: recording ? "#f56" : "#777" }}>
      {recording ? <>⏹ {fmtDuration(seconds)}</> : <>🎙️ 语音</>}
    </button>
  );
}

const T = "#00F5D4";

const STATUS_COLOR: Record<string, string> = {
  open: T,
  in_project: "#F5A623",
  completed: "#888",
};
const STATUS_LABEL: Record<string, string> = {
  open: "开放中",
  in_project: "进行中",
  completed: "已完成",
};

export default function IdeaDetailPage() {
  const params = useParams();
  const ideaId = Number(params.id);
  const { user, isLoggedIn } = useAuth();

  const [idea, setIdea] = useState<ApiIdea | null>(null);
  const [zones, setZones] = useState<ApiIdeaZone[]>([]);
  const [activeZone, setActiveZone] = useState<ApiIdeaZone | null>(null);
  const [zoneContent, setZoneContent] = useState<ApiZoneContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!ideaId) return;
    Promise.all([apiGetIdea(ideaId), apiGetIdeaZones(ideaId)])
      .then(([idea, zones]) => {
        setIdea(idea);
        setZones(zones);
        if (zones.length > 0) setActiveZone(zones[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ideaId]);

  const loadZone = useCallback(async (zone: ApiIdeaZone) => {
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

  async function handleStatusChange(status: string) {
    if (!idea) return;
    setStatusUpdating(true);
    try {
      const updated = await apiPatchIdeaStatus(ideaId, status);
      setIdea(updated);
    } catch { /* ignore */ }
    finally { setStatusUpdating(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>加载中…</p>
    </div>
  );
  if (!idea) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>Idea 不存在</p>
    </div>
  );

  const isOwner = user?.id === idea.creator_id;

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Idea 基本信息 ── */}
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: `${STATUS_COLOR[idea.status] ?? "#888"}18`,
                    color: STATUS_COLOR[idea.status] ?? "#888",
                  }}
                >
                  {STATUS_LABEL[idea.status] ?? idea.status}
                </span>
                <span className="text-xs font-mono" style={{ color: "#444" }}>{idea.idea_no}</span>
                <span className="text-xs" style={{ color: "#444" }}>👁 {idea.views_count}</span>
              </div>

              <h1 className="text-2xl font-bold mb-2" style={{ color: "#eee" }}>{idea.title}</h1>
              <p className="text-sm mb-4" style={{ color: "#555" }}>
                by @{idea.creator_username} · {new Date(idea.created_at).toLocaleDateString("zh-CN")}
              </p>

              {idea.description && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#888" }}>
                  {idea.description}
                </p>
              )}
            </div>

            {/* 状态操作（仅创建者） */}
            {isOwner && (
              <div className="flex-shrink-0 flex flex-col gap-2">
                {idea.status === "open" && (
                  <button
                    onClick={() => handleStatusChange("in_project")}
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                    style={{ background: "rgba(245,166,35,0.12)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
                  >
                    {statusUpdating ? "更新中…" : "发起 Project"}
                  </button>
                )}
                {idea.status === "in_project" && (
                  <button
                    onClick={() => handleStatusChange("completed")}
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {statusUpdating ? "更新中…" : "标记完成"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 讨论区 Tabs ── */}
        {zones.length > 0 && (
          <>
            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
              {zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => loadZone(z)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: activeZone?.id === z.id ? "rgba(0,245,212,0.1)" : "transparent",
                    color: activeZone?.id === z.id ? T : "#555",
                    border: activeZone?.id === z.id ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
                  }}
                >
                  {z.zone_name}
                  <span className="ml-1.5 opacity-60">({z.discussion_count})</span>
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
              <IdeaZonePanel
                zone={activeZone}
                content={zoneContent}
                userId={user?.id}
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

// ── 讨论区内容面板 ─────────────────────────────────────────────────────────────
function IdeaZonePanel({
  zone, content, userId, isLoggedIn, onRefresh,
}: {
  zone: ApiIdeaZone;
  content: ApiZoneContent;
  userId?: number;
  isLoggedIn: boolean;
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState("");
  const [langHint, setLangHint] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<{ blob: Blob; dur: number } | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  async function handlePost() {
    if (!postText.trim() && !voiceBlob) return;
    setPosting(true); setErr("");
    try {
      let postedDisc: ApiDiscussion | null = null;
      if (postText.trim()) {
        postedDisc = await apiPostDiscussion(zone.id, postText.trim());
        setPostText("");
      }
      if (voiceBlob && postedDisc) {
        setUploadingVoice(true);
        try { await apiUploadVoice(postedDisc.id, voiceBlob.blob); } catch { /* non-fatal */ }
        finally { setUploadingVoice(false); }
      }
      setVoiceBlob(null);
      if (postedDisc?.detected_lang && postedDisc.detected_lang !== lang) {
        setLangHint(postedDisc.detected_lang);
        setTimeout(() => setLangHint(null), 4000);
      }
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "发帖失败"); }
    finally { setPosting(false); }
  }

  async function handleSummarize() {
    setSummarizing(true); setErr("");
    try { await apiSummarize(zone.id); onRefresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : "生成失败"); }
    finally { setSummarizing(false); }
  }

  return (
    <div className="space-y-6">
      {isLoggedIn && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {langHint && (
            <div className="mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", color: "#F5A623" }}>
              {LANG_FLAG[langHint] ?? "🌐"} 检测到您使用 {LANG_NAME[langHint] ?? langHint} 发帖
            </div>
          )}
          <textarea
            rows={3}
            value={postText}
            onChange={e => setPostText(e.target.value)}
            placeholder={`在 ${zone.zone_name} 分享你的想法…`}
            className="w-full text-sm rounded-xl p-3 resize-none mb-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }}
          />
          {voiceBlob && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: "rgba(0,245,212,0.06)", border: "1px solid rgba(0,245,212,0.2)" }}>
              <span style={{ color: T }}>🎙️ {fmtDuration(voiceBlob.dur)}</span>
              <span className="flex-1" style={{ color: "#555" }}>录音已附加</span>
              <button onClick={() => setVoiceBlob(null)} style={{ color: "#555" }}>✕</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            {err && <p className="text-xs" style={{ color: "#ff6b6b" }}>{err}</p>}
            <div className="flex gap-2 ml-auto">
              <VoiceRecorder onReady={(blob, dur) => setVoiceBlob({ blob, dur })} />
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                style={{ borderColor: "rgba(0,245,212,0.3)", color: summarizing ? "#444" : T }}
              >
                {summarizing ? "生成中…" : "✦ AI总结"}
              </button>
              <button
                onClick={handlePost}
                disabled={(!postText.trim() && !voiceBlob) || posting || uploadingVoice}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: posting || (!postText.trim() && !voiceBlob) ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}
              >
                {posting ? "发送中…" : uploadingVoice ? "上传中…" : "发帖"}
              </button>
            </div>
          </div>
        </div>
      )}

      {content.summary && (
        <IdeaSummaryPanel summary={content.summary} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} />
      )}

      {content.discussions.length === 0 ? (
        <div className="text-center py-12" style={{ color: "#3a3a3a" }}>
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm">暂无讨论，来第一个发帖吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {content.discussions.map(d => (
            <IdeaDiscCard key={d.id} disc={d} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI 总结面板 ────────────────────────────────────────────────────────────────
function IdeaSummaryPanel({
  summary, userId, isLoggedIn, onRefresh,
}: {
  summary: ApiSummary;
  userId?: number;
  isLoggedIn: boolean;
  onRefresh: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const alreadyConfirmed = userId != null && summary.confirmed_user_ids?.includes(userId);

  async function handleConfirm() {
    setConfirming(true);
    try { await apiConfirmSummary(summary.id); onRefresh(); }
    catch { /* ignore */ }
    finally { setConfirming(false); }
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.15)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold" style={{ color: T }}>✦ AI 总结</span>
        <span className="text-xs" style={{ color: "#555" }}>
          已确认 {summary.confirm_count}/{summary.confirm_threshold}
        </span>
        {summary.status === "confirmed" && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,245,212,0.1)", color: T }}>已采纳</span>
        )}
      </div>
      <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: "#aaa" }}>
        {summary.content}
      </p>
      {isLoggedIn && !alreadyConfirmed && summary.status !== "confirmed" && (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="text-xs px-3 py-1.5 rounded-lg border transition-all"
          style={{ borderColor: "rgba(0,245,212,0.3)", color: T }}
        >
          {confirming ? "确认中…" : "确认采纳"}
        </button>
      )}
    </div>
  );
}

// ── 讨论卡片 ──────────────────────────────────────────────────────────────────
function IdeaDiscCard({
  disc, userId, isLoggedIn, onRefresh, depth = 0,
}: {
  disc: ApiDiscussion;
  userId?: number;
  isLoggedIn: boolean;
  onRefresh: () => void;
  depth?: number;
}) {
  const { lang } = useLang();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [liking, setLiking] = useState(false);
  const [replying, setReplying] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

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

  async function handleTranslate() {
    if (translated) { setShowTranslated(v => !v); return; }
    setTranslating(true);
    try {
      const res = await apiTranslate(disc.content, lang);
      setTranslated(res.translated_text);
      setShowTranslated(true);
    } catch { /* ignore */ }
    finally { setTranslating(false); }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: depth === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.05)",
        marginLeft: depth > 0 ? "16px" : "0",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "rgba(0,245,212,0.1)", color: T }}
        >
          {disc.username[0]?.toUpperCase()}
        </div>
        <span className="text-xs font-medium" style={{ color: "#888" }}>@{disc.username}</span>
        {disc.detected_lang && (
          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>
            {LANG_FLAG[disc.detected_lang] ?? "🌐"} {disc.detected_lang.toUpperCase()}
          </span>
        )}
        <span className="text-xs" style={{ color: "#444" }}>
          {new Date(disc.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm leading-relaxed mb-1 whitespace-pre-wrap" style={{ color: "#ccc" }}>
        {showTranslated && translated ? translated : disc.content}
      </p>
      {showTranslated && translated && (
        <p className="text-xs mb-2" style={{ color: "#444" }}>— 翻译自原文</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleLike}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: liking ? T : "#555" }}
        >
          ♥ {disc.likes_count}
        </button>
        <button onClick={handleTranslate} disabled={translating}
          className="text-xs transition-colors"
          style={{ color: showTranslated ? T : "#555" }}>
          {translating ? "翻译中…" : showTranslated ? "🌐 查看原文" : "🌐 翻译"}
        </button>
        {isLoggedIn && depth === 0 && (
          <button
            onClick={() => setShowReply(v => !v)}
            className="text-xs transition-colors"
            style={{ color: "#555" }}
          >
            回复
          </button>
        )}
      </div>

      {showReply && (
        <div className="mt-3 flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="回复…"
            className="flex-1 px-3 py-1.5 rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || replying}
            className="px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(0,245,212,0.15)", color: T }}
          >
            {replying ? "…" : "发送"}
          </button>
        </div>
      )}

      {disc.replies?.map(r => (
        <IdeaDiscCard key={r.id} disc={r} userId={userId} isLoggedIn={isLoggedIn} onRefresh={onRefresh} depth={depth + 1} />
      ))}
    </div>
  );
}
