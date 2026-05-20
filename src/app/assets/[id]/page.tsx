"use client";

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";
import {
  apiGetAsset, apiGetZones, apiGetDiscussions,
  apiPostDiscussion, apiReplyDiscussion, apiLikeDiscussion,
  apiSummarize, apiConfirmSummary, apiGenerateTaskFromSummary,
  apiClaimTask, apiCompleteDiscTask,
  apiGetBounties, apiPostBounty, apiClaimBounty, apiGetMyCredits,
  apiTranslate, apiUploadVoice,
  type ApiAssetDetail, type ApiZone, type ApiZoneContent,
  type ApiDiscussion, type ApiSummary, type ApiDiscTask, type ApiBounty,
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
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              {isLoggedIn && (
                <button onClick={() => setShowBountyModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{ background: "rgba(245,166,35,0.12)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}>
                  {A.postBounty}
                </button>
              )}
              {asset.latest_certificate && (
                <div className="text-right">
                  <p className="text-xs mb-1" style={{ color: "#555" }}>{A.copyright}</p>
                  <p className="text-xs font-mono" style={{ color: "#00F5D4" }}>{asset.latest_certificate}</p>
                </div>
              )}
            </div>
          </div>
        </div>

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
        {asset.tech_params && Object.values(asset.tech_params).some(v => v != null) && (
          <div className="mb-8 p-5 rounded-2xl" style={cardStyle}>
            <p className="text-xs font-semibold mb-4" style={{ color: "#666" }}>{A.printParams}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: A.params.material, value: asset.tech_params.material },
                { label: A.params.nozzle, value: asset.tech_params.nozzle_size ? `${asset.tech_params.nozzle_size} mm` : null },
                { label: A.params.layer, value: asset.tech_params.layer_height ? `${asset.tech_params.layer_height} mm` : null },
                { label: A.params.infill, value: asset.tech_params.infill_pct != null ? `${asset.tech_params.infill_pct}%` : null },
                { label: A.params.weight, value: asset.tech_params.weight_g ? `${asset.tech_params.weight_g} g` : null },
                { label: A.params.size, value: asset.tech_params.dim_x ? `${asset.tech_params.dim_x}×${asset.tech_params.dim_y}×${asset.tech_params.dim_z} mm` : null },
                { label: A.params.support, value: asset.tech_params.support_required != null ? (asset.tech_params.support_required ? A.params.yes : A.params.no) : null },
                { label: A.params.printTime, value: asset.tech_params.print_time_min ? `${Math.floor(asset.tech_params.print_time_min / 60)}h${asset.tech_params.print_time_min % 60}m` : null },
              ].filter(p => p.value != null).map(p => (
                <div key={p.label} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "#555" }}>{p.label}</p>
                  <p className="text-sm font-medium" style={{ color: "#ccc" }}>{p.value}</p>
                </div>
              ))}
            </div>
            {asset.tech_params.assembly_notes && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs mb-0.5" style={{ color: "#555" }}>{A.params.assembly}</p>
                <p className="text-sm" style={{ color: "#ccc" }}>{asset.tech_params.assembly_notes}</p>
              </div>
            )}
          </div>
        )}

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
            placeholder={lang === "zh" ? `在${zone.zone_name}发表你的看法…` : `Share your thoughts in ${zone.zone_name}…`}
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
