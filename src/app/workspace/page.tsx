"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang, COPY } from "@/lib/language";

const T = "#00F5D4";

const cardBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
};
const cardHover = {
  background: "rgba(0,245,212,0.04)",
  border: "1px solid rgba(0,245,212,0.2)",
};

// ── IDEAS ──────────────────────────────────────────────
function IdeasTab() {
  const { lang } = useLang();
  const [recording, setRecording] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [ideas, setIdeas] = useState([
    { id: 1, type: "voice", title: lang === "zh" ? "厨房调料架" : "Kitchen Spice Rack", tag: lang === "zh" ? "家居" : "Home" },
    { id: 2, type: "note",  title: lang === "zh" ? "桌面走线夹" : "Cable Management Clip", tag: lang === "zh" ? "工具" : "Tools" },
  ]);

  const inputTypes = [
    { id: "voice",  icon: "🎙", label: lang === "zh" ? "语音"   : "Voice",  desc: lang === "zh" ? "说出你的想法"  : "Speak your idea" },
    { id: "sketch", icon: "✏️", label: lang === "zh" ? "草图"   : "Sketch", desc: lang === "zh" ? "画个草图"      : "Draw a sketch" },
    { id: "note",   icon: "📝", label: lang === "zh" ? "文字"   : "Note",   desc: lang === "zh" ? "文字记录"      : "Write it down" },
    { id: "image",  icon: "🖼", label: lang === "zh" ? "图片"   : "Image",  desc: lang === "zh" ? "上传参考图"    : "Upload reference" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">{lang === "zh" ? "想法" : "Ideas"}</h2>
        <p className="text-sm" style={{ color: "#555" }}>
          {lang === "zh" ? "捕捉你的每一个悟" : "Capture every spark of insight"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {inputTypes.map(t => {
          const isActive = activeInput === t.id;
          return (
            <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => {
                setActiveInput(isActive ? null : t.id);
                if (t.id === "voice") setRecording(!recording);
              }}
              className="relative text-left p-4 rounded-2xl transition-all duration-200"
              style={isActive ? { ...cardBase, ...cardHover } : cardBase}>
              <div className="text-2xl mb-3">{t.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: isActive ? T : "#ccc" }}>{t.label}</div>
              <div className="text-xs" style={{ color: "#555" }}>{t.desc}</div>
              {t.id === "voice" && recording && (
                <div className="flex items-end gap-0.5 h-5 mt-3">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <div key={j} className="flex-1 rounded-full"
                      style={{ background: T, minHeight: "3px",
                        animation: `wave-bar ${0.4 + j * 0.07}s ease-in-out infinite`,
                        animationDelay: `${j * 0.05}s` }} />
                  ))}
                </div>
              )}
              {t.id === "voice" && (
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${recording ? "pulse-teal" : ""}`}
                  style={{ background: recording ? T : "rgba(255,255,255,0.1)" }} />
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeInput === "note" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-2xl space-y-3" style={cardBase}>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder={lang === "zh" ? "描述你想解决的问题……" : "Describe the problem you want to solve…"}
                rows={4} className="w-full text-sm rounded-xl p-3 resize-none"
                style={{ background: "rgba(255,255,255,0.03)", color: "#ddd", border: "1px solid rgba(255,255,255,0.08)" }} />
              <div className="flex justify-end">
                <button onClick={() => {
                  if (!noteText.trim()) return;
                  setIdeas(p => [{ id: Date.now(), type: "note", title: noteText.slice(0, 18), tag: lang === "zh" ? "未分类" : "Misc" }, ...p]);
                  setNoteText(""); setActiveInput(null);
                }} className="text-xs px-4 py-1.5 rounded-full font-medium" style={{ background: T, color: "#050508" }}>
                  {lang === "zh" ? "保存" : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        className="w-full py-3.5 rounded-2xl text-sm font-medium border flex items-center justify-center gap-2 transition-all"
        style={{ borderColor: "rgba(0,245,212,0.3)", color: T, background: "rgba(0,245,212,0.04)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0,245,212,0.15)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
        <span>✦</span>
        {lang === "zh" ? "让 AI 帮我悟清楚" : "Let AI clarify my insight"}
      </motion.button>

      <div className="space-y-2">
        {ideas.map(idea => (
          <motion.div key={idea.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
            style={cardBase}
            onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, cardHover)}
            onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, cardBase)}>
            <div className="flex items-center gap-3">
              <span>{idea.type === "voice" ? "🎙" : "📝"}</span>
              <span className="text-sm" style={{ color: "#ddd" }}>{idea.title}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,245,212,0.1)", color: T }}>{idea.tag}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── MODELS ─────────────────────────────────────────────
const MODEL_STAGES = [
  { id: "draft",  color: "#555",    icon: "◌", labelZh: "草稿",   labelEn: "Draft",            models: [{ name: "调料架 v1", progress: 20, contributors: 1, earnings: 0 }] },
  { id: "collab", color: "#F5A623", icon: "◈", labelZh: "进行中", labelEn: "In Collaboration",  models: [{ name: "桌面走线夹", progress: 65, contributors: 3, earnings: 0 }, { name: "手机充电底座", progress: 45, contributors: 2, earnings: 0 }] },
  { id: "ready",  color: T,         icon: "◉", labelZh: "待打印", labelEn: "Ready to Print",    models: [{ name: "可拆卸手机支架", progress: 100, contributors: 1, earnings: 24 }] },
  { id: "mold",   color: "#BF5FFF", icon: "⬡", labelZh: "量产",  labelEn: "Mold Stage",        models: [{ name: "磁吸钥匙挂钩", progress: 100, contributors: 4, earnings: 186 }] },
];

function ModelsTab() {
  const { lang } = useLang();
  const [open, setOpen] = useState<string | null>("ready");

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold mb-1">{lang === "zh" ? "模型" : "Models"}</h2>
        <p className="text-sm" style={{ color: "#555" }}>{lang === "zh" ? "按阶段管理你的设计" : "Manage your designs by stage"}</p>
      </div>
      {MODEL_STAGES.map(stage => (
        <div key={stage.id} className="rounded-2xl overflow-hidden border transition-all"
          style={{ borderColor: open === stage.id ? "rgba(0,245,212,0.18)" : "rgba(255,255,255,0.06)" }}>
          <button className="w-full flex items-center justify-between p-4 transition-all"
            style={{ background: open === stage.id ? "rgba(0,245,212,0.04)" : "rgba(255,255,255,0.02)" }}
            onClick={() => setOpen(open === stage.id ? null : stage.id)}>
            <div className="flex items-center gap-3">
              <span style={{ color: stage.color }}>{stage.icon}</span>
              <span className="text-sm font-semibold" style={{ color: open === stage.id ? "#eee" : "#777" }}>
                {lang === "zh" ? stage.labelZh : stage.labelEn}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)", color: "#444" }}>{stage.models.length}</span>
            </div>
            <span className="text-xs" style={{ color: "#333" }}>{open === stage.id ? "▲" : "▼"}</span>
          </button>
          <AnimatePresence>
            {open === stage.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                <div className="px-4 pb-4 space-y-2">
                  {stage.models.map(m => (
                    <div key={m.name} className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: "rgba(0,245,212,0.07)", border: "1px solid rgba(0,245,212,0.1)" }}>⬡</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1.5" style={{ color: "#ddd" }}>{m.name}</div>
                        <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full" style={{ background: stage.color }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs" style={{ color: "#555" }}>👥 {m.contributors}</div>
                        {m.earnings > 0 && <div className="text-xs font-semibold mt-1" style={{ color: T }}>+{m.earnings} ⬡</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ── ORDERS ─────────────────────────────────────────────
const ORDER_SUBS = ["Cart", "Wishlist", "Ordered", "Received"] as const;
type OrderSub = typeof ORDER_SUBS[number];

function OrdersTab() {
  const { lang } = useLang();
  const [sub, setSub] = useState<OrderSub>("Cart");
  const subLabels: Record<OrderSub, string> = {
    Cart:     lang === "zh" ? "购物车" : "Cart",
    Wishlist: lang === "zh" ? "收藏"   : "Wishlist",
    Ordered:  lang === "zh" ? "已下单" : "Ordered",
    Received: lang === "zh" ? "已收货" : "Received",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">{lang === "zh" ? "订单" : "Orders"}</h2>
        <p className="text-sm" style={{ color: "#555" }}>{lang === "zh" ? "你的3D打印订单" : "Your 3D print orders"}</p>
      </div>
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
        {ORDER_SUBS.map(t => (
          <button key={t} onClick={() => setSub(t)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: sub === t ? "rgba(0,245,212,0.1)" : "transparent",
              color: sub === t ? T : "#555",
              border: sub === t ? "1px solid rgba(0,245,212,0.2)" : "1px solid transparent",
            }}>{subLabels[t]}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sub} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>
          {sub === "Cart" && (
            <div className="space-y-2">
              {[
                { name: lang === "zh" ? "磁吸钥匙挂钩" : "Magnetic Key Hook",     mat: "PLA",  price: 12, icon: "⬡" },
                { name: lang === "zh" ? "桌面走线夹套装" : "Cable Clip Set",       mat: "PETG", price: 18, icon: "◈" },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-4 p-4 rounded-xl" style={cardBase}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: "rgba(0,245,212,0.07)" }}>{item.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: "#ddd" }}>{item.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#555" }}>{item.mat}</div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: T }}>${item.price}</div>
                </div>
              ))}
              <button className="w-full mt-2 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: T, color: "#050508" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(0,245,212,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                {lang === "zh" ? "结算（$30）" : "Checkout ($30)"}
              </button>
            </div>
          )}
          {sub !== "Cart" && (
            <div className="text-center py-12 text-sm" style={{ color: "#3a3a3a" }}>
              {lang === "zh" ? "暂无内容" : "Nothing here yet"}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── EARNINGS ───────────────────────────────────────────
function EarningsTab() {
  const { lang } = useLang();
  const rows = [
    { name: lang === "zh" ? "磁吸钥匙挂钩"   : "Magnetic Key Hook",   prints: 12, tokens: 186 },
    { name: lang === "zh" ? "可拆卸手机支架" : "Adjustable Phone Stand", prints: 8, tokens: 96 },
    { name: lang === "zh" ? "桌面走线夹"     : "Cable Clip Set",       prints: 3,  tokens: 24  },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">{lang === "zh" ? "收益" : "Earnings"}</h2>
        <p className="text-sm" style={{ color: "#555" }}>{lang === "zh" ? "你的创作收益" : "Your creator earnings"}</p>
      </div>
      <div className="p-8 rounded-2xl text-center"
        style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.15)" }}>
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>WUUW</p>
        <div className="text-7xl font-bold mb-2 teal-text-glow" style={{ color: T }}>306</div>
        <p className="text-sm" style={{ color: "#555" }}>≈ $91.80 USD</p>
        <div className="flex gap-3 mt-6 justify-center">
          <button className="px-6 py-2.5 rounded-full text-sm font-medium"
            style={{ background: T, color: "#050508" }}>
            {lang === "zh" ? "提现" : "Withdraw"}
          </button>
          <button className="px-6 py-2.5 rounded-full text-sm border"
            style={{ borderColor: "rgba(0,245,212,0.3)", color: T }}>
            {lang === "zh" ? "绑定钱包" : "Connect Wallet"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.name} className="flex items-center justify-between p-4 rounded-xl" style={cardBase}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                style={{ background: "rgba(0,245,212,0.07)" }}>⬡</div>
              <div>
                <div className="text-sm font-medium" style={{ color: "#ddd" }}>{r.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "#555" }}>🖨️ {r.prints} {lang === "zh" ? "次" : "prints"}</div>
              </div>
            </div>
            <div className="text-sm font-bold" style={{ color: T }}>+{r.tokens} ⬡</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 主页面（由 URL 参数驱动 tab）─────────────────────
type TabId = "ideas" | "models" | "orders" | "earnings";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "ideas";
  const activeTab: TabId = ["ideas", "models", "orders", "earnings"].includes(rawTab)
    ? (rawTab as TabId)
    : "ideas";

  const content: Record<TabId, React.ReactNode> = {
    ideas:    <IdeasTab />,
    models:   <ModelsTab />,
    orders:   <OrdersTab />,
    earnings: <EarningsTab />,
  };

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-3xl mx-auto px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
            {content[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div style={{ color: "#333", padding: "2rem" }}>Loading…</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
