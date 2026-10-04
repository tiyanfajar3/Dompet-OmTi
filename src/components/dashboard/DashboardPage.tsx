import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Calendar, 
  ChevronRight,
  Receipt,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Layers,
  Sparkles,
  HandCoins
} from 'lucide-react';
import { 
  formatRupiah, 
  getGreetingForTuanMuda, 
  formatIndonesianDate, 
  formatIndonesianMonthYear 
} from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';
import { ReceiptImage, Transaction } from '../../types';

export const DashboardPage: React.FC = () => {
  const { 
    profile, 
    transactions, 
    categories, 
    budgets, 
    debts,
    openAddModal, 
    setActiveTab 
  } = useApp();

  const [selectedReceipts, setSelectedReceipts] = useState<ReceiptImage[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTitle, setReceiptTitle] = useState('Bukti Struk');

  // Debts statistics for dashboard reminder
  const unpaidDebts = useMemo(() => debts.filter(d => d.status === 'unpaid'), [debts]);
  const unpaidDebtsTotal = useMemo(() => unpaidDebts.reduce((sum, d) => sum + d.amount, 0), [unpaidDebts]);

  // Greeting & Date with dynamic user displayName and fallback
  const userDisplayName = profile?.displayName?.trim() || profile?.username?.trim() || 'Tuan Muda';
  const { greeting, periodText } = getGreetingForTuanMuda(userDisplayName);
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  // Filter transactions for the current month
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return y === currentYear && m === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  // Overall Financial Calculations
  const stats = useMemo(() => {
    // All-time balance
    let allTimeIncome = 0;
    let allTimeExpense = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'income') allTimeIncome += tx.amount;
      else allTimeExpense += tx.amount;
    });
    const currentBalance = allTimeIncome - allTimeExpense;

    // This month income & expense
    let monthIncome = 0;
    let monthExpense = 0;
    let largestExpenseAmount = 0;
    let largestExpenseItem: Transaction | null = null;

    const expenseCategoryMap: Record<string, { name: string; amount: number; count: number; color: string }> = {};

    currentMonthTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        monthIncome += tx.amount;
      } else {
        monthExpense += tx.amount;
        if (tx.amount > largestExpenseAmount) {
          largestExpenseAmount = tx.amount;
          largestExpenseItem = tx;
        }

        const cat = categories.find((c) => c.id === tx.categoryId);
        const catName = cat?.name || tx.categoryName || 'Lainnya';
        const catColor = cat?.color || '#059669';

        if (!expenseCategoryMap[catName]) {
          expenseCategoryMap[catName] = { name: catName, amount: 0, count: 0, color: catColor };
        }
        expenseCategoryMap[catName].amount += tx.amount;
        expenseCategoryMap[catName].count += 1;
      }
    });

    const netCashflow = monthIncome - monthExpense;
    const largestExpenseDescription = largestExpenseItem
      ? ((largestExpenseItem as Transaction).description || (largestExpenseItem as Transaction).categoryName || 'Pengeluaran')
      : 'Belum ada pengeluaran';

    // Top Category by Amount
    const categoryList = Object.values(expenseCategoryMap);
    categoryList.sort((a, b) => b.amount - a.amount);
    const topExpenseCategory = categoryList[0] || null;

    // Top Category by Frequency
    const frequencyList = [...categoryList].sort((a, b) => b.count - a.count);
    const topFrequentCategory = frequencyList[0] || null;

    // Budget this month
    let totalBudget = 0;
    let budgetedExpense = 0;
    budgets.forEach((b) => {
      totalBudget += b.amount;
      const catSpend = expenseCategoryMap[categories.find((c) => c.id === b.categoryId)?.name || '']?.amount || 0;
      budgetedExpense += catSpend;
    });

    const budgetPercent = totalBudget > 0 ? Math.min(Math.round((budgetedExpense / totalBudget) * 100), 100) : 0;

    return {
      currentBalance,
      monthIncome,
      monthExpense,
      netCashflow,
      largestExpenseAmount,
      largestExpenseDescription,
      topExpenseCategory,
      topFrequentCategory,
      categoryList,
      frequencyList,
      totalBudget,
      budgetedExpense,
      budgetPercent,
    };
  }, [transactions, currentMonthTransactions, categories, budgets]);

  // Top 5 Largest Expenses this month
  const top5Expenses = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [currentMonthTransactions]);

  // Daily Trend Data for Current Month
  const dailySpendingTrend = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: { day: number; amount: number }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, amount: 0 });
    }

    currentMonthTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        const d = parseInt(tx.date.split('-')[2], 10);
        if (d >= 1 && d <= daysInMonth) {
          days[d - 1].amount += tx.amount;
        }
      }
    });

    const maxDaySpend = Math.max(...days.map((d) => d.amount), 1);
    return { days, maxDaySpend };
  }, [currentMonthTransactions, currentYear, currentMonth]);

  // Recent 5 Transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const viewReceipt = (tx: Transaction) => {
    if (tx.receiptImages && tx.receiptImages.length > 0) {
      setSelectedReceipts(tx.receiptImages);
      setReceiptTitle(`Struk: ${tx.categoryName || 'Transaksi'} (${formatRupiah(tx.amount)})`);
      setIsReceiptModalOpen(true);
    }
  };

  // Helper for donut slice colors
  const donutColors = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', 
    '#06b6d4', '#f97316', '#14b8a6', '#ef4444', '#64748b'
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Personalized Greeting Header for Tuan Muda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-700/60 shadow-xl relative overflow-hidden">
        {/* Background glow element */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Brankas Pribadi &middot; {formatIndonesianMonthYear(currentYear, currentMonth)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {periodText} Berikut rangkuman pergerakan kas dan alokasi dana Anda bulan ini.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:self-center">
          <button
            onClick={() => openAddModal('income')}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
            <span>+ Pemasukan</span>
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-200" />
            <span>+ Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Unpaid Debts Reminder Banner */}
      {unpaidDebts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Catatan Piutang: {unpaidDebts.length} pinjaman belum lunas ({formatRupiah(unpaidDebtsTotal)})
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pantau tenggat waktu pelunasan dan konfirmasi pembayaran dari rekanan Anda.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('debts')}
            className="self-start sm:self-center px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Buka Catatan Piutang</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid: Saldo, Pemasukan, Pengeluaran, Selisih */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Saldo Saat Ini */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium">Saldo Brankas Saat Ini</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {formatRupiah(stats.currentBalance)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Akumulasi seluruh arus kas aktif
          </p>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium">Pemasukan Bulan Ini</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(stats.monthIncome)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Periode {formatIndonesianMonthYear(currentYear, currentMonth)}
          </p>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium">Pengeluaran Bulan Ini</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
            {formatRupiah(stats.monthExpense)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Total biaya operasional & pribadi
          </p>
        </div>

        {/* Selisih (Cash Flow) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium">Selisih Kas (Net)</span>
            <div className={`p-1.5 rounded-lg ${stats.netCashflow >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight tabular-nums ${stats.netCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatRupiah(stats.netCashflow)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {stats.netCashflow >= 0 ? 'Surplus kas aman terkendali' : 'Defisit kas bulan berjalan'}
          </p>
        </div>
      </div>

      {/* Secondary Highlights: Largest Expense, Top Category, Frequency & Budget Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pengeluaran Terbesar */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Pengeluaran Terbesar
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatRupiah(stats.largestExpenseAmount)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {stats.largestExpenseDescription}
          </p>
        </div>

        {/* Kategori Terbesar */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Kategori Pengeluaran Terbesar
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {stats.topExpenseCategory?.name || '-'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {stats.topExpenseCategory ? `${formatRupiah(stats.topExpenseCategory.amount)} (${Math.round((stats.topExpenseCategory.amount / (stats.monthExpense || 1)) * 100)}%)` : 'Belum ada'}
          </p>
        </div>

        {/* Kategori Paling Sering Digunakan */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Kategori Paling Sering
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {stats.topFrequentCategory?.name || '-'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {stats.topFrequentCategory ? `${stats.topFrequentCategory.count} kali transaksi` : 'Belum ada'}
          </p>
        </div>

        {/* Budget Bulan Berjalan */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Budget Bulan Berjalan</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {stats.budgetPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.budgetPercent > 90
                    ? 'bg-rose-500'
                    : stats.budgetPercent > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(stats.budgetPercent, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>Pakai: {formatRupiah(stats.budgetedExpense)}</span>
            <span>Total: {formatRupiah(stats.totalBudget)}</span>
          </div>
        </div>
      </div>

      {/* Charts Section: Pemasukan vs Pengeluaran & Donut Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Pemasukan vs Pengeluaran Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pemasukan vs Pengeluaran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perbandingan kas masuk dan keluar bulan ini
              </p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4 pt-2">
            {/* Pemasukan Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Pemasukan
                </span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatRupiah(stats.monthIncome)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-xl overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-700"
                  style={{
                    width: `${
                      stats.monthIncome + stats.monthExpense > 0
                        ? (stats.monthIncome / (stats.monthIncome + stats.monthExpense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Pengeluaran Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Pengeluaran
                </span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatRupiah(stats.monthExpense)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-xl overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-lg transition-all duration-700"
                  style={{
                    width: `${
                      stats.monthIncome + stats.monthExpense > 0
                        ? (stats.monthExpense / (stats.monthIncome + stats.monthExpense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Comparative Summary */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Rasio Pengeluaran terhadap Pemasukan:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.monthIncome > 0 ? `${Math.round((stats.monthExpense / stats.monthIncome) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Pengeluaran Berdasarkan Kategori (Visual Breakdown) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pengeluaran Berdasarkan Kategori
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribusi pos belanja dan biaya
              </p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          {stats.categoryList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada data pengeluaran bulan ini.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.categoryList.slice(0, 5).map((cat, idx) => {
                const percent = stats.monthExpense > 0 ? Math.round((cat.amount / stats.monthExpense) * 100) : 0;
                const color = donutColors[idx % donutColors.length];
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {cat.name}
                      </span>
                      <div className="tabular-nums text-right">
                        <span className="font-bold text-slate-900 dark:text-white mr-2">
                          {formatRupiah(cat.amount)}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({percent}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chart 3 & 4: Tren Pengeluaran & Top 5 Pengeluaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tren Pengeluaran Harian */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tren Pengeluaran Harian
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pola pengeluaran per hari sepanjang bulan ini
              </p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          {/* Sparkline / Bar Graph */}
          <div className="pt-2">
            <div className="h-36 flex items-end gap-1 px-1 border-b border-slate-200 dark:border-slate-800">
              {dailySpendingTrend.days.map((item) => {
                const heightPercent = dailySpendingTrend.maxDaySpend > 0
                  ? Math.max((item.amount / dailySpendingTrend.maxDaySpend) * 100, item.amount > 0 ? 8 : 2)
                  : 2;
                return (
                  <div
                    key={item.day}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-9 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded-md shadow-lg whitespace-nowrap tabular-nums">
                        Tgl {item.day}: {formatRupiah(item.amount)}
                      </div>
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        item.amount > 0
                          ? 'bg-emerald-500 group-hover:bg-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>Tgl 1</span>
              <span>Tgl 15</span>
              <span>Tgl {dailySpendingTrend.days.length}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Pengeluaran Terbesar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 5 Pengeluaran Terbesar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Item transaksi dengan nominal tertinggi bulan ini
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          {top5Expenses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada pengeluaran tercatat bulan ini.
            </div>
          ) : (
            <div className="space-y-3">
              {top5Expenses.map((tx, idx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {tx.description || tx.categoryName || 'Pengeluaran'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatIndonesianDate(tx.date, { shortMonth: true })} &middot; {tx.paymentMethod}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatRupiah(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart 5: Frekuensi Pengeluaran Berdasarkan Kategori */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Frekuensi Pengeluaran Berdasarkan Kategori
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seberapa sering Anda bertransaksi pada setiap kategori
            </p>
          </div>
        </div>

        {stats.frequencyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada data frekuensi transaksi.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.frequencyList.slice(0, 6).map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center"
              >
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {cat.count}x
                </div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {cat.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
                  {formatRupiah(cat.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ringkasan Transaksi Terbaru */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ringkasan Transaksi Terbaru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan transaksi terkini di akun Anda
            </p>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Belum ada transaksi tersimpan.
            </p>
            <button
              onClick={() => openAddModal('expense')}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            >
              + Catat Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <CategoryIcon name={tx.categoryName || 'Lainnya'} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tx.description || tx.categoryName || 'Transaksi'}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{formatIndonesianDate(tx.date, { shortMonth: true })}</span>
                      <span>&middot;</span>
                      <span>{tx.categoryName || 'Kategori'}</span>
                      <span>&middot;</span>
                      <span>{tx.paymentMethod}</span>
                      {tx.receiptImages && tx.receiptImages.length > 0 && (
                        <button
                          onClick={() => viewReceipt(tx)}
                          className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>{tx.receiptImages.length} bukti</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-xs sm:text-sm font-bold tabular-nums ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+ ' : '- '}
                    {formatRupiah(tx.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        images={selectedReceipts}
        title={receiptTitle}
      />
    </div>
  );
};
