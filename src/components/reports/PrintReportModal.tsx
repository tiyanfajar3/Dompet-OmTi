import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatIndonesianDate, formatIndonesianMonthYear, parseFlexibleDate } from '../../lib/formatters';
import { storageService } from '../../lib/storage';
import { printReport, ReportPrintData, ReportPrintItem, ReportCategorySummary } from '../../lib/pdfReportGenerator';
import { Transaction } from '../../types';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod?: 'this_month' | 'last_month' | 'custom' | 'all' | 'month';
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  defaultPeriod = 'this_month',
  defaultStartDate,
  defaultEndDate,
}) => {
  const { profile, users, transactions, categories, selectedAccountFilter } = useApp();
  const isAdmin = profile?.role === 'admin';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const pad = (n: number) => String(n).padStart(2, '0');

  // Filter Mode: 'month' | 'custom' | 'this_month' | 'last_month' | 'this_year' | 'all'
  const [filterType, setFilterType] = useState<'month' | 'custom' | 'this_month' | 'last_month' | 'this_year' | 'all'>(
    defaultPeriod === 'custom' ? 'custom' : defaultPeriod === 'all' ? 'all' : 'month'
  );

  // Selected Month & Year (for 'month' mode)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Custom Dates (for 'custom' mode)
  const [customStart, setCustomStart] = useState<string>(
    defaultStartDate || `${currentYear}-${pad(currentMonth)}-01`
  );
  const [customEnd, setCustomEnd] = useState<string>(
    defaultEndDate || `${currentYear}-${pad(currentMonth)}-${pad(new Date(currentYear, currentMonth, 0).getDate())}`
  );

  // Account Filter (Admin can choose: 'all', 'owner_1', or branch ID)
  const [accountFilter, setAccountFilter] = useState<string>(
    isAdmin ? (selectedAccountFilter || 'all') : (profile?.id || 'owner_1')
  );

  // Sort Order: 'chronological' (Terlama -> Terbaru layaknya buku rekening) vs 'descending' (Terbaru -> Terlama)
  const [sortOrder, setSortOrder] = useState<'chronological' | 'descending'>('chronological');

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultPeriod === 'custom' && defaultStartDate && defaultEndDate) {
        setFilterType('custom');
        setCustomStart(defaultStartDate);
        setCustomEnd(defaultEndDate);
      } else if (defaultPeriod === 'last_month') {
        const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
        setFilterType('month');
        setSelectedYear(prevY);
        setSelectedMonth(prevM);
      } else {
        setFilterType('month');
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
      }
      setAccountFilter(isAdmin ? (selectedAccountFilter || 'all') : (profile?.id || 'owner_1'));
    }
  }, [isOpen, defaultPeriod, defaultStartDate, defaultEndDate, currentYear, currentMonth, isAdmin, selectedAccountFilter, profile?.id]);

  // Compute Active Date Range [startDate, endDate] and Period Label
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (filterType === 'month') {
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const s = `${selectedYear}-${pad(selectedMonth)}-01`;
      const e = `${selectedYear}-${pad(selectedMonth)}-${pad(lastDay)}`;
      return {
        startDate: s,
        endDate: e,
        periodLabel: formatIndonesianMonthYear(selectedYear, selectedMonth),
      };
    }

    if (filterType === 'this_month') {
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      return {
        startDate: `${currentYear}-${pad(currentMonth)}-01`,
        endDate: `${currentYear}-${pad(currentMonth)}-${pad(lastDay)}`,
        periodLabel: formatIndonesianMonthYear(currentYear, currentMonth),
      };
    }

    if (filterType === 'last_month') {
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const lastDay = new Date(prevY, prevM, 0).getDate();
      return {
        startDate: `${prevY}-${pad(prevM)}-01`,
        endDate: `${prevY}-${pad(prevM)}-${pad(lastDay)}`,
        periodLabel: formatIndonesianMonthYear(prevY, prevM),
      };
    }

    if (filterType === 'this_year') {
      return {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        periodLabel: `Tahun ${currentYear}`,
      };
    }

    if (filterType === 'all') {
      return {
        startDate: '1970-01-01',
        endDate: '2099-12-31',
        periodLabel: 'Semua Waktu (All-Time)',
      };
    }

    // Default 'custom'
    const s = customStart || `${currentYear}-01-01`;
    const e = customEnd || `${currentYear}-12-31`;
    return {
      startDate: s,
      endDate: e,
      periodLabel: `${formatIndonesianDate(s)} s/d ${formatIndonesianDate(e)}`,
    };
  }, [filterType, selectedYear, selectedMonth, customStart, customEnd, currentYear, currentMonth]);

  // Account Label & Role
  const accountInfo = useMemo(() => {
    if (accountFilter === 'all') {
      return { name: 'Semua Akun / Cabang', roleLabel: 'Konsolidasi Seluruh Cabang' };
    }
    if (accountFilter === 'owner_1' || (profile && accountFilter === profile.id && isAdmin)) {
      return { name: `${profile?.displayName || 'Tuan Muda'}`, roleLabel: 'Kas Pribadi Admin' };
    }
    const matched = users.find((u) => u.id === accountFilter);
    if (matched) {
      return { name: matched.displayName || matched.username, roleLabel: `Cabang (@${matched.username})` };
    }
    return { name: `Cabang (${accountFilter})`, roleLabel: 'Akun Cabang' };
  }, [accountFilter, users, profile, isAdmin]);

  // Process and compute Report Print Data
  const reportData = useMemo<ReportPrintData>(() => {
    // 1. Filter transactions by account
    const matchedAccountTransactions = transactions.filter((t) =>
      storageService.matchesAccount(t, accountFilter, profile?.id)
    );

    // 2. Compute Saldo Awal (All transactions strictly before startDate)
    let initialBalance = 0;
    if (filterType !== 'all') {
      matchedAccountTransactions.forEach((t) => {
        const p = parseFlexibleDate(t.date || t.createdAt);
        if (!p) return;
        if (p.dateStr < startDate) {
          if (t.type === 'income') initialBalance += t.amount;
          else initialBalance -= t.amount;
        }
      });
    }

    // 3. Filter transactions within period [startDate, endDate]
    const inPeriodTransactions = matchedAccountTransactions.filter((t) => {
      const p = parseFlexibleDate(t.date || t.createdAt);
      if (!p) return false;
      return p.dateStr >= startDate && p.dateStr <= endDate;
    });

    // 4. Sort chronologically first (oldest to newest) to calculate Running Balance correctly
    const chronoList = [...inPeriodTransactions].sort((a, b) => {
      const cmpDate = (a.date || '').localeCompare(b.date || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    let currentBalance = initialBalance;
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseCategoryMap: Record<string, { name: string; amount: number; count: number }> = {};

    const computedItems: ReportPrintItem[] = chronoList.map((tx, idx) => {
      const isIncome = tx.type === 'income';
      const inc = isIncome ? tx.amount : 0;
      const exp = isIncome ? 0 : tx.amount;

      if (isIncome) {
        currentBalance += tx.amount;
        totalIncome += tx.amount;
      } else {
        currentBalance -= tx.amount;
        totalExpense += tx.amount;

        const catName = tx.categoryName || 'Lainnya';
        if (!expenseCategoryMap[catName]) {
          expenseCategoryMap[catName] = { name: catName, amount: 0, count: 0 };
        }
        expenseCategoryMap[catName].amount += tx.amount;
        expenseCategoryMap[catName].count += 1;
      }

      const parsed = parseFlexibleDate(tx.date || tx.createdAt);
      const displayDate = parsed ? formatIndonesianDate(parsed.dateStr) : (tx.date || '-');
      const hasReceipt = Array.isArray(tx.receiptImages) && tx.receiptImages.length > 0;

      return {
        no: idx + 1,
        date: displayDate,
        rawDate: tx.date || '',
        description: tx.description || tx.categoryName || 'Transaksi',
        hasReceipt,
        categoryName: tx.categoryName || 'Lainnya',
        type: tx.type,
        incomeAmount: inc,
        expenseAmount: exp,
        runningBalance: currentBalance,
      };
    });

    // If user chose reverse order (newest first), reverse the display list while keeping accurate running balances
    const displayItems = sortOrder === 'descending' ? [...computedItems].reverse() : computedItems;

    // Reset numbers 1..N based on display order
    const finalItems = displayItems.map((item, idx) => ({
      ...item,
      no: idx + 1,
    }));

    // Top Expense Category & Breakdown
    const catList = Object.values(expenseCategoryMap).map((cat) => ({
      name: cat.name,
      amount: cat.amount,
      percentage: totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0,
      count: cat.count,
    }));
    catList.sort((a, b) => b.amount - a.amount);
    const topExpense = catList.length > 0 ? catList[0] : null;

    const finalBalance = initialBalance + totalIncome - totalExpense;
    const netCashflow = totalIncome - totalExpense;

    return {
      accountName: accountInfo.name,
      accountRoleLabel: accountInfo.roleLabel,
      periodLabel,
      startDate: filterType === 'all' ? 'Awal' : formatIndonesianDate(startDate),
      endDate: filterType === 'all' ? 'Sekarang' : formatIndonesianDate(endDate),
      generatedDate: formatIndonesianDate(now, { withDay: true }),
      generatedBy: profile?.displayName || profile?.username || 'Tuan Muda',
      initialBalance,
      totalIncome,
      totalExpense,
      finalBalance,
      netCashflow,
      items: finalItems,
      topExpenseCategory: topExpense,
      categoryBreakdown: catList,
    };
  }, [
    transactions,
    accountFilter,
    profile,
    filterType,
    startDate,
    endDate,
    sortOrder,
    accountInfo,
    periodLabel,
  ]);

  if (!isOpen) return null;

  const handlePrintClick = () => {
    printReport(reportData);
  };

  // Month Options for dropdown
  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl my-auto rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ============================================================== */}
        {/* MODAL HEADER                                                  */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Printer className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cetak Rekap Laporan PDF</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Format Buku Rekening
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih periode & akun sebelum mengunduh atau mencetak laporan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[42px] min-w-[42px]"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* FILTER & CONFIGURATION CONTROLS                                */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 bg-slate-100/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 shrink-0 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            
            {/* 1. Mode Periode */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Rentang Waktu:</span>
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="month">Pilih Bulan Tertentu</option>
                <option value="custom">Kustom Rentang Tanggal</option>
                <option value="this_month">Bulan Ini ({formatIndonesianMonthYear(currentYear, currentMonth)})</option>
                <option value="last_month">Bulan Lalu</option>
                <option value="this_year">Tahun Ini ({currentYear})</option>
                <option value="all">Semua Waktu (Lengkap)</option>
              </select>
            </div>

            {/* 2. Detail Periode (Bulan atau Tanggal Kustom) */}
            {filterType === 'month' && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Bulan & Tahun:
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 px-2 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-24 px-2 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {filterType === 'custom' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Dari Tanggal s/d Selesai:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-2 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-2 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* 3. Pilihan Akun / Cabang (Khusus Admin) */}
            {isAdmin ? (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Akun / Cabang:</span>
                </label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Semua Akun (Konsolidasi)</option>
                  <option value="owner_1">👤 {profile?.displayName || 'Tuan Muda'} (Kas Pribadi)</option>
                  {users.filter(u => u.id !== 'owner_1' && u.id !== (profile?.id || '')).map((u) => (
                    <option key={u.id} value={u.id}>🏢 {u.displayName} (@{u.username})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Akun:
                </label>
                <div className="px-3 py-1.5 font-medium bg-slate-200/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 truncate">
                  {profile?.displayName || profile?.username}
                </div>
              </div>
            )}

            {/* 4. Urutan Mutasi Transaksi */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Urutan Data:</span>
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-2.5 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="chronological">Buku Rekening (Terlama → Terbaru)</option>
                <option value="descending">Tanggal Terbaru di Atas</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LIVE A4 PAPER PREVIEW                                          */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950/70">
          <div className="max-w-4xl mx-auto bg-white text-slate-900 shadow-2xl rounded-2xl p-6 sm:p-8 border border-slate-300/80 font-sans space-y-5">
            
            {/* Header / Kop Buku Rekening */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b-2 border-emerald-600">
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  DOMPET OMTI
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide mt-0.5">
                  BUKU REKENING & REKAP LAPORAN KEUANGAN
                </div>
              </div>
              <div className="self-start px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-600 tracking-wider">
                DOKUMEN RESMI
              </div>
            </div>

            {/* Info Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500 font-medium">Akun / Entitas:</span>{' '}
                  <strong className="text-slate-900">{reportData.accountName}</strong>{' '}
                  <span className="text-[11px] text-slate-500">({reportData.accountRoleLabel})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Periode Rekap:</span>{' '}
                  <strong className="text-slate-900">{reportData.periodLabel}</strong>{' '}
                  <span className="text-slate-500">({reportData.startDate} s/d {reportData.endDate})</span>
                </div>
              </div>
              <div className="space-y-1 sm:text-right">
                <div>
                  <span className="text-slate-500 font-medium">Tanggal Cetak:</span>{' '}
                  <strong className="text-slate-900">{reportData.generatedDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Petugas:</span>{' '}
                  <strong className="text-slate-900">{reportData.generatedBy}</strong>
                </div>
              </div>
            </div>

            {/* 4 Kotak Ringkasan Saldo Rekening */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-500">Saldo Awal</div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 tabular-nums">
                  {formatRupiah(reportData.initialBalance)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Total Masuk</div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5 tabular-nums">
                  + {formatRupiah(reportData.totalIncome)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                <div className="text-[10px] font-bold uppercase text-rose-700">Total Keluar</div>
                <div className="text-sm sm:text-base font-extrabold text-rose-700 mt-0.5 tabular-nums">
                  - {formatRupiah(reportData.totalExpense)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300">
                <div className="text-[10px] font-bold uppercase text-emerald-800">Saldo Akhir</div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-900 mt-0.5 tabular-nums">
                  {formatRupiah(reportData.finalBalance)}
                </div>
              </div>
            </div>

            {/* Tabel Buku Rekening Transaksi */}
            <div className="border border-slate-300 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-900">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Tanggal</th>
                    <th className="py-2.5 px-3">Keterangan Transaksi</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Masuk (Rp)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Keluar (Rp)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap font-bold">Saldo (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Baris Saldo Awal */}
                  <tr className="bg-slate-100 font-medium italic text-slate-700">
                    <td className="py-2 px-3 text-center">-</td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">{reportData.startDate}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">SALDO AWAL PERIODE</td>
                    <td className="py-2 px-3 text-slate-500">Saldo Bawaan</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums text-slate-900">
                      {formatRupiah(reportData.initialBalance)}
                    </td>
                  </tr>

                  {/* Baris Data Transaksi */}
                  {reportData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Tidak ada transaksi pada periode yang dipilih ({reportData.startDate} s/d {reportData.endDate}).
                      </td>
                    </tr>
                  ) : (
                    reportData.items.map((item) => (
                      <tr key={item.no} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 text-center tabular-nums text-slate-500">{item.no}</td>
                        <td className="py-2 px-3 whitespace-nowrap tabular-nums text-slate-700">{item.date}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <div>{item.description}</div>
                          {item.hasReceipt && (
                            <span className="text-[10px] font-semibold text-indigo-600 block mt-0.5">
                              *Gambar terlampir
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">{item.categoryName}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                          {item.incomeAmount > 0 ? formatRupiah(item.incomeAmount) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                          {item.expenseAmount > 0 ? formatRupiah(item.expenseAmount) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(item.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right">TOTAL MUTASI PERIODE</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                      {formatRupiah(reportData.totalIncome)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-rose-700 whitespace-nowrap">
                      {formatRupiah(reportData.totalExpense)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-900 whitespace-nowrap font-extrabold">
                      {formatRupiah(reportData.finalBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Catatan Kaki Lampiran Struk */}
            <div className="text-[11px] text-slate-500 italic">
              *<strong>Catatan Lampiran</strong>: Keterangan <em>*Gambar terlampir</em> menandakan struk/bukti fisik telah diarsipkan secara digital di brankas aplikasi Dompet Omti dan tidak dimuat dalam lembar cetak demi kebersihan dan efisiensi dokumen.
            </div>

            {/* ========================================================== */}
            {/* BAGIAN ANALISIS KEUANGAN (DI BAGIAN BAWAH)                  */}
            {/* ========================================================== */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-emerald-600 pb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Analisis Keuangan Periode</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Analisis Arus Kas & Laba Bersih */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">1. Arus Kas & Laba Bersih</div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Pemasukan:</span>
                    <strong className="text-emerald-700">{formatRupiah(reportData.totalIncome)}</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Pengeluaran:</span>
                    <strong className="text-rose-700">{formatRupiah(reportData.totalExpense)}</strong>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-slate-800">Laba / Selisih Bersih:</span>
                    <span className={reportData.netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {reportData.netCashflow > 0 ? '+ ' : ''}{formatRupiah(reportData.netCashflow)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {reportData.netCashflow >= 0
                      ? 'Status keuangan surplus. Pemasukan lebih besar daripada pengeluaran pada rentang waktu ini.'
                      : 'Status keuangan defisit. Pengeluaran melebihi pemasukan pada rentang waktu ini.'}
                  </div>
                </div>

                {/* Analisis Kategori Pengeluaran Terbesar (Top Expense) */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">2. Kategori Pengeluaran Terbesar</div>
                  {reportData.topExpenseCategory ? (
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-rose-700 text-sm">{reportData.topExpenseCategory.name}</span>
                        <strong className="text-slate-900">{formatRupiah(reportData.topExpenseCategory.amount)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Porsi <strong>{reportData.topExpenseCategory.percentage}%</strong> dari seluruh pengeluaran ({reportData.topExpenseCategory.count} kali transaksi).
                      </div>
                      
                      {reportData.categoryBreakdown.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                          <div className="text-[10px] font-semibold text-slate-500">Kategori Lainnya:</div>
                          {reportData.categoryBreakdown.slice(1, 4).map((c) => (
                            <div key={c.name} className="flex justify-between text-[11px] text-slate-700">
                              <span>{c.name}</span>
                              <span className="tabular-nums font-medium">{formatRupiah(c.amount)} ({c.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">
                      Belum ada catatan pengeluaran pada periode ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Lembar Pengesahan */}
            <div className="flex justify-between items-end pt-3 border-t border-slate-200 text-xs text-slate-500">
              <div className="max-w-md text-[11px]">
                Dicetak secara otomatis melalui aplikasi <strong>Dompet Omti</strong>. Saldo dan riwayat mutasi telah disinkronkan dengan database Cloud Firestore.
              </div>
              <div className="text-center min-w-[140px]">
                <div className="text-[11px] text-slate-600 mb-8">Petugas Pembukuan,</div>
                <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                  {reportData.generatedBy}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL FOOTER ACTIONS                                          */}
        {/* ============================================================== */}
        <div className="px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            Menampilkan <strong className="text-slate-900 dark:text-white">{reportData.items.length}</strong> transaksi buku rekening
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Tutup / Kembali
            </button>

            <button
              type="button"
              onClick={handlePrintClick}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Printer className="w-4 h-4 stroke-[2.3]" />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
