"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const T = "#00F5D4";

const filters = ["All", "Home", "Tools", "Wearable", "Medical", "Art", "Industrial"];

const mockModels = [
  { id: 1, name: "磁吸钥匙挂钩", author: "Zen.eth", problem: "每次找钥匙太浪费时间", likes: 284, prints: 47, tag: "Home", price: 0 },
  { id: 2, name: "可调节手机支架", author: "Nova_M", problem: "做饭时无法看手机食谱", likes: 156, prints: 31, tag: "Home", price: 0 },
  { id: 3, name: "桌面走线夹套装", author: "Kai_3D", problem: "桌面线缆凌乱影响专注", likes: 203, prints: 28, tag: "Tools", price: 2 },
  { id: 4, name: "耳机收纳架", author: "Pulse.io", problem: "耳机随手放容易损坏", likes: 98, prints: 19, tag: "Home", price: 0 },
  { id: 5, name: "折叠相机脚架", author: "Aria.eth", problem: "旅行时不想带沉重脚架", likes: 312, prints: 62, tag: "Tools", price: 3 },
  { id: 6, name: "药盒分格器", author: "Mira_X", problem: "每天药量容易搞混", likes: 67, prints: 15, tag: "Medical", price: 0 },
  { id: 7, name: "壁挂植物支架", author: "Lumen", problem: "小空间也想养绿植", likes: 445, prints: 83, tag: "Home", price: 0 },
  { id: 8, name: "音频接口保护盖", author: "Freq.3D", problem: "接口落灰影响音质", likes: 41, prints: 9, tag: "Tools", price: 0 },
];

function ModelCard({ model, index }: { model: typeof mockModels[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        background: hovered ? "rgba(0,245,212,0.04)" : "rgba(255,255,255,0.025)",
        border: hovered ? "1px solid rgba(0,245,212,0.25)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 0 20px rgba(0,245,212,0.08)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 预览区 */}
      <div className="aspect-[4/3] flex items-center justify-center text-5xl relative"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <span style={{ opacity: 0.3 }}>⬡</span>
        {/* 悬停时显示3D预览占位 */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,245,212,0.04)" }}>
            <span className="text-xs" style={{ color: T }}>3D Preview</span>
          </div>
        )}
        {model.price === 0 && (
          <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,245,212,0.15)", color: T }}>
            Free
          </div>
        )}
        {model.price > 0 && (
          <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", color: "#aaa" }}>
            ${model.price}
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1.5" style={{ color: "#e0e0e0" }}>{model.name}</h3>
        <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: "#555" }}>
          {model.problem}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#444" }}>by {model.author}</span>
          <div className="flex items-center gap-3 text-xs" style={{ color: "#444" }}>
            <span>♡ {model.likes}</span>
            <span style={{ color: hovered ? T : "#444" }}>⬡ {model.prints}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  const filtered = mockModels.filter(m => {
    const matchFilter = activeFilter === "All" || m.tag === activeFilter;
    const matchQuery = !query || m.name.includes(query) || m.problem.includes(query);
    return matchFilter && matchQuery;
  });

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* 页头 */}
        <div className="mb-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{ color: T }}
          >
            Discover
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            探索显化
          </motion.h1>
          <p className="text-sm" style={{ color: "#555" }}>
            来自真实需求的设计，每一个都解决了一个真实的问题
          </p>
        </div>

        {/* 搜索 + 排序 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#444" }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder="搜索模型或问题..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#ccc",
              }}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#888",
            }}
          >
            <option value="popular">最受欢迎</option>
            <option value="newest">最新上传</option>
            <option value="printed">打印最多</option>
          </select>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={{
                background: activeFilter === f ? "rgba(0,245,212,0.12)" : "transparent",
                borderColor: activeFilter === f ? "rgba(0,245,212,0.4)" : "rgba(255,255,255,0.08)",
                color: activeFilter === f ? T : "#666",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 结果数 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "#444" }}>{filtered.length} 个设计</p>
        </div>

        {/* 模型网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((model, i) => (
            <ModelCard key={model.id} model={model} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 text-sm" style={{ color: "#444" }}>
            没有找到匹配的模型
          </div>
        )}
      </div>
    </div>
  );
}
