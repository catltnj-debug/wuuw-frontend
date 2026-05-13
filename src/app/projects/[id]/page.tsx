"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  apiGetProject, apiPatchProjectStatus, apiInviteProjectMember,
  apiAddMilestone, apiCompleteMilestone,
  type ApiProject, type ApiProjectMilestone,
} from "@/lib/api";

const T = "#00F5D4";
const STATUS_COLOR: Record<string, string> = {
  planning: "#888", active: T, completed: "#F5A623", cancelled: "#444",
};
const STATUS_LABEL: Record<string, string> = {
  planning: "规划中", active: "进行中", completed: "已完成", cancelled: "已取消",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const { user } = useAuth();

  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "milestones">("overview");

  // invite form
  const [inviteUser, setInviteUser] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteShare, setInviteShare] = useState(0);
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState("");

  // milestone form
  const [msTitle, setMsTitle] = useState("");
  const [msDue, setMsDue] = useState("");
  const [addingMs, setAddingMs] = useState(false);

  const refresh = async () => {
    const p = await apiGetProject(projectId);
    setProject(p);
  };

  useEffect(() => {
    apiGetProject(projectId)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>加载中…</p>
    </div>
  );
  if (!project) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>项目不存在</p>
    </div>
  );

  const isOwner = user?.id === project.creator_id;
  const isMember = project.members.some(m => m.user_id === user?.id);
  const completedMs = project.milestones.filter(m => m.completed).length;

  async function handleStatusChange(status: string) {
    const updated = await apiPatchProjectStatus(projectId, status);
    setProject(updated);
  }

  async function handleInvite() {
    if (!inviteUser.trim()) return;
    setInviting(true); setInviteErr("");
    try {
      const updated = await apiInviteProjectMember(projectId, inviteUser.trim(), inviteRole, inviteShare);
      setProject(updated); setInviteUser(""); setInviteShare(0);
    } catch (e: unknown) { setInviteErr(e instanceof Error ? e.message : "邀请失败"); }
    finally { setInviting(false); }
  }

  async function handleAddMs() {
    if (!msTitle.trim()) return;
    setAddingMs(true);
    try {
      await apiAddMilestone(projectId, { title: msTitle.trim(), due_date: msDue || undefined });
      setMsTitle(""); setMsDue("");
      await refresh();
    } catch { /* ignore */ }
    finally { setAddingMs(false); }
  }

  async function handleCompleteMs(ms: ApiProjectMilestone) {
    await apiCompleteMilestone(projectId, ms.id);
    await refresh();
  }

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: `${STATUS_COLOR[project.status]}18`, color: STATUS_COLOR[project.status] }}>
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
                <span className="text-xs font-mono" style={{ color: "#444" }}>{project.project_no}</span>
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#eee" }}>{project.title}</h1>
              <p className="text-sm mb-3" style={{ color: "#555" }}>
                创建者 @{project.creator_username} · {new Date(project.created_at).toLocaleDateString("zh-CN")}
              </p>
              {project.description && (
                <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{project.description}</p>
              )}
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noreferrer"
                  className="text-xs mt-3 inline-flex items-center gap-1"
                  style={{ color: T }}>
                  ⌥ GitHub →
                </a>
              )}
            </div>
            {isOwner && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                {project.status === "planning" && (
                  <button onClick={() => handleStatusChange("active")}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.3)` }}>
                    启动项目
                  </button>
                )}
                {project.status === "active" && (
                  <button onClick={() => handleStatusChange("completed")}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}>
                    标记完成
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {project.milestones.length > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "#555" }}>
                <span>里程碑进度</span>
                <span>{completedMs}/{project.milestones.length}</span>
              </div>
              <div className="h-1 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded transition-all"
                  style={{ width: `${(completedMs / project.milestones.length) * 100}%`, background: T }} />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
          {(["overview", "members", "milestones"] as const).map(tab => {
            const labels = { overview: "概览", members: `成员 (${project.members.length})`, milestones: `里程碑 (${project.milestones.length})` };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab ? "rgba(0,245,212,0.1)" : "transparent",
                  color: activeTab === tab ? T : "#555",
                  border: activeTab === tab ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
                }}>
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "成员", value: project.members.length },
              { label: "里程碑", value: project.milestones.length },
              { label: "已完成", value: completedMs },
              { label: "状态", value: STATUS_LABEL[project.status] ?? project.status },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-xl font-bold mb-1" style={{ color: "#eee" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "#555" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Members */}
        {activeTab === "members" && (
          <div className="space-y-3">
            {project.members.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "rgba(0,245,212,0.1)", color: T }}>
                  {m.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#ccc" }}>@{m.username}</p>
                  <p className="text-xs" style={{ color: "#555" }}>{m.role} · 股份 {m.share_pct}%</p>
                </div>
              </div>
            ))}
            {isOwner && (
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs mb-3 font-medium" style={{ color: "#666" }}>邀请成员</p>
                <div className="flex gap-2 flex-wrap">
                  <input value={inviteUser} onChange={e => setInviteUser(e.target.value)}
                    placeholder="用户名" className="flex-1 min-w-[100px] px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }} />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }}>
                    <option value="member">成员</option>
                    <option value="reviewer">审查者</option>
                  </select>
                  <input type="number" value={inviteShare} onChange={e => setInviteShare(Number(e.target.value))}
                    placeholder="股份%" min={0} max={100} className="w-20 px-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }} />
                  <button onClick={handleInvite} disabled={inviting}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(0,245,212,0.12)", color: T }}>
                    {inviting ? "…" : "邀请"}
                  </button>
                </div>
                {inviteErr && <p className="text-xs mt-2" style={{ color: "#f56" }}>{inviteErr}</p>}
              </div>
            )}
          </div>
        )}

        {/* Milestones */}
        {activeTab === "milestones" && (
          <div className="space-y-3">
            {project.milestones.map(ms => (
              <div key={ms.id} className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs ${ms.completed ? "bg-teal-500 border-teal-500" : "border-gray-600"}`}
                  style={ms.completed ? { background: T, borderColor: T } : { borderColor: "#444" }}>
                  {ms.completed && "✓"}
                </div>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: ms.completed ? "#666" : "#ccc", textDecoration: ms.completed ? "line-through" : "none" }}>
                    {ms.title}
                  </p>
                  {ms.due_date && <p className="text-xs mt-0.5" style={{ color: "#444" }}>截止 {ms.due_date}</p>}
                </div>
                {!ms.completed && isMember && (
                  <button onClick={() => handleCompleteMs(ms)}
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(0,245,212,0.08)", color: T }}>
                    完成
                  </button>
                )}
              </div>
            ))}
            {isMember && (
              <div className="flex gap-2">
                <input value={msTitle} onChange={e => setMsTitle(e.target.value)}
                  placeholder="新里程碑标题…" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }} />
                <input type="date" value={msDue} onChange={e => setMsDue(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }} />
                <button onClick={handleAddMs} disabled={addingMs || !msTitle.trim()}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(0,245,212,0.12)", color: T }}>
                  {addingMs ? "…" : "添加"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
