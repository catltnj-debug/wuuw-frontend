"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetProject, apiInviteProjectMember, type ApiProject } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";

export default function ProjectMembersPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const { lang } = useLang();
  const L = COPY[lang].pages.projectSub;

  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ username: "", role: "member", share_pct: "0" });
  const [inviting, setInviting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    apiGetProject(id).then(setProject).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const isOwner = project?.creator_id === user?.id;

  async function handleInvite() {
    if (!inviteForm.username.trim()) { setErr(lang === "zh" ? "请输入用户名" : "Enter a username"); return; }
    setInviting(true); setErr("");
    try {
      const updated = await apiInviteProjectMember(id, inviteForm.username.trim(), inviteForm.role, parseFloat(inviteForm.share_pct) || 0);
      setProject(updated);
      setInviteForm({ username: "", role: "member", share_pct: "0" });
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setInviting(false); }
  }

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/projects/${id}`} className="text-xs" style={{ color: "#555" }}>{L.backToProject}</Link>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#eee" }}>{L.members}</h1>
        <p className="text-sm mb-8" style={{ color: "#555" }}>{L.membersSub}</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-8">
              {project?.members.map(m => (
                <div key={m.user_id} className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: "rgba(0,245,212,0.1)", color: T }}>
                    {m.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#ddd" }}>{m.username}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{L.roles[m.role as keyof typeof L.roles] ?? m.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: T }}>{m.share_pct}%</p>
                    <p className="text-xs" style={{ color: "#444" }}>{L.inviteShare}</p>
                  </div>
                </div>
              ))}
            </div>

            {project && project.members.length > 0 && (
              <div className="mb-8 p-3 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs" style={{ color: "#555" }}>
                  {L.totalShare}：<span style={{ color: T }}>{project.members.reduce((a, m) => a + m.share_pct, 0).toFixed(1)}%</span>
                </p>
              </div>
            )}

            {isOwner && (
              <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "#888" }}>{L.inviteTitle}</p>
                <div className="space-y-3">
                  <input value={inviteForm.username} onChange={e => setInviteForm(f => ({ ...f, username: e.target.value }))}
                    placeholder={L.inviteUsername}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                  <div className="flex gap-3">
                    <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }}>
                      <option value="member">{L.roles.member}</option>
                      <option value="contributor">{L.roles.contributor}</option>
                    </select>
                    <input type="number" min="0" max="100" value={inviteForm.share_pct}
                      onChange={e => setInviteForm(f => ({ ...f, share_pct: e.target.value }))}
                      placeholder={L.inviteShare}
                      className="flex-1 px-3 py-2 rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
                  </div>
                </div>
                {err && <p className="mt-2 text-xs" style={{ color: "#f56" }}>{err}</p>}
                <button onClick={handleInvite} disabled={inviting}
                  className="mt-4 w-full py-2 rounded-xl text-sm font-semibold"
                  style={{ background: inviting ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
                  {inviting ? COPY[lang].common.inviting : COPY[lang].common.invite}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
