import React, { useMemo } from 'react';
import { 
  Scale, 
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { formatRupiah, parseFlexibleDate } from '../../lib/formatters';
import { Transaction } from '../../types';

interface IncomeExpenseComparison3DChartProps {
  monthIncome: number;
  monthExpense: number;
  currentMonthTransactions: Transaction[];
}

export const IncomeExpenseComparison3DChart: React.FC<IncomeExpenseComparison3DChartProps> = ({
  monthIncome,
  monthExpense,
  currentMonthTransactions,
}) => {
  const totalFlow = monthIncome + monthExpense;
  const incomePercent = totalFlow > 0 ? Math.round((monthIncome / totalFlow) * 100) : 0;
  const expensePercent = totalFlow > 0 ? 100 - incomePercent : 0;
  const netFlow = monthIncome - monthExpense;
  const isSurplus = netFlow >= 0;

  // 4-Week Breakdown
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: 'Mgg 1', range: 'Tgl 1-7', income: 0, expense: 0 },
      { label: 'Mgg 2', range: 'Tgl 8-14', income: 0, expense: 0 },
      { label: 'Mgg 3', range: 'Tgl 15-21', income: 0, expense: 0 },
      { label: 'Mgg 4', range: 'Tgl 22+', income: 0, expense: 0 },
    ];

    currentMonthTransactions.forEach((tx) => {
      const parsed = parseFlexibleDate(tx.date || tx.createdAt);
      const day = parsed ? parsed.day : parseInt(String(tx.date).split('-')[2], 10);
      let idx = 0;
      if (day <= 7) idx = 0;
      else if (day <= 14) idx = 1;
      else if (day <= 21) idx = 2;
      else idx = 3;

      if (tx.type === 'income') {
        weeks[idx].income += tx.amount;
      } else {
        weeks[idx].expense += tx.amount;
      }
    });

    const maxWeekly = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      1
    );

    return { weeks, maxWeekly };
  }, [currentMonthTransactions]);

  // Relative pillar heights (clamped between 25% and 100%)
  const maxPillarVal = Math.max(monthIncome, monthExpense, 1);
  const incomePillarHeight = monthIncome > 0 ? Math.max((monthIncome / maxPillarVal) * 100, 24) : 12;
  const expensePillarHeight = monthExpense > 0 ? Math.max((monthExpense / maxPillarVal) * 100, 24) : 12;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
      {/* Subtle ambient light */}
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Pemasukan vs Pengeluaran (3D Depth)
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              3D Glow
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Komparasi volume kas masuk dan keluar bulan ini
          </p>
        </div>
        <Scale className="w-4 h-4 text-slate-400" />
      </div>

      {/* Main 3D Dual-Pillar Stage */}
      <div className="grid grid-cols-2 gap-4 py-2 relative z-10">
        {/* Pillar 1: Pemasukan (Emerald 3D Pillar) */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-emerald-500/20 flex flex-col items-center justify-between min-h-[175px] group">
          <div className="w-full flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Pemasukan
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {incomePercent}%
            </span>
          </div>

          {/* 3D Pillar Isometric Graphic */}
          <div className="w-full h-24 flex items-end justify-center px-4 relative my-1">
            {/* Ambient floor glow pool */}
            <div className="absolute bottom-0 w-24 h-4 rounded-full bg-emerald-500/30 blur-md pointer-events-none" />

            {/* 3D Column Body */}
            <div
              className="w-16 rounded-t-xl transition-all duration-700 relative flex flex-col justify-start drop-shadow-[0_12px_20px_rgba(16,185,129,0.35)]"
              style={{ height: `${incomePillarHeight}%` }}
            >
              {/* Top 3D Cylinder Elliptical Cap */}
              <div className="w-full h-3 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-100 to-emerald-400 shadow-xs shrink-0 border border-emerald-200/50" />
              {/* Pillar Front Face with specular shine */}
              <div className="w-full flex-1 rounded-b-xl bg-gradient-to-t from-emerald-700 via-emerald-500 to-teal-400 border-x border-b border-emerald-400/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/20 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Nominal */}
          <div className="text-center mt-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatRupiah(monthIncome)}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Total Dana Masuk
            </span>
          </div>
        </div>

        {/* Pillar 2: Pengeluaran (Rose 3D Pillar) */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-rose-500/20 flex flex-col items-center justify-between min-h-[175px] group">
          <div className="w-full flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Pengeluaran
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {expensePercent}%
            </span>
          </div>

          {/* 3D Pillar Isometric Graphic */}
          <div className="w-full h-24 flex items-end justify-center px-4 relative my-1">
            {/* Ambient floor glow pool */}
            <div className="absolute bottom-0 w-24 h-4 rounded-full bg-rose-500/30 blur-md pointer-events-none" />

            {/* 3D Column Body */}
            <div
              className="w-16 rounded-t-xl transition-all duration-700 relative flex flex-col justify-start drop-shadow-[0_12px_20px_rgba(244,63,94,0.35)]"
              style={{ height: `${expensePillarHeight}%` }}
            >
              {/* Top 3D Cylinder Elliptical Cap */}
              <div className="w-full h-3 rounded-full bg-gradient-to-r from-rose-300 via-rose-100 to-rose-400 shadow-xs shrink-0 border border-rose-200/50" />
              {/* Pillar Front Face with specular shine */}
              <div className="w-full flex-1 rounded-b-xl bg-gradient-to-t from-rose-700 via-rose-500 to-red-400 border-x border-b border-rose-400/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/20 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Nominal */}
          <div className="text-center mt-1">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatRupiah(monthExpense)}
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
              Total Dana Keluar
            </span>
          </div>
        </div>
      </div>

      {/* 4-Week Mini 3D Paired Bar Chart */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
          <span>Progres Per Minggu</span>
          <span>Perbandingan 4 Minggu</span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {weeklyData.weeks.map((week, idx) => {
            const incH = week.income > 0 ? Math.max((week.income / weeklyData.maxWeekly) * 100, 10) : 4;
            const expH = week.expense > 0 ? Math.max((week.expense / weeklyData.maxWeekly) * 100, 10) : 4;

            return (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-1.5 group relative"
              >
                {/* Floating Tooltip */}
                <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                  <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-xl whitespace-nowrap tabular-nums border border-slate-700">
                    <span className="text-emerald-400">+{formatRupiah(week.income)}</span>
                    {' · '}
                    <span className="text-rose-400">-{formatRupiah(week.expense)}</span>
                  </div>
                </div>

                {/* 3D Mini Paired Bars */}
                <div className="h-14 w-full flex items-end justify-center gap-1.5 pb-0.5">
                  {/* Income bar */}
                  <div
                    className="w-3 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 shadow-xs shadow-emerald-500/40"
                    style={{ height: `${incH}%` }}
                    title={`Pemasukan: ${formatRupiah(week.income)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className="w-3 rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-500 shadow-xs shadow-rose-500/40"
                    style={{ height: `${expH}%` }}
                    title={`Pengeluaran: ${formatRupiah(week.expense)}`}
                  />
                </div>

                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {week.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Net Surplus / Deficit Bottom Badge */}
      <div className={`mt-3 p-3 rounded-xl flex items-center justify-between text-xs border ${
        isSurplus
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
          : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-300'
      }`}>
        <div className="flex items-center gap-1.5 font-bold">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{isSurplus ? 'Status Arus Kas: Surplus Positif' : 'Status Arus Kas: Defisit'}</span>
        </div>
        <div className="font-extrabold tabular-nums">
          {isSurplus ? '+' : ''}{formatRupiah(netFlow)}
        </div>
      </div>
    </div>
  );
};
