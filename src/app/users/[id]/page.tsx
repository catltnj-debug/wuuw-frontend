"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGetUserProfile, apiGetExpLog, apiGetUserCreditsPublic,
         type ApiUserProfile, type ApiExpLog } from "@/lib/api";
import { useLang } from "@/lib/language";

const T = "#00F5D4";

function getActionLabel(lang: string): Record<string, string> {
  const zh = lang === "zh";
  return {
    post_discussion:  zh ? "发布讨论"    : "Posted discussion",
    reply_discussion: zh ? "回复讨论"    : "Replied to discussion",
    like_given:       zh ? "为帖子点赞"  : "Liked a post",
    like_received:    zh ? "帖子被点赞"  : "Post liked",
    task_claimed:     zh ? "认领任务"    : "Claimed task",
    task_completed:   zh ? "完成任务"    : "Completed task",
    upload_asset:     zh ? "上传资产"    : "Uploaded asset",
    collab_completed: zh ? "完成协作"    : "Completed collaboration",
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { lang } = useLang();
  const ACTION_LABEL = getActionLabel(lang);

  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [logs, setLogs] = useState<ApiExpLog[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      apiGetUserProfile(userId),
      apiGetUserCreditsPublic(userId),
    ])
      .then(([p, c]) => { setProfile(p); setCredits(c?.credits_balance ?? null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLogLoading(true);
    apiGetExpLog(userId, logPage)
      .then(d => { setLogs(d.items); setLogTotal(d.total); })
      .catch(console.error)
      .finally(() => setLogLoading(false));
  }, [userId, logPage]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>{lang === "zh" ? "加载中…" : "Loading…"}</p>
    </div>
  );
  if (!profile) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>{lang === "zh" ? "用户不存在" : "User not found"}</p>
    </div>
  );

  const { level } = profile;
  const expToNext = level.next_level_min != null ? level.next_level_min - level.current_exp : null;

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* ── 用户卡片 ── */}
        <div className="p-6 rounded-2xl flex items-start gap-6"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* 头像 */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: "rgba(0,245,212,0.1)", color: T, border: `2px solid rgba(0,245,212,0.25)` }}>
            {profile.username[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold" style={{ color: "#eee" }}>{profile.username}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(0,245,212,0.08)", color: T }}>
                Lv{level.level} · {level.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)", color: "#777" }}>
                {profile.tier}
              </span>
            </div>

            {/* 头衔列表 */}
            {profile.titles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.titles.map(t => (
                  <span key={t.key} title={t.desc}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(191,95,255,0.1)", color: "#BF5FFF" }}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* 经验进度条 */}
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "#555" }}>
                <span>{level.current_exp.toLocaleString()} EXP</span>
                {expToNext != null
                  ? <span>{lang === "zh" ? `距下一级还差 ${expToNext.toLocaleString()} EXP` : `${expToNext.toLocaleString()} EXP to next level`}</span>
                  : <span>{lang === "zh" ? "满级" : "Max level"}</span>}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${level.progress_pct}%`, background: `linear-gradient(90deg, ${T}, #00c4aa)` }} />
              </div>
            </div>

            <p className="text-xs mt-2" style={{ color: "#3a3a3a" }}>
              {lang === "zh" ? "加入于" : "Joined"} {new Date(profile.joined_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
            </p>
          </div>

          {/* Credits badge */}
          {credits !== null && (
            <div className="flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl"
              style={{ background: "rgba(0,245,212,0.06)", border: "1px solid rgba(0,245,212,0.12)" }}>
              <span className="text-lg font-bold" style={{ color: T }}>💎</span>
              <span className="text-base font-bold" style={{ color: T }}>{credits.toFixed(0)}</span>
              <span className="text-xs" style={{ color: "#555" }}>Credits</span>
            </div>
          )}
        </div>

        {/* ── 参与项目 ── */}
        {profile.projects.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#666" }}>{lang === "zh" ? "参与项目" : "Projects"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.projects.map(p => (
                <Link key={p.id} href={`/assets/${p.id}`}
                  className="p-4 rounded-xl flex items-center justify-between group transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,245,212,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)"; }}>
                  <div className="min-w-0">
                    <p className="text-sm truncate font-medium" style={{ color: "#ccc" }}>{p.title}</p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: "#555" }}>{p.asset_no} · {p.current_version}</p>
                  </div>
                  <span className="text-sm flex-shrink-0 ml-2" style={{ color: "rgba(0,245,212,0.4)" }}>→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 经验记录 ── */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#666" }}>{lang === "zh" ? "经验记录" : "EXP History"}</h2>
          {logLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#3a3a3a" }}>{lang === "zh" ? "暂无经验记录" : "No EXP history yet"}</p>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-sm" style={{ color: "#bbb" }}>
                      {ACTION_LABEL[log.action_type] ?? log.action_type}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs" style={{ color: "#555" }}>
                        {new Date(log.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}
                      </span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: T }}>
                        +{log.exp_gained}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {logTotal > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: logPage === 1 ? "#333" : "#777" }}>
                    {lang === "zh" ? "上一页" : "Prev"}
                  </button>
                  <span className="px-3 py-1.5 text-xs" style={{ color: "#555" }}>
                    {lang === "zh" ? `第 ${logPage} 页 / 共 ${Math.ceil(logTotal / 20)} 页` : `${logPage} / ${Math.ceil(logTotal / 20)}`}
                  </span>
                  <button onClick={() => setLogPage(p => p + 1)} disabled={logPage * 20 >= logTotal}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: logPage * 20 >= logTotal ? "#333" : "#777" }}>
                    {lang === "zh" ? "下一页" : "Next"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
