"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import {
  apiGetCollabRequests, apiApproveRequest, apiRejectRequest,
  apiGetMyTasks, apiSendCollabInvite, apiCompleteTask,
  type ApiCollabRequest, type ApiCollabTask,
} from "@/lib/api";

const T = "#00F5D4";
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待处理", approved: "已批准", rejected: "已拒绝", completed: "已完成",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#F5A623", approved: T, rejected: "#ff6b6b", completed: "#666",
};

type Tab = "received" | "tasks" | "sent" | "invite";

export default function CollaborationPage() {
  const { isLoggedIn, user } = useAuth();
  const [tab, setTab] = useState<Tab>("received");

  const [received, setReceived] = useState<ApiCollabRequest[]>([]);
  const [sent, setSent] = useState<ApiCollabRequest[]>([]);
  const [tasks, setTasks] = useState<ApiCollabTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionErr, setActionErr] = useState("");

  const fetchAll = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const [recvRes, sentRes, taskRes] = await Promise.all([
        apiGetCollabRequests("collaborator"),
        apiGetCollabRequests("requester"),
        apiGetMyTasks(),
      ]);
      setReceived(recvRes.requests);
      setSent(sentRes.requests);
      setTasks(taskRes.tasks);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleApprove(requestId: number) {
    setActionErr("");
    try {
      await apiApproveRequest(requestId);
      await fetchAll();
    } catch (e) { setActionErr(e instanceof Error ? e.message : "操作失败"); }
  }

  async function handleReject(requestId: number) {
    setActionErr("");
    try {
      await apiRejectRequest(requestId);
      await fetchAll();
    } catch (e) { setActionErr(e instanceof Error ? e.message : "操作失败"); }
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "received", label: "收到的邀请", badge: received.filter(r => r.status === "pending").length || undefined },
    { id: "tasks",    label: "我的任务",   badge: tasks.filter(t => t.status !== "completed").length || undefined },
    { id: "sent",     label: "发出的邀请" },
    { id: "invite",   label: "＋ 发起邀请" },
  ];

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
        <p style={{ color: "#555" }}>请先登录以查看协作内容</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>协作系统</h1>
        <p className="text-sm mb-6" style={{ color: "#555" }}>管理你的协作邀请与版本任务</p>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              style={{
                background: tab === t.id ? "rgba(0,245,212,0.1)" : "transparent",
                color: tab === t.id ? T : "#555",
                border: tab === t.id ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
              }}>
              {t.label}
              {t.badge ? (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "#F5A623", fontSize: 9 }}>{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {actionErr && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>
            {actionErr}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse h-24" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>

              {/* 收到的邀请 */}
              {tab === "received" && (
                <div className="space-y-3">
                  {received.length === 0 ? (
                    <Empty text="暂无收到的协作邀请" />
                  ) : received.map(r => (
                    <div key={r.request_id} className="p-4 rounded-2xl" style={cardStyle}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#ddd" }}>{r.asset_title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                            来自 <span style={{ color: T }}>{r.requester}</span> · {r.asset_no}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.modification_notes && (
                        <p className="text-xs mb-3 px-3 py-2 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.03)", color: "#888", lineHeight: 1.6 }}>
                          {r.modification_notes}
                        </p>
                      )}
                      <p className="text-xs mb-3" style={{ color: "#3a3a3a" }}>
                        {new Date(r.created_at).toLocaleString("zh-CN")}
                      </p>
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(r.request_id)}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: T, color: "#050508" }}>
                            接受并生成任务包
                          </button>
                          <button onClick={() => handleReject(r.request_id)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(255,80,80,0.12)", color: "#ff6b6b" }}>
                            拒绝
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 我的任务 */}
              {tab === "tasks" && (
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <Empty text="暂无协作任务" />
                  ) : tasks.map(t => (
                    <TaskCard key={t.task_id} task={t} currentUsername={user?.username ?? ""} onDone={fetchAll} />
                  ))}
                </div>
              )}

              {/* 发出的邀请 */}
              {tab === "sent" && (
                <div className="space-y-3">
                  {sent.length === 0 ? (
                    <Empty text="暂无发出的邀请" />
                  ) : sent.map(r => (
                    <div key={r.request_id} className="p-4 rounded-2xl" style={cardStyle}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#ddd" }}>{r.asset_title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                            邀请 <span style={{ color: T }}>{r.collaborator}</span> · {r.asset_no}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.modification_notes && (
                        <p className="text-xs px-3 py-2 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.03)", color: "#888", lineHeight: 1.6 }}>
                          {r.modification_notes}
                        </p>
                      )}
                      <p className="text-xs mt-2" style={{ color: "#3a3a3a" }}>
                        {new Date(r.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 发起邀请 */}
              {tab === "invite" && <InviteForm currentUsername={user?.username ?? ""} onSent={() => { fetchAll(); setTab("sent"); }} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── 任务卡片（含提交弹窗）────────────────────────────────────────────────────
function TaskCard({ task, currentUsername, onDone }: {
  task: ApiCollabTask;
  currentUsername: string;
  onDone: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const downloadUrl = `http://localhost:8001${task.download_url}`;

  return (
    <>
      <div className="p-4 rounded-2xl" style={cardStyle}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ddd" }}>{task.asset_title}</p>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>{task.asset_no}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        {task.modification_notes && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.03)", color: "#888", lineHeight: 1.6 }}>
            {task.modification_notes}
          </p>
        )}
        {task.expires_at && (
          <p className="text-xs mb-3" style={{ color: task.expired ? "#ff6b6b" : "#555" }}>
            {task.expired ? "⚠ 任务包已过期" : `有效期至 ${new Date(task.expires_at).toLocaleString("zh-CN")}`}
          </p>
        )}
        {task.status !== "completed" && (
          <div className="flex gap-2">
            <a href={downloadUrl} target="_blank" rel="noreferrer"
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: "#ccc" }}>
              下载任务包
            </a>
            <button onClick={() => setShowModal(true)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: T, color: "#050508" }}>
              提交新版本
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <SubmitVersionModal
          taskId={task.task_id}
          assetTitle={task.asset_title}
          currentUsername={currentUsername}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); onDone(); }}
        />
      )}
    </>
  );
}

// ── 提交版本弹窗 ──────────────────────────────────────────────────────────────
function SubmitVersionModal({ taskId, assetTitle, currentUsername, onClose, onSuccess }: {
  taskId: number;
  assetTitle: string;
  currentUsername: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [shares, setShares] = useState([
    { username: currentUsername, share: 100 },
    { username: "", share: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  function updateShare(i: number, field: "username" | "share", val: string) {
    setShares(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === "share" ? Number(val) : val } : s));
  }

  const total = shares.filter(s => s.username.trim()).reduce((acc, s) => acc + s.share, 0);

  async function handleSubmit() {
    if (!file) { setErr("请上传修改后的文件"); return; }
    const validShares = shares.filter(s => s.username.trim() && s.share > 0);
    if (Math.abs(total - 100) > 0.01) { setErr(`版权比例之和必须为100%（当前 ${total}%）`); return; }
    setSubmitting(true);
    setErr("");
    try {
      await apiCompleteTask(taskId, file, changeNotes, validShares);
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#ddd",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6" onClick={e => e.stopPropagation()}
        style={{ background: "#0d0d12", border: "1px solid rgba(0,245,212,0.15)" }}>
        <h3 className="text-base font-bold mb-1" style={{ color: "#eee" }}>提交新版本</h3>
        <p className="text-xs mb-5" style={{ color: "#555" }}>{assetTitle}</p>

        {/* 文件上传 */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>修改后的3D文件 *</label>
          <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
            onClick={() => document.getElementById("submit-file")?.click()}>
            <input id="submit-file" type="file" accept=".stl,.obj,.glb,.3mf" className="hidden"
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
            {file ? (
              <p className="text-sm" style={{ color: T }}>{file.name}</p>
            ) : (
              <p className="text-xs" style={{ color: "#555" }}>点击选择文件（STL · OBJ · GLB）</p>
            )}
          </div>
        </div>

        {/* 修改说明 */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>修改说明</label>
          <textarea rows={2} value={changeNotes} onChange={e => setChangeNotes(e.target.value)}
            placeholder="描述本次修改的内容…" style={{ ...inputStyle, resize: "none" }} />
        </div>

        {/* 版权份额 */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
            版权份额分配（合计 {total}% / 100%）
          </label>
          <div className="space-y-2">
            {shares.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="用户名" value={s.username}
                  onChange={e => updateShare(i, "username", e.target.value)}
                  style={{ ...inputStyle, flex: 2 }} />
                <input type="number" placeholder="%" min={0} max={100} value={s.share || ""}
                  onChange={e => updateShare(i, "share", e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            ))}
          </div>
          <button onClick={() => setShares(p => [...p, { username: "", share: 0 }])}
            className="mt-2 text-xs" style={{ color: "#555" }}>＋ 添加贡献者</button>
        </div>

        {err && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>{err}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#555" }}>取消</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: submitting ? "rgba(0,245,212,0.4)" : T, color: "#050508" }}>
            {submitting ? "提交中…" : "确认提交"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 发起邀请表单 ──────────────────────────────────────────────────────────────
function InviteForm({ currentUsername, onSent }: { currentUsername: string; onSent: () => void }) {
  const [assetId, setAssetId] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#ddd",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  async function handleSend() {
    if (!assetId || !collaborator.trim() || !notes.trim()) { setErr("请填写所有字段"); return; }
    if (collaborator.trim() === currentUsername) { setErr("不能邀请自己"); return; }
    setSending(true); setErr("");
    try {
      await apiSendCollabInvite(Number(assetId), collaborator.trim(), notes.trim());
      setAssetId(""); setCollaborator(""); setNotes("");
      onSent();
    } catch (e) { setErr(e instanceof Error ? e.message : "发送失败"); }
    finally { setSending(false); }
  }

  return (
    <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>资产 ID *</label>
        <input type="number" placeholder="在模型库找到你的资产 ID" value={assetId}
          onChange={e => setAssetId(e.target.value)} style={inputStyle} />
        <p className="text-xs mt-1" style={{ color: "#3a3a3a" }}>只有你创建的资产才能发起协作邀请</p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>被邀请人用户名 *</label>
        <input placeholder="输入对方用户名" value={collaborator}
          onChange={e => setCollaborator(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>修改说明 *</label>
        <textarea rows={3} placeholder="描述你希望对方进行的修改内容…" value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ ...inputStyle, resize: "none" }} />
      </div>
      {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>{err}</p>}
      <button onClick={handleSend} disabled={sending}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
        style={{ background: sending ? "rgba(0,245,212,0.4)" : T, color: "#050508" }}>
        {sending ? "发送中…" : "发送协作邀请"}
      </button>
    </div>
  );
}

// ── 小组件 ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
      style={{ background: `${STATUS_COLOR[status] ?? "#666"}18`, color: STATUS_COLOR[status] ?? "#666" }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16" style={{ color: "#3a3a3a" }}>
      <div className="text-4xl mb-3">◌</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
