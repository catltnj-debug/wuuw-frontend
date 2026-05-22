"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";
import {
  apiGetAsset, apiGetZones, apiGetDiscussions,
  apiPostDiscussion, apiReplyDiscussion, apiLikeDiscussion,
  apiSummarize, apiConfirmSummary, apiGenerateTaskFromSummary,
  apiClaimTask, apiCompleteDiscTask,
  apiGetBounties, apiPostBounty, apiClaimBounty, apiGetMyCredits,
  apiTranslate, apiUploadVoice,
  apiGetAssetStats, apiLikeAsset, apiGetAssetLikes, apiTipAsset,
  apiRecordView, apiGetAssetDiscussions, apiVoteDiscussion,
  apiPostAssetDiscussion,
  type ApiAssetDetail, type ApiZone, type ApiZoneContent,
  type ApiDiscussion, type ApiSummary, type ApiDiscTask, type ApiBounty,
  type ApiRedditPost,
} from "@/lib/api";

const ModelViewer = lazy(() => import("@/components/ModelViewer"));

const API_BASE = "http://localhost:8001";

const T = "#00F5D4";
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
};

function getTaskStatusLabel(lang: string): Record<string, string> {
  const zh = lang === "zh";
  return { open: zh ? "待认领" : "Open", claimed: zh ? "已认领" : "Claimed", in_progress: zh ? "进行中" : "In Progress", done: zh ? "已完成" : "Done" };
}

// ── Translation helpers ───────────────────────────────────────────────────────
const LANG_FLAG: Record<string, string> = {
  zh: "🇨🇳", en: "🇺🇸", ja: "🇯🇵", es: "🇪🇸", pt: "🇵🇹",
  ko: "🇰🇷", fr: "🇫🇷", de: "🇩🇪", ar: "🇸🇦", ru: "🇷🇺",
};
const LANG_NAME: Record<string, string> = {
  zh: "中文", en: "English", ja: "日本語", es: "Español", pt: "Português",
  ko: "한국어", fr: "Français", de: "Deutsch", ar: "العربية", ru: "Русский",
};

const ZONE_NAME_EN: Record<string, string> = {
  "需求区": "Requirements",
  "数据区": "Data",
  "评测区": "Reviews",
  "讨论区": "Discussion",
  "反馈区": "Feedback",
  "更新区": "Updates",
};
function localizeZoneName(name: string, isZh: boolean): string {
  if (isZh) return name;
  return ZONE_NAME_EN[name] ?? name;
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Voice recorder ─────────────────────────────────────────────────────────────
function VoiceRecorder({ onReady }: { onReady: (blob: Blob, dur: number) => void }) {
  const { lang } = useLang();
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
        setBlob(b);
        onReady(b, seconds);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(200);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert(lang === "zh" ? "无法访问麦克风，请检查权限设置" : "Microphone access denied. Please check permissions.");
    }
  }

  function stop() {
    mrRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

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
      {recording ? <>⏹ {fmtDuration(seconds)}</> : <>🎙️ {lang === "zh" ? "语音" : "Voice"}</>}
    </button>
  );
}
const TASK_STATUS_COLOR: Record<string, string> = {
  open: T, claimed: "#F5A623", in_progress: "#BF5FFF", done: "#555",
};

function SaveButton({ assetId, lang }: { assetId: number; lang: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button onClick={() => setSaved(s => !s)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
      style={{
        background: saved ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.04)",
        color: saved ? "#F5A623" : "#777",
        border: saved ? "1px solid rgba(245,166,35,0.25)" : "1px solid rgba(255,255,255,0.08)",
      }}>
      {saved ? "♥" : "♡"} {lang === "zh" ? "收藏" : "Save"}
    </button>
  );
}

function ShareButton({ title, lang }: { title: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }
  return (
    <button onClick={handleShare}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
      style={{ background: "rgba(255,255,255,0.04)", color: copied ? T : "#777", border: `1px solid ${copied ? "rgba(0,245,212,0.25)" : "rgba(255,255,255,0.08)"}` }}>
      {copied ? "✓" : "↗"} {copied ? (lang === "zh" ? "已复制" : "Copied!") : (lang === "zh" ? "分享" : "Share")}
    </button>
  );
}

// ── Reddit Post Card ──────────────────────────────────────────────────────────
const TAG_COLOR: Record<string, string> = {
  需求: "#00b4d8", 数据: "#00F5D4", 评测: "#F5A623", 灵感: "#BF5FFF", 问答: "#f56",
};

function RedditPostCard({ post, isLoggedIn, userId, onRefresh, lang }: {
  post: ApiRedditPost;
  isLoggedIn: boolean;
  userId?: number;
  onRefresh: () => void;
  lang: string;
}) {
  const [localScore, setLocalScore] = useState(post.score);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  async function handleVote(vt: "up" | "down") {
    if (!isLoggedIn) return;
    try {
      const r = await apiVoteDiscussion(post.id, vt);
      setLocalScore(r.score);
    } catch {}
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await fetch(`http://localhost:8001/api/discussions/${post.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("wuuw_token") ?? ""}` },
        body: JSON.stringify({ content: replyText }),
      });
      setReplyText(""); onRefresh();
    } catch {} finally { setReplying(false); }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="flex gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Vote column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <button onClick={() => handleVote("up")} className="text-sm transition-colors" style={{ color: "#555" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = T}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#555"}>▲</button>
        <span className="text-xs font-semibold" style={{ color: localScore > 0 ? T : localScore < 0 ? "#f56" : "#555" }}>
          {localScore}
        </span>
        <button onClick={() => handleVote("down")} className="text-sm transition-colors" style={{ color: "#555" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f56"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#555"}>▼</button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "#888" }}>{post.username}</span>
          {post.tag && (
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${TAG_COLOR[post.tag] ?? "#666"}22`, color: TAG_COLOR[post.tag] ?? "#666", border: `1px solid ${TAG_COLOR[post.tag] ?? "#666"}44` }}>
              {post.tag}
            </span>
          )}
          <span className="text-xs" style={{ color: "#444" }}>{timeAgo(post.created_at)}</span>
        </div>
        <p className="text-sm mb-2" style={{ color: "#ccc" }}>{post.content}</p>
        <div className="flex items-center gap-4 text-xs" style={{ color: "#444" }}>
          <button onClick={() => setShowReplies(s => !s)} className="hover:text-white transition-colors">
            💬 {post.reply_count ?? 0} {lang === "zh" ? "回复" : "replies"}
          </button>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="hover:text-white transition-colors">
            ↗ {lang === "zh" ? "分享" : "Share"}
          </button>
        </div>

        {showReplies && (
          <div className="mt-3 pl-3 border-l-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {isLoggedIn && (
              <div className="flex gap-2 mb-2">
                <input value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder={lang === "zh" ? "写回复…" : "Write a reply…"}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                <button onClick={handleReply} disabled={replying || !replyText.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: T, color: "#050508" }}>
                  {replying ? "…" : lang === "zh" ? "回复" : "Reply"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = Number(params.id);
  const { user, isLoggedIn } = useAuth();
  const { lang } = useLang();
  const A = COPY[lang].pages.assets;
  const BM = COPY[lang].pages.tasks.bountyModal;

  const username = user?.username;
  const [asset, setAsset] = useState<ApiAssetDetail | null>(null);
  const [zones, setZones] = useState<ApiZone[]>([]);
  const [activeZone, setActiveZone] = useState<ApiZone | null>(null);
  const [zoneContent, setZoneContent] = useState<ApiZoneContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [assetBounties, setAssetBounties] = useState<ApiBounty[]>([]);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [bountyForm, setBountyForm] = useState({ title: "", description: "", amount: "", deadline: "" });
  const [bountySubmitting, setBountySubmitting] = useState(false);
  const [bountyErr, setBountyErr] = useState("");
  const [myCredits, setMyCredits] = useState<number | null>(null);
  const [claimingBountyId, setClaimingBountyId] = useState<number | null>(null);

  // ── Stats & interactions ──
  const [stats, setStats] = useState<{ views: number; likes: number; comments: number } | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState("10");
  const [tipMessage, setTipMessage] = useState("");
  const [tipping, setTipping] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  // Reddit discussions
  const [posts, setPosts] = useState<ApiRedditPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postTag, setPostTag] = useState("all");
  const [postSort, setPostSort] = useState("hot");
  const [postText, setPostText] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [newPostTag, setNewPostTag] = useState("需求");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!assetId) return;
    Promise.all([apiGetAsset(assetId), apiGetZones(assetId), apiGetBounties({ asset_id: assetId })])
      .then(([a, z, bRes]) => {
        setAsset(a);
        setZones(z);
        setAssetBounties(bRes.items);
        if (z.length > 0) setActiveZone(z[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => {
    if (isLoggedIn) apiGetMyCredits(1).then(r => setMyCredits(r.balance)).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    if (!assetId) return;
    apiGetAssetStats(assetId).then(s => {
      setStats(s);
      setLikeCount(s.likes);
    }).catch(() => {});
    apiGetAssetLikes(assetId).then(r => {
      setLiked(r.liked);
      setLikeCount(r.likes);
    }).catch(() => {});
    apiRecordView(assetId).catch(() => {});
  }, [assetId]);

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const res = await apiGetAssetDiscussions(assetId, {
        tag: postTag === "all" ? undefined : postTag,
        sort: postSort,
      });
      setPosts(res.items);
      setPostsTotal(res.total);
    } catch {} finally { setPostsLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (assetId) loadPosts(); }, [assetId, postTag, postSort]);

  async function handlePostBounty() {
    const amount = parseFloat(bountyForm.amount);
    if (!bountyForm.title.trim()) { setBountyErr(lang === "zh" ? "标题不能为空" : "Title required"); return; }
    if (!amount || amount < 1) { setBountyErr(lang === "zh" ? "悬赏金额至少 1 Credits" : "Minimum 1 Credit"); return; }
    if (myCredits !== null && amount > myCredits) {
      setBountyErr(lang === "zh" ? `Credits 不足（当前 ${myCredits.toFixed(1)}）` : `Insufficient credits (${myCredits.toFixed(1)})`); return;
    }
    setBountySubmitting(true); setBountyErr("");
    try {
      await apiPostBounty({ title: bountyForm.title.trim(), description: bountyForm.description || undefined, amount, asset_id: assetId, deadline: bountyForm.deadline || undefined });
      setShowBountyModal(false);
      setBountyForm({ title: "", description: "", amount: "", deadline: "" });
      const bRes = await apiGetBounties({ asset_id: assetId });
      setAssetBounties(bRes.items);
    } catch (e) { setBountyErr(e instanceof Error ? e.message : lang === "zh" ? "发布失败" : "Failed to post"); }
    finally { setBountySubmitting(false); }
  }

  async function handleClaimBounty(bountyId: number) {
    setClaimingBountyId(bountyId);
    try {
      await apiClaimBounty(bountyId);
      const bRes = await apiGetBounties({ asset_id: assetId });
      setAssetBounties(bRes.items);
    } catch (e) { alert(e instanceof Error ? e.message : lang === "zh" ? "认领失败" : "Failed to claim"); }
    finally { setClaimingBountyId(null); }
  }

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

  async function handleLike() {
    if (!isLoggedIn) return;
    try {
      const r = await apiLikeAsset(assetId);
      setLiked(r.liked);
      setLikeCount(r.likes);
    } catch {}
  }

  async function handleTip() {
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount < 10) return;
    setTipping(true);
    try {
      await apiTipAsset(assetId, amount, tipMessage || undefined);
      setTipSuccess(true);
      setTimeout(() => { setShowTipModal(false); setTipSuccess(false); setTipAmount("10"); setTipMessage(""); }, 2000);
    } catch (e) { alert(e instanceof Error ? e.message : "Tip failed"); }
    finally { setTipping(false); }
  }

  async function handleSubmitPost() {
    if (!postText.trim()) return;
    setSubmittingPost(true);
    try {
      await apiPostAssetDiscussion(assetId, postText.trim(), newPostTag, postTitle || undefined);
      setPostText(""); setPostTitle(""); setShowPostForm(false);
      await loadPosts();
    } catch (e) { alert(e instanceof Error ? e.message : "Post failed"); }
    finally { setSubmittingPost(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>{lang === "zh" ? "加载中…" : "Loading…"}</p>
    </div>
  );
  if (!asset) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>{A.notExist}</p>
    </div>
  );

  return (
    <>
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── 产品基本信息 ── */}
        <div className="mb-6 p-5 rounded-2xl" style={cardStyle}>
          <div className="flex items-start justify-between gap-4 mb-4">
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
            {isLoggedIn && (
              <button onClick={() => setShowBountyModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(245,166,35,0.12)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}>
                {A.postBounty}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-4 border-t flex-wrap"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <a href={`/printers?model=${assetId}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(0,245,212,0.12)", color: T, border: "1px solid rgba(0,245,212,0.25)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,212,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,212,0.12)"; }}>
              🖨️ {lang === "zh" ? "发起打印" : "Print This"}
            </a>
            <SaveButton assetId={assetId} lang={lang} />
            <ShareButton title={asset.title} lang={lang} />
          </div>
        </div>

        {/* ── 版权证书 ── */}
        {asset.latest_certificate && (
          <div className="mb-8 p-4 rounded-2xl flex items-center gap-4"
            style={{ background: "rgba(191,95,255,0.05)", border: "1px solid rgba(191,95,255,0.18)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "rgba(191,95,255,0.12)", color: "#BF5FFF" }}>
              📜
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#BF5FFF" }}>{A.copyright}</p>
              <p className="text-sm font-mono truncate" style={{ color: "#ddd" }}>{asset.latest_certificate}</p>
              <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                {lang === "zh" ? "链上确权，版权受保护" : "On-chain verified · Copyright protected"}
              </p>
            </div>
            <a href={`/verify/${asset.latest_certificate}`}
              className="px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all"
              style={{ background: "rgba(191,95,255,0.12)", color: "#BF5FFF", border: "1px solid rgba(191,95,255,0.25)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(191,95,255,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(191,95,255,0.12)"; }}>
              {lang === "zh" ? "验证" : "Verify"}
            </a>
          </div>
        )}

        {/* ── 3D 预览 / 媒体 ── */}
        {asset.file_format === "GLB" || asset.file_format === "GLTF" ? (
          <div className="mb-8">
            <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>{A.preview3d}</p>
            <Suspense fallback={
              <div className="rounded-2xl flex items-center justify-center"
                style={{ height: 340, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#555", fontSize: 13 }}>{lang === "zh" ? "加载预览组件…" : "Loading preview…"}</span>
              </div>
            }>
              <ModelViewer
                url={`${API_BASE}/${asset.file_path}`}
                size="md"
              />
            </Suspense>
          </div>
        ) : asset.file_path ? (
          <div className="mb-8 p-4 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs mb-2" style={{ color: "#555" }}>
              {asset.file_format} {A.noPreview}
            </p>
            <a href={`${API_BASE}/${asset.file_path}`} download
              className="text-xs underline" style={{ color: "#00F5D4" }}>
              {A.downloadView}
            </a>
          </div>
        ) : null}

        {/* ── 打印参数 ── */}
        {asset.tech_params && (
          <div className="mb-8 p-5 rounded-2xl" style={cardStyle}>
            <p className="text-xs font-semibold mb-4" style={{ color: "#666" }}>{A.printParams}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: A.params.material, value: asset.tech_params.material ?? null },
                { label: A.params.weight,   value: asset.tech_params.weight_g != null ? `${asset.tech_params.weight_g} g` : null },
                { label: A.params.printTime, value: asset.tech_params.print_time_min ? `${Math.floor(asset.tech_params.print_time_min / 60)}h ${asset.tech_params.print_time_min % 60}m` : null },
                { label: A.params.nozzle,  value: asset.tech_params.nozzle_size != null ? `${asset.tech_params.nozzle_size} mm` : null },
                { label: A.params.size,    value: asset.tech_params.dim_x != null ? `${asset.tech_params.dim_x}×${asset.tech_params.dim_y}×${asset.tech_params.dim_z} mm` : null },
                { label: A.params.layer,   value: asset.tech_params.layer_height != null ? `${asset.tech_params.layer_height} mm` : null },
                { label: A.params.infill,  value: asset.tech_params.infill_pct != null ? `${asset.tech_params.infill_pct}%` : null },
                { label: A.params.support, value: asset.tech_params.support_required != null ? (asset.tech_params.support_required ? A.params.yes : A.params.no) : null },
              ].map(p => (
                <div key={p.label} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "#555" }}>{p.label}</p>
                  <p className="text-sm font-medium" style={{ color: p.value != null ? "#ccc" : "#333" }}>
                    {p.value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs mb-0.5" style={{ color: "#555" }}>{A.params.assembly}</p>
              <p className="text-sm" style={{ color: asset.tech_params.assembly_notes ? "#ccc" : "#333" }}>
                {asset.tech_params.assembly_notes ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* ── Stats bar ── */}
        <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "#555" }}>
          <span>👁 {stats ? (stats.views >= 1000 ? `${(stats.views/1000).toFixed(1)}k` : stats.views) : "—"} {lang === "zh" ? "浏览" : "views"}</span>
          <span>❤️ {likeCount} {lang === "zh" ? "点赞" : "likes"}</span>
          <span>💬 {stats?.comments ?? "—"} {lang === "zh" ? "评论" : "comments"}</span>
        </div>

        {/* ── Main action buttons ── */}
        <div className="flex gap-3 mb-3">
          <a href="#discussion-section"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: T, color: "#050508" }}>
            🖨️ {lang === "zh" ? "打印此模型" : "Print This"}
          </a>
          <button onClick={handleLike}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all"
            style={{
              background: liked ? "rgba(255,80,120,0.15)" : "rgba(255,255,255,0.04)",
              color: liked ? "#ff5078" : "#888",
              border: `1px solid ${liked ? "rgba(255,80,120,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {liked ? "❤️" : "🤍"} {likeCount}
          </button>
          <button onClick={() => isLoggedIn ? setShowTipModal(true) : null}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(245,166,35,0.1)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.2)" }}>
            💝 {lang === "zh" ? "打赏" : "Tip"}
          </button>
        </div>

        {/* ── Secondary actions ── */}
        <div className="flex gap-2 mb-6">
          <ShareButton title={asset?.title ?? ""} lang={lang} />
          <SaveButton assetId={assetId} lang={lang} />
          <a href="#discussion-section" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.04)", color: "#777", border: "1px solid rgba(255,255,255,0.08)" }}>
            💬 {lang === "zh" ? "跳到讨论" : "Discussion"}
          </a>
        </div>

        {/* ── Reddit Discussion Section ── */}
        <div id="discussion-section">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-sm" style={{ color: "#ccc" }}>
              {lang === "zh" ? "社区讨论" : "Community"} · {postsTotal}
            </p>
            {isLoggedIn && (
              <button onClick={() => setShowPostForm(f => !f)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-sm font-semibold"
                style={{ background: T, color: "#050508" }}>
                + {lang === "zh" ? "发帖" : "Post"}
              </button>
            )}
          </div>

          {/* Tag filter */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {["all","需求","数据","评测","灵感","问答"].map(tag => (
              <button key={tag} onClick={() => setPostTag(tag)}
                className="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all"
                style={{
                  background: postTag === tag ? T : "rgba(255,255,255,0.05)",
                  color: postTag === tag ? "#050508" : "#666",
                  border: postTag === tag ? "none" : "1px solid rgba(255,255,255,0.07)",
                }}>
                {tag === "all" ? (lang === "zh" ? "全部" : "All") : tag}
              </button>
            ))}
            <div className="ml-auto flex gap-1">
              {["hot","new","top"].map(s => (
                <button key={s} onClick={() => setPostSort(s)}
                  className="px-2 py-1 rounded-lg text-xs"
                  style={{ color: postSort === s ? T : "#555" }}>
                  {s === "hot" ? "🔥" : s === "new" ? "🆕" : "⬆️"}
                </button>
              ))}
            </div>
          </div>

          {/* Post form */}
          {showPostForm && (
            <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,245,212,0.15)" }}>
              <input value={postTitle} onChange={e => setPostTitle(e.target.value)}
                placeholder={lang === "zh" ? "标题（可选）" : "Title (optional)"}
                className="w-full px-3 py-2 rounded-xl text-sm mb-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              <textarea rows={3} value={postText} onChange={e => setPostText(e.target.value)}
                placeholder={lang === "zh" ? "分享你的想法…" : "Share your thoughts…"}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none mb-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {["需求","数据","评测","灵感","问答"].map(tag => (
                    <button key={tag} onClick={() => setNewPostTag(tag)}
                      className="px-2 py-1 rounded-lg text-xs transition-all"
                      style={{
                        background: newPostTag === tag ? "rgba(0,245,212,0.15)" : "rgba(255,255,255,0.04)",
                        color: newPostTag === tag ? T : "#555",
                        border: newPostTag === tag ? "1px solid rgba(0,245,212,0.3)" : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPostForm(false)} className="px-3 py-1.5 text-xs" style={{ color: "#555" }}>
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                  <button onClick={handleSubmitPost} disabled={submittingPost || !postText.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: submittingPost ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
                    {submittingPost ? (lang === "zh" ? "发送中…" : "Posting…") : (lang === "zh" ? "发帖" : "Post")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Posts list */}
          {postsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#444" }}>
              {lang === "zh" ? "还没有帖子，来发第一帖吧" : "No posts yet — be the first!"}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <RedditPostCard key={post.id} post={post} isLoggedIn={isLoggedIn} userId={user?.id} onRefresh={loadPosts} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* ── 相关悬赏 ── */}
        {assetBounties.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>{A.relatedBounties}</p>
            <div className="space-y-2">
              {assetBounties.map(b => (
                <AssetBountyRow key={b.id} bounty={b} userId={user?.id} isLoggedIn={isLoggedIn}
                  claiming={claimingBountyId === b.id} onClaim={() => handleClaimBounty(b.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Tip Modal ── */}
    {showTipModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={e => { if (e.target === e.currentTarget) setShowTipModal(false); }}>
        <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0d0d12", border: "1px solid rgba(245,166,35,0.25)" }}>
          {tipSuccess ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">💝</div>
              <p className="font-semibold" style={{ color: "#ddd" }}>{lang === "zh" ? "打赏成功！" : "Tip sent!"}</p>
              <p className="text-xs mt-1" style={{ color: "#555" }}>{lang === "zh" ? "感谢你支持设计师" : "Thank you for supporting the creator"}</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold mb-4" style={{ color: "#eee" }}>
                💝 {lang === "zh" ? `打赏 ${asset?.creator ?? "设计师"}` : `Tip ${asset?.creator ?? "Creator"}`}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#666" }}>Credits {lang === "zh" ? "数量" : "Amount"} (min 10)</label>
                  <input type="number" min="10" value={tipAmount} onChange={e => setTipAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                  <div className="flex gap-2 mt-2">
                    {[10, 50, 100, 500].map(v => (
                      <button key={v} onClick={() => setTipAmount(String(v))}
                        className="flex-1 py-1 rounded-lg text-xs"
                        style={{ background: tipAmount === String(v) ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)", color: tipAmount === String(v) ? "#F5A623" : "#666", border: "1px solid rgba(255,255,255,0.07)" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#666" }}>{lang === "zh" ? "留言（可选）" : "Message (optional)"}</label>
                  <input value={tipMessage} onChange={e => setTipMessage(e.target.value)}
                    placeholder={lang === "zh" ? "感谢你的设计…" : "Love your design…"}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowTipModal(false)} className="flex-1 py-2 rounded-xl text-sm border" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>
                  {lang === "zh" ? "取消" : "Cancel"}
                </button>
                <button onClick={handleTip} disabled={tipping}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: tipping ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#050508" }}>
                  {tipping ? (lang === "zh" ? "处理中…" : "Sending…") : (lang === "zh" ? `确认打赏 ${tipAmount} Credits` : `Send ${tipAmount} Credits`)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* ── 发起悬赏弹窗 ── */}
    {showBountyModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={e => { if (e.target === e.currentTarget) setShowBountyModal(false); }}>
        <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d0d12", border: "1px solid rgba(245,166,35,0.2)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: "#eee" }}>{A.postBounty}</h2>
            {myCredits !== null && (
              <span className="text-xs" style={{ color: "#666" }}>{BM.balance}: <span style={{ color: T }}>{myCredits.toFixed(1)}</span> Credits</span>
            )}
          </div>
          <div className="space-y-3">
            <input value={bountyForm.title} onChange={e => setBountyForm(f => ({ ...f, title: e.target.value }))}
              placeholder={BM.titleField}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <textarea rows={3} value={bountyForm.description} onChange={e => setBountyForm(f => ({ ...f, description: e.target.value }))}
              placeholder={BM.descField}
              className="w-full px-3 py-2 rounded-xl text-sm resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <div className="flex gap-3">
              <input type="number" min="1" value={bountyForm.amount} onChange={e => setBountyForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={BM.amountField}
                className="flex-1 px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              <input type="date" value={bountyForm.deadline} onChange={e => setBountyForm(f => ({ ...f, deadline: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            </div>
          </div>
          {bountyErr && <p className="mt-2 text-xs" style={{ color: "#f56" }}>{bountyErr}</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowBountyModal(false)}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>
              {BM.cancel}
            </button>
            <button onClick={handlePostBounty} disabled={bountySubmitting}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: bountySubmitting ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#050508" }}>
              {bountySubmitting ? BM.submitting : BM.submit}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
    } catch (e) { setErr(e instanceof Error ? e.message : lang === "zh" ? "发帖失败" : "Post failed"); }
    finally { setPosting(false); }
  }

  async function handleSummarize() {
    setSummarizing(true); setErr("");
    try {
      await apiSummarize(zone.id);
      onRefresh();
    } catch (e) { setErr(e instanceof Error ? e.message : lang === "zh" ? "生成失败" : "Failed to generate"); }
    finally { setSummarizing(false); }
  }

  return (
    <div className="space-y-6">
      {/* 发帖框 */}
      {isLoggedIn && (
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {langHint && (
            <div className="mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", color: "#F5A623" }}>
              {LANG_FLAG[langHint] ?? "🌐"} {lang === "zh" ? `检测到您使用 ${LANG_NAME[langHint] ?? langHint} 发帖` : `Detected language: ${LANG_NAME[langHint] ?? langHint}`}
            </div>
          )}
          <textarea rows={3} value={postText} onChange={e => setPostText(e.target.value)}
            placeholder={lang === "zh" ? `在${zone.zone_name}发表你的看法…` : `Share your thoughts in ${localizeZoneName(zone.zone_name, false)}…`}
            className="w-full text-sm rounded-xl p-3 resize-none mb-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
          {voiceBlob && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: "rgba(0,245,212,0.06)", border: "1px solid rgba(0,245,212,0.2)" }}>
              <span style={{ color: T }}>🎙️ {fmtDuration(voiceBlob.dur)}</span>
              <span className="flex-1" style={{ color: "#555" }}>{lang === "zh" ? "录音已附加" : "Voice attached"}</span>
              <button onClick={() => setVoiceBlob(null)} style={{ color: "#555" }}>✕</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            {err && <p className="text-xs" style={{ color: "#ff6b6b" }}>{err}</p>}
            <div className="flex gap-2 ml-auto">
              <VoiceRecorder onReady={(blob, dur) => setVoiceBlob({ blob, dur })} />
              <button onClick={handleSummarize} disabled={summarizing}
                className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                style={{ borderColor: "rgba(0,245,212,0.3)", color: summarizing ? "#444" : T }}>
                {summarizing ? (lang === "zh" ? "生成中…" : "Generating…") : (lang === "zh" ? "✦ AI总结" : "✦ AI Summary")}
              </button>
              <button onClick={handlePost} disabled={(!postText.trim() && !voiceBlob) || posting || uploadingVoice}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: posting || (!postText.trim() && !voiceBlob) ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
                {posting ? (lang === "zh" ? "发送中…" : "Sending…") : uploadingVoice ? (lang === "zh" ? "上传中…" : "Uploading…") : (lang === "zh" ? "发帖" : "Post")}
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
          <p className="text-xs font-semibold mb-3" style={{ color: "#666" }}>{lang === "zh" ? "本区任务" : "Zone Tasks"}</p>
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
          <p className="text-sm">{lang === "zh" ? "暂无讨论，来第一个发帖吧" : "No discussions yet — be the first to post!"}</p>
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
  const { lang } = useLang();
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [liking, setLiking] = useState(false);
  const [replying, setReplying] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

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
          {disc.detected_lang && (
            <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>
              {LANG_FLAG[disc.detected_lang] ?? "🌐"} {disc.detected_lang.toUpperCase()}
            </span>
          )}
          <span className="text-xs" style={{ color: "#3a3a3a" }}>{new Date(disc.created_at).toLocaleString()}</span>
        </div>
        <p className="text-sm leading-relaxed mb-1" style={{ color: "#ccc" }}>
          {showTranslated && translated ? translated : disc.content}
        </p>
        {showTranslated && translated && (
          <p className="text-xs mb-2" style={{ color: "#444" }}>{lang === "zh" ? "— 翻译自原文" : "— Translated"}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <button onClick={handleLike} disabled={!isLoggedIn || liking || disc.user_id === userId}
            className="flex items-center gap-1 text-xs transition-all"
            style={{ color: "#555" }}
            onMouseEnter={e => isLoggedIn && disc.user_id !== userId && ((e.currentTarget as HTMLElement).style.color = T)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#555")}>
            ♡ {disc.likes_count}
          </button>
          <button onClick={handleTranslate} disabled={translating}
            className="text-xs transition-all" style={{ color: showTranslated ? T : "#555" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T)}
            onMouseLeave={e => { if (!showTranslated) (e.currentTarget as HTMLElement).style.color = "#555"; }}>
            {translating ? (lang === "zh" ? "翻译中…" : "Translating…") : showTranslated ? (lang === "zh" ? "🌐 查看原文" : "🌐 Original") : (lang === "zh" ? "🌐 翻译" : "🌐 Translate")}
          </button>
          {isLoggedIn && depth === 0 && (
            <button onClick={() => setShowReply(!showReply)}
              className="text-xs transition-all" style={{ color: "#555" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#555")}>
              {lang === "zh" ? "回复" : "Reply"}
            </button>
          )}
        </div>
        {showReply && (
          <div className="mt-3 flex gap-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder={lang === "zh" ? "写下回复…" : "Write a reply…"} onKeyDown={e => e.key === "Enter" && handleReply()}
              className="flex-1 text-sm rounded-lg px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
            <button onClick={handleReply} disabled={!replyText.trim() || replying}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: T, color: "#050508" }}>
              {lang === "zh" ? "发送" : "Send"}
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
  const { lang } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const alreadyConfirmed = userId ? summary.confirmed_user_ids?.includes(userId) : false;

  async function handleConfirm() {
    setConfirming(true);
    try { await apiConfirmSummary(summary.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : (lang === "zh" ? "确认失败" : "Failed to confirm")); }
    finally { setConfirming(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    try { await apiGenerateTaskFromSummary(summary.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : (lang === "zh" ? "生成失败" : "Failed to generate")); }
    finally { setGenerating(false); }
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.12)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold" style={{ color: T }}>{lang === "zh" ? "✦ AI 总结" : "✦ AI Summary"}</span>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: summary.status === "confirmed" ? "rgba(0,245,212,0.1)" : "rgba(255,166,35,0.1)", color: summary.status === "confirmed" ? T : "#F5A623" }}>
          {summary.status === "confirmed" ? (lang === "zh" ? "已确认" : "Confirmed") : (lang === "zh" ? "待确认" : "Pending")}
        </span>
        <span className="text-xs ml-auto" style={{ color: "#555" }}>
          {lang === "zh" ? `${summary.confirm_count} / ${summary.confirm_threshold} 人确认` : `${summary.confirm_count} / ${summary.confirm_threshold} confirmed`}
        </span>
      </div>
      <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: "#bbb" }}>{summary.content}</p>
      <div className="flex gap-2">
        {isLoggedIn && summary.status !== "confirmed" && !alreadyConfirmed && (
          <button onClick={handleConfirm} disabled={confirming}
            className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(0,245,212,0.1)", color: T, border: "1px solid rgba(0,245,212,0.2)" }}>
            {confirming ? (lang === "zh" ? "确认中…" : "Confirming…") : (lang === "zh" ? "✓ 确认此总结" : "✓ Confirm Summary")}
          </button>
        )}
        {isLoggedIn && summary.status === "confirmed" && !summary.task_generated && (
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: T, color: "#050508" }}>
            {generating ? (lang === "zh" ? "生成中…" : "Generating…") : (lang === "zh" ? "生成任务 →" : "Generate Tasks →")}
          </button>
        )}
        {summary.task_generated && (
          <span className="text-xs" style={{ color: "#555" }}>{lang === "zh" ? "✓ 任务已生成" : "✓ Tasks generated"}</span>
        )}
        {alreadyConfirmed && summary.status !== "confirmed" && (
          <span className="text-xs" style={{ color: "#555" }}>{lang === "zh" ? "✓ 已确认，等待其他人" : "✓ Confirmed — waiting for others"}</span>
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
  const { lang } = useLang();
  const TASK_STATUS_LABEL = getTaskStatusLabel(lang);
  const [acting, setActing] = useState(false);

  async function handleClaim() {
    setActing(true);
    try { await apiClaimTask(task.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : (lang === "zh" ? "抢单失败" : "Failed to claim")); }
    finally { setActing(false); }
  }

  async function handleComplete() {
    setActing(true);
    try { await apiCompleteDiscTask(task.id); onRefresh(); }
    catch (e) { alert(e instanceof Error ? e.message : (lang === "zh" ? "操作失败" : "Operation failed")); }
    finally { setActing(false); }
  }

  const isAssignee = task.assignee && username && task.assignee === username;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "#ddd" }}>{task.title}</p>
        {task.assignee && <p className="text-xs mt-0.5" style={{ color: "#555" }}>{lang === "zh" ? "认领人：" : "Assignee: "}{task.assignee}</p>}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: `${TASK_STATUS_COLOR[task.status] ?? "#666"}18`, color: TASK_STATUS_COLOR[task.status] ?? "#666" }}>
        {TASK_STATUS_LABEL[task.status] ?? task.status}
      </span>
      {isLoggedIn && task.status === "open" && (
        <button onClick={handleClaim} disabled={acting}
          className="px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: T, color: "#050508" }}>
          {lang === "zh" ? "抢单" : "Claim"}
        </button>
      )}
      {isLoggedIn && task.status === "claimed" && isAssignee && (
        <button onClick={handleComplete} disabled={acting}
          className="px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: "rgba(0,245,212,0.1)", color: T }}>
          {lang === "zh" ? "完成" : "Done"}
        </button>
      )}
    </div>
  );
}

// ── 资产悬赏行 ────────────────────────────────────────────────────────────────
const BOUNTY_STATUS_COLOR: Record<string, string> = {
  open: T, claimed: "#F5A623", completed: "#888", cancelled: "#444",
};
function AssetBountyRow({ bounty, userId, isLoggedIn, claiming, onClaim }: {
  bounty: ApiBounty;
  userId?: number;
  isLoggedIn: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const { lang } = useLang();
  const BOUNTY_STATUS_LABEL: Record<string, string> = lang === "zh"
    ? { open: "开放中", claimed: "已认领", completed: "已完成", cancelled: "已取消" }
    : { open: "Open", claimed: "Claimed", completed: "Completed", cancelled: "Cancelled" };
  const statusColor = BOUNTY_STATUS_COLOR[bounty.status] ?? "#777";
  const isOwner = userId === bounty.creator_id;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: "rgba(245,166,35,0.04)", border: "1px solid rgba(245,166,35,0.1)" }}>
      <span className="text-base flex-shrink-0">💰</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "#ddd" }}>{bounty.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "#555" }}>
          <span style={{ color: "#F5A623", fontWeight: 600 }}>{bounty.amount} Credits</span>
          {bounty.deadline && <span> · {lang === "zh" ? "截止" : "Due"} {bounty.deadline}</span>}
          <span> · by {bounty.creator_username}</span>
        </p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: `${statusColor}18`, color: statusColor }}>
        {BOUNTY_STATUS_LABEL[bounty.status] ?? bounty.status}
      </span>
      {isLoggedIn && bounty.status === "open" && !isOwner && (
        <button onClick={onClaim} disabled={claiming}
          className="px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ background: claiming ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#050508" }}>
          {claiming ? "…" : (lang === "zh" ? "认领" : "Claim")}
        </button>
      )}
    </div>
  );
}
