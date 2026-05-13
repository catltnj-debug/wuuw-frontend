"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";
import {
  apiGetAllTasks, apiClaimTask,
  apiGetBounties, apiPostBounty, apiClaimBounty, apiGetMyCredits,
  type ApiDiscTask, type ApiBounty,
} from "@/lib/api";

const T = "#00F5D4";

const ZONE_COLOR: Record<string, string> = {
  requirement: "#F5A623",
  data:        T,
  review:      "#BF5FFF",
};

const BOUNTY_STATUS_COLOR: Record<string, string> = {
  open: T, claimed: "#F5A623", completed: "#888", cancelled: "#444",
};

export default function TasksPage() {
  const { isLoggedIn, user } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.tasks;
  const S = COPY[lang].status;

  const TABS = [
    { value: "bounty",      label: L.tabs.bounty },
    { value: "open",        label: L.tabs.open },
    { value: "claimed",     label: L.tabs.claimed },
    { value: "in_progress", label: L.tabs.in_progress },
    { value: "done",        label: L.tabs.done },
  ];

  const ZONE_LABEL: Record<string, string> = lang === "zh"
    ? { requirement: "需求区", data: "数据区", review: "评测区" }
    : { requirement: "Requirements", data: "Data", review: "Review" };

  const [tab, setTab] = useState("bounty");
  const [tasks, setTasks] = useState<ApiDiscTask[]>([]);
  const [bounties, setBounties] = useState<ApiBounty[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", amount: "", deadline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [myCredits, setMyCredits] = useState<number | null>(null);

  function load(t: string, p: number) {
    setLoading(true);
    if (t === "bounty") {
      apiGetBounties({ page: p })
        .then(d => { setBounties(d.items); setTotal(d.total); })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      apiGetAllTasks(t, p)
        .then(d => { setTasks(d.items); setTotal(d.total); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => { load(tab, page); }, [tab, page]);

  useEffect(() => {
    if (isLoggedIn) apiGetMyCredits(1).then(r => setMyCredits(r.balance)).catch(() => {});
  }, [isLoggedIn]);

  function handleTabChange(t: string) { setTab(t); setPage(1); }

  async function handleClaim(taskId: number) {
    setClaimingId(taskId);
    try { await apiClaimTask(taskId); load(tab, page); }
    catch (e) { alert(e instanceof Error ? e.message : "error"); }
    finally { setClaimingId(null); }
  }

  async function handleClaimBounty(bountyId: number) {
    setClaimingId(bountyId);
    try { await apiClaimBounty(bountyId); load(tab, page); }
    catch (e) { alert(e instanceof Error ? e.message : "error"); }
    finally { setClaimingId(null); }
  }

  async function handlePostBounty() {
    const amount = parseFloat(form.amount);
    if (!form.title.trim()) { setFormErr(lang === "zh" ? "标题不能为空" : "Title required"); return; }
    if (!amount || amount < 1) { setFormErr(lang === "zh" ? "悬赏金额至少 1 Credits" : "Minimum 1 Credit"); return; }
    if (myCredits !== null && amount > myCredits) {
      setFormErr(lang === "zh" ? `Credits 不足（当前 ${myCredits.toFixed(1)}）` : `Insufficient credits (${myCredits.toFixed(1)})`); return;
    }
    setSubmitting(true); setFormErr("");
    try {
      await apiPostBounty({ title: form.title.trim(), description: form.description || undefined, amount, deadline: form.deadline || undefined });
      setShowModal(false);
      setForm({ title: "", description: "", amount: "", deadline: "" });
      if (tab === "bounty") load("bounty", 1);
    } catch (e) { setFormErr(e instanceof Error ? e.message : "error"); }
    finally { setSubmitting(false); }
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>
              {lang === "zh" ? "合作" : "Collab"}
            </h1>
            <p className="text-sm" style={{ color: "#555" }}>{L.subtitle}</p>
          </div>
          {isLoggedIn && (
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}>
              {L.publishBounty}
            </button>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "rgba(255,255,255,0.03)" }}>
          {TABS.map(opt => (
            <button key={opt.value} onClick={() => handleTabChange(opt.value)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === opt.value ? (opt.value === "bounty" ? "rgba(245,166,35,0.12)" : "rgba(0,245,212,0.1)") : "transparent",
                color: tab === opt.value ? (opt.value === "bounty" ? "#F5A623" : T) : "#555",
                border: tab === opt.value ? `1px solid ${opt.value === "bounty" ? "rgba(245,166,35,0.3)" : "rgba(0,245,212,0.2)"}` : "1px solid transparent",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : tab === "bounty" ? (
          bounties.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#3a3a3a" }}>
              <div className="text-4xl mb-3">💰</div>
              <p className="text-sm">{L.noBounties}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bounties.map(b => (
                <BountyCard key={b.id} bounty={b} userId={user?.id} isLoggedIn={isLoggedIn}
                  claiming={claimingId === b.id} onClaim={() => handleClaimBounty(b.id)}
                  statusColor={BOUNTY_STATUS_COLOR[b.status] ?? "#777"}
                  statusLabel={S[b.status as keyof typeof S] ?? b.status}
                  claimLabel={L.claimBounty} claimingLabel={L.claimingBounty} />
              ))}
            </div>
          )
        ) : (
          tasks.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#3a3a3a" }}>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">{L.noTasks}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} isLoggedIn={isLoggedIn}
                  claiming={claimingId === task.id} onClaim={() => handleClaim(task.id)}
                  zoneLabel={ZONE_LABEL[task.zone_type] ?? task.zone_name}
                  zoneColor={ZONE_COLOR[task.zone_type] ?? "#777"}
                  assigneeLabel={L.assignee}
                  claimLabel={L.claim} claimingLabel={L.claiming}
                  openLabel={S.open_task}
                  doneLabel={S.done} claimedLabel={S.claimed} inProgressLabel={S.in_progress} />
              ))}
            </div>
          )
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page === 1 ? "#333" : "#777" }}>
              {COPY[lang].common.prev}
            </button>
            <span className="px-3 py-1.5 text-xs" style={{ color: "#555" }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page >= totalPages ? "#333" : "#777" }}>
              {COPY[lang].common.next}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d0d12", border: "1px solid rgba(245,166,35,0.2)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: "#eee" }}>{L.bountyModal.title}</h2>
              {myCredits !== null && (
                <span className="text-xs" style={{ color: "#666" }}>
                  {L.bountyModal.balance}：<span style={{ color: T }}>{myCredits.toFixed(1)}</span> Credits
                </span>
              )}
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={L.bountyModal.titleField}
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={L.bountyModal.descField}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              <div className="flex gap-3">
                <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={L.bountyModal.amountField}
                  className="flex-1 px-3 py-2 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
              </div>
            </div>
            {formErr && <p className="mt-2 text-xs" style={{ color: "#f56" }}>{formErr}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl text-sm border"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>
                {L.bountyModal.cancel}
              </button>
              <button onClick={handlePostBounty} disabled={submitting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: submitting ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#050508" }}>
                {submitting ? L.bountyModal.submitting : L.bountyModal.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, isLoggedIn, claiming, onClaim, zoneLabel, zoneColor, assigneeLabel, claimLabel, claimingLabel, openLabel, doneLabel, claimedLabel, inProgressLabel }: {
  task: ApiDiscTask;
  isLoggedIn: boolean;
  claiming: boolean;
  onClaim: () => void;
  zoneLabel: string;
  zoneColor: string;
  assigneeLabel: string;
  claimLabel: string;
  claimingLabel: string;
  openLabel: string;
  doneLabel: string;
  claimedLabel: string;
  inProgressLabel: string;
}) {
  return (
    <div className="p-4 rounded-2xl flex items-start gap-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
            className="transition-colors" style={{ color: "#555" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00F5D4"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}>
            {task.asset_title}
          </Link>
          <span>·</span>
          <span>{new Date(task.created_at).toLocaleDateString()}</span>
          {task.assignee && <><span>·</span><span>{assigneeLabel}：{task.assignee}</span></>}
        </div>
      </div>
      <div className="flex-shrink-0">
        {task.status === "open" ? (
          isLoggedIn ? (
            <button onClick={onClaim} disabled={claiming}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: claiming ? "rgba(0,245,212,0.3)" : "#00F5D4", color: "#050508" }}>
              {claiming ? claimingLabel : claimLabel}
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(0,245,212,0.08)", color: "#00F5D4" }}>
              {openLabel}
            </span>
          )
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}>
            {task.status === "done" ? doneLabel : task.status === "claimed" ? claimedLabel : inProgressLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function BountyCard({ bounty, userId, isLoggedIn, claiming, onClaim, statusColor, statusLabel, claimLabel, claimingLabel }: {
  bounty: ApiBounty;
  userId?: number;
  isLoggedIn: boolean;
  claiming: boolean;
  onClaim: () => void;
  statusColor: string;
  statusLabel: string;
  claimLabel: string;
  claimingLabel: string;
}) {
  const isOwner = userId === bounty.creator_id;

  return (
    <div className="p-4 rounded-2xl flex items-start gap-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(245,166,35,0.1)" }}>
      <div className="flex-shrink-0 mt-0.5 text-center">
        <div className="text-lg leading-none">💰</div>
        <p className="text-xs font-bold mt-0.5" style={{ color: "#F5A623" }}>{bounty.amount}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1 truncate" style={{ color: "#ddd" }}>{bounty.title}</p>
        {bounty.description && (
          <p className="text-xs mb-2 line-clamp-2" style={{ color: "#666" }}>{bounty.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs" style={{ color: "#444" }}>
          <span style={{ color: "#555" }}>by {bounty.creator_username}</span>
          {bounty.deadline && <><span>·</span><span>{bounty.deadline}</span></>}
          <span>·</span>
          <span>{new Date(bounty.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: `${statusColor}18`, color: statusColor }}>
          {statusLabel}
        </span>
        {isLoggedIn && bounty.status === "open" && !isOwner && (
          <button onClick={onClaim} disabled={claiming}
            className="px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ background: claiming ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#050508" }}>
            {claiming ? claimingLabel : claimLabel}
          </button>
        )}
      </div>
    </div>
  );
}
