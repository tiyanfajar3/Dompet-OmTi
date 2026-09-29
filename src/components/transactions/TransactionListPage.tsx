import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Receipt, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  ChevronDown,
  Calendar,
  AlertTriangle,
  Eye,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Transaction, ReceiptImage, TransactionType } from '../../types';
import { formatRupiah, formatIndonesianDate } from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';

export const TransactionListPage: React.FC = () => {
  const { 
    transactions, 
    categories, 
    paymentMethods, 
    deleteTransaction, 
    openAddModal 
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | '7days' | 'this_month' | 'last_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  
  // Sort State
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Filter expand toggle on mobile
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modals
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<ReceiptImage[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    return transactions.filter((tx) => {
      // 1. Text Search (description, category name, payment method)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const catMatch = (tx.categoryName || '').toLowerCase().includes(q);
        const pmMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
        if (!descMatch && !catMatch && !pmMatch) return false;
      }

      // 2. Type filter
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }

      // 3. Category filter
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) {
        return false;
      }

      // 4. Payment method filter
      if (filterPaymentMethod !== 'all' && tx.paymentMethod !== filterPaymentMethod) {
        return false;
      }

      // 5. Nominal Range
      if (minAmount && tx.amount < parseInt(minAmount, 10)) {
        return false;
      }
      if (maxAmount && tx.amount > parseInt(maxAmount, 10)) {
        return false;
      }

      // 6. Date filter
      if (filterDatePreset !== 'all') {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1;

        if (filterDatePreset === 'today') {
          const nowStr = today.toISOString().split('T')[0];
          if (tx.date !== nowStr) return false;
        } else if (filterDatePreset === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (txDate < sevenDaysAgo || txDate > today) return false;
        } else if (filterDatePreset === 'this_month') {
          if (txYear !== curYear || txMonth !== curMonth) return false;
        } else if (filterDatePreset === 'last_month') {
          const lastM = curMonth === 1 ? 12 : curMonth - 1;
          const lastMY = curMonth === 1 ? curYear - 1 : curYear;
          if (txYear !== lastMY || txMonth !== lastM) return false;
        } else if (filterDatePreset === 'custom') {
          if (customStartDate && tx.date < customStartDate) return false;
          if (customEndDate && tx.date > customEndDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.createdAt.localeCompare(a.createdAt);
      }
      if (sortBy === 'date_asc') {
        const cmp = a.date.localeCompare(b.date);
        return cmp !== 0 ? cmp : a.createdAt.localeCompare(b.createdAt);
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [
    transactions,
    searchQuery,
    filterType,
    filterCategory,
    filterPaymentMethod,
    filterDatePreset,
    customStartDate,
    customEndDate,
    minAmount,
    maxAmount,
    sortBy,
  ]);

  // Aggregate stats of filtered results
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleOpenReceipts = (images: ReceiptImage[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedReceipts(images);
    setIsReceiptModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingTx) {
      await deleteTransaction(deletingTx.id);
      setDeletingTx(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterPaymentMethod('all');
    setFilterDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Riwayat Transaksi Tuan Muda
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Seluruh catatan kas masuk, keluar, dan bukti struk
          </p>
        </div>

        <button
          onClick={() => openAddModal('expense')}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Search Bar & Filter Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari deskripsi, kategori, atau metode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Filter Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3 py-2 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition ${
              isFilterOpen || filterType !== 'all' || filterCategory !== 'all' || filterDatePreset !== 'all'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(filterType !== 'all' || filterCategory !== 'all' || filterDatePreset !== 'all' || minAmount) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Filter Drawer / Panel */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Jenis Transaksi */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Jenis Transaksi
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="expense">Hanya Pengeluaran</option>
                  <option value="income">Hanya Pemasukan</option>
                </select>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kategori
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'income' ? 'Masuk' : 'Keluar'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Periode Tanggal */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rentang Waktu
                </label>
                <select
                  value={filterDatePreset}
                  onChange={(e) => setFilterDatePreset(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="custom">Pilih Rentang...</option>
                </select>
              </div>

              {/* Urutkan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Urutkan Berdasarkan
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="date_desc">Tanggal Terbaru</option>
                  <option value="date_asc">Tanggal Terlama</option>
                  <option value="amount_desc">Nominal Terbesar</option>
                  <option value="amount_asc">Nominal Terkecil</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range if active */}
            {filterDatePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Dari Tanggal</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Filter by Metode & Nominal Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Semua Metode</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{pm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nominal Min (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nominal Max (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Reset Filters */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
              >
                Reset Semua Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Result Stats Banner */}
      <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Menampilkan <strong className="text-slate-900 dark:text-white">{summary.count}</strong> transaksi
        </span>
        <div className="flex items-center gap-4 tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Masuk: {formatRupiah(summary.income)}
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Keluar: {formatRupiah(summary.expense)}
          </span>
        </div>
      </div>

      {/* Transaction List Cards */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tidak ada transaksi ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian atau ubah filter untuk menemukan transaksi Tuan Muda.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition"
          >
            Bersihkan Filter
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setDetailTx(tx)}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              {/* Left Zone: Category Icon & Details */}
              <div className="flex items-start sm:items-center gap-3 min-w-0">
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
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {tx.description || tx.categoryName || 'Transaksi'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{formatIndonesianDate(tx.date, { withDay: true })}</span>
                    <span>&middot;</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{tx.categoryName}</span>
                    <span>&middot;</span>
                    <span>{tx.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Right Zone: Nominal & Badges & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                {/* Receipt Image Badge */}
                {tx.receiptImages && tx.receiptImages.length > 0 && (
                  <button
                    onClick={(e) => handleOpenReceipts(tx.receiptImages, e)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                    title="Lihat foto bukti"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{tx.receiptImages.length} Foto</span>
                  </button>
                )}

                {/* Amount */}
                <div
                  className={`text-sm sm:text-base font-bold tabular-nums ${
                    tx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? '+ ' : '- '}
                  {formatRupiah(tx.amount)}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openAddModal(tx.type, tx)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Edit transaksi"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTx(tx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Hapus transaksi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Transaction Modal */}
      {detailTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rincian Transaksi
              </h3>
              <button
                onClick={() => setDetailTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Nominal:</span>
                <span className={`font-bold text-sm tabular-nums ${detailTx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {detailTx.type === 'income' ? '+ ' : '- '}
                  {formatRupiah(detailTx.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Jenis:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {detailTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatIndonesianDate(detailTx.date, { withDay: true })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {detailTx.categoryName || 'Lainnya'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {detailTx.paymentMethod}
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Catatan / Deskripsi:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {detailTx.description || '-'}
                </span>
              </div>

              {/* Photos inside detail */}
              {detailTx.receiptImages && detailTx.receiptImages.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-2 font-medium">
                    Foto Bukti Struk ({detailTx.receiptImages.length}):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {detailTx.receiptImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => handleOpenReceipts(detailTx.receiptImages)}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition"
                      >
                        <img src={img.dataUrl} alt="Struk" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  const tx = detailTx;
                  setDetailTx(null);
                  openAddModal(tx.type, tx);
                }}
                className="flex-1 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl transition"
              >
                Ubah Transaksi
              </button>
              <button
                onClick={() => setDetailTx(null)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hapus Transaksi Ini, Tuan Muda?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Transaksi <strong className="text-slate-800 dark:text-slate-200">{deletingTx.description || deletingTx.categoryName}</strong> senilai <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(deletingTx.amount)}</strong> akan dihapus permanen dari brankas.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer */}
      <ReceiptViewerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        images={selectedReceipts}
      />
    </div>
  );
};
