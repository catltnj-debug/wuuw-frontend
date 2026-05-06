"use client";

import { useEffect, useRef } from "react";
import { useLang, COPY } from "@/lib/language";

const CHAKRAS = [
  { color: "#FF2D2D", glow: "rgba(255,45,45,0.8)",   nameCn: "海底轮", nameEn: "Root"      },
  { color: "#FF8C00", glow: "rgba(255,140,0,0.8)",   nameCn: "脐轮",   nameEn: "Sacral"    },
  { color: "#FFD700", glow: "rgba(255,215,0,0.8)",   nameCn: "太阳轮", nameEn: "Solar"     },
  { color: "#00C853", glow: "rgba(0,200,83,0.8)",    nameCn: "心轮",   nameEn: "Heart"     },
  { color: "#2979FF", glow: "rgba(41,121,255,0.8)",  nameCn: "喉轮",   nameEn: "Throat"    },
  { color: "#651FFF", glow: "rgba(101,31,255,0.8)",  nameCn: "眉心轮", nameEn: "Third Eye" },
  { color: "#D500F9", glow: "rgba(213,0,249,0.8)",   nameCn: "顶轮",   nameEn: "Crown"     },
];

// Fixed internal canvas resolution — no measurement needed
const CW = 900;
const CH = 200;
const CY = CH / 2;

const SEG_GAP = 11;
const SPEED   = 1.6;

const STAGES = [
  { body: "#2a7a2a", r: 4,   segs: 5  },
  { body: "#9a1a1a", r: 4.5, segs: 7  },
  { body: "#d07000", r: 5,   segs: 9  },
  { body: "#c0a000", r: 5.5, segs: 11 },
  { body: "#007a40", r: 6,   segs: 13 },
  { body: "#1a40b0", r: 6.5, segs: 16 },
  { body: "#4a00a0", r: 7,   segs: 19 },
  { body: "#7a00a0", r: 7.5, segs: 22 },
];

export default function SnakeChakra() {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const { lang } = useLang();
  const c = COPY[lang].home;

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // Ball x positions spread across the canvas width
    const ballXs = CHAKRAS.map((_, i) => CW * (0.08 + i * (0.85 / 6)));

    // State
    const eaten:     boolean[] = CHAKRAS.map(() => false);
    let stage = 0, time = 0;
    let eating = false, eatTimer = 0;
    let enlightened = false, enlightenTimer = 0;

    const makeSegs = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ x: -10 - i * SEG_GAP, y: CY }));
    let segs = makeSegs(STAGES[0].segs);

    const growTo = (n: number) => {
      while (segs.length < n) {
        const t = segs[segs.length - 1];
        segs.push({ x: t.x - SEG_GAP, y: t.y });
      }
    };

    const nextTarget = () => eaten.findIndex(e => !e);

    const reset = () => {
      eaten.fill(false);
      stage = 0; time = 0;
      eating = false; eatTimer = 0;
      enlightened = false; enlightenTimer = 0;
      segs = makeSegs(STAGES[0].segs);
    };

    // ── draw ──────────────────────────────────────────────
    const drawBalls = () => {
      CHAKRAS.forEach(({ color, glow }, i) => {
        if (eaten[i]) return;
        const x = ballXs[i];
        const pulse = Math.sin(time * 0.05 + i * 1.1) * 2;
        const r = 13 + pulse;
        ctx.save();
        ctx.shadowBlur  = 22 + pulse * 2;
        ctx.shadowColor = glow;
        const g = ctx.createRadialGradient(x - r * 0.35, CY - r * 0.35, 0, x, CY, r);
        g.addColorStop(0,   "#ffffff");
        g.addColorStop(0.3, color);
        g.addColorStop(1,   glow.replace("0.8", "0.1"));
        ctx.beginPath();
        ctx.arc(x, CY, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      });
    };

    const drawSnake = () => {
      const st = STAGES[Math.min(stage, STAGES.length - 1)];
      ctx.save();
      ctx.shadowBlur  = enlightened ? 50 : 18;
      ctx.shadowColor = enlightened
        ? `rgba(255,255,255,${0.5 + Math.min(enlightenTimer / 40, 1) * 0.5})`
        : "rgba(180,255,180,0.5)";

      for (let i = segs.length - 1; i >= 0; i--) {
        const t = i / segs.length;
        const r = Math.max(st.r * (1 - t * 0.45), 2);
        let fill: string;
        if (enlightened) {
          fill = `rgba(255,255,255,${0.6 + Math.min(enlightenTimer / 40, 1) * 0.4})`;
        } else if (stage >= 6) {
          const hue = ((i / segs.length) * 300 + time * 1.5) % 360;
          fill = `hsl(${hue},90%,68%)`;
        } else {
          fill = st.body;
        }
        ctx.beginPath();
        ctx.arc(segs[i].x, segs[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }
      // eye
      if (!enlightened && segs[0]) {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = "#fff";
        ctx.beginPath();
        ctx.arc(segs[0].x + 2.5, segs[0].y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawLight = () => {
      const a = Math.min(enlightenTimer / 50, 0.9);
      ctx.save();
      const g = ctx.createRadialGradient(CW / 2, CY, 0, CW / 2, CY, CW * 0.6);
      g.addColorStop(0,   `rgba(255,255,255,${a})`);
      g.addColorStop(0.4, `rgba(210,245,255,${a * 0.55})`);
      g.addColorStop(1,   "rgba(5,5,8,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
    };

    // ── update ────────────────────────────────────────────
    const update = () => {
      time++;
      if (enlightened) {
        if (++enlightenTimer > 160) reset();
        return;
      }
      if (eating) {
        if (++eatTimer > 28) { eating = false; eatTimer = 0; }
        return;
      }
      const ti = nextTarget();
      if (ti < 0) { enlightened = true; return; }

      const tx   = ballXs[ti];
      const head = segs[0];
      const tyOsc = CY + Math.sin(time * 0.022) * 30;
      const dx = tx - head.x, dy = tyOsc - head.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > SPEED) { head.x += (dx / d) * SPEED; head.y += (dy / d) * SPEED * 0.65; }

      for (let i = 1; i < segs.length; i++) {
        const p = segs[i - 1], s = segs[i];
        const sx = p.x - s.x, sy = p.y - s.y;
        const sd = Math.sqrt(sx * sx + sy * sy);
        if (sd > SEG_GAP) { s.x += (sx / sd) * (sd - SEG_GAP); s.y += (sy / sd) * (sd - SEG_GAP); }
      }

      if (Math.sqrt((head.x - tx) ** 2 + (head.y - CY) ** 2) < 18) {
        eaten[ti] = true;
        stage++;
        eating = true;
        growTo(STAGES[Math.min(stage, STAGES.length - 1)].segs);
      }
    };

    // ── loop ─────────────────────────────────────────────
    let animId: number;
    const loop = () => {
      update();
      ctx.clearRect(0, 0, CW, CH);
      if (enlightened) drawLight();
      drawBalls();
      drawSnake();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-6">
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "#00F5D4" }}>
          {c.chakraTitle}
        </p>
        <p className="text-sm" style={{ color: "#484848" }}>{c.chakraSub}</p>
      </div>

      {/* Chakra labels */}
      <div className="flex justify-between px-1 mb-3">
        {CHAKRAS.map(ch => (
          <div key={ch.nameEn} className="text-center flex-1">
            <span className="text-xs" style={{ color: ch.color, opacity: 0.75 }}>
              {lang === "zh" ? ch.nameCn : ch.nameEn}
            </span>
          </div>
        ))}
      </div>

      {/*
        Canvas: fixed internal resolution 900×200, CSS width:100% stretches it.
        No measurement needed — works regardless of container width.
      */}
      <canvas
        ref={cvRef}
        width={CW}
        height={CH}
        style={{
          display: "block",
          width: "100%",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.018)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
    </section>
  );
}
