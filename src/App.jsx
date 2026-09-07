import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Upload,
  Layers,
  Award,
  Wallet,
  Info,
  CheckCircle2,
  ArrowUpRight,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Building2,
  X,
  AlertCircle
} from 'lucide-react';

const AUTO_CLASSIFICATION = {
  // 大盤原型 (Core)
  '0050': { type: 'core', name: '元大台灣50', market: 'TWD', queryTicker: '0050.TW' },
  '006208': { type: 'core', name: '富邦台50', market: 'TWD', queryTicker: '006208.TW' },
  'VOO': { type: 'core', name: 'Vanguard S&P 500 ETF', market: 'USD', queryTicker: 'VOO' },
  'SPY': { type: 'core', name: 'SPDR S&P 500 ETF', market: 'USD', queryTicker: 'SPY' },
  'IVV': { type: 'core', name: 'iShares Core S&P 500', market: 'USD', queryTicker: 'IVV' },
  'VTI': { type: 'core', name: 'Vanguard Total Stock Market', market: 'USD', queryTicker: 'VTI' },
  'VT': { type: 'core', name: 'Vanguard Total World Stock', market: 'USD', queryTicker: 'VT' },

  // 衛星科技與個股 (Satellite)
  'NVDA': { type: 'satellite', name: 'Nvidia Corp', market: 'USD', queryTicker: 'NVDA' },
  'GOOG': { type: 'satellite', name: 'Alphabet Inc Class C', market: 'USD', queryTicker: 'GOOG' },
  'GOOGL': { type: 'satellite', name: 'Alphabet Inc Class A', market: 'USD', queryTicker: 'GOOGL' },
  'SMH': { type: 'satellite', name: 'VanEck Semiconductor ETF', market: 'USD', queryTicker: 'SMH' },
  'QQQ': { type: 'satellite', name: 'Invesco QQQ Trust', market: 'USD', queryTicker: 'QQQ' },
  'AAPL': { type: 'satellite', name: 'Apple Inc', market: 'USD', queryTicker: 'AAPL' },
  'MSFT': { type: 'satellite', name: 'Microsoft Corp', market: 'USD', queryTicker: 'MSFT' },
  'TSM': { type: 'satellite', name: '台積電 ADR', market: 'USD', queryTicker: 'TSM' },
  '2330': { type: 'satellite', name: '台積電', market: 'TWD', queryTicker: '2330.TW' },
  '1629': { type: 'satellite', name: 'NF商社・卸売 ETF', market: 'JPY', queryTicker: '1629.T' },

  // 槓桿策略 (Leveraged)
  '00631L': { type: 'leveraged', name: '元大台灣50正2', market: 'TWD', queryTicker: '00631L.TW' },
  '00675L': { type: 'leveraged', name: '富邦臺灣加權正2', market: 'TWD', queryTicker: '00675L.TW' },
  'SSO': { type: 'leveraged', name: 'ProShares Ultra S&P500 (2x)', market: 'USD', queryTicker: 'SSO' },
  'UPRO': { type: 'leveraged', name: 'ProShares UltraPro S&P500 (3x)', market: 'USD', queryTicker: 'UPRO' },
  'QLD': { type: 'leveraged', name: 'ProShares Ultra QQQ (2x)', market: 'USD', queryTicker: 'QLD' },
  'TQQQ': { type: 'leveraged', name: 'ProShares UltraPro QQQ (3x)', market: 'USD', queryTicker: 'TQQQ' },

  // 現金與短債 (Cash / Buffer)
  'CASH_TWD': { type: 'cash', name: '台幣備用現金', market: 'TWD', queryTicker: null },
  'CASH_USD': { type: 'cash', name: '美金備用現金', market: 'USD', queryTicker: null },
  'CASH_JPY': { type: 'cash', name: '日圓現鈔/存款', market: 'JPY', queryTicker: null },
  'BIL': { type: 'cash', name: 'SPDR 1-3月短期美債', market: 'USD', queryTicker: 'BIL' },
  'SHY': { type: 'cash', name: 'iShares 1-3年美債 ETF', market: 'USD', queryTicker: 'SHY' },
  '00719B': { type: 'cash', name: '元大1-3年期美債', market: 'TWD', queryTicker: '00719B.TW' }
};

const STORAGE_KEY = 'portfolio_doctor_data_v5';

const INITIAL_HOLDINGS = [
  // 1. 台股部位
  { id: '1', symbol: '0050', name: '元大台灣50', market: 'TWD', type: 'core', shares: 5000, price: 200, sourceBrokers: ['元大證券(5000)'] },
  { id: '2', symbol: 'CASH_TWD', name: '台幣備用現金', market: 'TWD', type: 'cash', shares: 1, price: 200000, sourceBrokers: ['台新(台股)'] },

  // 2. 美股部位
  { id: '3', symbol: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'USD', type: 'core', shares: 30, price: 708.64, sourceBrokers: ['嘉信證券(10)', '盈透證券(20)'] },
  { id: '4', symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'USD', type: 'core', shares: 5, price: 770.8, sourceBrokers: ['盈透證券(5)'] },
  { id: '5', symbol: 'NVDA', name: 'Nvidia Corp', market: 'USD', type: 'satellite', shares: 105, price: 233.85, sourceBrokers: ['嘉信證券(40)', '盈透證券(65)'] },
  { id: '6', symbol: 'GOOG', name: 'Alphabet Inc Class C', market: 'USD', type: 'satellite', shares: 95, price: 334.92, sourceBrokers: ['嘉信證券(40)', '盈透證券(55)'] },
  { id: '7', symbol: 'SMH', name: 'VanEck Semiconductor ETF', market: 'USD', type: 'satellite', shares: 15, price: 566.27, sourceBrokers: ['盈透證券(15)'] },
  { id: '8', symbol: 'CASH_USD', name: '美金備用現金', market: 'USD', type: 'cash', shares: 1, price: 10000, sourceBrokers: ['盈透證券'] },

  // 3. 日股部位
  { id: '9', symbol: '1629', name: 'NF商社・卸売 ETF', market: 'JPY', type: 'satellite', shares: 10, price: 100000, sourceBrokers: ['台新(日股)(10)'] },
  { id: '10', symbol: 'CASH_JPY', name: '日圓現鈔', market: 'JPY', type: 'cash', shares: 1, price: 300000, sourceBrokers: ['台新(日股)'] }
];

export default function App() {
  const [usdTwd, setUsdTwd] = useState(32.0);
  const [jpyTwd, setJpyTwd] = useState(0.215);
  const [monthlyContribution, setMonthlyContribution] = useState(50000);
  const [selectedStrategy, setSelectedStrategy] = useState('clec');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // 即時報價狀態
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [priceUpdateStatus, setPriceUpdateStatus] = useState('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState(new Set());

  // Toast 訊息
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  // 目標配置比例：台股 47.6% : 美股 47.6% : 日股 4.8% (1 : 1 : 0.1)
  const targetAllocation = useMemo(() => ({
    TWD: 47.6,
    USD: 47.6,
    JPY: 4.8
  }), []);

  const [holdings, setHoldings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.holdings) && parsed.holdings.length > 0) {
          return parsed.holdings;
        }
      }
    } catch (e) {
      console.warn('LocalStorage 讀取失敗，載入預設持股:', e);
    }
    return INITIAL_HOLDINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        holdings,
        usdTwd,
        jpyTwd,
        monthlyContribution,
        isPrivacyMode,
        lastUpdatedTime
      }));
    } catch (e) {
      console.error('儲存至 LocalStorage 失敗:', e);
    }
  }, [holdings, usdTwd, jpyTwd, monthlyContribution, isPrivacyMode, lastUpdatedTime]);

  const showToast = (title, desc = '', type = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const [formAsset, setFormAsset] = useState({
    symbol: '',
    name: '',
    market: 'TWD',
    type: 'core',
    shares: '',
    price: ''
  });

  const handleSymbolChange = (sym) => {
    let upper = sym.trim().toUpperCase();
    if (upper === '50') upper = '0050';

    const match = AUTO_CLASSIFICATION[upper];
    let inferredType = 'satellite';
    let inferredMarket = formAsset.market;
    let inferredName = '';

    if (match) {
      inferredType = match.type;
      inferredName = match.name;
      inferredMarket = match.market;
    } else if (upper.includes('CASH') || upper.includes('現金')) {
      inferredType = 'cash';
      inferredName = '備用現金';
    }

    setFormAsset(prev => ({
      ...prev,
      symbol: upper,
      market: inferredMarket,
      type: inferredType,
      name: inferredName || prev.name
    }));
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    let sym = formAsset.symbol.trim().toUpperCase();
    if (sym === '50') sym = '0050';
    if (!sym) return;

    const sharesNum = Math.max(0, parseFloat(formAsset.shares) || 0);
    const priceNum = Math.max(0, parseFloat(formAsset.price) || 0);

    if (sharesNum <= 0) {
      showToast('輸入錯誤', '持有股數需大於 0！', 'warning');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      symbol: sym,
      name: formAsset.name.trim() || sym,
      market: formAsset.market,
      type: formAsset.type,
      shares: sharesNum,
      price: priceNum,
      sourceBrokers: ['手動新增']
    };

    setHoldings(prev => [newItem, ...prev]);
    setFormAsset({
      symbol: '',
      name: '',
      market: 'TWD',
      type: 'core',
      shares: '',
      price: ''
    });
    showToast('新增成功', `已將 ${sym} 加入持股清單。`, 'success');
  };

  const handleDeleteHolding = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  const handleInlineUpdate = (id, field, value) => {
    const val = Math.max(0, parseFloat(value) || 0);
    setHoldings(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const calculatedData = useMemo(() => {
    let totalTwd = 0;
    const marketMap = { TWD: 0, USD: 0, JPY: 0 };
    const typeMap = { core: 0, satellite: 0, leveraged: 0, cash: 0 };

    const enrichedHoldings = holdings.map(h => {
      const shares = Number(h.shares) || 0;
      const price = Number(h.price) || 0;
      const rawValue = shares * price;

      let valueTwd = rawValue;
      if (h.market === 'USD') valueTwd = rawValue * (Number(usdTwd) || 32);
      if (h.market === 'JPY') valueTwd = rawValue * (Number(jpyTwd) || 0.215);

      totalTwd += valueTwd;
      if (marketMap[h.market] !== undefined) marketMap[h.market] += valueTwd;
      if (typeMap[h.type] !== undefined) typeMap[h.type] += valueTwd;

      return {
        ...h,
        rawValue,
        valueTwd
      };
    });

    const marketPct = {
      TWD: totalTwd > 0 ? (marketMap.TWD / totalTwd) * 100 : 0,
      USD: totalTwd > 0 ? (marketMap.USD / totalTwd) * 100 : 0,
      JPY: totalTwd > 0 ? (marketMap.JPY / totalTwd) * 100 : 0
    };

    const typePct = {
      core: totalTwd > 0 ? (typeMap.core / totalTwd) * 100 : 0,
      satellite: totalTwd > 0 ? (typeMap.satellite / totalTwd) * 100 : 0,
      leveraged: totalTwd > 0 ? (typeMap.leveraged / totalTwd) * 100 : 0,
      cash: totalTwd > 0 ? (typeMap.cash / totalTwd) * 100 : 0
    };

    return {
      totalTwd: Math.round(totalTwd),
      marketMap,
      marketPct,
      typeMap,
      typePct,
      enrichedHoldings
    };
  }, [holdings, usdTwd, jpyTwd]);

  const rebalancePlan = useMemo(() => {
    const contribution = Math.max(0, Number(monthlyContribution) || 0);
    if (contribution <= 0 || calculatedData.totalTwd <= 0) {
      return { TWD: 0, USD: 0, JPY: 0, gapTWD: 0, gapUSD: 0, gapJPY: 0 };
    }

    const futureTotal = calculatedData.totalTwd + contribution;
    const targetTWD = futureTotal * (targetAllocation.TWD / 100);
    const targetUSD = futureTotal * (targetAllocation.USD / 100);
    const targetJPY = futureTotal * (targetAllocation.JPY / 100);

    const gapTWD = Math.max(0, targetTWD - calculatedData.marketMap.TWD);
    const gapUSD = Math.max(0, targetUSD - calculatedData.marketMap.USD);
    const gapJPY = Math.max(0, targetJPY - calculatedData.marketMap.JPY);
    const totalGaps = gapTWD + gapUSD + gapJPY;

    if (totalGaps === 0) {
      return {
        TWD: Math.round(contribution * (targetAllocation.TWD / 100)),
        USD: Math.round(contribution * (targetAllocation.USD / 100)),
        JPY: Math.round(contribution * (targetAllocation.JPY / 100)),
        gapTWD: 0, gapUSD: 0, gapJPY: 0
      };
    }

    return {
      TWD: Math.round((gapTWD / totalGaps) * contribution),
      USD: Math.round((gapUSD / totalGaps) * contribution),
      JPY: Math.round((gapJPY / totalGaps) * contribution),
      gapTWD: Math.round(targetTWD - calculatedData.marketMap.TWD),
      gapUSD: Math.round(targetUSD - calculatedData.marketMap.USD),
      gapJPY: Math.round(targetJPY - calculatedData.marketMap.JPY)
    };
  }, [calculatedData, monthlyContribution, targetAllocation]);

  const formatMoney = (amount, currency = 'NT$') => {
    if (isPrivacyMode) {
      return `${currency} ••••••`;
    }
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  };

  // 單標的查價函式（含 Yahoo Finance 雙備援 Proxy）
  const fetchSinglePrice = async (queryTicker) => {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(queryTicker)}?interval=1d&range=1d`;
    const proxyEndpoints = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
    ];

    for (const pUrl of proxyEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(pUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        let json;
        if (pUrl.includes('allorigins')) {
          const wrapper = await res.json();
          json = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
        } else {
          json = await res.json();
        }

        const meta = json?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice || meta?.chartPreviousClose || meta?.previousClose;
        if (typeof price === 'number' && price > 0) {
          return Number(price.toFixed(2));
        }
      } catch (err) {
        // 嘗試備援代理
        continue;
      }
    }
    return null;
  };

  // 序列式微幅延遲抓取（避免並發造成 Rate Limit 429 封鎖）
  const handleRefreshPrices = async (targetList = holdings) => {
    if (isUpdatingPrices) return;
    setIsUpdatingPrices(true);
    setPriceUpdateStatus('連線報價中...');

    const updatedMap = {};
    const updatedIdSet = new Set();
    let successCount = 0;

    for (let i = 0; i < targetList.length; i++) {
      const h = targetList[i];
      if (h.type === 'cash') continue;

      // 自動補齊台美日代號後綴
      let queryTicker = h.symbol;
      if (AUTO_CLASSIFICATION[h.symbol]?.queryTicker) {
        queryTicker = AUTO_CLASSIFICATION[h.symbol].queryTicker;
      } else if (h.market === 'TWD') {
        queryTicker = `${h.symbol}.TW`;
      } else if (h.market === 'JPY') {
        queryTicker = `${h.symbol}.T`;
      }

      setPriceUpdateStatus(`更新中: ${h.symbol} (${i + 1}/${targetList.length})`);
      const fetchedPrice = await fetchSinglePrice(queryTicker);

      if (fetchedPrice !== null && fetchedPrice > 0) {
        updatedMap[h.id] = fetchedPrice;
        updatedIdSet.add(h.id);
        successCount++;
      }

      // 序列化等待 400ms，徹底避開伺服器限流防禦
      if (i < targetList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    if (successCount > 0) {
      setHoldings(prev => prev.map(item => {
        if (updatedMap[item.id] !== undefined) {
          return { ...item, price: updatedMap[item.id] };
        }
        return item;
      }));
      setRecentlyUpdatedIds(updatedIdSet);
      setTimeout(() => setRecentlyUpdatedIds(new Set()), 3500);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdatedTime(nowStr);
      showToast('行情更新完畢', `已成功獲取 ${successCount} 檔標的最新收盤市價！`, 'success');
    } else {
      showToast('行情提示', '公開報價端點暫時繁忙，已為您保留現有市價。', 'info');
    }

    setIsUpdatingPrices(false);
    setPriceUpdateStatus('');
  };

  const sanitizeCSVCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    let csvContent = '\uFEFF券商/帳戶,類型,標的,股數,股價,合計,折合台幣\n';

    calculatedData.enrichedHoldings.forEach(item => {
      const typeLabel = {
        core: '核心',
        satellite: '衛星',
        leveraged: '槓桿',
        cash: '現金'
      }[item.type] || item.type;

      const brokerStr = Array.isArray(item.sourceBrokers) ? item.sourceBrokers.join(' + ') : '自有部位';

      const row = [
        sanitizeCSVCell(brokerStr),
        sanitizeCSVCell(typeLabel),
        sanitizeCSVCell(item.symbol),
        item.shares,
        item.price,
        Math.round(item.rawValue),
        Math.round(item.valueTwd)
      ].join(',');

      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `全球資產配置檢視表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('匯出完成', '已下載相容於 Excel 格式的完整報表。', 'success');
  };

  const loadSheetJS = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let matrix = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        showToast('解析中', '正在解析 Excel 工作表結構...', 'info');
        const XLSX = await loadSheetJS();
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      } else {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parseCSVLine = (line) => {
          const row = [];
          let insideQuote = false;
          let entry = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              row.push(entry.trim().replace(/^["']|["']$/g, ''));
              entry = '';
            } else {
              entry += char;
            }
          }
          row.push(entry.trim().replace(/^["']|["']$/g, ''));
          return row;
        };
        matrix = lines.map(parseCSVLine);
      }

      if (!matrix || matrix.length < 2) {
        showToast('檔案空白', '上傳的檔案無有效數據內容。', 'warning');
        return;
      }

      // 定位下半部明細起點：尋找含有「股數」與「股價」的標題行
      let startIndex = -1;
      for (let i = 0; i < matrix.length; i++) {
        const rowStr = matrix[i].map(c => String(c)).join(' ');
        if (rowStr.includes('股數') && rowStr.includes('股價')) {
          startIndex = i + 1;
          break;
        }
      }

      if (startIndex === -1) {
        // 備援：若未找到標題，尋找券商名稱開頭
        for (let i = 0; i < matrix.length; i++) {
          const rowStr = matrix[i].map(c => String(c)).join(' ');
          if (rowStr.includes('嘉信') || rowStr.includes('盈透') || rowStr.includes('台新') || rowStr.includes('元大')) {
            startIndex = i;
            break;
          }
        }
      }

      if (startIndex === -1) startIndex = 1;

      // 狀態機：追蹤當前券商與幣別
      let currentBroker = '外部帳戶';
      let currentCurrency = 'USD'; // 預設

      // 三大獨立現金池（嚴格分流，絕不數字混加）
      const cashAccumulator = {
        TWD: { amount: 0, brokers: [] },
        USD: { amount: 0, brokers: [] },
        JPY: { amount: 0, brokers: [] }
      };

      const mergedMap = {};
      let needOnlineFetch = false;

      // 輔助函式：依券商文字與幣別標題精確推導貨幣
      const resolveMarketContext = (brokerText, rawSymText) => {
        const b = brokerText.toLowerCase();
        const s = rawSymText.toUpperCase();

        // 1. 特殊已知標的直接鎖定市場
        if (s === '0050' || s === '50' || s === '006208' || s === '2330' || s.endsWith('.TW')) {
          return 'TWD';
        }
        if (s === '1629' || s.endsWith('.T')) {
          return 'JPY';
        }

        // 2. 券商或標籤帶有台股/日股特徵
        if (b.includes('日股') || b.includes('sbi') || b.includes('日圓') || b.includes('日幣') || b.includes('jpy')) {
          return 'JPY';
        }
        if (b.includes('台股') || b.includes('元大') || b.includes('富邦') || b.includes('國泰') || b.includes('台幣') || b.includes('twd')) {
          return 'TWD';
        }
        if (b.includes('嘉信') || b.includes('盈透') || b.includes('美股') || b.includes('美元') || b.includes('usd')) {
          return 'USD';
        }

        return currentCurrency;
      };

      // 全域連續穿透掃描
      for (let i = startIndex; i < matrix.length; i++) {
        const row = matrix[i];
        if (!row || row.length < 3) continue;

        const rawCol0 = String(row[0] || '').trim();
        const rawCol1 = String(row[1] || '').trim();
        const rawCol2 = String(row[2] || '').trim();
        const rawCol3 = String(row[3] || '').trim();
        const rawCol4 = String(row[4] || '').trim();
        const rawCol5 = String(row[5] || '').trim();

        // 遇到幣別標題（例如：單位：美元 / 單位：日圓 / 單位：台幣）
        if (rawCol0.includes('單位：') || rawCol0.includes('單位:')) {
          if (rawCol0.includes('日圓') || rawCol0.includes('日幣') || rawCol0.includes('JPY')) currentCurrency = 'JPY';
          else if (rawCol0.includes('台幣') || rawCol0.includes('新台幣') || rawCol0.includes('TWD')) currentCurrency = 'TWD';
          else if (rawCol0.includes('美元') || rawCol0.includes('美金') || rawCol0.includes('USD')) currentCurrency = 'USD';
          continue;
        }

        // 遇到次標題列跳過
        if (rawCol0.includes('總覽') || rawCol0.includes('統計') || rawCol1 === '類型' || rawCol2 === '標的') {
          continue;
        }

        // 更新當前券商
        if (rawCol0.length > 0 && !rawCol0.includes('合計')) {
          currentBroker = rawCol0;
          if (currentBroker.includes('日股')) currentCurrency = 'JPY';
          else if (currentBroker.includes('台股') || currentBroker.includes('元大')) currentCurrency = 'TWD';
          else if (currentBroker.includes('嘉信') || currentBroker.includes('盈透')) currentCurrency = 'USD';
        }

        // 排除空白或合計行
        if (rawCol1 === '合計' || rawCol2 === '合計') continue;

        // 數值提取
        const shares = parseFloat(rawCol3.replace(/[$,¥NT,\s]/g, '')) || 0;
        const price = parseFloat(rawCol4.replace(/[$,¥NT,\s]/g, '')) || 0;
        const totalVal = parseFloat(rawCol5.replace(/[$,¥NT,\s]/g, '')) || 0;

        // 判斷是否為現金行
        if (rawCol1.includes('現金') || rawCol2.includes('現金') || rawCol2.toUpperCase().includes('CASH')) {
          let cashAmount = 0;
          if (shares > 1 && price > 0) cashAmount = shares * price;
          else if (totalVal > 0) cashAmount = totalVal;
          else if (shares > 0) cashAmount = shares;
          else if (price > 0) cashAmount = price;
          else {
            cashAmount = parseFloat(rawCol2.replace(/[$,¥NT,\s]/g, '')) || 0;
          }

          if (cashAmount > 0) {
            const cashMarket = resolveMarketContext(currentBroker, rawCol2);
            cashAccumulator[cashMarket].amount += cashAmount;
            if (!cashAccumulator[cashMarket].brokers.includes(currentBroker)) {
              cashAccumulator[cashMarket].brokers.push(currentBroker);
            }
          }
          continue;
        }

        // 標的代號清洗與標準化
        let symRaw = rawCol2.replace(/[^\w.-]/g, '').trim().toUpperCase();
        if (!symRaw) continue;

        // 純數字標的容許與轉換：'50' -> '0050', '1629' 原樣保留
        if (symRaw === '50') symRaw = '0050';

        // 排除預設未持有的空白標的
        if (symRaw.startsWith('標的') || shares <= 0) continue;

        // 判斷市場與屬性
        const targetMarket = resolveMarketContext(currentBroker, symRaw);
        let targetType = rawCol1.includes('核心') ? 'core' : 'satellite';

        if (['0050', '006208', 'VOO', 'SPY', 'IVV', 'VT', 'VTI'].includes(symRaw)) {
          targetType = 'core';
        } else if (['00631L', 'UPRO', 'TQQQ', 'SSO', 'QLD'].includes(symRaw)) {
          targetType = 'leveraged';
        }

        if (price <= 0) {
          needOnlineFetch = true;
        }

        // 跨券商同標的合併
        if (!mergedMap[symRaw]) {
          const dict = AUTO_CLASSIFICATION[symRaw];
          mergedMap[symRaw] = {
            id: `${Date.now()}_${symRaw}`,
            symbol: symRaw,
            name: dict?.name || symRaw,
            market: dict?.market || targetMarket,
            type: dict?.type || targetType,
            shares: shares,
            price: price > 0 ? price : (dict?.price || 0),
            sourceBrokers: [`${currentBroker}(${shares})`]
          };
        } else {
          mergedMap[symRaw].shares += shares;
          if (price > 0) mergedMap[symRaw].price = price;
          mergedMap[symRaw].sourceBrokers.push(`${currentBroker}(${shares})`);
        }
      }

      const consolidatedList = Object.values(mergedMap);

      // 嚴格獨立加入三大現金池
      if (cashAccumulator.TWD.amount > 0) {
        consolidatedList.push({
          id: `${Date.now()}_CASH_TWD`,
          symbol: 'CASH_TWD',
          name: '台幣備用現金',
          market: 'TWD',
          type: 'cash',
          shares: 1,
          price: cashAccumulator.TWD.amount,
          sourceBrokers: cashAccumulator.TWD.brokers
        });
      }
      if (cashAccumulator.USD.amount > 0) {
        consolidatedList.push({
          id: `${Date.now()}_CASH_USD`,
          symbol: 'CASH_USD',
          name: '美金備用現金',
          market: 'USD',
          type: 'cash',
          shares: 1,
          price: cashAccumulator.USD.amount,
          sourceBrokers: cashAccumulator.USD.brokers
        });
      }
      if (cashAccumulator.JPY.amount > 0) {
        consolidatedList.push({
          id: `${Date.now()}_CASH_JPY`,
          symbol: 'CASH_JPY',
          name: '日圓現鈔/存款',
          market: 'JPY',
          type: 'cash',
          shares: 1,
          price: cashAccumulator.JPY.amount,
          sourceBrokers: cashAccumulator.JPY.brokers
        });
      }

      if (consolidatedList.length > 0) {
        setHoldings(consolidatedList);
        showToast('匯入與整併成功', `已完整辨識台/美/日各帳戶明細，整併為 ${consolidatedList.length} 檔標準資產！`, 'success');

        // 若有空白股價，自動發起線上報價查詢
        if (needOnlineFetch) {
          setTimeout(() => {
            handleRefreshPrices(consolidatedList);
          }, 600);
        }
      } else {
        showToast('解析失敗', '未能辨識出有效持股或股數，請確認下半部欄位格式。', 'warning');
      }
    } catch (err) {
      console.error('檔案讀取失敗:', err);
      showToast('匯入錯誤', '檔案結構解析異常，請確認檔案格式。', 'warning');
    }

    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-12">
      {/* 浮動提示 Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
          <div className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
            toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-white' :
            toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-500/30 text-white' :
            'bg-slate-900/90 border-slate-700/50 text-white'
          }`}>
            <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm">{toastMessage.title}</h4>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">{toastMessage.desc}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 頂部 Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                全球資產配置診斷與再平衡工具
              </h1>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <span>Portfolio Doctor & Strategy Benchmark</span>
                {lastUpdatedTime && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">
                    <Clock className="w-2.5 h-2.5" /> 收盤行情: {lastUpdatedTime}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 匯率微調 */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400 text-[11px]">USD:</span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={usdTwd}
                  onChange={(e) => setUsdTwd(Math.max(0.1, parseFloat(e.target.value) || 32))}
                  className="w-13 px-1 py-0.5 text-center font-bold bg-white border border-slate-200 rounded text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400 text-[11px]">JPY:</span>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={jpyTwd}
                  onChange={(e) => setJpyTwd(Math.max(0.001, parseFloat(e.target.value) || 0.215))}
                  className="w-15 px-1 py-0.5 text-center font-bold bg-white border border-slate-200 rounded text-slate-800"
                />
              </div>
            </div>

            {/* 隱私遮罩切換 */}
            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isPrivacyMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={isPrivacyMode ? '點擊關閉隱私遮罩' : '點擊開啟隱私遮罩'}
            >
              {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-500" />}
              <span className="hidden sm:inline">{isPrivacyMode ? '隱私中' : '隱私遮罩'}</span>
            </button>

            {/* 自動更新收盤價按鈕 */}
            <button
              onClick={() => handleRefreshPrices(holdings)}
              disabled={isUpdatingPrices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-colors disabled:opacity-50"
              title="即時獲取最新台美日股收盤價"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPrices ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isUpdatingPrices ? (priceUpdateStatus || '更新中...') : '更新收盤價'}</span>
            </button>

            {/* 匯入 Excel / CSV 按鈕 */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 shadow-xs"
              title="支援直接匯入 .xlsx 或 .csv"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">匯入 Excel/CSV</span>
            </button>

            {/* 匯出報表按鈕 */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors text-white shadow-sm shadow-emerald-600/20"
              title="匯出相容 Excel 格式的報表"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">匯出報表</span>
            </button>
          </div>
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-medium text-slate-400 block mb-0.5">全球總資產折合 (TWD)</span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatMoney(calculatedData.totalTwd)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>三幣別現金分流・全帳戶明細已整合</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-slate-400">台股部位 (TWD)</span>
              <span className="text-xs font-bold font-mono text-blue-600">
                {calculatedData.marketPct.TWD.toFixed(1)}%
              </span>
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {formatMoney(calculatedData.marketMap.TWD)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              目標比重：{targetAllocation.TWD}% (核心 0050 等)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-slate-400">美股部位 (USD)</span>
              <span className="text-xs font-bold font-mono text-indigo-600">
                {calculatedData.marketPct.USD.toFixed(1)}%
              </span>
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {formatMoney(calculatedData.marketMap.USD)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              目標比重：{targetAllocation.USD}% (VOO/NVDA/SMH)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-slate-400">日股部位 (JPY)</span>
              <span className="text-xs font-bold font-mono text-amber-600">
                {calculatedData.marketPct.JPY.toFixed(1)}%
              </span>
            </div>
            <div className="text-xl font-bold text-slate-800 font-mono">
              {formatMoney(calculatedData.marketMap.JPY)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              目標比重：{targetAllocation.JPY}% (1629商社等)
            </div>
          </div>
        </div>

        {/* 雙欄主架構 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= 左側主操作區 (7 欄寬) ================= */}
          <div className="lg:col-span-7 space-y-6">
            {}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-slate-800 text-sm">手動新增持股或備用現金</h2>
              </div>

              <form onSubmit={handleAddAsset} className="space-y-3">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4 sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">標的代號</label>
                    <input
                      type="text"
                      placeholder="如 0050、NVDA"
                      value={formAsset.symbol}
                      onChange={(e) => handleSymbolChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold uppercase"
                      required
                    />
                  </div>

                  <div className="col-span-8 sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">標的名稱 / 說明</label>
                    <input
                      type="text"
                      placeholder="如 元大台灣50、台幣備用現金"
                      value={formAsset.name}
                      onChange={(e) => setFormAsset({ ...formAsset, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">市場幣別</label>
                    <select
                      value={formAsset.market}
                      onChange={(e) => setFormAsset({ ...formAsset, market: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="TWD">台幣 (TWD)</option>
                      <option value="USD">美金 (USD)</option>
                      <option value="JPY">日圓 (JPY)</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">屬性標籤</label>
                    <select
                      value={formAsset.type}
                      onChange={(e) => setFormAsset({ ...formAsset, type: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="core">大盤原型</option>
                      <option value="satellite">科技/衛星</option>
                      <option value="leveraged">槓桿策略</option>
                      <option value="cash">防禦現金</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5 sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">持有數量 / 股數</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="例：1000"
                      value={formAsset.shares}
                      onChange={(e) => setFormAsset({ ...formAsset, shares: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      目前市價 ({formAsset.market})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="例：200 (留白自動抓)"
                      value={formAsset.price}
                      onChange={(e) => setFormAsset({ ...formAsset, price: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    整合持股清單 ({holdings.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">已自動合併跨券商同標的・支援即時編輯</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="py-2.5 px-2">標的 / 來源帳戶</th>
                      <th className="py-2.5 px-2">分類屬性</th>
                      <th className="py-2.5 px-2 text-right">持有總股數</th>
                      <th className="py-2.5 px-2 text-right">最新單價</th>
                      <th className="py-2.5 px-2 text-right">折合台幣</th>
                      <th className="py-2.5 px-2 text-center w-10">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculatedData.enrichedHoldings.map((h) => {
                      const badgeConfig = {
                        core: { bg: 'bg-blue-50 text-blue-700 border-blue-200/60', label: '大盤原型' },
                        satellite: { bg: 'bg-purple-50 text-purple-700 border-purple-200/60', label: '科技衛星' },
                        leveraged: { bg: 'bg-amber-50 text-amber-700 border-amber-200/60', label: '槓桿策略' },
                        cash: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', label: '防禦現金' }
                      }[h.type] || { bg: 'bg-slate-50 text-slate-600 border-slate-200', label: h.type };

                      const isRecentlyUpdated = recentlyUpdatedIds.has(h.id);

                      return (
                        <tr key={h.id} className={`hover:bg-slate-50/80 transition-colors ${isRecentlyUpdated ? 'bg-teal-50/80 animate-pulse' : ''}`}>
                          <td className="py-2.5 px-2">
                            <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                              <span>{h.symbol}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                                {h.market}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{h.name}</div>
                            {Array.isArray(h.sourceBrokers) && h.sourceBrokers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {h.sourceBrokers.map((b, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-sans">
                                    <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-2">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeConfig.bg}`}>
                              {badgeConfig.label}
                            </span>
                          </td>

                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={h.shares}
                              onChange={(e) => handleInlineUpdate(h.id, 'shares', e.target.value)}
                              className="w-20 text-right font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded px-1 py-0.5 text-xs font-semibold focus:outline-none transition-colors"
                            />
                          </td>

                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            {isPrivacyMode ? (
                              <span className="text-slate-400">••••</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={h.price}
                                onChange={(e) => handleInlineUpdate(h.id, 'price', e.target.value)}
                                className="w-20 text-right font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded px-1 py-0.5 text-xs font-semibold focus:outline-none transition-colors"
                              />
                            )}
                          </td>

                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                            {formatMoney(h.valueTwd)}
                          </td>

                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleDeleteHolding(h.id)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors"
                              title="刪除此項目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-teal-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    新資金「純買進」再平衡計算機 (Buy-Only Rebalance)
                  </h3>
                </div>
                <span className="text-[11px] text-teal-700 font-medium bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  免賣股票・零交易摩擦
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    本期預計投入新資金 (新台幣 TWD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-xs text-slate-400">NT$</span>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-700">目標平衡比重 (台 : 美 : 日)</span>
                    <span className="text-teal-700 font-mono font-bold">1 : 1 : 0.1</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    以新流入資金優先注水落後市場，消除波動誤差，無須賣出獲利資產引發課稅或手續費。
                  </p>
                </div>
              </div>

              {/* 下單分配金額展示 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <div className="text-[11px] text-blue-800 font-medium flex items-center justify-between">
                    <span>台股配置 (0050)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-blue-900 font-mono mt-1">
                    {formatMoney(rebalancePlan.TWD)}
                  </div>
                  <div className="text-[10px] text-blue-600/80 mt-0.5">
                    缺口差額約 {formatMoney(rebalancePlan.gapTWD)}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                  <div className="text-[11px] text-indigo-800 font-medium flex items-center justify-between">
                    <span>美股配置 (VOO/衛星)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-indigo-900 font-mono mt-1">
                    {formatMoney(rebalancePlan.USD)}
                  </div>
                  <div className="text-[10px] text-indigo-600/80 mt-0.5">
                    缺口差額約 {formatMoney(rebalancePlan.gapUSD)}
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                  <div className="text-[11px] text-amber-800 font-medium flex items-center justify-between">
                    <span>日股配置 (1629)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-1">
                    {formatMoney(rebalancePlan.JPY)}
                  </div>
                  <div className="text-[10px] text-amber-600/80 mt-0.5">
                    缺口差額約 {formatMoney(rebalancePlan.gapJPY)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= 右側診斷區 (5 欄寬，Sticky 釘選) ================= */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
            {}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">資產屬性架構拆解</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Real-time Exposure</span>
              </div>

              {/* 橫向堆疊色彩條 */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex mb-4">
                <div
                  style={{ width: `${calculatedData.typePct.core}%` }}
                  className="bg-blue-500 h-full transition-all duration-300"
                  title={`大盤原型: ${calculatedData.typePct.core.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${calculatedData.typePct.satellite}%` }}
                  className="bg-purple-500 h-full transition-all duration-300"
                  title={`科技衛星: ${calculatedData.typePct.satellite.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${calculatedData.typePct.leveraged}%` }}
                  className="bg-amber-500 h-full transition-all duration-300"
                  title={`槓桿策略: ${calculatedData.typePct.leveraged.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${calculatedData.typePct.cash}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`防禦現金: ${calculatedData.typePct.cash.toFixed(1)}%`}
                />
              </div>

              {/* 四分位屬性詳細數值 */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>大盤原型 (Core)</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {calculatedData.typePct.core.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatMoney(calculatedData.typeMap.core)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>科技/衛星 (Satellite)</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {calculatedData.typePct.satellite.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatMoney(calculatedData.typeMap.satellite)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>槓桿策略 (Leveraged)</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {calculatedData.typePct.leveraged.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatMoney(calculatedData.typeMap.leveraged)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>現金短債 (Buffer)</span>
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {calculatedData.typePct.cash.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatMoney(calculatedData.typeMap.cash)}
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">經典投資策略對照鏡</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">客觀體質診斷</span>
              </div>

              {/* Tab 選擇器 */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setSelectedStrategy('chou')}
                  className={`py-1.5 rounded-lg transition-all ${
                    selectedStrategy === 'chou'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  周冠男教授
                </button>
                <button
                  onClick={() => setSelectedStrategy('buffett')}
                  className={`py-1.5 rounded-lg transition-all ${
                    selectedStrategy === 'buffett'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  巴菲特 90/10
                </button>
                <button
                  onClick={() => setSelectedStrategy('clec')}
                  className={`py-1.5 rounded-lg transition-all ${
                    selectedStrategy === 'clec'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  CLEC 433
                </button>
              </div>

              {/* 1. 周冠男教授風格 */}
              {selectedStrategy === 'chou' && (
                <div className="space-y-3">
                  <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                    <span className="font-bold block mb-1">長期主義被動投資・買進大盤・不擇時不出場</span>
                    <p className="text-[11px] text-indigo-800">
                      核心大盤原型 ETF（0050/VOO 等）應維持在 80%~100% 水準。個股或單一產業主題 ETF 會增加非系統性風險與交易心魔。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">目前大盤原型佔比</span>
                      <span className="font-bold font-mono text-slate-800">
                        {calculatedData.typePct.core.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">個股與科技衛星佔比</span>
                      <span className={`font-bold font-mono ${calculatedData.typePct.satellite > 25 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {calculatedData.typePct.satellite.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      <span>健檢評語：</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {calculatedData.typePct.satellite > 25
                        ? '目前個股與科技衛星部位偏高（>25%），科技股多頭時表現搶眼，但若遇產業週期回檔將承受較大心理壓力。建議可透過每月新資金持續強化 0050 與 VOO 等全市場大盤標的。'
                        : '核心資產結構非常穩健且專注！大盤部位佔據主體，有效降伏頻繁盯盤與預測市場的心魔。'}
                    </p>
                  </div>
                </div>
              )}

              {/* 2. 巴菲特 90/10 哲學 */}
              {selectedStrategy === 'buffett' && (
                <div className="space-y-3">
                  <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-100 text-xs text-amber-950 leading-relaxed">
                    <span className="font-bold block mb-1">90% S&P 500 低成本大盤 + 10% 短期無風險國債/現金</span>
                    <p className="text-[11px] text-amber-800">
                      巴菲特著名的遺產信託指示：以全美最強五百家企業驅動增長，輔以 10% 現金與短債做為安全閥。
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">基準要求 (大盤股票 / 現金短債)</span>
                      <span className="font-bold font-mono text-slate-700">90.0% / 10.0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">您目前配置比重</span>
                      <span className="font-bold font-mono text-slate-800">
                        {(calculatedData.typePct.core + calculatedData.typePct.satellite + calculatedData.typePct.leveraged).toFixed(1)}% / {calculatedData.typePct.cash.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>健檢評語：</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      目前現金與防禦資產佔比約為 {calculatedData.typePct.cash.toFixed(1)}%。
                      {calculatedData.typePct.cash < 8
                        ? '現金水位偏低，若遇緊急支出或黑天鵝恐需被迫拋售股票變現，建議可適度墊高防禦儲備。'
                        : '防禦水準充裕，能在黑天鵝跌破支撐時維持安穩睡好覺的心態。'}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. CLEC 433 彈性再平衡框架 */}
              {selectedStrategy === 'clec' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                    <span className="font-bold block mb-1">
                      CLEC 433 框架：保留現金緩衝區（Cash Buffer）主導的不敗戰法
                    </span>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      理想配置：<strong>40% 原型 ETF + 30% 成長/槓桿衛星 + 30% 短債或現金</strong>。<br />
                      不刻意追求頻繁機械化再平衡，而是由<strong>現金緩衝區動態微調</strong>：
                    </p>
                    <div className="mt-2 space-y-1 text-[11px] text-emerald-900 pl-2 border-l-2 border-emerald-500">
                      <div>• <strong>上漲年份</strong>：獲利的 30%~50% 轉換存入現金/短債池，穩步拉高安全緩衝。</div>
                      <div>• <strong>下跌年份</strong>：每年從緩衝池中提取最多約 <strong>2% 總資產</strong>逆勢逢低加碼風險部位。</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>原型 ETF 目標 40% (您目前)</span>
                      <span className="font-bold font-mono text-slate-900">{calculatedData.typePct.core.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>成長/槓桿衛星 目標 30% (您目前)</span>
                      <span className="font-bold font-mono text-slate-900">
                        {(calculatedData.typePct.satellite + calculatedData.typePct.leveraged).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>現金短債緩衝 目標 30% (您目前)</span>
                      <span className="font-bold font-mono text-slate-900">{calculatedData.typePct.cash.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* 實戰行動試算小卡 */}
                  <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs text-xs space-y-1.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>CLEC 現階段行動指引：</span>
                    </span>
                    <p className="text-[11px] text-emerald-100 leading-relaxed">
                      • <strong>遇年度大漲時</strong>：建議將當年度帳面獲利的 30%~50% 鎖利停撥入活存或短債。<br />
                      • <strong>遇年度回檔時</strong>：緩衝池上限可提取約 <strong className="text-white font-mono">{formatMoney(calculatedData.totalTwd * 0.02)}</strong>（總資產 2%）逢低補進 0050 或核心標的！
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
