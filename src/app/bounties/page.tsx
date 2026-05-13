"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGetBounties, apiPostBounty, apiClaimBounty, apiCancelBounty,
         apiGetMyCredits, ApiBounty } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";
const BG = "#050508";

const STATUS_COLOR: Record<string, string> = {
  open: T, claimed: "#F5A623", completed: "#888", cancelled: "#444",
};

export default function BountiesPage() {
  const { user, isLoggedIn } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.bounties;
  const S = COPY[lang].status;

  const STATUS_TABS = [
    { key: "", label: L.tabs.all },
    { key: "open", label: L.tabs.open },
    { key: "claimed", label: L.tabs.claimed },
    { key: "completed", label: L.tabs.completed },
  ];

  const STATUS_LABEL: Record<string, string> = {
    open: S.open, claimed: S.claimed, completed: S.completed, cancelled: S.cancelled,
  };

  const [bounties, setBounties] = useState<ApiBounty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("");
  const [search, setSearch] = useState("");
  const [deb, setDeb] = useState("");
  const [loading, setLoading] = useState(false);
  const [myCredits, setMyCredits] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", amount: "", deadline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [claimTarget, setClaimTarget] = useState<ApiBounty | null>(null);
  const [claimNote, setClaimNote] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState("");

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBounties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetBounties({ q: deb || undefined, status: statusTab || undefined, page });
      setBounties(res.items);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [deb, statusTab, page]);

  useEffect(() => { fetchBounties(); }, [fetchBounties]);

  useEffect(() => {
    if (isLoggedIn) {
      apiGetMyCredits().then(r => setMyCredits(r.balance)).catch(() => {});
    }
  }, [isLoggedIn]);

  async function handlePost() {
    const amount = parseFloat(form.amount);
    if (!form.title.trim()) { setErr(lang === "zh" ? "标题不能为空" : "Title required"); return; }
    if (!amount || amount < 1) { setErr(lang === "zh" ? "悬赏金额至少 1 Credits" : "Minimum 1 Credit"); return; }
    if (myCredits !== null && amount > myCredits) {
      setErr(lang === "zh" ? `Credits 不足（当前 ${myCredits.toFixed(1)}）` : `Insufficient credits (${myCredits.toFixed(1)})`); return;
    }
    setSubmitting(true); setErr("");
    try {
      const b = await apiPostBounty({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        amount,
        deadline: form.deadline || undefined,
      });
      setShowModal(false);
      setForm({ title: "", description: "", amount: "", deadline: "" });
      setBounties(prev => [b, ...prev]);
      setTotal(t => t + 1);
      setMyCredits(c => c !== null ? c - amount : c);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "error");
    } finally { setSubmitting(false); }
  }

  async function handleClaim() {
    if (!claimTarget) return;
    setClaiming(true); setClaimErr("");
    try {
      const updated = await apiClaimBounty(claimTarget.id, claimNote || undefined);
      setBounties(prev => prev.map(b => b.id === updated.id ? updated : b));
      setClaimTarget(null); setClaimNote("");
    } catch (e: unknown) {
      setClaimErr(e instanceof Error ? e.message : "error");
    } finally { setClaiming(false); }
  }

  async function handleCancel(b: ApiBounty) {
    try {
      const updated = await apiCancelBounty(b.id);
      setBounties(prev => prev.map(x => x.id === updated.id ? updated : x));
      setMyCredits(c => c !== null ? c + b.amount : c);
    } catch { /* ignore */ }
  }

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>{L.title}</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn && myCredits !== null && (
              <div className="text-sm px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(0,245,212,0.06)", color: T, border: "1px solid rgba(0,245,212,0.15)" }}>
                💎 {myCredits.toFixed(1)} Credits
              </div>
            )}
            {isLoggedIn && (
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}>
                {L.post}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={L.searchPlaceholder}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }} />
          <div className="flex gap-1">
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => { setStatusTab(tab.key); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: statusTab === tab.key ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: statusTab === tab.key ? T : "#666",
                  border: statusTab === tab.key ? `1px solid rgba(0,245,212,0.3)` : "1px solid rgba(255,255,255,0.06)",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "#333" }}>{COPY[lang].common.loading}</div>
        ) : bounties.length === 0 ? (
          <div className="text-center py-20" style={{ color: "#333" }}>
            <div className="text-4xl mb-3">🎯</div>
            <p>{L.noData}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {bounties.map(b => {
              const isOwner = user?.id === b.creator_id;
              const alreadyClaimed = b.claims.some(c => c.claimer_id === user?.id);
              return (
                <div key={b.id} className="rounded-xl p-5"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${STATUS_COLOR[b.status] ?? "#888"}18`, color: STATUS_COLOR[b.status] ?? "#888" }}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                        <span className="text-xs font-mono" style={{ color: "#444" }}>{b.bounty_no}</span>
                        {b.deadline && (
                          <span className="text-xs" style={{ color: "#444" }}>{L.deadlineLabel} {b.deadline}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: "#ccc" }}>{b.title}</h3>
                      {b.description && (
                        <p className="text-xs line-clamp-2 mb-2" style={{ color: "#555" }}>{b.description}</p>
                      )}
                      <span className="text-xs" style={{ color: "#444" }}>by @{b.creator_username}</span>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <div className="text-lg font-bold" style={{ color: T }}>
                        💎 {b.amount.toFixed(0)}
                      </div>
                      <div className="text-xs" style={{ color: "#555" }}>{L.reward(Math.floor(b.amount * 0.8))}</div>
                      {isLoggedIn && !isOwner && b.status === "open" && !alreadyClaimed && (
                        <button onClick={() => setClaimTarget(b)}
                          className="px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.25)` }}>
                          {L.claim}
                        </button>
                      )}
                      {isOwner && b.status === "open" && (
                        <button onClick={() => handleCancel(b)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ color: "#555", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {L.cancel}
                        </button>
                      )}
                      {alreadyClaimed && (
                        <span className="text-xs" style={{ color: "#F5A623" }}>{L.cancelClaim}</span>
                      )}
                    </div>
                  </div>

                  {isOwner && b.claims.length > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <p className="text-xs mb-2" style={{ color: "#555" }}>{L.claimList}</p>
                      {b.claims.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs py-1">
                          <span style={{ color: "#777" }}>@{c.claimer_username}</span>
                          <span style={{ color: c.status === "approved" ? T : "#666" }}>{c.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
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

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6"
            style={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#eee" }}>{L.modal.title}</h2>
            {myCredits !== null && (
              <p className="text-xs mb-5" style={{ color: "#555" }}>
                {L.modal.balance}：<span style={{ color: T }}>💎 {myCredits.toFixed(1)} Credits</span>
              </p>
            )}
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.modal.titleLabel}</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={L.modal.titlePlaceholder}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }} />
            </div>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.modal.descLabel}</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder={L.modal.descPlaceholder}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.modal.amountLabel}</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="100" min={1}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#666" }}>{L.modal.deadlineLabel}</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }} />
              </div>
            </div>
            {err && <p className="text-xs mb-3" style={{ color: "#f56" }}>{err}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#666" }}>
                {L.modal.cancel}
              </button>
              <button onClick={handlePost} disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(0,245,212,0.15)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}>
                {submitting ? L.modal.submitting : L.modal.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {claimTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setClaimTarget(null); }}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: "#0d0d12", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-base font-semibold mb-1" style={{ color: "#eee" }}>{L.claimModal.title}</h2>
            <p className="text-xs mb-4" style={{ color: "#555" }}>
              《{claimTarget.title}》 · 💎 {(claimTarget.amount * 0.8).toFixed(0)} Credits
            </p>
            <textarea value={claimNote} onChange={e => setClaimNote(e.target.value)}
              rows={3} placeholder={L.claimModal.noteLabel}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }} />
            {claimErr && <p className="text-xs mb-3" style={{ color: "#f56" }}>{claimErr}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setClaimTarget(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#666" }}>
                {L.claimModal.cancel}
              </button>
              <button onClick={handleClaim} disabled={claiming}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(0,245,212,0.15)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}>
                {claiming ? L.claimModal.submitting : L.claimModal.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
