"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiCreateOrder, apiUploadFile } from "@/lib/api";

export default function UploadPage() {
  const { isLoggedIn, openAuthModal } = useAuth();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState("PLA");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ order_no: string } | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function handlePublish() {
    if (!isLoggedIn) { openAuthModal(); return; }
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const order = await apiCreateOrder(material, "standard");
      await apiUploadFile(order.order_no, file);
      setUploadResult({ order_no: order.order_no });
      setStep(4);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  if (step === 4 && uploadResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">模型已提交！</h2>
        <p className="text-gray-500 text-sm mb-2">订单号：<span className="font-mono font-semibold text-gray-800">{uploadResult.order_no}</span></p>
        <p className="text-gray-400 text-sm">AI 正在处理你的模型，完成后将安排打印</p>
        <button onClick={() => { setStep(1); setFile(null); setUploadResult(null); }}
          className="mt-8 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors">
          再上传一个
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">上传3D模型</h1>
      <p className="text-gray-500 text-sm mb-8">分享你的设计，当它被打印时你就能赚到 WUUW 代币</p>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { n: 1, label: "上传文件" },
          { n: 2, label: "填写信息" },
          { n: 3, label: "版权设置" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step >= n ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {n}
            </div>
            <span className={`text-xs ${step >= n ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
            {n < 3 && <div className={`flex-1 h-px ${step > n ? "bg-gray-900" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* 步骤1：上传文件 */}
      {step === 1 && (
        <div className="space-y-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files[0];
              if (dropped) setFile(dropped);
            }}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".stl,.obj,.3mf,.step,.stp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 text-gray-300">⬡</div>
                <p className="font-semibold text-gray-700">拖拽或点击上传3D文件</p>
                <p className="text-sm text-gray-400 mt-2">支持 STL · OBJ · 3MF · STEP</p>
              </div>
            )}
          </div>
          <button
            disabled={!file}
            onClick={() => setStep(2)}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            下一步
          </button>
        </div>
      )}

      {/* 步骤2：填写信息 */}
      {step === 2 && (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称 *</label>
            <input
              required
              type="text"
              placeholder="例如：可拆卸手机支架"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              你解决了什么问题？ *
              <span className="text-gray-400 font-normal ml-1">（这是 wuuw 最重要的一栏）</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="例如：我在厨房做饭时需要看手机食谱，但手机平放看不到，所以设计了这个可以夹在橱柜边缘的支架。"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">详细描述</label>
            <textarea
              rows={4}
              placeholder="材质建议、打印参数、使用说明……"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">推荐材质</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="PLA">PLA</option>
                <option value="ABS">ABS</option>
                <option value="PETG">PETG</option>
                <option value="Resin">Resin</option>
                <option value="TPU">TPU</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">预估打印时长</label>
              <input
                type="text"
                placeholder="例如：3.5 小时"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              上一步
            </button>
            <button
              type="submit"
              className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              下一步
            </button>
          </div>
        </form>
      )}

      {/* 步骤3：版权设置 */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">版权协议</label>
            <div className="space-y-2">
              {[
                { value: "CC_BY_SA", label: "CC BY-SA（署名-相同方式共享）", desc: "最常用，允许他人改编，但需要注明来源并采用相同协议", recommended: true },
                { value: "CC_BY", label: "CC BY（署名）", desc: "最宽松，只需注明来源" },
                { value: "CC_BY_NC", label: "CC BY-NC（非商业）", desc: "允许改编，但不能商用" },
                { value: "PROPRIETARY", label: "专有版权", desc: "他人必须付费授权才能使用或改编" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input type="radio" name="license" value={opt.value} defaultChecked={opt.recommended} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {opt.label}
                      {opt.recommended && <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">推荐</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              版税比例（当他人派生你的模型时）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={30}
                defaultValue={10}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-900 w-12 text-right">10%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              当有人基于你的模型创作改版，你从他们的收益中获得的比例
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-2">💰 收益说明</p>
            <p>每次有人打印你的模型，平台将自动向你的钱包发放 <strong>WUUW 代币</strong>（占订单金额的 15%）。你无需主动操作，代币会实时到账。</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              上一步
            </button>
            {uploadError && (
              <p className="text-xs text-red-500 text-center">{uploadError}</p>
            )}
            <button
              onClick={handlePublish}
              disabled={uploading}
              className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {uploading ? "上传中..." : isLoggedIn ? "发布模型" : "登录后发布"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
