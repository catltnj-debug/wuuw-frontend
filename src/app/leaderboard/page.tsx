"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetLeaderboard, type ApiLeaderboardEntry } from "@/lib/api";

const T = "#00F5D4";

const RANK_STYLE: Record<number, { color: string; bg: string }> = {
  1: { color: "#FFD700", bg: "rgba(255,215,0,0.08)" },
  2: { color: "#C0C0C0", bg: "rgba(192,192,192,0.08)" },
  3: { color: "#CD7F32", bg: "rgba(205,127,50,0.08)" },
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ApiLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetLeaderboard(50)
      .then(d => setEntries(d.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── 标题 ── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>经验值排行榜</h1>
          <p className="text-sm" style={{ color: "#555" }}>社区贡献者综合排名 Top 50</p>
        </div>

        {/* ── 前三名卡片 ── */}
        {!loading && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[entries[1], entries[0], entries[2]].map((entry, i) => {
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const rs = RANK_STYLE[rank];
              return (
                <Link key={entry.user_id} href={`/users/${entry.user_id}`}
                  className="flex flex-col items-center p-4 rounded-2xl transition-all"
                  style={{ background: rs.bg, border: `1px solid ${rs.color}25`, order: rank === 1 ? -1 : 0 }}>
                  <div className="text-2xl mb-2">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2"
                    style={{ background: `${rs.color}15`, color: rs.color }}>
                    {entry.username[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold truncate w-full text-center" style={{ color: "#ddd" }}>{entry.username}</p>
                  <p className="text-xs mt-0.5" style={{ color: rs.color }}>{entry.level_name}</p>
                  <p className="text-xs mt-1 font-mono font-bold" style={{ color: rs.color }}>
                    {entry.total_exp.toLocaleString()} EXP
                  </p>
                  {entry.titles.length > 0 && (
                    <p className="text-xs mt-1 text-center" style={{ color: "#555" }}>
                      {entry.titles[0]}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── 完整榜单 ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#3a3a3a" }}>
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map(entry => {
              const rs = RANK_STYLE[entry.rank];
              const isTop3 = entry.rank <= 3;
              return (
                <Link key={entry.user_id} href={`/users/${entry.user_id}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all group"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,245,212,0.15)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.04)"; }}>

                  {/* 排名 */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3 ? (
                      <span className="text-lg">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
                    ) : (
                      <span className="text-sm font-mono font-semibold" style={{ color: "#3a3a3a" }}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* 头像 */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isTop3 ? `${rs.color}15` : "rgba(0,245,212,0.08)",
                      color: isTop3 ? rs.color : T,
                    }}>
                    {entry.username[0]?.toUpperCase()}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#ddd" }}>{entry.username}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,245,212,0.06)", color: "#666", fontSize: 10 }}>
                        Lv{entry.level}
                      </span>
                      {entry.titles.slice(0, 2).map(t => (
                        <span key={t} className="text-xs px-1.5 py-0.5 rounded hidden sm:inline"
                          style={{ background: "rgba(191,95,255,0.08)", color: "#BF5FFF", fontSize: 10 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: "#444" }}>{entry.level_name}</span>
                      <span className="text-xs" style={{ color: "#3a3a3a" }}>·</span>
                      <span className="text-xs" style={{ color: "#444" }}>{entry.project_count} 个项目</span>
                    </div>
                  </div>

                  {/* 经验 + 进度 */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-mono font-semibold"
                      style={{ color: isTop3 ? rs.color : T }}>
                      {entry.total_exp.toLocaleString()}
                    </p>
                    <div className="w-20 h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${entry.progress_pct}%`, background: isTop3 ? rs.color : T }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
