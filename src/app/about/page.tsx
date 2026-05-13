"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useLang, type Locale } from "@/lib/language";
import { useAuth } from "@/lib/auth";

const T = "#00F5D4";

// ── Starfield canvas ───────────────────────────────────────────────────────────
interface Star {
  x: number; y: number; r: number;
  vx: number; vy: number;
  alpha: number; da: number;
}

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const stars: Star[] = [];
    const N = 180;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        vx: (Math.random() - 0.5) * 0.08,
        vy: Math.random() * 0.06 + 0.02,
        alpha: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.alpha = Math.max(0.05, Math.min(1, s.alpha + s.da));
        if (s.alpha <= 0.05 || s.alpha >= 1) s.da *= -1;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(s.alpha * 0.7).toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }} />
  );
}

// ── Fade-in section wrapper ────────────────────────────────────────────────────
function FadeSection({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ── Typewriter for hero ────────────────────────────────────────────────────────
function TypewriterLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [started, text]);

  return <span>{displayed}<span className="opacity-60 animate-pulse">|</span></span>;
}

// ── Value card ────────────────────────────────────────────────────────────────
function ValueCard({ icon, title, desc, delay }: {
  icon: string; title: string; desc: string; delay: number;
}) {
  return (
    <FadeSection delay={delay}>
      <div className="flex flex-col gap-4 p-8 rounded-2xl h-full"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="text-3xl">{icon}</div>
        <h3 className="text-lg font-bold" style={{ color: "#eee" }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#666" }}>{desc}</p>
      </div>
    </FadeSection>
  );
}

// ── Per-locale content ────────────────────────────────────────────────────────
const ABOUT: Record<Locale, {
  heroLines: string[];
  manifesto: string[];
  coreValues: string;
  values: { icon: string; title: string; desc: string }[];
  ctaLine1: string;
  ctaLine2: string;
  goIdeas: string;
  joinNow: string;
  browseMarket: string;
}> = {
  zh: {
    heroLines: ["悟，既是你，也是我。"],
    manifesto: [
      "WuuW 是一个为创造者而生的协作平台。在这里，一个想法可以成为产品，一个产品可以改变生活。我们相信，真正的创新从不孤独——它诞生于思想的碰撞，成长于协作的土壤，最终属于每一个参与其中的人。",
      "无论你是设计者、制造者、还是梦想家，WuuW 让你的贡献被看见、被记录、被奖励。每一行代码、每一个版本、每一次讨论，都在这里留下永久的印记。",
      "这不是一个平台。这是一场关于创造的运动。",
    ],
    coreValues: "核心价值",
    values: [
      { icon: "✦", title: "创造", desc: "从一个念头到一件实物，WuuW 让每个创意都有机会被实现。无论多小的想法，都值得被认真对待。" },
      { icon: "◈", title: "协作", desc: "思想的碰撞产生火花，合作的土壤孕育伟大。在 WuuW，你的每一次贡献都会被记录，每一位合作者都会被认可。" },
      { icon: "⬡", title: "共享", desc: "贡献被永久记录，收益被公平分配。版权属于创造者，价值属于每一个参与其中的人。" },
    ],
    ctaLine1: "加入我们，",
    ctaLine2: "一起改变创造的方式。",
    goIdeas: "去创意广场",
    joinNow: "立即加入",
    browseMarket: "浏览市场",
  },
  en: {
    heroLines: ["WuuW is you.", "WuuW is me.", "We are WuuW."],
    manifesto: [
      "WuuW is awakening. WuuW is creation. WuuW is connection. Here, an idea can become a product, and a product can change lives. We believe true innovation is never a solo act — it's born from the collision of minds, shaped by collaboration, and ultimately belongs to everyone who helped bring it to life.",
      "Whether you're a designer, a maker, or a dreamer, WuuW ensures your contribution is seen, recorded, and rewarded. Every version, every discussion, every spark of inspiration leaves a permanent mark here.",
      "This is not just a platform. This is a movement.",
    ],
    coreValues: "Core Values",
    values: [
      { icon: "✦", title: "Create", desc: "From a single idea to a physical object, WuuW gives every creative vision a chance to become real. No idea is too small to matter." },
      { icon: "◈", title: "Collaborate", desc: "Great things happen when minds meet. On WuuW, every contribution is recorded, every collaborator is credited, and no effort goes unseen." },
      { icon: "⬡", title: "Share", desc: "Contributions are recorded permanently, and value is distributed fairly. Copyright belongs to creators. Value belongs to everyone who helped build it." },
    ],
    ctaLine1: "Join us.",
    ctaLine2: "Change the way things are made.",
    goIdeas: "Go to Ideas",
    joinNow: "Join Now",
    browseMarket: "Browse Market",
  },
  es: {
    heroLines: ["WuuW eres tú.", "WuuW soy yo.", "Somos WuuW."],
    manifesto: [
      "WuuW está despertando. WuuW es creación. WuuW es conexión. Aquí, una idea puede convertirse en producto, y un producto puede cambiar vidas. Creemos que la verdadera innovación nunca es solitaria — nace del choque de mentes, se forma en la colaboración y, en última instancia, pertenece a todos los que ayudaron a hacerla realidad.",
      "Ya seas diseñador, creador o soñador, WuuW garantiza que tu contribución sea vista, registrada y recompensada. Cada versión, cada debate, cada chispa de inspiración deja una huella permanente aquí.",
      "Esto no es solo una plataforma. Es un movimiento.",
    ],
    coreValues: "Valores Fundamentales",
    values: [
      { icon: "✦", title: "Crear", desc: "Desde una idea hasta un objeto físico, WuuW da a cada visión creativa la oportunidad de hacerse realidad. Ninguna idea es demasiado pequeña para importar." },
      { icon: "◈", title: "Colaborar", desc: "Las grandes cosas ocurren cuando las mentes se encuentran. En WuuW, cada contribución se registra, cada colaborador recibe crédito y ningún esfuerzo pasa desapercibido." },
      { icon: "⬡", title: "Compartir", desc: "Las contribuciones se registran de forma permanente y el valor se distribuye de manera justa. Los derechos de autor pertenecen a los creadores. El valor pertenece a todos los que ayudaron a construirlo." },
    ],
    ctaLine1: "Únete a nosotros.",
    ctaLine2: "Cambia la forma en que se hacen las cosas.",
    goIdeas: "Ir a Ideas",
    joinNow: "Únete ahora",
    browseMarket: "Explorar mercado",
  },
  pt: {
    heroLines: ["WuuW és tu.", "WuuW sou eu.", "Somos WuuW."],
    manifesto: [
      "WuuW está a despertar. WuuW é criação. WuuW é conexão. Aqui, uma ideia pode tornar-se um produto, e um produto pode mudar vidas. Acreditamos que a verdadeira inovação nunca é solitária — nasce do choque de mentes, forma-se na colaboração e, em última análise, pertence a todos que ajudaram a construí-la.",
      "Seja você designer, criador ou sonhador, o WuuW garante que a sua contribuição seja vista, registada e recompensada. Cada versão, cada discussão, cada centelha de inspiração deixa uma marca permanente aqui.",
      "Isto não é apenas uma plataforma. É um movimento.",
    ],
    coreValues: "Valores Fundamentais",
    values: [
      { icon: "✦", title: "Criar", desc: "De uma única ideia a um objeto físico, o WuuW dá a cada visão criativa a oportunidade de se tornar real. Nenhuma ideia é pequena demais para importar." },
      { icon: "◈", title: "Colaborar", desc: "As grandes coisas acontecem quando as mentes se encontram. No WuuW, cada contribuição é registada, cada colaborador é reconhecido e nenhum esforço passa despercebido." },
      { icon: "⬡", title: "Partilhar", desc: "As contribuições são registadas permanentemente e o valor é distribuído de forma justa. Os direitos de autor pertencem aos criadores. O valor pertence a todos que ajudaram a construí-lo." },
    ],
    ctaLine1: "Junte-se a nós.",
    ctaLine2: "Mude a forma como as coisas são feitas.",
    goIdeas: "Ir para Ideias",
    joinNow: "Aderir agora",
    browseMarket: "Explorar mercado",
  },
  ja: {
    heroLines: ["WuuWはあなた。", "WuuWは私。", "私たちはWuuW。"],
    manifesto: [
      "WuuWが目覚めています。WuuWは創造です。WuuWはつながりです。ここでは、アイデアが製品になり、製品が人生を変えることができます。真のイノベーションは決して孤独ではないと私たちは信じています——それは心のぶつかり合いから生まれ、コラボレーションによって形作られ、最終的には実現に貢献したすべての人のものになります。",
      "デザイナーであれ、メーカーであれ、夢想家であれ、WuuWはあなたの貢献が見られ、記録され、報われることを保証します。すべてのバージョン、すべての議論、すべてのインスピレーションの閃きが、ここに永続的な痕跡を残します。",
      "これはただのプラットフォームではありません。これは動きです。",
    ],
    coreValues: "コアバリュー",
    values: [
      { icon: "✦", title: "創造", desc: "一つのアイデアから実物まで、WuuWはすべての創造的なビジョンが実現する機会を与えます。小さなアイデアでも大切に扱われます。" },
      { icon: "◈", title: "協力", desc: "心が出会うと偉大なことが起きます。WuuWでは、すべての貢献が記録され、すべてのコラボレーターが評価され、いかなる努力も見過ごされません。" },
      { icon: "⬡", title: "共有", desc: "貢献は永続的に記録され、価値は公平に分配されます。著作権はクリエイターのものです。価値はそれを構築するのに貢献したすべての人のものです。" },
    ],
    ctaLine1: "参加しよう。",
    ctaLine2: "ものづくりのあり方を変えよう。",
    goIdeas: "アイデアへ",
    joinNow: "今すぐ参加",
    browseMarket: "マーケットを見る",
  },
};

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AboutPage() {
  const { lang } = useLang();
  const { isLoggedIn, openAuthModal } = useAuth();
  const locale = (lang as Locale) in ABOUT ? (lang as Locale) : "en";
  const content = ABOUT[locale];
  const isSingleLine = content.heroLines.length === 1;

  return (
    <div style={{ background: "#020205", color: "#eee" }}>

      {/* ── Section 1: Hero ──────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden"
        style={{ height: "20vh" }}>
        <Starfield />

        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 400, height: 400, background: `radial-gradient(circle, rgba(0,245,212,0.05) 0%, transparent 70%)` }} />
        </div>

        <div className="relative text-center px-6 max-w-4xl mx-auto" style={{ zIndex: 2 }}>
          <div className="text-xs font-mono tracking-[0.3em] mb-2 uppercase" style={{ color: "rgba(0,245,212,0.4)" }}>
            WuuW
          </div>
          {isSingleLine ? (
            <h1 className="font-bold leading-tight"
              style={{ fontSize: "clamp(1.4rem, 4vw, 2.4rem)", color: "#eee", letterSpacing: "-0.02em" }}>
              <TypewriterLine text={content.heroLines[0]} delay={0.3} />
            </h1>
          ) : (
            <h1 className="font-bold leading-snug"
              style={{ fontSize: "clamp(1.1rem, 3vw, 1.8rem)", letterSpacing: "-0.02em" }}>
              <span style={{ color: T }}><TypewriterLine text={content.heroLines[0]} delay={0.3} /></span>
              {" "}
              <span style={{ color: "#eee" }}><TypewriterLine text={content.heroLines[1]} delay={1.6} /></span>
              {" "}
              <span style={{ color: "rgba(0,245,212,0.6)" }}><TypewriterLine text={content.heroLines[2]} delay={2.9} /></span>
            </h1>
          )}
        </div>
      </section>

      {/* ── Section 2: Manifesto ─────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {content.manifesto.map((para, i) => (
            <FadeSection key={i} delay={0.15 * (i + 1)}>
              <p className="mb-7 leading-[1.9]"
                style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)", color: i === 2 ? "#eee" : "#555", fontWeight: i === 2 ? 600 : 400 }}>
                {para}
              </p>
            </FadeSection>
          ))}

          <FadeSection delay={0.5}>
            <div className="mt-12 h-px w-16" style={{ background: `linear-gradient(to right, ${T}, transparent)` }} />
          </FadeSection>
        </div>
      </section>

      {/* ── Section 3: Values ────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <FadeSection>
            <div className="text-xs font-mono tracking-[0.25em] mb-12 uppercase text-center" style={{ color: "rgba(0,245,212,0.35)" }}>
              {content.coreValues}
            </div>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.values.map((v, i) => (
              <ValueCard key={v.title} {...v} delay={0.1 * i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: CTA ───────────────────────────────────────────────── */}
      <section className="py-36 px-6 text-center relative overflow-hidden"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="rounded-full" style={{ width: 500, height: 300,
            background: `radial-gradient(ellipse, rgba(0,245,212,0.06) 0%, transparent 70%)` }} />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <FadeSection>
            <p className="font-bold mb-3" style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", color: "#ddd", lineHeight: 1.4 }}>
              {content.ctaLine1}
            </p>
            <p className="font-bold mb-14" style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", color: T, lineHeight: 1.4 }}>
              {content.ctaLine2}
            </p>
          </FadeSection>

          <FadeSection delay={0.2}>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {isLoggedIn ? (
                <Link href="/ideas"
                  className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200"
                  style={{ background: T, color: "#020205" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(0,245,212,0.4)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  {content.goIdeas}
                </Link>
              ) : (
                <>
                  <button onClick={openAuthModal}
                    className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200"
                    style={{ background: T, color: "#020205" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px rgba(0,245,212,0.4)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    {content.joinNow}
                  </button>
                  <Link href="/models"
                    className="px-8 py-3 rounded-full text-sm font-semibold border transition-all duration-200"
                    style={{ borderColor: "rgba(255,255,255,0.12)", color: "#888" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T; (e.currentTarget as HTMLElement).style.color = T; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#888"; }}>
                    {content.browseMarket}
                  </Link>
                </>
              )}
            </div>
          </FadeSection>

          <FadeSection delay={0.4}>
            <p className="mt-16 text-xs font-mono" style={{ color: "rgba(255,255,255,0.1)", letterSpacing: "0.2em" }}>
              WuuW · {new Date().getFullYear()}
            </p>
          </FadeSection>
        </div>
      </section>
    </div>
  );
}
