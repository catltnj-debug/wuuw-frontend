export default function WalletPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">我的钱包</h1>
      <p className="text-gray-500 text-sm mb-8">管理你的 WUUW 代币余额与收益</p>

      {/* 余额卡片 */}
      <div className="bg-gray-900 text-white rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">WUUW 余额</p>
            <div className="text-4xl font-bold">0.00</div>
            <p className="text-gray-400 text-sm mt-1">≈ $0.00 USD</p>
          </div>
          <div className="text-4xl">⬡</div>
        </div>
        <div className="flex gap-3 mt-8">
          <button className="flex-1 bg-white text-gray-900 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors">
            提现
          </button>
          <button className="flex-1 bg-white/10 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-white/20 transition-colors">
            绑定钱包
          </button>
        </div>
      </div>

      {/* 统计网格 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="设计奖励" value="0 WUUW" />
        <StatCard label="我的模型" value="0 个" />
        <StatCard label="总打印次数" value="0 次" />
      </div>

      {/* 交易记录 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">代币流水</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            暂无记录
            <br />
            <span className="text-xs mt-1 block">上传模型并等待有人打印，代币就会出现在这里</span>
          </div>
        </div>
      </div>

      {/* 提现说明 */}
      <div className="mt-6 bg-gray-50 rounded-xl p-5 text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-900">关于提现</p>
        <p>WUUW 代币发行在 Polygon 区块链上。提现时，代币将转入你绑定的以太坊/Polygon 钱包（如 MetaMask）。</p>
        <p>你也可以通过平台内置的兑换功能将代币换成 USDC 或 ETH，再转入银行账户。</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
