"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang, COPY } from "@/lib/language";
import HeroCanvas from "@/components/HeroCanvas";

const T = "#00F5D4";

const LIVE_FEED = [
  { user: "Aria.eth", model: "Modular Cable Organizer", action: { zh: "刚刚打印",    en: "just printed"    }, time: "2s"  },
  { user: "Kai_3D",   model: "Ergonomic Pen Holder",    action: { zh: "已显化",      en: "manifested"      }, time: "18s" },
  { user: "Nova_M",   model: "Foldable Phone Stand",    action: { zh: "获得12 WuuW", en: "earned 12 WuuW"  }, time: "1m"  },
  { user: "Zen.io",   model: "Herb Garden Tray",         action: { zh: "刚刚打印",    en: "just printed"    }, time: "2m"  },
  { user: "Pulse",    model: "Cable Clip Set",           action: { zh: "获得8 WuuW",  en: "earned 8 WuuW"   }, time: "4m"  },
];

export default function HomePage() {
  const { lang } = useLang();
  const c = COPY[lang].home;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: "#050508" }}>

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
            {LIVE_FEED.map((item, i) => (
              <motion.div key={`${item.user}-${tick}`}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center justify-between py-3 border-b"
                style={{ borderColor: "rgba(255,255,255,0.045)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(0,245,212,0.08)", color: T, border: "1px solid rgba(0,245,212,0.18)" }}>
                    {item.user[0]}
                  </div>
                  <div className="text-sm">
                    <span style={{ color: T }}>{item.user}</span>
                    <span style={{ color: "#555" }}> · {item.action[lang]} · </span>
                    <span style={{ color: "#999" }}>{item.model}</span>
                  </div>
                </div>
                <span className="text-xs flex-shrink-0 ml-3" style={{ color: "#3a3a3a" }}>{item.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
