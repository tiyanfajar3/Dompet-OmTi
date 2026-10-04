import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  Percent, 
  ArrowRight,
  PieChart as PieIcon,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  formatRupiah, 
  formatIndonesianDate, 
  formatIndonesianMonthYear 
} from '../../lib/formatters';
import { Transaction } from '../../types';

type ReportPeriod = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

export const ReportsPage: React.FC = () => {
  const { transactions, categories } = useApp();

  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Compute Current Period Range and Previous Period Range for comparison
  const { currentRange, prevRange, periodLabel, prevPeriodLabel } = useMemo(() => {
    let curStart = '';
    let curEnd = '';
    let pStart = '';
    let pEnd = '';
    let label = '';
    let prevLabel = '';

    const pad = (n: number) => String(n).padStart(2, '0');

    if (period === 'today') {
      const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(now.getDate())}`;
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
      curStart = todayStr;
      curEnd = todayStr;
      pStart = yStr;
      pEnd = yStr;
      label = `Hari Ini (${formatIndonesianDate(todayStr)})`;
      prevLabel = `Kemarin (${formatIndonesianDate(yStr)})`;
    } else if (period === 'this_week') {
      const day = now.getDay() || 7; // Monday as 1
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const prevMon = new Date(mon);
      prevMon.setDate(mon.getDate() - 7);
      const prevSun = new Date(prevMon);
      prevSun.setDate(prevMon.getDate() + 6);

      curStart = `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
      curEnd = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`;
      pStart = `${prevMon.getFullYear()}-${pad(prevMon.getMonth() + 1)}-${pad(prevMon.getDate())}`;
      pEnd = `${prevSun.getFullYear()}-${pad(prevSun.getMonth() + 1)}-${pad(prevSun.getDate())}`;
      label = 'Minggu Ini';
      prevLabel = 'Minggu Lalu';
    } else if (period === 'this_month') {
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      curStart = `${currentYear}-${pad(currentMonth)}-01`;
      curEnd = `${currentYear}-${pad(currentMonth)}-${pad(lastDay)}`;

      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevLastDay = new Date(prevY, prevM, 0).getDate();
      pStart = `${prevY}-${pad(prevM)}-01`;
      pEnd = `${prevY}-${pad(prevM)}-${pad(prevLastDay)}`;

      label = formatIndonesianMonthYear(currentYear, currentMonth);
      prevLabel = formatIndonesianMonthYear(prevY, prevM);
    } else if (period === 'this_year') {
      curStart = `${currentYear}-01-01`;
      curEnd = `${currentYear}-12-31`;
      pStart = `${currentYear - 1}-01-01`;
      pEnd = `${currentYear - 1}-12-31`;
      label = `Tahun ${currentYear}`;
      prevLabel = `Tahun ${currentYear - 1}`;
    } else {
      curStart = customStart || `${currentYear}-${pad(currentMonth)}-01`;
      curEnd = customEnd || `${currentYear}-${pad(currentMonth)}-${pad(now.getDate())}`;
      // Previous equivalent duration
      const s = new Date(curStart);
      const e = new Date(curEnd);
      const diffDays = Math.max(Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)), 1);
      const pE = new Date(s);
      pE.setDate(s.getDate() - 1);
      const pS = new Date(pE);
      pS.setDate(pE.getDate() - diffDays + 1);

      pStart = `${pS.getFullYear()}-${pad(pS.getMonth() + 1)}-${pad(pS.getDate())}`;
      pEnd = `${pE.getFullYear()}-${pad(pE.getMonth() + 1)}-${pad(pE.getDate())}`;
      label = `${curStart} s/d ${curEnd}`;
      prevLabel = `${pStart} s/d ${pEnd}`;
    }

    return {
      currentRange: { start: curStart, end: curEnd },
      prevRange: { start: pStart, end: pEnd },
      periodLabel: label,
      prevPeriodLabel: prevLabel,
    };
  }, [period, currentYear, currentMonth, customStart, customEnd]);

  // Compute Stats for a given range
  const computeStatsForRange = (start: string, end: string) => {
    const list = transactions.filter((tx) => tx.date >= start && tx.date <= end);
    let income = 0;
    let expense = 0;
    let largestExpense = 0;
    const catMap: Record<string, { name: string; amount: number; count: number }> = {};

    list.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
        if (tx.amount > largestExpense) {
          largestExpense = tx.amount;
        }

        const cat = categories.find((c) => c.id === tx.categoryId);
        const name = cat?.name || tx.categoryName || 'Lainnya';
        if (!catMap[name]) {
          catMap[name] = { name, amount: 0, count: 0 };
        }
        catMap[name].amount += tx.amount;
        catMap[name].count += 1;
      }
    });

    const categoryList = Object.values(catMap).sort((a, b) => b.amount - a.amount);
    const topCategory = categoryList[0] || null;

    const frequencyList = [...categoryList].sort((a, b) => b.count - a.count);
    const topFrequentCategory = frequencyList[0] || null;

    const expenseCount = list.filter((t) => t.type === 'expense').length;
    const avgExpense = expenseCount > 0 ? Math.round(expense / expenseCount) : 0;

    return {
      income,
      expense,
      net: income - expense,
      totalCount: list.length,
      expenseCount,
      avgExpense,
      largestExpense,
      topCategory,
      topFrequentCategory,
      categoryList,
    };
  };

  const currentStats = useMemo(
    () => computeStatsForRange(currentRange.start, currentRange.end),
    [currentRange, transactions, categories]
  );

  const prevStats = useMemo(
    () => computeStatsForRange(prevRange.start, prevRange.end),
    [prevRange, transactions, categories]
  );

  // Period Comparison Math
  const comparison = useMemo(() => {
    const expenseDiff = currentStats.expense - prevStats.expense;
    const expensePercentChange =
      prevStats.expense > 0 ? Math.round((expenseDiff / prevStats.expense) * 100) : 0;

    const incomeDiff = currentStats.income - prevStats.income;
    const incomePercentChange =
      prevStats.income > 0 ? Math.round((incomeDiff / prevStats.income) * 100) : 0;

    return {
      expenseDiff,
      expensePercentChange,
      incomeDiff,
      incomePercentChange,
    };
  }, [currentStats, prevStats]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan Keuangan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Analisis arus kas & perbandingan periode untuk Tuan Muda
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'this_week', label: 'Minggu Ini' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'this_year', label: 'Tahun Ini' },
            { id: 'custom', label: 'Kustom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as ReportPeriod)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker if active */}
      {period === 'custom' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Mulai:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Sampai:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Pemasukan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            Total Pemasukan Periode Ini
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatRupiah(currentStats.income)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {periodLabel}
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            Total Pengeluaran Periode Ini
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatRupiah(currentStats.expense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {periodLabel}
          </div>
        </div>

        {/* Selisih */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            Selisih Arus Kas (Net)
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              currentStats.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(currentStats.net)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {currentStats.net >= 0 ? 'Surplus finansial' : 'Defisit finansial'}
          </div>
        </div>
      </div>

      {/* Perbandingan Periode (Comparison Box) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Perbandingan Periode</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {periodLabel} dibanding {prevPeriodLabel}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Comparison Pengeluaran */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Perbandingan Pengeluaran
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{periodLabel}:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {formatRupiah(currentStats.expense)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{prevPeriodLabel}:</span>
              <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400">
                {formatRupiah(prevStats.expense)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">Selisih Nominal:</span>
              <span
                className={`tabular-nums ${
                  comparison.expenseDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {comparison.expenseDiff > 0 ? '+ ' : ''}
                {formatRupiah(comparison.expenseDiff)} ({comparison.expensePercentChange > 0 ? '+' : ''}{comparison.expensePercentChange}%)
              </span>
            </div>
          </div>

          {/* Comparison Pemasukan */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Perbandingan Pemasukan
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{periodLabel}:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {formatRupiah(currentStats.income)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{prevPeriodLabel}:</span>
              <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400">
                {formatRupiah(prevStats.income)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">Selisih Nominal:</span>
              <span
                className={`tabular-nums ${
                  comparison.incomeDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {comparison.incomeDiff > 0 ? '+ ' : ''}
                {formatRupiah(comparison.incomeDiff)} ({comparison.incomePercentChange > 0 ? '+' : ''}{comparison.incomePercentChange}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Statistical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500">Jumlah Transaksi</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {currentStats.totalCount} item
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {currentStats.expenseCount} pengeluaran
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500">Rata-rata Pengeluaran</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatRupiah(currentStats.avgExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">per transaksi</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500">Pengeluaran Terbesar</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatRupiah(currentStats.largestExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">pada periode ini</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500">Kategori Terbesar</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
            {currentStats.topCategory?.name || '-'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
            {currentStats.topCategory ? formatRupiah(currentStats.topCategory.amount) : 'Rp 0'}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Rincian Distribusi Pengeluaran
        </h2>

        {currentStats.categoryList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ada pengeluaran pada rentang waktu yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 font-semibold">Kategori</th>
                  <th className="py-2.5 font-semibold text-right">Frekuensi</th>
                  <th className="py-2.5 font-semibold text-right">Total Nominal</th>
                  <th className="py-2.5 font-semibold text-right">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {currentStats.categoryList.map((cat) => {
                  const percent =
                    currentStats.expense > 0 ? Math.round((cat.amount / currentStats.expense) * 100) : 0;
                  return (
                    <tr key={cat.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                        {cat.name}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {cat.count}x
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatRupiah(cat.amount)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-500">
                        {percent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
