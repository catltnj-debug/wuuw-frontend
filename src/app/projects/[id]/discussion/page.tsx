"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useLang, COPY } from "@/lib/language";

export default function ProjectDiscussionPage() {
  const params = useParams();
  const id = params.id;
  const { lang } = useLang();
  const L = COPY[lang].pages.projectSub;

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/projects/${id}`} className="text-xs" style={{ color: "#555" }}>{L.backToProject}</Link>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#eee" }}>{L.discussion}</h1>
        <p className="text-sm mb-8" style={{ color: "#555" }}>{L.discussionSub}</p>
        <div className="p-8 rounded-2xl text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm" style={{ color: "#444" }}>{L.discussionComing}</p>
        </div>
      </div>
    </div>
  );
}
