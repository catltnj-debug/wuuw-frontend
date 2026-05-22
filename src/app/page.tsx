"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang, COPY } from "@/lib/language";
import { apiGetAssets, type ApiAsset } from "@/lib/api";
import HeroCanvas from "@/components/HeroCanvas";

const T = "#00F5D4";

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default function HomePage() {
  const { lang } = useLang();
  const c = COPY[lang].home;
  const [feed, setFeed] = useState<ApiAsset[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiGetAssets({ pageSize: 6 }).then(r => setFeed(r.items)).catch(() => {});
    const id = setInterval(() => {
      apiGetAssets({ pageSize: 6 }).then(r => setFeed(r.items)).catch(() => {});
      setTick(t => t + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: "#050508" }}>

      {/* ── Private Beta Badge ── */}
      <div className="flex justify-center pt-4 pb-0">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{ background: "rgba(0,245,212,0.06)", border: "1px solid rgba(0,245,212,0.18)", color: "#888" }}>
          <span style={{ color: T }}>🔒</span>
          <span>{lang === "zh" ? "当前处于私测阶段" : "Currently in Private Beta"}</span>
          <span style={{ color: "#555" }}>·</span>
          <a href="mailto:catltnj@gmail.com"
            className="transition-colors"
            style={{ color: T }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
            {lang === "zh" ? "申请加入" : "Request Access"}
          </a>
        </div>
      </div>

      {/* ── Hero Canvas ── */}
      <HeroCanvas />

      {/* ── Live Manifestations ── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-1.5" style={{ color: T }}>Live</p>
            <h2 className="text-2xl font-bold">{c.liveTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pulse-teal" style={{ background: T }} />
            <span className="text-xs" style={{ color: "#444" }}>
              {lang === "zh" ? "实时更新" : "Real-time"}
            </span>
          </div>
        </motion.div>

        <div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.018)" }}>
          <div className="px-5">
            {feed.length > 0 ? feed.map((item, i) => (
              <motion.div key={`${item.id}-${tick}`}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center justify-between py-3 border-b"
                style={{ borderColor: "rgba(255,255,255,0.045)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(0,245,212,0.08)", color: T, border: "1px solid rgba(0,245,212,0.18)" }}>
                    {item.creator[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="text-sm">
                    <span style={{ color: T }}>{item.creator}</span>
                    <span style={{ color: "#555" }}> · {lang === "zh" ? "上传了" : "uploaded"} · </span>
                    <Link href={`/assets/${item.id}`} style={{ color: "#999" }}
                      className="hover:underline">{item.title}</Link>
                  </div>
                </div>
                <span className="text-xs flex-shrink-0 ml-3" style={{ color: "#3a3a3a" }}>
                  {timeAgo(item.created_at)}
                </span>
              </motion.div>
            )) : (
              <div className="py-8 text-center text-xs" style={{ color: "#3a3a3a" }}>
                {lang === "zh" ? "暂无动态" : "No activity yet"}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
