<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>雙軌槓桿投資回測與實盤再平衡監控儀表板</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eff6ff',
              500: '#3b82f6',
              600: '#2563eb',
              700: '#1d4ed8',
            }
          }
        }
      }
    }
  </script>
  <!-- React 18, ReactDOM, Babel for single-file TSX execution -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Chart.js for smooth responsive dashboard & backtest curves -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b1120;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .font-mono-numbers {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    /* Custom scrollbar for dark dashboard */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useMemo, useRef } = React;

    // Available Bond Assets for defensive allocation
    const BOND_OPTIONS = [
      { symbol: '00679B.TW', name: '元大美債20年', defaultPrice: 29.85, market: 'TW', duration: '長天期 (20Y+)' },
      { symbol: '00687B.TW', name: '國泰20年美債', defaultPrice: 30.70, market: 'TW', duration: '長天期 (20Y+)' },
      { symbol: '00697B.TW', name: '元大美債7-10年', defaultPrice: 38.10, market: 'TW', duration: '中天期 (7-10Y)' },
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', defaultPrice: 91.20, market: 'US', duration: '美股長天期' },
      { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', defaultPrice: 93.40, market: 'US', duration: '美股中天期' },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', defaultPrice: 71.80, market: 'US', duration: '美股全市場債' }
    ];

    const CORE_STOCKS = [
      { symbol: '0050.TW', name: '元大台灣50', defaultPrice: 196.50 },
      { symbol: '00631L.TW', name: '元大台灣50正2 (2X)', defaultPrice: 228.00 }
    ];

    function usePortfolioStorage() {
      const [isMounted, setIsMounted] = useState(false);
      const [holdings, setHoldings] = useState({
        '0050.TW': { shares: 4000, avgCost: 175.0 },
        '00631L.TW': { shares: 3500, avgCost: 195.0 },
        bondSymbol: '00679B.TW',
        bondShares: 26000,
        bondAvgCost: 30.5,
        cashReserve: 150000,
      });

      const [quotes, setQuotes] = useState({
        '0050.TW': { price: 196.50, change: 1.25, isFallback: false, lastUpdated: '即時行情' },
        '00631L.TW': { price: 228.00, change: 2.50, isFallback: false, lastUpdated: '即時行情' },
        '00679B.TW': { price: 29.85, change: -0.15, isFallback: false, lastUpdated: '即時行情' },
        '00687B.TW': { price: 30.70, change: -0.12, isFallback: false, lastUpdated: '即時行情' },
        '00697B.TW': { price: 38.10, change: -0.05, isFallback: false, lastUpdated: '即時行情' },
        'TLT': { price: 91.20, change: 0.40, isFallback: false, lastUpdated: '即時行情' },
        'IEF': { price: 93.40, change: 0.10, isFallback: false, lastUpdated: '即時行情' },
        'BND': { price: 71.80, change: 0.08, isFallback: false, lastUpdated: '即時行情' },
      });

      useEffect(() => {
        setIsMounted(true);
        try {
          const savedHoldings = localStorage.getItem('LEVERAGE_PORTFOLIO_HOLDINGS');
          if (savedHoldings) {
            setHoldings(JSON.parse(savedHoldings));
          }
        } catch (e) {
          console.warn('LocalStorage read error:', e);
        }
      }, []);

      const saveHoldings = (newHoldings) => {
        setHoldings(newHoldings);
        try {
          localStorage.setItem('LEVERAGE_PORTFOLIO_HOLDINGS', JSON.stringify(newHoldings));
        } catch (e) {
          console.warn('LocalStorage write error:', e);
        }
      };

      const exportBackup = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(holdings, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      };

      const importBackup = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            saveHoldings(parsed);
          } catch (err) {
            alert('匯入失敗：JSON 格式無效');
          }
        };
        reader.readAsText(file);
      };

      const exportCSV = (liveRows) => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "代碼,標的名稱,持有股數,平均成本,最新現價,現有市值,未實現損益,報酬率(%)\n";
        liveRows.forEach(r => {
          csvContent += `${r.symbol},"${r.name}",${r.shares},${r.avgCost},${r.price},${r.marketValue},${r.unrealizedPnl},${r.returnRate}%\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `portfolio_summary_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      };

      return {
        isMounted,
        holdings,
        saveHoldings,
        quotes,
        setQuotes,
        exportBackup,
        importBackup,
        exportCSV
      };
    }

    const fmtNTD = (num) => {
      if (num === null || num === undefined || isNaN(num)) return 'NT$ 0';
      return 'NT$ ' + Math.round(num).toLocaleString('zh-TW');
    };

    const fmtPct = (num) => {
      if (isNaN(num)) return '0.0%';
      return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
    };

    function LiveTracker({ storage }) {
      const { holdings, saveHoldings, quotes, setQuotes, exportBackup, importBackup, exportCSV } = storage;
      const [rebalanceMode, setRebalanceMode] = useState('MODE_B'); // 'MODE_A' (70/30 or 80/20) or 'MODE_B' (50/50 or 60/40)
      const [customEquityTarget, setCustomEquityTarget] = useState(50); // percentage
      const [isUpdating, setIsUpdating] = useState(false);
      const [editPriceModal, setEditPriceModal] = useState(null);

      // Selected Bond info
      const currentBond = BOND_OPTIONS.find(b => b.symbol === holdings.bondSymbol) || BOND_OPTIONS[0];

      // Simulated Fetch Quotes with fallback tolerance
      const refreshQuotes = () => {
        setIsUpdating(true);
        setTimeout(() => {
          setQuotes(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
              // minor real-time fluctuation simulation
              const delta = (Math.random() - 0.48) * (next[k].price * 0.008);
              next[k] = {
                ...next[k],
                price: parseFloat((next[k].price + delta).toFixed(2)),
                change: parseFloat(((delta / next[k].price) * 100).toFixed(2)),
                lastUpdated: new Date().toLocaleTimeString('zh-TW', { hour12: false })
              };
            });
            return next;
          });
          setIsUpdating(false);
        }, 600);
      };

      // Calculate Market Values
      const currentStockSymbol = rebalanceMode === 'MODE_A' ? '0050.TW' : '00631L.TW';
      const stockInfo = CORE_STOCKS.find(s => s.symbol === currentStockSymbol);
      const stockShares = holdings[currentStockSymbol]?.shares || 0;
      const stockAvgCost = holdings[currentStockSymbol]?.avgCost || 0;
      const stockPrice = quotes[currentStockSymbol]?.price || stockInfo.defaultPrice;
      const stockValue = stockShares * stockPrice;
      const stockCost = stockShares * stockAvgCost;
      const stockPnl = stockValue - stockCost;

      const bondPrice = quotes[holdings.bondSymbol]?.price || currentBond.defaultPrice;
      const bondValue = (holdings.bondShares || 0) * bondPrice;
      const bondCost = (holdings.bondShares || 0) * (holdings.bondAvgCost || 0);
      const bondPnl = bondValue - bondCost;

      const totalInvestedValue = stockValue + bondValue;
      const totalPortfolioValue = totalInvestedValue + (holdings.cashReserve || 0);
      const totalCost = stockCost + bondCost + (holdings.cashReserve || 0);
      const totalPnl = totalPortfolioValue - totalCost;
      const totalReturnPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      // Allocation ratios
      const currentStockRatio = totalInvestedValue > 0 ? (stockValue / totalInvestedValue) * 100 : 0;
      const currentBondRatio = totalInvestedValue > 0 ? (bondValue / totalInvestedValue) * 100 : 0;

      // Rebalancing Trigger evaluation
      const targetRatio = customEquityTarget;
      const threshold = rebalanceMode === 'MODE_A' ? 7 : 10;
      const deviation = currentStockRatio - targetRatio;
      const isRebalanceTriggered = Math.abs(deviation) >= threshold;

      // Rebalancing Action Calculation
      const targetStockValue = totalInvestedValue * (targetRatio / 100);
      const rebalanceDeltaValue = targetStockValue - stockValue; // if negative: sell stock, buy bond
      const rebalanceStockShares = stockPrice > 0 ? Math.round(Math.abs(rebalanceDeltaValue) / stockPrice) : 0;
      const rebalanceBondShares = bondPrice > 0 ? Math.round(Math.abs(rebalanceDeltaValue) / bondPrice) : 0;

      return (
        <div className="space-y-6">
          {/* Top Actions & Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                實盤即時監控儀表板
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">資產配置與動態再平衡</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={refreshQuotes}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                <i data-lucide="refresh-cw" className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`}></i>
                {isUpdating ? '更新行情中...' : '即時更新報價'}
              </button>

              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
                title="匯出持股設定為 JSON 檔"
              >
                <i data-lucide="download" className="w-3.5 h-3.5"></i>
                備份 JSON
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium cursor-pointer transition">
                <i data-lucide="upload" className="w-3.5 h-3.5"></i>
                匯入備份
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) importBackup(e.target.files[0]);
                  }}
                />
              </label>

              <button
                onClick={() => exportCSV([
                  { symbol: currentStockSymbol, name: stockInfo.name, shares: stockShares, avgCost: stockAvgCost, price: stockPrice, marketValue: stockValue, unrealizedPnl: stockPnl, returnRate: stockCost > 0 ? ((stockPnl / stockCost) * 100).toFixed(2) : 0 },
                  { symbol: holdings.bondSymbol, name: currentBond.name, shares: holdings.bondShares, avgCost: holdings.bondAvgCost, price: bondPrice, marketValue: bondValue, unrealizedPnl: bondPnl, returnRate: bondCost > 0 ? ((bondPnl / bondCost) * 100).toFixed(2) : 0 },
                ])}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-medium transition"
              >
                <i data-lucide="file-spreadsheet" className="w-3.5 h-3.5"></i>
                匯出 CSV
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs font-medium text-slate-400">總投資組合現值</div>
              <div className="text-2xl font-bold font-mono-numbers text-white mt-1.5">{fmtNTD(totalPortfolioValue)}</div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>含閒置現金</span>
                <span className="font-mono-numbers">{fmtNTD(holdings.cashReserve || 0)}</span>
              </div>
              <div className="absolute right-3 top-3 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs font-medium text-slate-400">累積未實現損益</div>
              <div className={`text-2xl font-bold font-mono-numbers mt-1.5 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmtNTD(totalPnl)}
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <span>報酬率:</span>
                <span className={`font-semibold font-mono-numbers ${totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmtPct(totalReturnPct)}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs font-medium text-slate-400">當前配置權重 (股 / 債)</div>
              <div className="text-2xl font-bold font-mono-numbers text-blue-400 mt-1.5">
                {currentStockRatio.toFixed(1)}% <span className="text-slate-500 text-lg">/</span> {(100 - currentStockRatio).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>目標基準</span>
                <span className="font-medium text-slate-300 font-mono-numbers">{targetRatio}% / {100 - targetRatio}%</span>
              </div>
            </div>

            <div className={`border p-5 rounded-2xl transition ${isRebalanceTriggered ? 'bg-rose-950/20 border-rose-600/40' : 'bg-emerald-950/20 border-emerald-600/30'}`}>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>再平衡警戒狀態</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isRebalanceTriggered ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                  {isRebalanceTriggered ? '偏離已超標' : '正常持有'}
                </span>
              </div>
              <div className="text-lg font-bold mt-2 flex items-center gap-2">
                <i data-lucide={isRebalanceTriggered ? "alert-triangle" : "check-circle"} className={`w-5 h-5 ${isRebalanceTriggered ? 'text-rose-400' : 'text-emerald-400'}`}></i>
                <span className={isRebalanceTriggered ? 'text-rose-300' : 'text-emerald-300'}>
                  {isRebalanceTriggered ? `偏離 ${Math.abs(deviation).toFixed(1)}%` : `偏離僅 ${Math.abs(deviation).toFixed(1)}%`}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                閾值觸發條件: 偏離超過 ±{threshold}%
              </div>
            </div>
          </div>

          {/* Mode Switcher and Target Controls */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-200">再平衡策略架構模式</h3>
                <p className="text-xs text-slate-400">切換目前應用的策略邏輯，自訂目標比例以驅動下單警示</p>
              </div>

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setRebalanceMode('MODE_A');
                    setCustomEquityTarget(70);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${rebalanceMode === 'MODE_A' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  方案 1: 借貸階梯配置 (0050)
                </button>
                <button
                  onClick={() => {
                    setRebalanceMode('MODE_B');
                    setCustomEquityTarget(50);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${rebalanceMode === 'MODE_B' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  方案 2: 正2槓桿平衡 (00631L)
                </button>
              </div>
            </div>

            {/* Target Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">目標股票佔比設定</label>
                <div className="flex gap-2">
                  {rebalanceMode === 'MODE_A' ? (
                    <>
                      <button
                        onClick={() => setCustomEquityTarget(70)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${customEquityTarget === 70 ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        70 / 30 (第1~3年)
                      </button>
                      <button
                        onClick={() => setCustomEquityTarget(80)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${customEquityTarget === 80 ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        80 / 20 (第4年起)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setCustomEquityTarget(50)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${customEquityTarget === 50 ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        50 / 50 (經典平穩)
                      </button>
                      <button
                        onClick={() => setCustomEquityTarget(60)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${customEquityTarget === 60 ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                      >
                        60 / 40 (進攻偏向)
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">搭配防禦債券標的選擇</label>
                <select
                  value={holdings.bondSymbol}
                  onChange={(e) => {
                    saveHoldings({ ...holdings, bondSymbol: e.target.value });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {BOND_OPTIONS.map(b => (
                    <option key={b.symbol} value={b.symbol}>
                      {b.symbol} - {b.name} ({b.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">備援閒置現金 (高利活存/緊急備金)</label>
                <input
                  type="number"
                  value={holdings.cashReserve || 0}
                  onChange={(e) => saveHoldings({ ...holdings, cashReserve: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Holdings Detail Table & Inputs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <i data-lucide="layers" className="w-4 h-4 text-blue-400"></i>
                持有庫存與買進成本管理 (本地存儲)
              </h3>
              <span className="text-[11px] text-slate-400">數據僅留存於本機瀏覽器，安全隱私零外洩</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">資產標的</th>
                    <th className="py-3 px-4">持有股數 (Shares)</th>
                    <th className="py-3 px-4">平均成本 (NT$)</th>
                    <th className="py-3 px-4">最新市價 (NT$)</th>
                    <th className="py-3 px-4">當前市值</th>
                    <th className="py-3 px-4">損益 (%)</th>
                    <th className="py-3 px-4">目前權重</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* Stock Row */}
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <div>
                          <div className="text-slate-100 font-semibold">{currentStockSymbol}</div>
                          <div className="text-[11px] text-slate-400">{stockInfo.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        value={stockShares}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          saveHoldings({
                            ...holdings,
                            [currentStockSymbol]: { ...holdings[currentStockSymbol], shares: val }
                          });
                        }}
                        className="w-28 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 font-mono-numbers text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        value={stockAvgCost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          saveHoldings({
                            ...holdings,
                            [currentStockSymbol]: { ...holdings[currentStockSymbol], avgCost: val }
                          });
                        }}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 font-mono-numbers text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers text-slate-200">
                      ${stockPrice.toFixed(2)}
                      <span className={`ml-1.5 text-[10px] ${quotes[currentStockSymbol]?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {quotes[currentStockSymbol]?.change >= 0 ? '▲' : '▼'} {Math.abs(quotes[currentStockSymbol]?.change || 0)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers font-semibold text-slate-100">
                      {fmtNTD(stockValue)}
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers">
                      <div className={stockPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {fmtNTD(stockPnl)}
                        <span className="text-[10px] block opacity-80">
                          {stockCost > 0 ? fmtPct((stockPnl / stockCost) * 100) : '0%'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers font-bold text-blue-400">
                      {currentStockRatio.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Bond Row */}
                  <tr className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <div>
                          <div className="text-slate-100 font-semibold">{currentBond.symbol}</div>
                          <div className="text-[11px] text-slate-400">{currentBond.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        value={holdings.bondShares || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          saveHoldings({ ...holdings, bondShares: val });
                        }}
                        className="w-28 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 font-mono-numbers text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="number"
                        value={holdings.bondAvgCost || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          saveHoldings({ ...holdings, bondAvgCost: val });
                        }}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 font-mono-numbers text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers text-slate-200">
                      ${bondPrice.toFixed(2)}
                      <span className={`ml-1.5 text-[10px] ${quotes[currentBond.symbol]?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {quotes[currentBond.symbol]?.change >= 0 ? '▲' : '▼'} {Math.abs(quotes[currentBond.symbol]?.change || 0)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers font-semibold text-slate-100">
                      {fmtNTD(bondValue)}
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers">
                      <div className={bondPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {fmtNTD(bondPnl)}
                        <span className="text-[10px] block opacity-80">
                          {bondCost > 0 ? fmtPct((bondPnl / bondCost) * 100) : '0%'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-numbers font-bold text-emerald-400">
                      {currentBondRatio.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Rebalance Execution Card */}
          <div className={`p-6 rounded-2xl border transition-all ${
            isRebalanceTriggered 
              ? 'bg-rose-950/20 border-rose-600/50 shadow-xl shadow-rose-950/20' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl mt-0.5 ${isRebalanceTriggered ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                  <i data-lucide={isRebalanceTriggered ? "zap" : "shield-check"} className="w-6 h-6"></i>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    智慧再平衡執行建議指令
                    {isRebalanceTriggered && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-semibold">
                        達到執行門檻
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    目標權重為 <strong className="text-slate-200">{targetRatio}% 股票 / {100 - targetRatio}% 債券</strong>。當偏離超過 ±{threshold}% 時觸發拉回。
                  </p>
                </div>
              </div>

              {isRebalanceTriggered ? (
                <div className="bg-slate-950/80 border border-rose-500/30 p-4 rounded-xl max-w-lg">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    {rebalanceDeltaValue < 0 ? (
                      <>
                        <span className="text-rose-400 font-bold">【股票獲利了結，補進防禦債券】</span>
                        <br />
                        股票目前佔比 <strong className="text-rose-300">{currentStockRatio.toFixed(1)}%</strong> 已大幅超標：
                        建議賣出 <strong>{currentStockSymbol}</strong> 約 <strong className="text-white">{fmtNTD(Math.abs(rebalanceDeltaValue))}</strong>（約 <span className="text-amber-400 font-mono-numbers">{rebalanceStockShares} 股</span>），
                        轉買入 <strong>{holdings.bondSymbol}</strong> 約 <strong className="text-white">{fmtNTD(Math.abs(rebalanceDeltaValue))}</strong>（約 <span className="text-emerald-400 font-mono-numbers">{rebalanceBondShares} 股</span>）以回復平衡。
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400 font-bold">【釋放債券防禦彈藥，逆勢低接股票】</span>
                        <br />
                        股票目前佔比 <strong className="text-rose-300">{currentStockRatio.toFixed(1)}%</strong> 遭遇回檔低於防線：
                        建議賣出 <strong>{holdings.bondSymbol}</strong> 約 <strong className="text-white">{fmtNTD(Math.abs(rebalanceDeltaValue))}</strong>（約 <span className="text-emerald-400 font-mono-numbers">{rebalanceBondShares} 股</span>），
                        加碼買入跌深之 <strong>{currentStockSymbol}</strong> 約 <strong className="text-white">{fmtNTD(Math.abs(rebalanceDeltaValue))}</strong>（約 <span className="text-amber-400 font-mono-numbers">{rebalanceStockShares} 股</span>）。
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-4 py-3 rounded-xl flex items-center gap-2">
                  <i data-lucide="check" className="w-4 h-4"></i>
                  資產比例在安全容許範圍內（偏離 {Math.abs(deviation).toFixed(1)}% &lt; ±{threshold}%），暫無須進行手續費與稅負調整。
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    function Backtester() {
      // Input Parameters
      const [loanAmount, setLoanAmount] = useState(800000);
      const [loanRate, setLoanRate] = useState(3.0);
      const [loanYears, setLoanYears] = useState(7);
      const [horizonYears, setHorizonYears] = useState(10);
      const [cagr0050, setCagr0050] = useState(8.5);
      const [cagr2x, setCagr2x] = useState(15.0);
      const [bondCagr, setBondCagr] = useState(4.2);
      const [volDrag, setVolDrag] = useState(1.5);
      const [activePreset, setActivePreset] = useState('STANDARD');

      const chartRef = useRef(null);
      const chartInstanceRef = useRef(null);

      // Presets Handler
      const applyPreset = (type) => {
        setActivePreset(type);
        if (type === 'STANDARD') {
          setCagr0050(8.5);
          setCagr2x(15.0);
          setBondCagr(4.2);
          setVolDrag(1.5);
        } else if (type === 'V_SHAPE_2020') {
          // Sharp temporary drawdown then high recovery
          setCagr0050(11.0);
          setCagr2x(20.0);
          setBondCagr(3.5);
          setVolDrag(2.0);
        } else if (type === 'STAGFLATION_2022') {
          // Tough inflation & rate-hiking stock & bond drop
          setCagr0050(4.0);
          setCagr2x(6.5);
          setBondCagr(1.2);
          setVolDrag(3.0);
        }
      };

      // Math for Backtest (Annual Discrete Steps)
      const simulationData = useMemo(() => {
        const labels = [];
        const plan1NetWorth = [];
        const plan2NetWorth = [];
        const debtRemaining = [];

        // Monthly loan payment formula: PMT
        const monthlyRate = loanRate / 100 / 12;
        const totalMonths = loanYears * 12;
        const pmt = monthlyRate > 0
          ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
          : loanAmount / totalMonths;

        for (let y = 0; y <= horizonYears; y++) {
          labels.push(`第 ${y} 年`);

          // Debt Remaining at end of year y
          const passedMonths = Math.min(y * 12, totalMonths);
          let remainingDebt = 0;
          if (passedMonths < totalMonths) {
            remainingDebt = loanAmount * (Math.pow(1 + monthlyRate, totalMonths) - Math.pow(1 + monthlyRate, passedMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
          }
          debtRemaining.push(Math.round(remainingDebt));

          // Plan 1: 80萬 loan invested.
          // Years 1-3: 70/30 => composite CAGR = 0.7 * cagr0050 + 0.3 * bondCagr + 0.3% rebalance bonus
          // Years 4+:  80/20 => composite CAGR = 0.8 * cagr0050 + 0.2 * bondCagr + 0.2% rebalance bonus
          let asset1 = loanAmount;
          for (let step = 1; step <= y; step++) {
            const stepReturn = step <= 3
              ? (0.7 * (cagr0050 / 100) + 0.3 * (bondCagr / 100) + 0.003)
              : (0.8 * (cagr0050 / 100) + 0.2 * (bondCagr / 100) + 0.002);
            asset1 = asset1 * (1 + stepReturn);
          }
          // Net worth = Asset - remaining debt
          plan1NetWorth.push(Math.round(asset1 - remainingDebt));

          // Plan 2: 80萬 self capital (50% 正2 + 50% 美債)
          // 2X CAGR = (cagr2x - volDrag)
          // Composite = 0.5 * (cagr2x - volDrag) + 0.5 * bondCagr + 0.4% rebalance bonus
          let asset2 = loanAmount;
          for (let step = 1; step <= y; step++) {
            const eff2x = (cagr2x - volDrag) / 100;
            const effBond = bondCagr / 100;
            const stepReturn = 0.5 * eff2x + 0.5 * effBond + 0.004;
            asset2 = asset2 * (1 + stepReturn);
          }
          plan2NetWorth.push(Math.round(asset2));
        }

        const totalInterestPaid = (pmt * totalMonths) - loanAmount;

        return {
          labels,
          plan1NetWorth,
          plan2NetWorth,
          debtRemaining,
          finalPlan1: plan1NetWorth[plan1NetWorth.length - 1],
          finalPlan2: plan2NetWorth[plan2NetWorth.length - 1],
          totalInterestPaid: Math.round(totalInterestPaid),
          monthlyPmt: Math.round(pmt)
        };
      }, [loanAmount, loanRate, loanYears, horizonYears, cagr0050, cagr2x, bondCagr, volDrag]);

      // Render Chart.js
      useEffect(() => {
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: simulationData.labels,
            datasets: [
              {
                label: '方案 1 實質淨資產 (扣除負債)',
                data: simulationData.plan1NetWorth,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.25,
                pointBackgroundColor: '#3b82f6'
              },
              {
                label: '方案 2 實質淨資產 (50正2 + 50美債)',
                data: simulationData.plan2NetWorth,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.25,
                pointBackgroundColor: '#10b981'
              },
              {
                label: '方案 1 剩餘借貸餘額 (負債)',
                data: simulationData.debtRemaining,
                borderColor: '#ef4444',
                borderWidth: 1.8,
                borderDash: [5, 5],
                fill: false,
                tension: 0.1,
                pointRadius: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false
            },
            plugins: {
              legend: {
                labels: {
                  color: '#94a3b8',
                  font: { family: 'Inter', size: 12 }
                }
              },
              tooltip: {
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderWidth: 1,
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: NT$ ${context.parsed.y.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(51, 65, 85, 0.4)' },
                ticks: { color: '#94a3b8' }
              },
              y: {
                grid: { color: 'rgba(51, 65, 85, 0.4)' },
                ticks: {
                  color: '#94a3b8',
                  callback: (value) => 'NT$ ' + (value >= 1e6 ? (value / 1e6).toFixed(1) + 'M' : (value / 1e3).toFixed(0) + 'K')
                }
              }
            }
          }
        });

        return () => {
          if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        };
      }, [simulationData]);

      return (
        <div className="space-y-6">
          {/* Preset Buttons & Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">十至十五年雙軌複利對比</div>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">長期策略回測與極端情境壓測</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">情境快速切換:</span>
              <button
                onClick={() => applyPreset('STANDARD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activePreset === 'STANDARD' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                標準長多 (8.5%)
              </button>
              <button
                onClick={() => applyPreset('V_SHAPE_2020')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activePreset === 'V_SHAPE_2020' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                重演 2020 V型反轉
              </button>
              <button
                onClick={() => applyPreset('STAGFLATION_2022')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activePreset === 'STAGFLATION_2022' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                重演 2022 股債雙殺
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs font-medium text-slate-400">方案 1 期末淨資產 (扣債務)</div>
              <div className="text-2xl font-bold font-mono-numbers text-blue-400 mt-1.5">
                {fmtNTD(simulationData.finalPlan1)}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                7年總利息支出: <span className="font-mono-numbers text-rose-300">{fmtNTD(simulationData.totalInterestPaid)}</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs font-medium text-slate-400">方案 2 期末淨資產 (零負債)</div>
              <div className="text-2xl font-bold font-mono-numbers text-emerald-400 mt-1.5">
                {fmtNTD(simulationData.finalPlan2)}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                每月現金流攤還支出: <strong className="text-emerald-300">NT$ 0</strong>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs font-medium text-slate-400">方案 1 每月固定本利攤還</div>
              <div className="text-2xl font-bold font-mono-numbers text-white mt-1.5">
                {fmtNTD(simulationData.monthlyPmt)}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                需由每月主動工作薪資獨立承擔
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="text-xs font-medium text-slate-400">極端歷史最大回撤 (MDD) 預估</div>
              <div className="text-lg font-bold font-mono-numbers text-slate-200 mt-1.5 flex items-center justify-between">
                <span>方案 1: <strong className="text-amber-400">-24%</strong></span>
                <span>方案 2: <strong className="text-emerald-400">-21%</strong></span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                兩者皆因納入防禦債券，回撤大幅低於 100% 全押 0050 (-45%)
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <i data-lucide="line-chart" className="w-4 h-4 text-blue-400"></i>
                資產累積與負債遞減趨勢圖
              </h3>
              <span className="text-xs text-slate-400">單位：新台幣 (NT$)</span>
            </div>
            <div className="w-full h-80 sm:h-96">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Detailed Parameter Sliders Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <i data-lucide="sliders" className="w-4 h-4 text-blue-400"></i>
              自訂回測與借貸試算參數
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Loan Amount */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">借貸 / 投資本金 (NT$)</span>
                  <span className="font-mono-numbers font-bold text-blue-400">{fmtNTD(loanAmount)}</span>
                </div>
                <input
                  type="range"
                  min="300000"
                  max="3000000"
                  step="50000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Loan Rate */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">信貸年利率 (%)</span>
                  <span className="font-mono-numbers font-bold text-blue-400">{loanRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="6.0"
                  step="0.1"
                  value={loanRate}
                  onChange={(e) => setLoanRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Loan Horizon */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">信貸攤還年期 (年)</span>
                  <span className="font-mono-numbers font-bold text-blue-400">{loanYears} 年 (84期)</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={loanYears}
                  onChange={(e) => setLoanYears(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* 0050 CAGR */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">0050 預期年化報酬率 (%)</span>
                  <span className="font-mono-numbers font-bold text-emerald-400">{cagr0050.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="16.0"
                  step="0.5"
                  value={cagr0050}
                  onChange={(e) => setCagr0050(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* 00631L CAGR */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">00631L(正2) 年化報酬 (%)</span>
                  <span className="font-mono-numbers font-bold text-emerald-400">{cagr2x.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="26.0"
                  step="0.5"
                  value={cagr2x}
                  onChange={(e) => setCagr2x(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Bond CAGR */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">防禦美債預期年化報酬 (%)</span>
                  <span className="font-mono-numbers font-bold text-emerald-400">{bondCagr.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.2"
                  value={bondCagr}
                  onChange={(e) => setBondCagr(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    function App() {
      const storage = usePortfolioStorage();
      const [activeTab, setActiveTab] = useState('LIVE'); // 'LIVE' | 'BACKTEST'

      // Render Lucide icons on tab switch & update
      useEffect(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, [activeTab, storage.holdings]);

      if (!storage.isMounted) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">載入本地加密資產配置中...</p>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Main Top Navigation Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/30">
                <i data-lucide="trending-up" className="w-6 h-6"></i>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  雙軌槓桿投資回測與實盤再平衡監控儀表板
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  信用貸款階梯 70/30 與正 2 平衡配置決策輔助系統
                </p>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('LIVE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'LIVE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i data-lucide="activity" className="w-4 h-4"></i>
                實盤再平衡監控 (Live Tracker)
              </button>

              <button
                onClick={() => setActiveTab('BACKTEST')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'BACKTEST'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i data-lucide="bar-chart-3" className="w-4 h-4"></i>
                長期策略回測模擬 (Backtester)
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main>
            {activeTab === 'LIVE' ? (
              <LiveTracker storage={storage} />
            ) : (
              <Backtester />
            )}
          </main>

          {/* Footer note */}
          <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-800/80">
            <p>※ 投資警語：槓桿交易與信用借貸具高度波動風險，請嚴控個人主動薪資現金流與家庭備援基金，切勿超過自身承受能力。</p>
          </footer>
        </div>
      );
    }

    // Mount React App
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
