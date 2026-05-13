"use client";

import { useEffect, useState } from "react";
import { apiGetMyCredits, type ApiCreditsLedger } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";
const BG = "#050508";

const ACTION_ICON: Record<string, string> = {
  earn_task: "✦",
  earn_collab: "◈",
  earn_summary_adopted: "★",
  earn_daily_login: "☀",
  spend_bounty: "▼",
  earn_bounty: "▲",
  transfer_in: "↓",
  transfer_out: "↑",
};

export default function WalletPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.wallet;

  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<ApiCreditsLedger[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    apiGetMyCredits(page)
      .then(r => { setBalance(r.balance); setEntries(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, page]);

  if (!isLoggedIn) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: BG }}>
      <p className="text-sm" style={{ color: "#555" }}>{L.loginRequired}</p>
    </div>
  );

  const earned = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const spent = entries.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="rounded-2xl p-8 mb-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(0,245,212,0.06) 0%, rgba(0,0,0,0) 60%), rgba(255,255,255,0.025)", border: "1px solid rgba(0,245,212,0.15)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5"
            style={{ background: T, transform: "translate(30%, -30%)" }} />
          <p className="text-xs mb-2" style={{ color: "#555" }}>{L.balanceLabel}</p>
          <div className="text-5xl font-bold mb-1" style={{ color: T }}>
            {balance !== null ? balance.toFixed(1) : "—"}
          </div>
          <p className="text-xs" style={{ color: "#444" }}>1 {L.credits} ≈ {lang === "zh" ? "平台积分单位" : "platform credit unit"}</p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <p className="text-xs mb-1" style={{ color: "#555" }}>{L.earnedLabel}</p>
              <p className="text-lg font-semibold" style={{ color: "#eee" }}>+{earned.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "#555" }}>{L.spentLabel}</p>
              <p className="text-lg font-semibold" style={{ color: "#eee" }}>{spent.toFixed(1)}</p>
            </div>
          </div>

          <button
            className="mt-6 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "#666", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={() => alert(lang === "zh" ? "充值功能即将上线" : "Top-up coming soon")}
          >
            {lang === "zh" ? "充值 Credits（即将上线）" : "Top up Credits (coming soon)"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: lang === "zh" ? "版权分红" : "Royalties", value: "—", note: lang === "zh" ? "预留" : "TBD" },
            { label: lang === "zh" ? "悬赏完成" : "Bounties Done", value: entries.filter(e => e.action_type === "earn_bounty").length, note: lang === "zh" ? "次" : "times" },
            { label: lang === "zh" ? "任务奖励" : "Task Rewards", value: entries.filter(e => e.action_type === "earn_task").length, note: lang === "zh" ? "次" : "times" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-xl font-bold mb-0.5" style={{ color: "#eee" }}>{s.value}</div>
              <div className="text-xs" style={{ color: "#555" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: "#ccc" }}>{L.historyTitle}</h2>
          {loading ? (
            <div className="text-center py-8" style={{ color: "#333" }}>{COPY[lang].common.loading}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#444" }}>
              <p className="text-sm">{L.noHistory}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      background: e.amount > 0 ? "rgba(0,245,212,0.1)" : "rgba(255,100,100,0.08)",
                      color: e.amount > 0 ? T : "#f66",
                    }}>
                    {ACTION_ICON[e.action_type] ?? (e.amount > 0 ? "+" : "−")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#ccc" }}>{e.action_label}</p>
                    {e.note && <p className="text-xs truncate" style={{ color: "#555" }}>{e.note}</p>}
                    <p className="text-xs" style={{ color: "#444" }}>
                      {new Date(e.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")} · {lang === "zh" ? "余额" : "Balance"} {e.balance_after.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold flex-shrink-0"
                    style={{ color: e.amount > 0 ? T : "#f66" }}>
                    {e.amount > 0 ? "+" : ""}{e.amount.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
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
      </div>
    </div>
  );
}
