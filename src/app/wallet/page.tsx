"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  apiGetMyCredits, apiGetPaymentHistory, apiCreateCheckout,
  type ApiCreditsLedger, type ApiPaymentOrder,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";
const BG = "#050508";

const ACTION_ICON: Record<string, string> = {
  earn_task: "✦", earn_collab: "◈", earn_summary_adopted: "★",
  earn_daily_login: "☀", spend_bounty: "▼", earn_bounty: "▲",
  transfer_in: "↓", transfer_out: "↑", purchase: "💳",
};

const PACKAGES = [
  { key: "starter", name: "Starter", usd: 9.99,  credits: 500,  desc: "适合个人体验", descEn: "Perfect for getting started" },
  { key: "pro",     name: "Pro",     usd: 24.99, credits: 1500, desc: "最受欢迎",      descEn: "Most popular",            popular: true },
  { key: "studio",  name: "Studio",  usd: 59.99, credits: 4000, desc: "专业创作者",    descEn: "For power creators" },
];

export default function WalletPage() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.wallet;
  const zh = lang === "zh";
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<ApiCreditsLedger[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [payHistory, setPayHistory] = useState<ApiPaymentOrder[]>([]);
  const [payHistoryTotal, setPayHistoryTotal] = useState(0);
  const [payPage, setPayPage] = useState(1);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"credits" | "purchase" | "payHistory">("credits");

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Handle Stripe redirect
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setPayMsg({ type: "success", text: zh ? "支付成功！Credits 已充入账户" : "Payment successful! Credits added to your account." });
      setActiveTab("credits");
    } else if (status === "cancelled") {
      setPayMsg({ type: "error", text: zh ? "支付已取消" : "Payment cancelled." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    apiGetMyCredits(page)
      .then(r => { setBalance(r.balance); setEntries(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, page]);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGetPaymentHistory(payPage)
      .then(r => { setPayHistory(r.items); setPayHistoryTotal(r.total); })
      .catch(() => {});
  }, [isLoggedIn, payPage]);

  async function handlePurchase(pkgKey: string) {
    setPurchasing(pkgKey);
    try {
      const origin = window.location.origin;
      const res = await apiCreateCheckout({
        package: pkgKey,
        success_url: `${origin}/wallet`,
        cancel_url: `${origin}/wallet`,
      });
      window.location.href = res.url;
    } catch (e) {
      setPayMsg({ type: "error", text: e instanceof Error ? e.message : (zh ? "支付创建失败" : "Failed to create checkout") });
    } finally {
      setPurchasing(null);
    }
  }

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

        {/* ── 余额卡 ── */}
        <div className="rounded-2xl p-8 mb-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(0,245,212,0.06) 0%, rgba(0,0,0,0) 60%), rgba(255,255,255,0.025)", border: "1px solid rgba(0,245,212,0.15)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5"
            style={{ background: T, transform: "translate(30%, -30%)" }} />
          <p className="text-xs mb-2" style={{ color: "#555" }}>{L.balanceLabel}</p>
          <div className="text-5xl font-bold mb-1" style={{ color: T }}>
            {balance !== null ? balance.toFixed(1) : "—"}
          </div>
          <p className="text-xs" style={{ color: "#444" }}>1 {L.credits} ≈ {zh ? "平台积分单位" : "platform credit unit"}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-xs mb-1" style={{ color: "#555" }}>{L.earnedLabel}</p>
              <p className="text-lg font-semibold" style={{ color: "#eee" }}>+{earned.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "#555" }}>{L.spentLabel}</p>
              <p className="text-lg font-semibold" style={{ color: "#eee" }}>{spent.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* ── Toast ── */}
        {payMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            style={{
              background: payMsg.type === "success" ? "rgba(0,245,212,0.08)" : "rgba(255,80,80,0.08)",
              border: `1px solid ${payMsg.type === "success" ? "rgba(0,245,212,0.2)" : "rgba(255,80,80,0.2)"}`,
              color: payMsg.type === "success" ? T : "#f66",
            }}>
            <span>{payMsg.text}</span>
            <button onClick={() => setPayMsg(null)} style={{ color: "#666" }}>✕</button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
          {([
            { key: "credits",    label: zh ? "积分记录" : "Credits History" },
            { key: "purchase",   label: zh ? "购买 Credits" : "Buy Credits" },
            { key: "payHistory", label: zh ? "支付记录" : "Payment History" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.key ? "rgba(0,245,212,0.1)" : "transparent",
                color: activeTab === tab.key ? T : "#555",
                border: activeTab === tab.key ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 积分记录 ── */}
        {activeTab === "credits" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: zh ? "悬赏完成" : "Bounties Done", value: entries.filter(e => e.action_type === "earn_bounty").length, note: zh ? "次" : "times" },
                { label: zh ? "任务奖励" : "Task Rewards", value: entries.filter(e => e.action_type === "earn_task").length, note: zh ? "次" : "times" },
                { label: zh ? "充值次数" : "Purchases", value: entries.filter(e => e.action_type === "purchase").length, note: zh ? "次" : "times" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl text-center"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-xl font-bold mb-0.5" style={{ color: "#eee" }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "#555" }}>{s.label}</div>
                </div>
              ))}
            </div>

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
                      style={{ background: e.amount > 0 ? "rgba(0,245,212,0.1)" : "rgba(255,100,100,0.08)", color: e.amount > 0 ? T : "#f66" }}>
                      {ACTION_ICON[e.action_type] ?? (e.amount > 0 ? "+" : "−")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "#ccc" }}>{e.action_label}</p>
                      {e.note && <p className="text-xs truncate" style={{ color: "#555" }}>{e.note}</p>}
                      <p className="text-xs" style={{ color: "#444" }}>
                        {new Date(e.created_at).toLocaleDateString(zh ? "zh-CN" : "en-US")} · {zh ? "余额" : "Balance"} {e.balance_after.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold flex-shrink-0" style={{ color: e.amount > 0 ? T : "#f66" }}>
                      {e.amount > 0 ? "+" : ""}{e.amount.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded text-xs"
                    style={{ background: p === page ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)", color: p === page ? T : "#666", border: p === page ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)" }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 购买 Credits ── */}
        {activeTab === "purchase" && (
          <div>
            <p className="text-sm mb-6" style={{ color: "#666" }}>
              {zh ? "选择合适的套餐，Credits 将即时到账。" : "Choose a package — Credits are added instantly after payment."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PACKAGES.map(pkg => (
                <div key={pkg.key}
                  className="relative rounded-2xl p-6 flex flex-col"
                  style={{
                    background: pkg.popular ? "rgba(0,245,212,0.06)" : "rgba(255,255,255,0.025)",
                    border: pkg.popular ? "1px solid rgba(0,245,212,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: T, color: "#050508" }}>
                      {zh ? "最受欢迎" : "Popular"}
                    </div>
                  )}
                  <p className="text-sm font-bold mb-1" style={{ color: "#eee" }}>{pkg.name}</p>
                  <p className="text-xs mb-4" style={{ color: "#666" }}>{zh ? pkg.desc : pkg.descEn}</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold" style={{ color: pkg.popular ? T : "#eee" }}>{pkg.credits.toLocaleString()}</span>
                    <span className="text-sm ml-1" style={{ color: "#666" }}>Credits</span>
                  </div>
                  <p className="text-xs mb-6" style={{ color: "#555" }}>${pkg.usd.toFixed(2)} USD</p>
                  <button
                    onClick={() => handlePurchase(pkg.key)}
                    disabled={purchasing !== null}
                    className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: purchasing === pkg.key ? "rgba(0,245,212,0.3)" : pkg.popular ? T : "rgba(255,255,255,0.06)",
                      color: pkg.popular ? "#050508" : "#ccc",
                      border: pkg.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {purchasing === pkg.key ? (zh ? "跳转中…" : "Redirecting…") : (zh ? "立即购买" : "Buy Now")}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mt-6" style={{ color: "#444" }}>
              {zh ? "由 Stripe 安全处理 · 支持 Visa / Mastercard / 支付宝" : "Powered by Stripe · Visa / Mastercard / Apple Pay accepted"}
            </p>
          </div>
        )}

        {/* ── 支付记录 ── */}
        {activeTab === "payHistory" && (
          <div>
            {payHistory.length === 0 ? (
              <div className="text-center py-16" style={{ color: "#444" }}>
                <p className="text-sm">{zh ? "暂无支付记录" : "No payment history yet"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payHistory.map(o => (
                  <div key={o.id} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: o.status === "paid" ? "rgba(0,245,212,0.1)" : "rgba(255,255,255,0.04)", color: o.status === "paid" ? T : "#666" }}>
                      💳
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "#ccc" }}>{o.package_name} Pack — {o.credits_amount.toLocaleString()} Credits</p>
                      <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                        {o.order_no} · {new Date(o.created_at).toLocaleDateString(zh ? "zh-CN" : "en-US")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#eee" }}>${o.amount_usd.toFixed(2)}</p>
                      <p className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block"
                        style={{
                          background: o.status === "paid" ? "rgba(0,245,212,0.08)" : "rgba(255,255,255,0.04)",
                          color: o.status === "paid" ? T : "#666",
                        }}>
                        {o.status === "paid" ? (zh ? "已支付" : "Paid") : o.status === "pending" ? (zh ? "待支付" : "Pending") : (zh ? "失败" : "Failed")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {Math.ceil(payHistoryTotal / 20) > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: Math.ceil(payHistoryTotal / 20) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPayPage(p)} className="w-8 h-8 rounded text-xs"
                    style={{ background: p === payPage ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)", color: p === payPage ? T : "#666", border: p === payPage ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)" }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
