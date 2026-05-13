"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGetProjectTasks } from "@/lib/api";
import { useLang, COPY } from "@/lib/language";

const STATUS_COLOR: Record<string, string> = {
  open: "#00F5D4", claimed: "#F5A623", in_progress: "#BF5FFF", done: "#555",
};

export default function ProjectTasksPage() {
  const params = useParams();
  const id = Number(params.id);
  const { lang } = useLang();
  const L = COPY[lang].pages.projectSub;

  const STATUS_LABEL = L.taskStatus;

  const [tasks, setTasks] = useState<{ id: number; title: string; status: string; assignee?: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGetProjectTasks(id)
      .then(r => setTasks(r.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/projects/${id}`} className="text-xs" style={{ color: "#555" }}>{L.backToProject}</Link>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#eee" }}>{L.tasks}</h1>
        <p className="text-sm mb-8" style={{ color: "#555" }}>{L.tasksSub}</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 rounded-2xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm" style={{ color: "#444" }}>{L.noTasks}</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>{L.noTasksHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "#ddd" }}>{t.title}</p>
                  {t.assignee && (
                    <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                      {lang === "zh" ? "认领人" : "Assignee"}：{t.assignee}
                    </p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${STATUS_COLOR[t.status] ?? "#666"}18`, color: STATUS_COLOR[t.status] ?? "#666" }}>
                  {STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] ?? t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
