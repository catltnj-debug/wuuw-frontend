"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { apiGetAssets, apiGetCategories, type ApiAsset, type ApiCategory } from "@/lib/api";
import { useLang } from "@/lib/language";

const T = "#00F5D4";
const BG = "#050508";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Resin", "Nylon", "Carbon Fiber"];

const FORMAT_COLOR: Record<string, string> = {
  STL: T, OBJ: "#F5A623", GLB: "#BF5FFF", STEP: "#4FC3F7",
};

function CoverImage({ src, title }: { src?: string | null; title: string }) {
  const [err, setErr] = useState(false);
  const url = src && !err ? `${API_BASE}${src}` : null;
  return (
    <div className="w-full aspect-[4/3] rounded-t-xl overflow-hidden flex items-center justify-center"
      style={{ background: "rgba(255,255,255,0.03)" }}>
      {url ? (
        <img src={url} alt={title} onError={() => setErr(true)}
          className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
          <span className="text-3xl opacity-20">◈</span>
          <span className="text-xs opacity-10" style={{ color: "#555" }}>{title[0]?.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, zh }: { asset: ApiAsset; zh: boolean }) {
  const fmt = asset.file_format?.toUpperCase();
  const fmtColor = FORMAT_COLOR[fmt] ?? "#555";

  return (
    <div className="rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <CoverImage src={asset.cover_image} title={asset.title} />

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {/* Format + tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {fmt && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold"
              style={{ background: `${fmtColor}18`, color: fmtColor }}>
              {fmt}
            </span>
          )}
          {asset.tags.slice(0, 2).map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>
              {t}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold line-clamp-2 flex-1" style={{ color: "#ddd" }}>
          {asset.title}
        </h3>

        {/* Creator */}
        <p className="text-xs" style={{ color: "#484848" }}>@{asset.creator}</p>

        {/* CTA */}
        <Link href={`/assets/${asset.id}`}
          className="block text-center py-1.5 rounded-lg text-xs font-semibold transition-all mt-1"
          style={{ background: "rgba(0,245,212,0.1)", color: T, border: "1px solid rgba(0,245,212,0.2)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,212,0.18)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,212,0.1)"; }}>
          {zh ? "查看 / 下单" : "View / Order"}
        </Link>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const { lang } = useLang();
  const zh = lang === "zh";

  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [activeMat, setActiveMat] = useState("");
  const [search, setSearch] = useState("");
  const [debSearch, setDebSearch] = useState("");

  const PAGE_SIZE = 24;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const catBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetAssets({
        categoryId: activeCat ?? undefined,
        tag: activeMat || undefined,
        q: debSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setAssets(res.items);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeCat, activeMat, debSearch, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  function selectCat(id: number | null) { setActiveCat(id); setPage(1); }
  function selectMat(m: string) { setActiveMat(prev => prev === m ? "" : m); setPage(1); }
  function clearFilters() { setSearch(""); setActiveCat(null); setActiveMat(""); setPage(1); }

  const hasFilters = !!debSearch || activeCat !== null || !!activeMat;

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>
            {zh ? "市场" : "Market"}
          </h1>
          <p className="text-sm" style={{ color: "#555" }}>
            {zh
              ? "浏览已发布的 3D 模型，下单打印属于自己的实物"
              : "Browse published 3D models — order a print of anything you like"}
          </p>
        </div>

        {/* Search + material filter */}
        <div className="flex flex-wrap items-start gap-3 mb-5">
          {/* Search */}
          <div className="relative" style={{ minWidth: 220 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={zh ? "搜索模型名称…" : "Search models…"}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#ccc" }}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#444" }}>🔍</span>
          </div>

          {/* Material chips */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <span className="text-xs flex-shrink-0" style={{ color: "#383838" }}>
              {zh ? "材料" : "Material"}
            </span>
            {MATERIALS.map(m => (
              <button key={m} onClick={() => selectMat(m)}
                className="text-xs px-2.5 py-1 rounded-full transition-all flex-shrink-0"
                style={{
                  background: activeMat === m ? "rgba(0,245,212,0.12)" : "rgba(255,255,255,0.04)",
                  color: activeMat === m ? T : "#555",
                  border: `1px solid ${activeMat === m ? "rgba(0,245,212,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Category strip */}
        {categories.length > 0 && (
          <div ref={catBarRef}
            className="flex items-center gap-2 mb-7 overflow-x-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            <button onClick={() => selectCat(null)}
              className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full font-medium transition-all"
              style={{
                background: activeCat === null ? T : "rgba(255,255,255,0.05)",
                color: activeCat === null ? "#050508" : "#666",
                border: `1px solid ${activeCat === null ? "transparent" : "rgba(255,255,255,0.07)"}`,
              }}>
              {zh ? "全部" : "All"}
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => selectCat(cat.id)}
                className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full transition-all"
                style={{
                  background: activeCat === cat.id ? T : "rgba(255,255,255,0.05)",
                  color: activeCat === cat.id ? "#050508" : "#666",
                  fontWeight: activeCat === cat.id ? 600 : 400,
                  border: `1px solid ${activeCat === cat.id ? "transparent" : "rgba(255,255,255,0.07)"}`,
                }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Count + clear */}
        <div className="flex items-center justify-between mb-5">
          {!loading && (
            <p className="text-xs" style={{ color: "#383838" }}>
              {zh ? `共 ${total} 件` : `${total} result${total !== 1 ? "s" : ""}`}
            </p>
          )}
          {hasFilters && !loading && (
            <button onClick={clearFilters} className="text-xs" style={{ color: "#484848" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#484848"; }}>
              {zh ? "清除筛选 ×" : "Clear filters ×"}
            </button>
          )}
        </div>

        {/* Asset grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", aspectRatio: "3/4" }} />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4 opacity-20">◈</div>
            <p className="text-sm" style={{ color: "#333" }}>
              {zh ? "暂无模型" : "No models found"}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs underline" style={{ color: "#444" }}>
                {zh ? "清除筛选条件" : "Clear filters"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(a => <AssetCard key={a.id} asset={a} zh={zh} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page === 1 ? "#2a2a2a" : "#777" }}>
              {zh ? "上一页" : "Prev"}
            </button>
            <span className="text-xs" style={{ color: "#444" }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-4 py-1.5 rounded-lg text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: page >= totalPages ? "#2a2a2a" : "#777" }}>
              {zh ? "下一页" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
