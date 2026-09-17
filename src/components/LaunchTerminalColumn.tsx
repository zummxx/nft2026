import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Clock,
  Square,
  Terminal,
  Filter,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { LogEntry, ChainConfig, PublicDropData, SniperConfig } from '../types';
import { formatAddress } from '../utils/seadrop';

interface LaunchTerminalColumnProps {
  chain: ChainConfig;
  dropData: PublicDropData | null;
  sniperConfig: SniperConfig;
  selectedWalletsCount: number;
  onSimulate: () => void;
  onStartSnipe: () => void;
  onCancelSnipe: () => void;
  isSimulating: boolean;
  isExecuting: boolean;
  isCountdownActive: boolean;
  countdownSeconds: number;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LaunchTerminalColumn: React.FC<LaunchTerminalColumnProps> = ({
  chain,
  dropData,
  sniperConfig,
  selectedWalletsCount,
  onSimulate,
  onStartSnipe,
  onCancelSnipe,
  isSimulating,
  isExecuting,
  isCountdownActive,
  countdownSeconds,
  logs,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const copyAllLogs = () => {
    const text = logs
      .map(
        l =>
          `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.text} ${
            l.txHash ? `(Tx: ${l.txHash})` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return '00:00:00';
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return days > 0 ? `${days}天 ${timeStr}` : timeStr;
  };

  const isReady = Boolean(dropData && dropData.isFetched && selectedWalletsCount > 0);
  const totalQuantity = (sniperConfig.quantityPerWallet || 1) * selectedWalletsCount;
  const singlePrice = dropData ? parseFloat(dropData.mintPriceFormatted) : 0;
  const totalEthCost = (singlePrice * totalQuantity).toFixed(4);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3.5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>模拟发射 & 链上终端</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-400 font-mono">RPC 监听在线</span>
        </div>
      </div>

      {/* Part 1: 发射主控台 (原上面第 3 个 - 统计汇总与操作) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
        {/* Countdown Alert (if armed) */}
        {isCountdownActive && (
          <div className="bg-amber-950/70 border border-amber-500/60 rounded-lg p-2.5 flex items-center justify-between gap-2 text-amber-200 animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <div className="truncate">
                <div className="text-xs font-bold text-white">定时监听已就绪</div>
                <div className="text-[10px] text-amber-300/90 truncate">
                  提前 {sniperConfig.triggerAdvanceMs}ms 瞬间并发广播
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                {formatCountdown(countdownSeconds)}
              </span>
              <button
                type="button"
                onClick={onCancelSnipe}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded transition-colors flex items-center gap-1 shadow-sm"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>中止</span>
              </button>
            </div>
          </div>
        )}

        {/* Target Status Summary */}
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
          <div>
            <span className="text-[10px] text-slate-400">已就绪钱包 / 总份数</span>
            <div className="text-xs font-bold text-white">
              {isReady ? (
                <span>
                  <strong className="text-emerald-400 font-mono">{selectedWalletsCount}</strong> 个钱包 · 共{' '}
                  <strong className="text-emerald-400 font-mono">{totalQuantity}</strong> 份
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">等待读取合约与勾选钱包</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400">预估代币总花费</span>
            <div className="text-xs font-mono font-bold text-emerald-300">
              {isReady ? `${totalEthCost} ${chain.nativeSymbol}` : `0.00 ${chain.nativeSymbol}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Dry Run Button */}
          <button
            id="launch-dry-run-btn"
            type="button"
            onClick={onSimulate}
            disabled={!isReady || isSimulating || isExecuting || isCountdownActive}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 shrink-0"
            title="预估各钱包 nonce 与模拟链上交易"
          >
            {isSimulating ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>模拟校验</span>
          </button>

          {/* Main Action Button */}
          {isCountdownActive ? (
            <button
              id="launch-cancel-snipe-btn"
              type="button"
              onClick={onCancelSnipe}
              className="grow py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-950"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>中止定时抢购</span>
            </button>
          ) : (
            <button
              id="launch-start-snipe-btn"
              type="button"
              onClick={onStartSnipe}
              disabled={!isReady || isExecuting || isSimulating}
              className={`grow py-2 text-white text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                !isReady
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : sniperConfig.mode === 'scheduled'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/60'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60 animate-pulse'
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>并发广播中...</span>
                </>
              ) : sniperConfig.mode === 'scheduled' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-200" />
                  <span>启动定时抢购</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>一键并发发射 (Fire)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Part 2: 链上实时终端日志 (TerminalLogs) */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-inner flex-1 flex flex-col font-mono min-h-[260px] max-h-[440px]">
        {/* Terminal Titlebar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 mr-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-semibold text-xs">执行终端</span>
            <span className="text-[10px] text-slate-500">[{filteredLogs.length}]</span>
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-[10px]">
              {['all', 'sniper', 'success', 'error'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-1 py-0.5 rounded transition-colors ${
                    filter === f
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f === 'all' ? '全' : f === 'sniper' ? '抢' : f === 'success' ? '成' : '错'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={copyAllLogs}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="复制全部日志"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={onClearLogs}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="清空终端"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-2.5 flex-1 overflow-y-auto space-y-1 text-xs text-slate-300 custom-scrollbar select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 italic py-10 text-center text-xs">
              暂无日志输出。准备就绪后点击「模拟校验」或「一键并发发射」开始执行。
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="leading-relaxed flex items-start gap-1.5 hover:bg-slate-900/40 px-1 rounded text-xs">
                <span className="text-slate-600 shrink-0 text-[10px] pt-0.5 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>

                <span
                  className={`text-[9px] px-1 py-0.2 rounded shrink-0 font-bold ${
                    log.level === 'success'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                      : log.level === 'error'
                      ? 'bg-red-950/80 text-red-400 border border-red-800/40'
                      : log.level === 'sniper'
                      ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40'
                      : log.level === 'warn'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.level.toUpperCase()}
                </span>

                <div className="break-all flex-1 min-w-0">
                  <span className="text-slate-200">{log.text}</span>
                  {log.walletAddress && (
                    <span className="ml-1 text-[11px] text-slate-400 bg-slate-900 px-1 py-0.2 rounded">
                      [{formatAddress(log.walletAddress)}]
                    </span>
                  )}
                  {log.txHash && chain.blockExplorer && (
                    <a
                      href={`${chain.blockExplorer}/tx/${log.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1.5 text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-0.5 text-[11px]"
                    >
                      <span>查看交易</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
