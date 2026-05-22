"use client";

import { useEffect, useRef } from "react";

const CW = 1400, CH = 630;
const CX = CW / 2, CY = CH / 2;
const TR = 185;

const CHAKRAS = [
  { color: "#FF3333", r: 255, g: 51,  b: 51,  glow: "rgba(255,50,50,0.9)",   hue: 0   },
  { color: "#FF8C00", r: 255, g: 140, b: 0,   glow: "rgba(255,140,0,0.9)",   hue: 28  },
  { color: "#FFD700", r: 255, g: 215, b: 0,   glow: "rgba(255,215,0,0.9)",   hue: 51  },
  { color: "#00C853", r: 0,   g: 200, b: 83,  glow: "rgba(0,200,83,0.9)",    hue: 142 },
  { color: "#00C4D8", r: 0,   g: 196, b: 216, glow: "rgba(0,196,216,0.9)",   hue: 186 },
  { color: "#2979FF", r: 41,  g: 121, b: 255, glow: "rgba(41,121,255,0.9)",  hue: 224 },
  { color: "#C040FF", r: 192, g: 64,  b: 255, glow: "rgba(192,64,255,0.9)",  hue: 285 },
];

// Ball positions evenly spread in a ring around taichi
const BALL_POS = CHAKRAS.map((_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2 / 7);
  return { x: CX + Math.cos(a) * TR * 1.82, y: CY + Math.sin(a) * TR * 1.65 };
});

// Starting colors for the 4 snakes (black → dark gray → gray → light gray)
const SNAKE_START_COLORS = [
  { r: 18,  g: 18,  b: 20  },
  { r: 55,  g: 55,  b: 60  },
  { r: 100, g: 100, b: 108 },
  { r: 165, g: 165, b: 172 },
];

function hslBlend(totalEaten: number) {
  if (totalEaten === 0) return { h: 0, s: 0, l: 8 };
  const hues = CHAKRAS.slice(0, totalEaten).map(c => c.hue);
  const sn = hues.reduce((s, h) => s + Math.sin(h * Math.PI / 180), 0) / hues.length;
  const cs = hues.reduce((s, h) => s + Math.cos(h * Math.PI / 180), 0) / hues.length;
  const hue = ((Math.atan2(sn, cs) * 180 / Math.PI) + 360) % 360;
  return { h: hue, s: 28 + totalEaten * 7, l: 32 + totalEaten * 5 };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export default function HeroCanvas() {
  const cvRef  = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    // ── Particles ────────────────────────────────────────────────────────────
    type Pt = { x: number; y: number; r: number; vx: number; vy: number; hue: number; a: number };
    const pts: Pt[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * CW, y: Math.random() * CH,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      hue: Math.random() * 360, a: Math.random() * 0.55 + 0.1,
    }));

    // ── Energy ripples ────────────────────────────────────────────────────────
    type Ripple = { r: number; a: number };
    const ripples: Ripple[] = [];

    // ── Snakes ───────────────────────────────────────────────────────────────
    const SEG = 5, NSEGS = 14;
    type SnakeRGB = { r: number; g: number; b: number };
    type Snake = {
      segs: { x: number; y: number }[];
      angle: number; spd: number;
      baseCol: SnakeRGB;  // starting color
    };
    const snakes: Snake[] = Array.from({ length: 4 }, (_, si) => ({
      segs: Array.from({ length: NSEGS }, (_, j) => ({
        x: CW * (0.1 + si * 0.25) - j * SEG,
        y: CY + (Math.random() - 0.5) * 240,
      })),
      angle: Math.random() * Math.PI * 2,
      spd: 1.0 + Math.random() * 0.45,
      baseCol: SNAKE_START_COLORS[si],
    }));

    // ── State ─────────────────────────────────────────────────────────────────
    const eaten    = new Array<boolean>(7).fill(false);
    const bOpacity = new Array<number>(7).fill(0);
    let phase = 0, phaseT = 0, time = 0, rot = 0;
    let totalEaten = 0;
    let enlightened = false, enlightenT = 0;

    // Eating animation
    let eatAnim = false;   // mid-eat animation
    let eatTimer = 0;      // 0→60 (1 second)
    let eatBallIdx = -1;

    // Body color morph (60 frames)
    let morphT = 1.0;   // 0 = just started, 1 = done
    let morphFrom = hslBlend(0);
    let morphTo   = hslBlend(0);
    let bodyHSL   = hslBlend(0);

    function getCurBodyColor() {
      if (morphT >= 1) return `hsl(${bodyHSL.h},${bodyHSL.s}%,${bodyHSL.l}%)`;
      const t = morphT;
      const h = lerp(morphFrom.h, morphTo.h, t);
      const s = lerp(morphFrom.s, morphTo.s, t);
      const l = lerp(morphFrom.l, morphTo.l, t);
      return `hsl(${h},${s}%,${l}%)`;
    }

    // Mix snake start gray with body color (so they gradually become colored)
    function getSnakeColor(snake: Snake) {
      if (totalEaten === 0) {
        return `rgb(${snake.baseCol.r},${snake.baseCol.g},${snake.baseCol.b})`;
      }
      // blend base gray toward body color (fully blended after 3+ balls)
      const blend = Math.min(totalEaten / 3, 1);
      // Extract gray luminance from baseCol
      const gray = snake.baseCol.r;
      // Mix: gray rgb toward bodyHSL
      const bh = morphT >= 1 ? bodyHSL : {
        h: lerp(morphFrom.h, morphTo.h, morphT),
        s: lerp(morphFrom.s, morphTo.s, morphT),
        l: lerp(morphFrom.l, morphTo.l, morphT),
      };
      const mixL = lerp(gray / 2.55, bh.l, blend);
      const mixS = lerp(0, bh.s, blend);
      return `hsl(${bh.h},${mixS}%,${mixL}%)`;
    }

    // ── Draw: Background ──────────────────────────────────────────────────────
    function drawBackground() {
      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, CW, CH);

      // Silver luminous center (like reference image)
      const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, TR * 3.2);
      cg.addColorStop(0,   "rgba(180,195,220,0.18)");
      cg.addColorStop(0.35,"rgba(120,140,175,0.07)");
      cg.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, CW, CH);
    }

    // ── Draw: Energy ripples ──────────────────────────────────────────────────
    function drawRipples() {
      ctx.save();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.r += 1.4;
        rip.a -= 0.0038;
        if (rip.a <= 0) { ripples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(CX, CY, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(190,210,240,${rip.a})`;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(200,220,255,${rip.a * 0.6})`;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Draw: Taichi (rings + bagua + yin-yang) ───────────────────────────────
    function drawTaichi() {
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(rot);
      const R = TR;
      const ef = enlightened ? Math.min(enlightenT / 80, 1) : 0;
      const white = (a: number) => `rgba(220,235,255,${a + ef * 0.12})`;

      // ── Concentric segmented rings (bagua / reference style) ──
      const ringDefs = [
        { r: R * 1.52, segA: 0.60, w: 1.8, a: 0.12 },
        { r: R * 1.38, segA: 0.55, w: 2.2, a: 0.18 },
        { r: R * 1.24, segA: 0.50, w: 2.8, a: 0.25 },
        { r: R * 1.12, segA: 0.45, w: 3.5, a: 0.32 },
        { r: R * 1.04, segA: 0.40, w: 4.0, a: 0.45 },
      ];
      ringDefs.forEach(({ r: rr, segA, w, a }) => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = white(0.4);
        for (let seg = 0; seg < 8; seg++) {
          const base = (seg / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, rr, base, base + Math.PI * 2 * segA);
          ctx.strokeStyle = white(a);
          ctx.lineWidth = w;
          ctx.stroke();
        }
      });

      // 8 radial spokes connecting inner to outer ring
      ctx.shadowBlur = 8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 1.04, Math.sin(a) * R * 1.04);
        ctx.lineTo(Math.cos(a) * R * 1.52, Math.sin(a) * R * 1.52);
        ctx.strokeStyle = white(0.22);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Solid inner boundary ring
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = white(0.5 + ef * 0.2);
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = white(0.6);
      ctx.stroke();

      // ── Yin-Yang ──────────────────────────────────────────────────────────
      // 1. Full background circle — dark (yin base)
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = enlightened ? `rgba(5,5,10,${0.30 - ef * 0.25})` : "#0D0D14";
      ctx.fill();

      // 2. Right semicircle — white (yang)
      ctx.beginPath();
      ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
      ctx.shadowBlur = enlightened ? 40 : 18;
      ctx.shadowColor = enlightened ? "rgba(255,255,255,0.9)" : "rgba(190,215,255,0.5)";
      ctx.fillStyle = enlightened ? `rgba(255,255,255,${0.92 + ef * 0.08})` : "#E0E8F0";
      ctx.fill();

      // 3. Upper small semicircle — white (yang extends up)
      ctx.beginPath();
      ctx.arc(0, -R / 2, R / 2, Math.PI / 2, -Math.PI / 2, false);
      ctx.fillStyle = enlightened ? `rgba(255,255,255,${0.92 + ef * 0.08})` : "#E0E8F0";
      ctx.fill();

      // 4. Lower small semicircle — dark (yin extends down)
      ctx.beginPath();
      ctx.arc(0, R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = enlightened ? `rgba(5,5,10,${0.30 - ef * 0.25})` : "#0D0D14";
      ctx.fill();

      // 5. Upper fish eye — dark dot in yang (white area)
      ctx.beginPath();
      ctx.arc(0, -R / 2, R / 6, 0, Math.PI * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = enlightened ? `rgba(5,5,10,${0.85 - ef * 0.7})` : "#0D0D14";
      ctx.fill();

      // 6. Lower fish eye — white dot in yin (dark area)
      ctx.beginPath();
      ctx.arc(0, R / 2, R / 6, 0, Math.PI * 2);
      ctx.shadowBlur = 8;
      ctx.shadowColor = enlightened ? "rgba(255,255,255,0.9)" : "rgba(210,230,255,0.6)";
      ctx.fillStyle = enlightened ? `rgba(255,255,255,${0.92 + ef * 0.08})` : "#E0E8F0";
      ctx.fill();

      // 7. Outer ring stroke
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = white(0.5 + ef * 0.2);
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = white(0.6);
      ctx.stroke();

      ctx.restore();
    }

    // ── Draw: Chakra balls (white-core + rotating orbital rings) ─────────────
    function drawBalls() {
      CHAKRAS.forEach(({ color, glow, r: cr, g: cg, b: cb }, i) => {
        if (bOpacity[i] <= 0) return;
        const { x: bx, y: by } = BALL_POS[i];
        let ballR: number;
        let alpha = bOpacity[i];

        if (eatAnim && eatBallIdx === i) {
          if (eatTimer >= 30) return;
          const t = eatTimer / 30;
          ballR = (13 + Math.sin(time * 0.04 + i * 0.9) * 2) * (1 - t);
          alpha = bOpacity[i] * (1 + eatTimer / 30);
          if (ballR < 0.5) return;
        } else if (eaten[i]) {
          return;
        } else {
          ballR = 13 + Math.sin(time * 0.045 + i * 0.9) * 2;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(alpha, 1);

        // ── Outer color energy cloud / aura ───────────────────────────────
        const auraG = ctx.createRadialGradient(bx, by, ballR * 0.6, bx, by, ballR * 3.8);
        auraG.addColorStop(0,   `rgba(${cr},${cg},${cb},0.28)`);
        auraG.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.07)`);
        auraG.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(bx, by, ballR * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = auraG;
        ctx.fill();

        // ── Rotating orbital ring (flattened = 3D perspective) ────────────
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(time * 0.024 + i * 0.9);
        ctx.scale(1, 0.28);

        // Full faint ring
        ctx.beginPath();
        ctx.arc(0, 0, ballR * 2.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 16;
        ctx.shadowColor = glow;
        ctx.stroke();

        // 3 bright white energy arcs on the ring
        for (let seg = 0; seg < 3; seg++) {
          const arcA = (seg / 3) * Math.PI * 2 + time * 0.015;
          ctx.beginPath();
          ctx.arc(0, 0, ballR * 2.2, arcA, arcA + Math.PI * 0.38);
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255,255,255,1)";
          ctx.stroke();
        }
        ctx.restore();  // undo scale+rotate

        // ── Second slower counter-rotating ring ───────────────────────────
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-time * 0.012 + i * 1.8);
        ctx.scale(0.28, 1);  // vertical ring

        ctx.beginPath();
        ctx.arc(0, 0, ballR * 1.9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.35)`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = glow;
        ctx.stroke();

        // 2 bright arcs on vertical ring
        for (let seg = 0; seg < 2; seg++) {
          const arcA = (seg / 2) * Math.PI * 2 - time * 0.011;
          ctx.beginPath();
          ctx.arc(0, 0, ballR * 1.9, arcA, arcA + Math.PI * 0.28);
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255,255,255,0.9)";
          ctx.stroke();
        }
        ctx.restore();

        // ── White-dominant core ────────────────────────────────────────────
        const coreG = ctx.createRadialGradient(
          bx - ballR * 0.28, by - ballR * 0.28, 0,
          bx, by, ballR
        );
        coreG.addColorStop(0,    "rgba(255,255,255,1)");
        coreG.addColorStop(0.35, "rgba(255,255,255,0.88)");
        coreG.addColorStop(0.65, color);
        coreG.addColorStop(1,    `rgba(${cr},${cg},${cb},0.05)`);
        ctx.beginPath();
        ctx.arc(bx, by, ballR, 0, Math.PI * 2);
        ctx.fillStyle = coreG;
        ctx.shadowBlur = 32;
        ctx.shadowColor = glow;
        ctx.fill();

        // ── Specular bright spot ──────────────────────────────────────────
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.beginPath();
        ctx.arc(bx - ballR * 0.26, by - ballR * 0.3, ballR * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    // ── Draw: Snakes (3D futuristic — 3-pass cylinder lighting) ──────────────
    function drawSnake(snake: Snake) {
      const segs = snake.segs;
      if (segs.length < 3) return;

      const col = getSnakeColor(snake);
      const maxW = 3.2;  // slightly wider head for 3D effect

      // Get midpoint coords for segment i (with optional y offset)
      function getMid(i: number, yOff = 0): [number, number] {
        const mx = (segs[i].x + segs[i + 1].x) / 2;
        const my = (segs[i].y + segs[i + 1].y) / 2 + yOff;
        return [mx, my];
      }
      function getEnd(i: number, yOff = 0): [number, number] {
        if (i + 1 < segs.length - 1) {
          return [(segs[i + 1].x + segs[i + 2].x) / 2, (segs[i + 1].y + segs[i + 2].y) / 2 + yOff];
        }
        return [segs[i + 1].x, segs[i + 1].y + yOff];
      }

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Pass 1: Dark underside shadow (wider, offset slightly downward)
      for (let i = 0; i < segs.length - 1; i++) {
        const t = 1 - i / (segs.length - 1);
        const w = Math.max(maxW * t * 1.9, 0.6);
        const [x1, y1] = getMid(i, 0.9);
        const [x2, y2] = getEnd(i, 0.9);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(segs[i + 1].x, segs[i + 1].y + 0.9, x2, y2);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = w;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      // Pass 2: Main body with glow
      for (let i = 0; i < segs.length - 1; i++) {
        const t = 1 - i / (segs.length - 1);
        const w = Math.max(maxW * t, 0.35);
        const [x1, y1] = getMid(i);
        const [x2, y2] = getEnd(i);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(segs[i + 1].x, segs[i + 1].y, x2, y2);
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.shadowBlur = i < 3 ? 12 : 5;
        ctx.shadowColor = col;
        ctx.stroke();
      }

      // Pass 3: White highlight — thin line offset upward (top-light cylinder illusion)
      for (let i = 0; i < segs.length - 1; i++) {
        const t = 1 - i / (segs.length - 1);
        const mainW = Math.max(maxW * t, 0.35);
        const hlW = Math.max(mainW * 0.38, 0.18);
        const yOff = -mainW * 0.28;  // shift upward
        const [x1, y1] = getMid(i, yOff);
        const [x2, y2] = getEnd(i, yOff);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(segs[i + 1].x, segs[i + 1].y + yOff, x2, y2);
        ctx.strokeStyle = `rgba(255,255,255,${0.65 * t})`;
        ctx.lineWidth = hlW;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

      // 3D sphere head
      const h = segs[0];
      const hr = maxW * 1.1;
      // Shadow
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.arc(h.x + 0.6, h.y + 0.6, hr, 0, Math.PI * 2); ctx.fill();
      // Main
      ctx.fillStyle = col;
      ctx.shadowBlur = 14;
      ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(h.x, h.y, hr, 0, Math.PI * 2); ctx.fill();
      // Specular highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(h.x - hr * 0.22, h.y - hr * 0.28, hr * 0.32, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    // ── Draw: Enlightenment bloom ─────────────────────────────────────────────
    function drawBloom() {
      const a = Math.min(enlightenT / 90, 0.9);
      ctx.save();
      const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, CW * 0.65);
      g.addColorStop(0,    `rgba(255,255,255,${a})`);
      g.addColorStop(0.28, `rgba(230,245,255,${a * 0.5})`);
      g.addColorStop(1,    "rgba(5,5,8,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
      ctx.restore();
    }

    // ── Update: Particles ─────────────────────────────────────────────────────
    function updateParticles() {
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = CW; if (p.x > CW) p.x = 0;
        if (p.y < 0) p.y = CH; if (p.y > CH) p.y = 0;
        p.hue = (p.hue + 0.06) % 360;
      });
    }

    function drawParticles() {
      pts.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.shadowBlur  = 5;
        ctx.shadowColor = `hsl(${p.hue},70%,72%)`;
        ctx.fillStyle   = `hsl(${p.hue},65%,68%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // ── Update: Snakes ────────────────────────────────────────────────────────
    function updateSnakes() {
      snakes.forEach(snake => {
        const head = snake.segs[0];

        if (enlightened) {
          const dx = CX - head.x, dy = CY - head.y;
          if (Math.hypot(dx, dy) > 25) snake.angle = Math.atan2(dy, dx);
        } else if (phase < 7 && !eatAnim) {
          const tgt = BALL_POS[phase];
          const dx = tgt.x - head.x, dy = tgt.y - head.y;
          if (Math.hypot(dx, dy) < 300) {
            const ta = Math.atan2(dy, dx);
            let da = ta - snake.angle;
            while (da >  Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            snake.angle += da * 0.065;
          } else {
            snake.angle += (Math.random() - 0.5) * 0.12;
          }
        } else {
          snake.angle += (Math.random() - 0.5) * 0.1;
        }

        head.x += Math.cos(snake.angle) * snake.spd;
        head.y += Math.sin(snake.angle) * snake.spd;

        if (head.x < 8 || head.x > CW - 8) {
          snake.angle = Math.PI - snake.angle;
          head.x = Math.max(8, Math.min(CW - 8, head.x));
        }
        if (head.y < 8 || head.y > CH - 8) {
          snake.angle = -snake.angle;
          head.y = Math.max(8, Math.min(CH - 8, head.y));
        }

        for (let i = 1; i < snake.segs.length; i++) {
          const p = snake.segs[i - 1], s = snake.segs[i];
          const dx = p.x - s.x, dy = p.y - s.y;
          const d = Math.hypot(dx, dy);
          if (d > SEG) { s.x += (dx / d) * (d - SEG); s.y += (dy / d) * (d - SEG); }
        }

        // Trigger eat animation
        if (!enlightened && phase < 7 && !eatAnim && !eaten[phase] && bOpacity[phase] > 0.7) {
          const tgt = BALL_POS[phase];
          if (Math.hypot(head.x - tgt.x, head.y - tgt.y) < 20) {
            eatAnim = true;
            eatTimer = 0;
            eatBallIdx = phase;
            morphFrom = { ...bodyHSL };
            morphTo   = hslBlend(totalEaten + 1);
            morphT    = 0;
          }
        }
      });
    }

    // ── Update: Balls ─────────────────────────────────────────────────────────
    function updateBalls() {
      if (enlightened || phase >= 7) return;
      bOpacity[phase] = Math.min(1, phaseT / 180);
      if (phase + 1 < 7) bOpacity[phase + 1] = Math.max(0, bOpacity[phase] - 0.45) * 0.38;
    }

    // ── Update: Eat animation ─────────────────────────────────────────────────
    function updateEatAnim() {
      if (!eatAnim) return;
      eatTimer++;
      morphT = Math.min(eatTimer / 60, 1);

      if (eatTimer === 30) {
        // Ball is gone — advance phase
        eaten[eatBallIdx] = true;
        bOpacity[eatBallIdx] = 0;
        totalEaten++;
        phase++;
        phaseT = 0;
        if (phase >= 7) enlightened = true;
      }

      if (eatTimer >= 60) {
        eatAnim = false;
        eatTimer = 0;
        eatBallIdx = -1;
        bodyHSL = { ...morphTo };
        morphT  = 1;
      }
    }

    // ── Main Loop ─────────────────────────────────────────────────────────────
    let animId: number;
    function loop() {
      time++; phaseT++; rot += 0.0016;
      if (time % 85 === 0) ripples.push({ r: TR * 1.04, a: 0.28 });

      drawBackground();
      drawRipples();
      updateParticles();
      drawParticles();

      updateSnakes();
      updateBalls();
      updateEatAnim();

      drawTaichi();
      drawBalls();
      snakes.forEach(s => drawSnake(s));

      if (enlightened) {
        enlightenT++;
        drawBloom();
        if (enlightenT > 240) {
          eaten.fill(false); bOpacity.fill(0);
          phase = 0; phaseT = 0; totalEaten = 0;
          enlightened = false; enlightenT = 0;
          bodyHSL = hslBlend(0); morphFrom = bodyHSL; morphTo = bodyHSL; morphT = 1;
          eatAnim = false; eatTimer = 0; eatBallIdx = -1;
        }
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={cvRef}
      width={CW}
      height={CH}
      style={{ display: "block", width: "100%", height: "auto", background: "#050508" }}
    />
  );
}
