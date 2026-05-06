export default function ModelsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模型库</h1>
          <p className="text-gray-500 text-sm mt-1">来自真实需求的3D模型</p>
        </div>
        {/* 搜索栏 */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="搜索模型..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["全部", "家居", "工具", "玩具", "医疗", "工业", "艺术"].map((cat) => (
          <button
            key={cat}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              cat === "全部"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 模型网格（占位） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ModelCard key={i} />
        ))}
      </div>
    </div>
  );
}

function ModelCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
      {/* 预览图 */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300 text-5xl group-hover:bg-gray-50 transition-colors">
        ⬡
      </div>
      {/* 信息 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate">模型标题占位</h3>
        <p className="text-gray-400 text-xs mt-1 truncate">解决了：某个真实问题</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">by 设计师名</span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>❤️ 12</span>
            <span>🖨️ 5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
