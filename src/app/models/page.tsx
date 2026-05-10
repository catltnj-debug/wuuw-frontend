"use client";

import { useState, useEffect } from "react";
import { apiGetAssets, type ApiAsset } from "@/lib/api";

const T = "#00F5D4";
const API_BASE = "http://localhost:8001";

const TAG_FILTERS = ["全部", "家居", "工具", "玩具", "医疗", "工业", "艺术"];

export default function ModelsPage() {
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("全部");

  useEffect(() => {
    apiGetAssets({ pageSize: 100 })
      .then(d => setAssets(d.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.creator.toLowerCase().includes(q);
    const matchTag = activeTag === "全部" || a.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>模型库</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>
              {loading ? "加载中…" : `共 ${filtered.length} 个资产${search ? `（"${search}"的结果）` : ""}`}
            </p>
          </div>
          <input
            type="text"
            placeholder="搜索标题或创作者…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72 px-4 py-2 text-sm rounded-xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ddd",
              outline: "none",
            }}
          />
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TAG_FILTERS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeTag === tag ? T : "rgba(255,255,255,0.05)",
                color: activeTag === tag ? "#050508" : "#666",
                border: `1px solid ${activeTag === tag ? T : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", aspectRatio: "1 / 1.3" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24" style={{ color: "#3a3a3a" }}>
            <div className="text-5xl mb-4">⬡</div>
            <p>{search ? `没有找到 "${search}"` : "暂无模型资产"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: ApiAsset }) {
  const coverUrl = asset.cover_image ? `${API_BASE}${asset.cover_image}` : null;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, {
        border: "1px solid rgba(0,245,212,0.25)",
        background: "rgba(0,245,212,0.03)",
        transform: "translateY(-2px)",
      })}
      onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, {
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        transform: "translateY(0)",
      })}
    >
      {/* Cover image */}
      <div className="aspect-square flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(0,245,212,0.03)" }}>
        {coverUrl ? (
          <img src={coverUrl} alt={asset.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: 52, opacity: 0.15 }}>⬡</span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate flex-1" style={{ color: "#ddd" }}>
            {asset.title}
          </h3>
          <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(0,245,212,0.08)", color: T, fontSize: 10 }}>
            {asset.file_format}
          </span>
        </div>

        <p className="text-xs mb-2 truncate" style={{ color: "#555" }}>by {asset.creator}</p>

        {asset.certificate_no && (
          <p className="text-xs font-mono truncate mb-2" style={{ color: "#383838" }}>
            {asset.certificate_no}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#3a3a3a" }}>{asset.current_version}</span>
          {asset.tags.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}>
              {asset.tags[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
