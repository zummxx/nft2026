import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Key,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  Clipboard,
  Send,
  Fuel,
  Sliders
} from 'lucide-react';
import { WalletAccount, ChainConfig, GasConfig, GasPreset } from '../types';
import { formatAddress } from '../utils/seadrop';
import { ethers } from 'ethers';

interface WalletGasColumnProps {
  wallets: WalletAccount[];
  setWallets: React.Dispatch<React.SetStateAction<WalletAccount[]>>;
  chain: ChainConfig;
  onRefreshBalances: () => void;
  isRefreshing: boolean;
  onOpenSweepModal?: () => void;
  gasConfig: GasConfig;
  setGasConfig: React.Dispatch<React.SetStateAction<GasConfig>>;
}

export const WalletGasColumn: React.FC<WalletGasColumnProps> = ({
  wallets,
  setWallets,
  chain,
  onRefreshBalances,
  isRefreshing,
  onOpenSweepModal,
  gasConfig,
  setGasConfig,
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedCount = wallets.filter(w => w.selected).length;

  const isArc = chain.id === 5042;
  const isL2 = chain.id === 4663 || chain.id === 57073;

  const handlePresetChange = (preset: GasPreset) => {
    let maxPriority = 1.5;
    let maxFee = 25;

    if (isArc) {
      if (preset === 'standard') {
        maxPriority = 10;
        maxFee = 30;
      } else if (preset === 'fast') {
        maxPriority = 20;
        maxFee = 60;
      } else if (preset === 'sniper') {
        maxPriority = 30;
        maxFee = 100;
      }
    } else if (isL2) {
      if (preset === 'standard') {
        maxPriority = 0.01;
        maxFee = 0.1;
      } else if (preset === 'fast') {
        maxPriority = 0.05;
        maxFee = 0.2;
      } else if (preset === 'sniper') {
        maxPriority = 0.2;
        maxFee = 1.0;
      }
    } else {
      if (preset === 'standard') {
        maxPriority = 1.5;
        maxFee = 25;
      } else if (preset === 'fast') {
        maxPriority = 3.0;
        maxFee = 45;
      } else if (preset === 'sniper') {
        maxPriority = 8.0;
        maxFee = 80;
      }
    }

    setGasConfig({
      preset,
      maxPriorityFeePerGasGwei: maxPriority,
      maxFeePerGasGwei: maxFee,
      gasLimitMultiplier: gasConfig.gasLimitMultiplier || 1.2,
    });
  };

  const handlePriorityFeeChange = (val: number) => {
    setGasConfig(prev => ({
      ...prev,
      preset: 'custom',
      maxPriorityFeePerGasGwei: val,
      maxFeePerGasGwei: Math.max(val, prev.maxFeePerGasGwei)
    }));
  };

  const handleMaxFeeChange = (val: number) => {
    setGasConfig(prev => ({
      ...prev,
      preset: 'custom',
      maxFeePerGasGwei: val,
      maxPriorityFeePerGasGwei: Math.min(val, prev.maxPriorityFeePerGasGwei)
    }));
  };

  const handleGasMultiplierChange = (val: number) => {
    setGasConfig(prev => ({
      ...prev,
      preset: 'custom',
      gasLimitMultiplier: val
    }));
  };

  const toggleSelect = (id: string) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, selected: !w.selected } : w));
  };

  const toggleSelectAll = () => {
    const allSelected = wallets.every(w => w.selected);
    setWallets(prev => prev.map(w => ({ ...w, selected: !allSelected })));
  };

  const removeWallet = (id: string) => {
    setWallets(prev => prev.filter(w => w.id !== id));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Connect Web3 Provider (MetaMask/OKX)
  const connectInjected = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('未检测到浏览器 Web3 钱包插件 (如 MetaMask, OKX, Rabby)。请安装或使用私钥导入功能。');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) return;

      const address = accounts[0];
      const balance = await provider.getBalance(address);

      if (wallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
        alert('该插件钱包已存在于列表中');
        return;
      }

      const newWallet: WalletAccount = {
        id: `injected-${Date.now()}`,
        address,
        type: 'injected',
        balanceWei: balance.toString(),
        balanceFormatted: ethers.formatEther(balance).substring(0, 7),
        status: 'idle',
        selected: true,
      };

      setWallets(prev => [newWallet, ...prev]);
    } catch (err: any) {
      alert(`连接浏览器钱包失败: ${err?.message || err}`);
    }
  };

  // Generate ephemeral test wallet
  const generateRandomWallet = () => {
    const random = ethers.Wallet.createRandom();
    const newWallet: WalletAccount = {
      id: `gen-${Date.now()}`,
      address: random.address,
      privateKey: random.privateKey,
      type: 'generated',
      balanceWei: '0',
      balanceFormatted: '0',
      status: 'idle',
      selected: true,
    };
    setWallets(prev => [newWallet, ...prev]);
  };

  // Handle batch private key import
  const handleImportPrivateKeys = () => {
    setImportError(null);
    const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) {
      setImportError('请输入至少一个私钥');
      return;
    }

    const imported: WalletAccount[] = [];
    for (let i = 0; i < lines.length; i++) {
      let key = lines[i];
      if (!key.startsWith('0x')) {
        key = '0x' + key;
      }

      try {
        const w = new ethers.Wallet(key);
        if (!wallets.some(existing => existing.address.toLowerCase() === w.address.toLowerCase()) &&
            !imported.some(existing => existing.address.toLowerCase() === w.address.toLowerCase())) {
          imported.push({
            id: `pk-${Date.now()}-${i}`,
            address: w.address,
            privateKey: key,
            type: 'private_key',
            balanceWei: '0',
            balanceFormatted: '查询中...',
            status: 'idle',
            selected: true,
          });
        }
      } catch {
        setImportError(`第 ${i + 1} 行私钥格式不正确，必须为 64 位十六进制字符`);
        return;
      }
    }

    if (imported.length === 0) {
      setImportError('所输入的钱包均已存在于列表中');
      return;
    }

    setWallets(prev => [...prev, ...imported]);
    setImportText('');
    setShowImportModal(false);
    
    setTimeout(() => {
      onRefreshBalances();
    }, 100);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3.5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>钱包管理 & EIP-1559 费率</span>
            </h2>
          </div>
        </div>
        <span className="text-xs bg-slate-800 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
          已选 {selectedCount} / {wallets.length}
        </span>
      </div>

      {/* Part 1: EIP-1559 链上手续费 (原上面第 2 个) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            <span>EIP-1559 链上手续费 (Gas 手动设置)</span>
          </div>

          {/* Presets Button Group */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-0.5">
            {[
              { id: 'standard', label: '标准' },
              { id: 'fast', label: '极速' },
              { id: 'sniper', label: '抢跑' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as GasPreset)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  gasConfig.preset === p.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Gas Inputs Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Priority Fee */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span>小费 (Tip)</span>
              <span className="text-[9px] text-emerald-400 font-mono">Priority</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="gas-priority-fee-input"
                type="number"
                step={isL2 ? '0.001' : '0.1'}
                min="0.0001"
                value={gasConfig.maxPriorityFeePerGasGwei}
                onChange={(e) => handlePriorityFeeChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[9px] text-slate-500 font-mono shrink-0">G</span>
            </div>
          </div>

          {/* Max Fee */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span>上限 (Max)</span>
              <span className="text-[9px] text-cyan-400 font-mono">Base+Tip</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="gas-max-fee-input"
                type="number"
                step={isL2 ? '0.01' : '1'}
                min="0.001"
                value={gasConfig.maxFeePerGasGwei}
                onChange={(e) => handleMaxFeeChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[9px] text-slate-500 font-mono shrink-0">G</span>
            </div>
          </div>

          {/* Gas Limit Buffer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
              <span>限制倍率</span>
              <span className="text-[9px] text-amber-400 font-mono">Buffer</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                id="gas-limit-multiplier-input"
                type="number"
                step="0.05"
                min="1.0"
                max="3.0"
                value={gasConfig.gasLimitMultiplier || 1.2}
                onChange={(e) => handleGasMultiplierChange(parseFloat(e.target.value) || 1.2)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500"
              />
              <span className="text-[9px] text-slate-500 font-mono shrink-0">x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: 钱包工具栏 (Actions Toolbar) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded border border-slate-700/80 flex items-center gap-1 transition-colors"
          >
            {wallets.length > 0 && wallets.every(w => w.selected) ? (
              <>
                <CheckSquare className="w-3 h-3 text-emerald-400" />
                <span>全不选</span>
              </>
            ) : (
              <>
                <Square className="w-3 h-3" />
                <span>全选</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRefreshBalances}
            disabled={isRefreshing}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded border border-slate-700/80 flex items-center gap-1 transition-colors"
            title="刷新钱包余额"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>刷新余额</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onOpenSweepModal && (
            <button
              type="button"
              id="wallet-sweep-nft-btn"
              onClick={onOpenSweepModal}
              className="px-2.5 py-1 text-[11px] font-bold text-purple-200 bg-purple-950/70 hover:bg-purple-900 border border-purple-800/60 rounded flex items-center gap-1 transition-colors shadow-sm"
              title="扫描所有小钱包中的 NFT 并一键批量归集转账到主钱包"
            >
              <Send className="w-3 h-3 text-purple-400" />
              <span>批量归集 NFT</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>导入私钥</span>
          </button>
        </div>
      </div>

      {/* Part 3: 钱包列表 (Scrollable List) */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[360px] min-h-[160px] custom-scrollbar">
        {wallets.length === 0 ? (
          <div className="h-44 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <Wallet className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium text-slate-400">尚未添加任何钱包</p>
            <p className="text-[11px] text-slate-500 mt-1">
              点击上方【导入私钥】批量添加抢购小钱包
            </p>
          </div>
        ) : (
          wallets.map((wallet, index) => {
            const hasSufficient = parseFloat(wallet.balanceFormatted) > 0.0001;
            return (
              <div
                key={wallet.id}
                className={`p-2 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 ${
                  wallet.selected
                    ? 'bg-slate-950/80 border-slate-700/80 shadow-sm'
                    : 'bg-slate-950/30 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Left: Checkbox & Index & Address */}
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={wallet.selected}
                    onChange={() => toggleSelect(wallet.id)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500 w-4 text-center shrink-0">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1 truncate">
                    <span className="font-mono text-slate-200 text-xs truncate">
                      {formatAddress(wallet.address)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(wallet.address, wallet.id)}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                      title="复制地址"
                    >
                      {copiedId === wallet.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {chain.blockExplorer && (
                      <a
                        href={`${chain.blockExplorer}/address/${wallet.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-cyan-400 p-0.5"
                        title="在区块浏览器中查看"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right: Balance & Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-xs ${
                        hasSufficient ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {wallet.balanceFormatted}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1 font-mono">
                      {chain.nativeSymbol}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWallet(wallet.id)}
                    className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                    title="移除此钱包"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">批量导入抢购钱包私钥</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">
                粘贴私钥 (每行一个，支持带或不带 0x):
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="0x4f3edf983ac636a65a842ce7c78d5aa706d3b113bce9c46f30d7d21715b23b1d&#10;6c838706670d955d2041ec1ec2b25a3b5e460d4d73a504a14483a37e1a686397"
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>私钥仅保存在您本地浏览器内存中，绝不上报服务器。</span>
              </p>
            </div>

            {importError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generateRandomWallet}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  生成临时测试钱包
                </button>
                <button
                  type="button"
                  onClick={connectInjected}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  连接 Web3 插件
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImportPrivateKeys}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950"
                >
                  确认导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
