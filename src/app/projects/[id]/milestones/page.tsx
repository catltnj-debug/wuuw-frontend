"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetProject } from "@/lib/api";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";

export default function ProjectMilestonesPage() {
  const params = useParams();
  const id = Number(params.id);
  const { lang } = useLang();
  const L = COPY[lang].pages.projectSub;

  const [milestones, setMilestones] = useState<{ id: number; title: string; description?: string | null; due_date?: string | null; completed: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGetProject(id)
      .then(p => setMilestones(p.milestones))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const done = milestones.filter(m => m.completed).length;
  const total = milestones.length;

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/projects/${id}`} className="text-xs" style={{ color: "#555" }}>{L.backToProject}</Link>
        </div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#eee" }}>{L.milestones}</h1>
            <p className="text-sm" style={{ color: "#555" }}>{L.milestonesSub}</p>
          </div>
          {total > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: T }}>{done}/{total}</p>
              <p className="text-xs" style={{ color: "#555" }}>{L.completedBadge}</p>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="h-1.5 rounded-full mb-8" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: T }} />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : milestones.length === 0 ? (
          <div className="p-8 rounded-2xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-4xl mb-3">⬟</div>
            <p className="text-sm" style={{ color: "#444" }}>{L.noMilestones}</p>
            <Link href={`/projects/${id}`} className="text-xs mt-2 inline-block underline" style={{ color: "#555" }}>
              {L.noMilestonesHint}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((ms, i) => (
              <div key={ms.id} className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${ms.completed ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.07)"}` }}>
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ background: ms.completed ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.05)", color: ms.completed ? T : "#444" }}>
                    {ms.completed ? "✓" : i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: ms.completed ? "#888" : "#ddd", textDecoration: ms.completed ? "line-through" : "none" }}>
                    {ms.title}
                  </p>
                  {ms.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#555" }}>{ms.description}</p>}
                  {ms.due_date && <p className="text-xs mt-1" style={{ color: "#444" }}>{lang === "zh" ? "截止" : "Due"}：{ms.due_date}</p>}
                </div>
                <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: ms.completed ? "rgba(0,245,212,0.08)" : "rgba(255,255,255,0.04)", color: ms.completed ? T : "#555" }}>
                  {ms.completed ? L.completedBadge : L.inProgressBadge}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
