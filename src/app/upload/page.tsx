"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiUploadAsset, apiUploadMedia, apiGetCategories, apiPatchTechParams, type ApiCategory } from "@/lib/api";

const T = "#00F5D4";

const MATERIALS = ["PLA", "ABS", "PETG", "Resin", "TPU", "其他"];
const NOZZLE_SIZES = ["0.2", "0.4", "0.6", "0.8"];
const MEDIA_KINDS = [
  { value: "image", label: "图片" },
  { value: "animation", label: "动图/渲染" },
  { value: "video", label: "演示视频" },
  { value: "usage_video", label: "使用视频" },
];

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#ddd",
  outline: "none",
  borderRadius: 10,
};
const labelStyle: React.CSSProperties = { color: "#888", fontSize: 13, marginBottom: 6, display: "block" };
const sectionCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 20,
};

interface TechParams {
  material: string;
  weight_g: string;
  print_time_min: string;
  nozzle_mm: string;
  dim_x: string; dim_y: string; dim_z: string;
  layer_height: string;
  infill_pct: string;
  support_required: boolean;
  assembly_notes: string;
}

interface PendingMedia {
  file: File;
  kind: string;
  previewUrl: string;
}

interface UploadResult {
  asset_no: string;
  asset_id: number;
  certificate_no: string;
}

export default function UploadPage() {
  const { isLoggedIn, openAuthModal } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  // Step 2
  const [file3D, setFile3D] = useState<File | null>(null);
  const [tech, setTech] = useState<TechParams>({
    material: "PLA", weight_g: "", print_time_min: "",
    nozzle_mm: "0.4", dim_x: "", dim_y: "", dim_z: "",
    layer_height: "0.2", infill_pct: "20",
    support_required: false, assembly_notes: "",
  });

  // Step 3
  const [mediaFiles, setMediaFiles] = useState<PendingMedia[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Submit state
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    apiGetCategories().then(setCategories).catch(() => {});
  }, []);

  function setTechField<K extends keyof TechParams>(k: K, v: TechParams[K]) {
    setTech(prev => ({ ...prev, [k]: v }));
  }

  function buildDescription() {
    const params: string[] = [];
    if (tech.material) params.push(`材料：${tech.material}`);
    if (tech.weight_g) params.push(`预估重量：${tech.weight_g}g`);
    if (tech.print_time_min) params.push(`打印时间：${tech.print_time_min}分钟`);
    if (tech.nozzle_mm) params.push(`推荐喷头：${tech.nozzle_mm}mm`);
    if (tech.dim_x && tech.dim_y && tech.dim_z)
      params.push(`尺寸：${tech.dim_x}×${tech.dim_y}×${tech.dim_z}mm`);
    if (tech.layer_height) params.push(`层高：${tech.layer_height}mm`);
    if (tech.infill_pct) params.push(`填充率：${tech.infill_pct}%`);
    params.push(`需要支撑：${tech.support_required ? "是" : "否"}`);
    if (tech.assembly_notes) params.push(`安装说明：${tech.assembly_notes}`);
    return description + (params.length ? (description ? "\n\n" : "") + "## 打印参数\n" + params.map(p => `- ${p}`).join("\n") : "");
  }

  function addMediaFile(file: File) {
    const kind = file.type.startsWith("video") ? "video" : "image";
    const previewUrl = URL.createObjectURL(file);
    setMediaFiles(prev => [...prev, { file, kind, previewUrl }]);
  }

  function removeMedia(idx: number) {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handlePublish() {
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!file3D || !title.trim()) return;
    setUploading(true);
    setError("");
    const total = 1 + mediaFiles.length;
    setUploadTotal(total);
    setUploadStep(0);

    try {
      const fullDesc = buildDescription();
      const uploadResult = await apiUploadAsset(
        file3D, title.trim(), fullDesc, tags.trim(),
        categoryId !== "" ? categoryId : undefined,
      );
      setUploadStep(1);

      // save tech params to proper DB columns
      await apiPatchTechParams(uploadResult.asset_id, {
        material: tech.material || null,
        nozzle_size: tech.nozzle_mm ? parseFloat(tech.nozzle_mm) : null,
        layer_height: tech.layer_height ? parseFloat(tech.layer_height) : null,
        infill_pct: tech.infill_pct ? parseInt(tech.infill_pct) : null,
        weight_g: tech.weight_g ? parseFloat(tech.weight_g) : null,
        dim_x: tech.dim_x ? parseFloat(tech.dim_x) : null,
        dim_y: tech.dim_y ? parseFloat(tech.dim_y) : null,
        dim_z: tech.dim_z ? parseFloat(tech.dim_z) : null,
        support_required: tech.support_required,
        assembly_notes: tech.assembly_notes || null,
        print_time_min: tech.print_time_min ? parseInt(tech.print_time_min) : null,
      }).catch(() => {}); // non-fatal

      for (const mf of mediaFiles) {
        await apiUploadMedia(uploadResult.asset_id, mf.file, mf.kind);
        setUploadStep(s => s + 1);
      }

      setResult({
        asset_no: uploadResult.asset_no,
        asset_id: uploadResult.asset_id,
        certificate_no: uploadResult.certificate_no,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  function resetAll() {
    setStep(1); setTitle(""); setDescription(""); setCategoryId(""); setTags("");
    setFile3D(null); setMediaFiles([]); setResult(null); setError(""); setUploadStep(0);
    setTech({ material: "PLA", weight_g: "", print_time_min: "", nozzle_mm: "0.4",
      dim_x: "", dim_y: "", dim_z: "", layer_height: "0.2", infill_pct: "20",
      support_required: false, assembly_notes: "" });
  }

  if (result) {
    return (
      <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">✦</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#eee" }}>模型已发布！</h2>
          <p className="text-sm mb-1" style={{ color: "#666" }}>
            资产编号：<span className="font-mono" style={{ color: T }}>{result.asset_no}</span>
          </p>
          {result.certificate_no && (
            <p className="text-sm mb-8" style={{ color: "#666" }}>
              版权证书：<span className="font-mono" style={{ color: "#BF5FFF" }}>{result.certificate_no}</span>
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link href={`/assets/${result.asset_id}`}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: T, color: "#050508" }}>
              查看详情
            </Link>
            <button onClick={resetAll}
              className="px-6 py-2.5 rounded-xl text-sm border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#777" }}>
              再上传一个
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = ["基本信息", "3D文件 & 参数", "配图媒体"];

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#eee" }}>上传模型</h1>
        <p className="text-sm mb-8" style={{ color: "#555" }}>分享你的设计，自动生成版权证书</p>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                    style={{
                      background: done ? "rgba(0,245,212,0.15)" : active ? T : "rgba(255,255,255,0.05)",
                      color: done ? T : active ? "#050508" : "#444",
                      border: done || active ? `1px solid ${T}` : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {done ? "✓" : n}
                  </div>
                  <span className="text-xs mt-1 whitespace-nowrap"
                    style={{ color: active ? T : done ? "#555" : "#333" }}>{label}</span>
                </div>
                {n < steps.length && (
                  <div className="flex-1 h-px mx-2 mb-5" style={{ background: done ? `rgba(0,245,212,0.3)` : "rgba(255,255,255,0.06)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>模型名称 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="例如：可拆卸手机支架"
                className="w-full px-4 py-2.5 text-sm" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>描述</label>
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="描述这个模型解决的问题、使用场景、设计思路…"
                className="w-full px-4 py-2.5 text-sm resize-none" style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>分类</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-2.5 text-sm" style={inputStyle}>
                  <option value="">不选分类</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>标签（逗号分隔）</label>
                <input value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="家居, 工具, 收纳"
                  className="w-full px-4 py-2.5 text-sm" style={inputStyle} />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!title.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-all"
              style={{ background: title.trim() ? T : "rgba(0,245,212,0.2)", color: title.trim() ? "#050508" : "#3a3a3a" }}>
              下一步 →
            </button>
          </div>
        )}

        {/* ── Step 2: 3D File + Tech Params ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* File drop zone */}
            <div>
              <label style={labelStyle}>3D文件 *</label>
              <div className="rounded-2xl p-8 text-center cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${file3D ? T : "rgba(255,255,255,0.1)"}`,
                  background: file3D ? "rgba(0,245,212,0.03)" : "rgba(255,255,255,0.02)",
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile3D(f); }}
                onClick={() => document.getElementById("file3DInput")?.click()}>
                <input id="file3DInput" type="file" accept=".stl,.obj,.glb,.3mf,.step,.stp"
                  className="hidden" onChange={e => e.target.files?.[0] && setFile3D(e.target.files[0])} />
                {file3D ? (
                  <>
                    <div className="text-2xl mb-2" style={{ color: T }}>⬡</div>
                    <p className="text-sm font-medium" style={{ color: "#ddd" }}>{file3D.name}</p>
                    <p className="text-xs mt-1" style={{ color: "#555" }}>{(file3D.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-2" style={{ color: "#333" }}>⬡</div>
                    <p className="text-sm font-medium" style={{ color: "#666" }}>拖拽或点击上传3D文件</p>
                    <p className="text-xs mt-1" style={{ color: "#444" }}>STL · OBJ · GLB · 3MF · STEP</p>
                  </>
                )}
              </div>
            </div>

            {/* Tech params */}
            <div style={sectionCard}>
              <p className="text-xs font-semibold mb-4" style={{ color: "#666" }}>打印参数（选填）</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>材料类型</label>
                  <select value={tech.material} onChange={e => setTechField("material", e.target.value)}
                    className="w-full px-3 py-2 text-sm" style={inputStyle}>
                    {MATERIALS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>推荐喷头 (mm)</label>
                  <select value={tech.nozzle_mm} onChange={e => setTechField("nozzle_mm", e.target.value)}
                    className="w-full px-3 py-2 text-sm" style={inputStyle}>
                    {NOZZLE_SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>预估重量 (g)</label>
                  <input type="number" value={tech.weight_g} onChange={e => setTechField("weight_g", e.target.value)}
                    placeholder="50" className="w-full px-3 py-2 text-sm" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>打印时间 (min)</label>
                  <input type="number" value={tech.print_time_min} onChange={e => setTechField("print_time_min", e.target.value)}
                    placeholder="120" className="w-full px-3 py-2 text-sm" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>层高 (mm)</label>
                  <input type="number" step="0.05" value={tech.layer_height} onChange={e => setTechField("layer_height", e.target.value)}
                    placeholder="0.2" className="w-full px-3 py-2 text-sm" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>填充率 (%)</label>
                  <input type="number" min="0" max="100" value={tech.infill_pct} onChange={e => setTechField("infill_pct", e.target.value)}
                    placeholder="20" className="w-full px-3 py-2 text-sm" style={inputStyle} />
                </div>
              </div>

              {/* Dimensions */}
              <div className="mt-3">
                <label style={labelStyle}>模型尺寸 L × W × H (mm)</label>
                <div className="flex gap-2">
                  {(["dim_x", "dim_y", "dim_z"] as const).map((k, i) => (
                    <input key={k} type="number" value={tech[k]} onChange={e => setTechField(k, e.target.value)}
                      placeholder={["长", "宽", "高"][i]}
                      className="flex-1 px-3 py-2 text-sm" style={inputStyle} />
                  ))}
                </div>
              </div>

              {/* Support + assembly */}
              <div className="mt-3 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tech.support_required}
                    onChange={e => setTechField("support_required", e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm" style={{ color: "#888" }}>需要支撑结构</span>
                </label>
              </div>

              <div className="mt-3">
                <label style={labelStyle}>安装注意事项</label>
                <textarea rows={2} value={tech.assembly_notes} onChange={e => setTechField("assembly_notes", e.target.value)}
                  placeholder="例如：零件A需先加热再插入零件B…"
                  className="w-full px-3 py-2 text-sm resize-none" style={inputStyle} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm border transition-all"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#777" }}>
                上一步
              </button>
              <button onClick={() => setStep(3)} disabled={!file3D}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: file3D ? T : "rgba(0,245,212,0.2)", color: file3D ? "#050508" : "#3a3a3a" }}>
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Media ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label style={labelStyle}>关联媒体（图片 / 视频 / 动图，可多文件）</label>
              <div className="rounded-2xl p-6 text-center cursor-pointer transition-all"
                style={{ border: "2px dashed rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  Array.from(e.dataTransfer.files).forEach(addMediaFile);
                }}
                onClick={() => mediaInputRef.current?.click()}>
                <input ref={mediaInputRef} type="file" multiple
                  accept="image/*,video/*,.gif"
                  className="hidden"
                  onChange={e => Array.from(e.target.files ?? []).forEach(addMediaFile)} />
                <div className="text-2xl mb-2" style={{ color: "#333" }}>🖼</div>
                <p className="text-sm" style={{ color: "#666" }}>拖拽或点击添加图片 / 视频</p>
                <p className="text-xs mt-1" style={{ color: "#444" }}>JPG · PNG · GIF · MP4 · MOV</p>
              </div>
            </div>

            {/* Media preview list */}
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                {mediaFiles.map((mf, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      {mf.file.type.startsWith("image") ? (
                        <img src={mf.previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: "#ccc" }}>{mf.file.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#444" }}>
                        {(mf.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <select value={mf.kind}
                      onChange={e => setMediaFiles(prev => prev.map((f, j) => j === i ? { ...f, kind: e.target.value } : f))}
                      className="px-2 py-1 text-xs rounded-lg" style={{ ...inputStyle, width: "auto" }}>
                      {MEDIA_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                    <button onClick={() => removeMedia(i)} className="text-xs px-2 py-1 rounded"
                      style={{ color: "#555" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Info box */}
            <div className="p-4 rounded-xl text-xs" style={{ background: "rgba(0,245,212,0.04)", border: "1px solid rgba(0,245,212,0.1)" }}>
              <p className="font-medium mb-1" style={{ color: T }}>✦ 关于版权证书</p>
              <p style={{ color: "#666" }}>上传成功后系统自动生成 CR-YYYY-NNNNNN 格式证书，包含文件 SHA-256 指纹，不可篡改。</p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(255,80,80,0.08)", color: "#ff6b6b", border: "1px solid rgba(255,80,80,0.2)" }}>
                {error}
              </div>
            )}

            {/* Upload progress */}
            {uploading && uploadTotal > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: "#555" }}>
                  <span>{uploadStep < uploadTotal ? `上传中 (${uploadStep}/${uploadTotal})…` : "处理中…"}</span>
                  <span>{Math.round((uploadStep / uploadTotal) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(uploadStep / uploadTotal) * 100}%`, background: T }} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} disabled={uploading}
                className="flex-1 py-3 rounded-xl text-sm border transition-all"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#777" }}>
                上一步
              </button>
              <button onClick={handlePublish} disabled={uploading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: uploading ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
                {uploading ? "上传中…" : isLoggedIn ? "发布模型" : "登录后发布"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
