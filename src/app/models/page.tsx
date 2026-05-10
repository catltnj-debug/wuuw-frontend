"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGetAssets, type ApiAsset } from "@/lib/api";

const T = "#00F5D4";
const API_BASE = "http://localhost:8001";

const TAG_FILTERS = [
  { label: "全部", value: "" },
  { label: "家居", value: "家居" },
  { label: "工具", value: "工具" },
  { label: "玩具", value: "玩具" },
  { label: "医疗", value: "医疗" },
  { label: "工业", value: "工业" },
  { label: "艺术", value: "艺术" },
];

export default function ModelsPage() {
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetAssets({
        q: debouncedSearch || undefined,
        tag: activeTag || undefined,
        page,
        pageSize: 24,
      });
      setAssets(data.items);
      setTotal(data.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [debouncedSearch, activeTag, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  function handleTagChange(tag: string) {
    setActiveTag(tag);
    setPage(1);
  }

  const totalPages = Math.ceil(total / 24);

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>模型库</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>
              {loading ? "加载中…" : `共 ${total} 个资产${debouncedSearch ? `（"${debouncedSearch}"的结果）` : ""}`}
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索标题…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-4 py-2 text-sm rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ddd",
                outline: "none",
              }}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TAG_FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => handleTagChange(value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeTag === value ? T : "rgba(255,255,255,0.05)",
                color: activeTag === value ? "#050508" : "#666",
                border: `1px solid ${activeTag === value ? T : "rgba(255,255,255,0.08)"}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", aspectRatio: "1 / 1.35" }} />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-24" style={{ color: "#3a3a3a" }}>
            <div className="text-5xl mb-4">⬡</div>
            <p>{debouncedSearch ? `没有找到 "${debouncedSearch}"` : "暂无模型资产"}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: page === 1 ? "#333" : "#777" }}>
                  上一页
                </button>
                <span className="px-3 py-1.5 text-xs" style={{ color: "#555" }}>
                  {page} / {totalPages}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: page >= totalPages ? "#333" : "#777" }}>
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: ApiAsset }) {
  const coverUrl = asset.cover_image
    ? (asset.cover_image.startsWith("http") ? asset.cover_image : `${API_BASE}${asset.cover_image}`)
    : null;

  return (
    <Link href={`/assets/${asset.id}`}
      className="rounded-2xl overflow-hidden block transition-all duration-200"
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
      })}>

      {/* Cover image */}
      <div className="aspect-square flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(0,245,212,0.02)" }}>
        {coverUrl ? (
          <img src={coverUrl} alt={asset.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: 52, opacity: 0.08 }}>⬡</span>
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
    </Link>
  );
}
