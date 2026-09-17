import React from 'react';
import {
  Search,
  ExternalLink,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Flame,
  Sparkles,
  Copy,
  Check,
  Clipboard,
  Zap,
  Calendar,
  Layers,
  Sliders,
  X
} from 'lucide-react';
import { ChainConfig, PublicDropData, SniperConfig } from '../types';
import { DEMO_CONTRACTS } from '../constants/chains';
import { formatAddress } from '../utils/seadrop';

interface ContractSniperColumnProps {
  contractAddress: string;
  setContractAddress: (addr: string) => void;
  onFetchDrop: () => void;
  isLoading: boolean;
  dropData: PublicDropData | null;
  nftName: string;
  nftSymbol: string;
  chain: ChainConfig;
  onApplyScheduleTime: (startTime: number) => void;
  error?: string | null;
  sniperConfig: SniperConfig;
  setSniperConfig: React.Dispatch<React.SetStateAction<SniperConfig>>;
}

export const ContractSniperColumn: React.FC<ContractSniperColumnProps> = ({
  contractAddress,
  setContractAddress,
  onFetchDrop,
  isLoading,
  dropData,
  nftName,
  nftSymbol,
  chain,
  onApplyScheduleTime,
  error,
  sniperConfig,
  setSniperConfig,
}) => {
  const [copiedFee, setCopiedFee] = React.useState(false);
  const [localDateTime, setLocalDateTime] = React.useState(() => {
    if (sniperConfig.targetTimestamp > 0) {
      const d = new Date(sniperConfig.targetTimestamp * 1000);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }
    return '';
  });

  React.useEffect(() => {
    if (sniperConfig.targetTimestamp > 0) {
      const d = new Date(sniperConfig.targetTimestamp * 1000);
      setLocalDateTime(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19));
    }
  }, [sniperConfig.targetTimestamp]);

  // 当合约读取出单钱包上限时，自动填入单包张数
  React.useEffect(() => {
    if (dropData?.maxTotalMintableByWallet && dropData.maxTotalMintableByWallet > 0) {
      setSniperConfig(prev => ({
        ...prev,
        quantityPerWallet: dropData.maxTotalMintableByWallet
      }));
    }
  }, [dropData?.maxTotalMintableByWallet, setSniperConfig]);

  const handleDateTimeChange = (val: string) => {
    setLocalDateTime(val);
    if (!val) {
      setSniperConfig(prev => ({ ...prev, targetTimestamp: 0 }));
      return;
    }
    const d = new Date(val);
    const ts = Math.floor(d.getTime() / 1000);
    setSniperConfig(prev => ({ ...prev, targetTimestamp: ts }));
  };

  const handlePasteContract = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setContractAddress(text.trim());
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const copyFeeRecipient = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedFee(true);
    setTimeout(() => setCopiedFee(false), 1800);
  };

  const formatTimestamp = (ts: number) => {
    if (!ts || ts === 0) return '未设置 / 永久有效';
    const date = new Date(ts * 1000);
    const dateStr = date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const diff = ts - nowSec;
    if (diff > 0) {
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      let relative = '';
      if (days > 0) {
        relative = `${days}天${hours}h后`;
      } else if (hours > 0) {
        relative = `${hours}h${mins}m后`;
      } else {
        relative = `${mins}m${secs}s后`;
      }
      return `${dateStr} (${relative})`;
    } else {
      return `${dateStr} (已开启)`;
    }
  };

  const demoContracts = DEMO_CONTRACTS.filter(c => c.chainId === chain.id || chain.isTestnet);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>抢购模式 & 合约解析</span>
            </h2>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
          {chain.nameZh || chain.name}
        </span>
      </div>

      {/* Part 1: 抢购模式与参数设置 (置顶与中栏Gas/右栏发射台对齐) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>抢购模式与参数设置</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {sniperConfig.mode === 'instant' ? '⚡ 立即模式' : '⏳ 定时狙击'}
          </span>
        </div>

        {/* Mode Toggle & Quantity */}
        <div className="grid grid-cols-2 gap-2">
          {/* Mode Switch */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSniperConfig(prev => ({ ...prev, mode: 'instant' }))}
              className={`flex-1 py-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                sniperConfig.mode === 'instant'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>立即开火</span>
            </button>
            <button
              type="button"
              onClick={() => setSniperConfig(prev => ({ ...prev, mode: 'scheduled' }))}
              className={`flex-1 py-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                sniperConfig.mode === 'scheduled'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>定时抢购</span>
            </button>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-400">单包张数:</span>
              {dropData && dropData.maxTotalMintableByWallet > 0 && (
                <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/50" title="已自动读取并同步合约单钱包限额">
                  上限{dropData.maxTotalMintableByWallet}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                id="sniper-quantity-input"
                type="number"
                min="1"
                max={dropData?.maxTotalMintableByWallet || 100}
                value={sniperConfig.quantityPerWallet}
                onChange={(e) => setSniperConfig(prev => ({
                  ...prev,
                  quantityPerWallet: Math.max(1, parseInt(e.target.value) || 1)
                }))}
                className="w-10 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs font-mono text-white text-center font-bold"
              />
              <div className="flex gap-0.5">
                {dropData && dropData.maxTotalMintableByWallet > 0 ? (
                  <>
                    {dropData.maxTotalMintableByWallet > 1 && (
                      <button
                        type="button"
                        onClick={() => setSniperConfig(prev => ({ ...prev, quantityPerWallet: 1 }))}
                        className={`px-1 py-0.5 text-[10px] rounded font-medium transition-colors ${
                          sniperConfig.quantityPerWallet === 1
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSniperConfig(prev => ({ ...prev, quantityPerWallet: dropData.maxTotalMintableByWallet }))}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-all ${
                        sniperConfig.quantityPerWallet === dropData.maxTotalMintableByWallet
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:text-white'
                      }`}
                      title={`填入单钱包最大上限: ${dropData.maxTotalMintableByWallet}`}
                    >
                      MAX
                    </button>
                  </>
                ) : (
                  [1, 2, 3].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSniperConfig(prev => ({ ...prev, quantityPerWallet: q }))}
                      className={`px-1 py-0.5 text-[10px] rounded font-medium ${
                        sniperConfig.quantityPerWallet === q
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* If Scheduled Mode: Show Datetime & Advance ms */}
        {sniperConfig.mode === 'scheduled' && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">目标开售时间:</span>
                {dropData?.startTime && dropData.startTime > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSniperConfig(prev => ({ ...prev, targetTimestamp: dropData.startTime }));
                    }}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>对齐链上开售时间</span>
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                step="1"
                value={localDateTime}
                onChange={(e) => handleDateTimeChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 text-[11px]">提前广播量 (毫秒):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="3000"
                  step="50"
                  value={sniperConfig.triggerAdvanceMs}
                  onChange={(e) => setSniperConfig(prev => ({ ...prev, triggerAdvanceMs: Number(e.target.value) || 0 }))}
                  className="w-16 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono text-amber-400 text-center font-bold"
                />
                <span className="text-[10px] text-slate-400">ms</span>
              </div>
            </div>

            {/* Countdown or status preview */}
            {sniperConfig.targetTimestamp > 0 && (
              <div className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded p-1.5 font-mono">
                {(() => {
                  const nowSec = Math.floor(Date.now() / 1000);
                  const diff = sniperConfig.targetTimestamp - nowSec;
                  if (diff > 0) {
                    const days = Math.floor(diff / 86400);
                    const hours = Math.floor((diff % 86400) / 3600);
                    const mins = Math.floor((diff % 3600) / 60);
                    const secs = diff % 60;
                    const dStr = days > 0 ? `${days}天 ` : '';
                    return `⏳ 距开售还剩: ${dStr}${hours}小时${mins}分${secs}秒`;
                  } else {
                    return `⚡ 目标时间已到，点击开火将直接发起铸造交易`;
                  }
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Part 2: NFT 合约输入 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <label className="text-slate-300 font-semibold flex items-center gap-1">
            <span>NFT 合约地址 (ERC-721 / SeaDrop)</span>
          </label>
          <div className="flex items-center gap-2">
            {contractAddress && (
              <button
                type="button"
                id="clear-contract-address-btn"
                onClick={() => setContractAddress('')}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-0.5 text-[11px] transition-colors"
                title="清空合约地址"
              >
                <X className="w-3 h-3" />
                <span>清除</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePasteContract}
              className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 text-[11px] transition-colors"
            >
              <Clipboard className="w-3 h-3" />
              <span>粘贴地址</span>
            </button>
          </div>
        </div>

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              id="contract-address-input"
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x... (NFT 合约地址)"
              className={`w-full bg-slate-950 border border-slate-700 rounded-lg pl-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono ${contractAddress ? 'pr-7' : 'pr-2.5'}`}
            />
            {contractAddress && (
              <button
                type="button"
                onClick={() => setContractAddress('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="清除输入"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            id="fetch-contract-btn"
            onClick={onFetchDrop}
            disabled={isLoading || !contractAddress}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-sm"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>读取</span>
          </button>
        </div>

        {/* Quick Demo Contracts */}
        {demoContracts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] text-slate-500">快捷预设:</span>
            {demoContracts.map((demo) => (
              <button
                key={demo.address}
                type="button"
                onClick={() => {
                  setContractAddress(demo.address);
                  setTimeout(onFetchDrop, 50);
                }}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  contractAddress.toLowerCase() === demo.address.toLowerCase()
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {demo.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contract Error */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-[11px]">{error}</div>
          </div>
        </div>
      )}

      {/* Part 3: Drop Details Card */}
      {dropData && dropData.isFetched ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
          {/* NFT Title & Explorer link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-white truncate text-xs">
                {nftName || dropData.name || 'NFT Collection'}
              </span>
              {(nftSymbol || dropData.symbol) && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                  {nftSymbol || dropData.symbol}
                </span>
              )}
            </div>
            {chain.blockExplorer && (
              <a
                href={`${chain.blockExplorer}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-400 text-[10px] flex items-center gap-0.5 font-mono"
              >
                <span>{formatAddress(contractAddress)}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-900/80 border border-slate-800 rounded p-1.5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400">铸造单价</span>
              <div className="font-bold text-emerald-400 font-mono text-xs flex items-baseline gap-1">
                <span>{dropData.mintPriceFormatted}</span>
                <span className="text-[9px] text-slate-400">{chain.nativeSymbol}</span>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded p-1.5 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400">单钱包上限</span>
              <div className="font-bold text-cyan-400 font-mono text-xs">
                {dropData.maxTotalMintableByWallet > 0 ? `${dropData.maxTotalMintableByWallet} 份` : '无限制'}
              </div>
            </div>
          </div>

          {/* Phase & Time Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded p-1.5 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">开售时间:</span>
              <span className="font-mono text-white text-[11px]">
                {formatTimestamp(dropData.startTime)}
              </span>
            </div>
            {dropData.startTime > 0 && (
              <button
                type="button"
                onClick={() => {
                  onApplyScheduleTime(dropData.startTime);
                  setSniperConfig(prev => ({ ...prev, mode: 'scheduled', targetTimestamp: dropData.startTime }));
                }}
                className="w-full py-0.5 text-[10px] rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 transition-colors flex items-center justify-center gap-1 font-medium"
              >
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>一键同步为抢购目标时间</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-lg p-3 text-center text-slate-500 text-xs">
          输入合约地址点击【读取】，自动解析价格、开售时间与单钱包限额
        </div>
      )}
    </div>
  );
};
