import React, { useState, useMemo, useEffect } from 'react';
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
  DollarSign,
  Users,
  User,
  Building2
} from 'lucide-react';
import { Transaction, ReceiptImage, TransactionType } from '../../types';
import { formatRupiah, formatIndonesianDate } from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';
import { storageService } from '../../lib/storage';

export const TransactionListPage: React.FC = () => {
  const { 
    profile,
    users,
    transactions, 
    categories, 
    paymentMethods, 
    deleteTransaction, 
    openAddModal 
  } = useApp();

  const isAdmin = profile?.role === 'admin';
  const currentAdminId = profile?.id || 'owner_1';

  // Filter Akun / Cabang (Khusus Admin):
  // Default: HANYA menampilkan transaksi milik Admin sendiri (bersih dari transaksi cabang lain)
  const [filterAccount, setFilterAccount] = useState<string>(() => currentAdminId);

  // Sinkronisasi otomatis saat profile selesai dimuat
  useEffect(() => {
    if (profile?.id && profile?.role === 'admin') {
      setFilterAccount((prev) => (prev === 'owner_1' || prev === 'me' ? profile.id : prev));
    }
  }, [profile?.id, profile?.role]);

  // Akun target kueri data transaksi dari Firestore:
  // - Mode "Semua Akun / Cabang" (all): mengambil SEMUA data transaksi dari Firestore tanpa membatasi user/akun
  // - Mode akun/cabang spesifik: kueri memfilter transaksi berdasarkan accountId / tenantId yang sesuai
  // - Mode Akun Cabang biasa: kueri selalu memfilter transaksi milik akun sendiri
  const targetQueryAccount = useMemo(() => {
    if (!isAdmin) return profile?.id || 'owner_1';
    return filterAccount; // 'all', 'owner_1', atau ID akun cabang
  }, [isAdmin, profile?.id, filterAccount]);

  // State data transaksi dari hasil kueri Firestore langsung via getTransactions & subscribeTransactions
  const [queriedTransactions, setQueriedTransactions] = useState<Transaction[]>([]);
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(true);

  // Jalankan pemanggilan getTransactions dan subscribeTransactions saat targetQueryAccount berubah
  useEffect(() => {
    let isMounted = true;
    setIsQueryLoading(true);

    // 1. Ambil data transaksi awal dengan filter accountId ('all' = tanpa pembatasan)
    storageService.getTransactions(targetQueryAccount)
      .then((items) => {
        if (isMounted) {
          setQueriedTransactions(items);
          setIsQueryLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error saat memuat getTransactions:', err);
        if (isMounted) setIsQueryLoading(false);
      });

    // 2. Hubungkan sinkronisasi realtime dengan subscribeTransactions
    const unsubscribe = storageService.subscribeTransactions(
      (items) => {
        if (isMounted) {
          setQueriedTransactions(items);
          setIsQueryLoading(false);
        }
      },
      (err) => {
        console.error('Error pada subscribeTransactions:', err);
        if (isMounted) setIsQueryLoading(false);
      },
      targetQueryAccount
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetQueryAccount]);

  // Daftar akun cabang (selain akun Admin saat ini)
  const branchUsers = useMemo(() => {
    const adminId = profile?.id || 'owner_1';
    return users.filter((u) => u.id !== adminId && u.id !== 'owner_1');
  }, [users, profile?.id]);

  // Helper info akun pemilik transaksi
  const getAccountInfo = (userId?: string) => {
    const uid = userId || 'owner_1';
    if (profile && (uid === profile.id || (profile.id === 'owner_1' && uid === 'owner_1'))) {
      return {
        name: profile.displayName || profile.username || 'Tuan Muda',
        role: profile.role,
        isSelf: true,
        label: `${profile.displayName || 'Tuan Muda'} (Admin - Kas Pribadi)`
      };
    }
    const matched = users.find((u) => u.id === uid);
    if (matched) {
      return {
        name: matched.displayName || matched.username,
        role: matched.role,
        isSelf: false,
        label: `${matched.displayName} (@${matched.username})`
      };
    }
    if (uid === 'owner_1') {
      return {
        name: 'Tuan Muda',
        role: 'admin' as const,
        isSelf: false,
        label: 'Tuan Muda (Admin)'
      };
    }
    return {
      name: `Cabang (${uid.substring(0, 6)})`,
      role: 'user' as const,
      isSelf: false,
      label: `Akun Cabang (${uid})`
    };
  };

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<ReceiptImage[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    // Gunakan data transaksi hasil kueri Firestore via getTransactions / subscribeTransactions
    const baseList = queriedTransactions.length > 0 || !isQueryLoading ? queriedTransactions : transactions;

    return baseList.filter((tx) => {
      const txOwnerId = tx.userId || tx.accountId || tx.tenantId || 'owner_1';

      // 0. Isolasi Data Akun / Tenant & Filter Akun Khusus Admin
      if (!isAdmin) {
        // Akun cabang/tenant biasa HANYA boleh melihat transaksi miliknya sendiri secara otomatis
        if (txOwnerId !== profile?.id) {
          return false;
        }
      } else {
        // Akun Admin ("Tuan Muda")
        // Default: HANYA menampilkan transaksi milik Admin itu sendiri (bersih dari transaksi cabang lain)
        // Transaksi dari akun/cabang lain HANYA akan muncul apabila Admin sengaja mengubah pilihan filter
        if (filterAccount !== 'all') {
          const targetAdminId = profile?.id || 'owner_1';
          const isTargetingAdmin = filterAccount === targetAdminId || filterAccount === 'owner_1';

          if (isTargetingAdmin) {
            // Cocokkan transaksi milik Admin (baik ID admin saat ini maupun fallback default owner_1)
            const isTxAdmin = txOwnerId === targetAdminId || txOwnerId === 'owner_1';
            if (!isTxAdmin) return false;
          } else {
            // Admin sengaja memilih cabang tertentu
            if (txOwnerId !== filterAccount) return false;
          }
        }
      }

      // 1. Text Search (description, category name, payment method, atau nama akun cabang)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const catMatch = (tx.categoryName || '').toLowerCase().includes(q);
        const pmMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
        const accountMatch = isAdmin ? getAccountInfo(tx.userId).name.toLowerCase().includes(q) : false;
        if (!descMatch && !catMatch && !pmMatch && !accountMatch) return false;
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
    queriedTransactions,
    transactions,
    isQueryLoading,
    filterAccount,
    isAdmin,
    profile?.id,
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
      setIsDeleting(true);
      setDeleteError(null);
      try {
        await deleteTransaction(deletingTx.id);
        setDeletingTx(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaksi gagal dihapus dari database.';
        setDeleteError(msg);
      } finally {
        setIsDeleting(false);
      }
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
    // Khusus Admin: reset ke akun Admin sendiri (default awal yang bersih dari transaksi cabang)
    if (isAdmin) {
      setFilterAccount(profile?.id || 'owner_1');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAdmin 
              ? `Riwayat Transaksi ${profile?.displayName || 'Tuan Muda'}` 
              : `Riwayat Transaksi ${profile?.displayName || 'Cabang'}`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAdmin 
              ? 'Kelola transaksi kas pribadi dan monitor transaksi seluruh akun cabang' 
              : 'Seluruh catatan transaksi keuangan akun Anda'}
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

      {/* Khusus Akun Admin: Elemen Dropdown Filter Akun / Tenant */}
      {isAdmin && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Filter Akun Transaksi
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Akses Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {filterAccount === 'all'
                  ? 'Menampilkan transaksi konsolidasi dari SELURUH cabang/akun'
                  : (filterAccount === (profile?.id || 'owner_1') || filterAccount === 'owner_1')
                    ? 'Default: Hanya menampilkan transaksi kas pribadi Admin (bersih dari transaksi cabang)'
                    : `Menampilkan transaksi khusus akun cabang: ${getAccountInfo(filterAccount).name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border-2 border-emerald-500/70 dark:border-emerald-500/60 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
            >
              <optgroup label="Akun Admin (Default)">
                <option value={profile?.id || 'owner_1'}>
                  👤 {profile?.displayName || 'Tuan Muda'} (Kas Pribadi Admin)
                </option>
              </optgroup>
              <optgroup label="Konsolidasi Seluruh Akun">
                <option value="all">
                  🌐 Semua Akun / Cabang
                </option>
              </optgroup>
              {branchUsers.length > 0 && (
                <optgroup label="Akun Cabang / Tenant Tertentu">
                  {branchUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      🏢 {u.displayName} (@{u.username})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      )}

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
              isFilterOpen || filterType !== 'all' || filterCategory !== 'all' || filterDatePreset !== 'all' || (isAdmin && filterAccount !== (profile?.id || 'owner_1') && filterAccount !== 'owner_1')
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {(filterType !== 'all' || filterCategory !== 'all' || filterDatePreset !== 'all' || minAmount || (isAdmin && filterAccount !== (profile?.id || 'owner_1') && filterAccount !== 'owner_1')) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Filter Drawer / Panel */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5`}>
              {/* Filter Akun untuk Admin di dalam Drawer */}
              {isAdmin && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Akun / Cabang
                  </label>
                  <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value={profile?.id || 'owner_1'}>
                      👤 {profile?.displayName || 'Tuan Muda'} (Admin - Default)
                    </option>
                    <option value="all">🌐 Semua Akun / Cabang</option>
                    {branchUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        🏢 {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">
            Menampilkan <strong className="text-slate-900 dark:text-white">{summary.count}</strong> transaksi
          </span>
          {isAdmin && (
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>
                {filterAccount === 'all'
                  ? 'Semua Akun'
                  : (filterAccount === (profile?.id || 'owner_1') || filterAccount === 'owner_1')
                    ? 'Kas Pribadi Admin'
                    : getAccountInfo(filterAccount).name}
              </span>
            </span>
          )}
        </div>
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
      {isQueryLoading && queriedTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Mengambil data transaksi dari Cloud Firestore...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Menyinkronkan data kueri akun secara realtime
          </p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tidak ada transaksi ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {isAdmin && (filterAccount === (profile?.id || 'owner_1') || filterAccount === 'owner_1')
              ? 'Belum ada transaksi di akun kas pribadi Admin, atau ubah filter akun untuk melihat transaksi cabang.'
              : 'Coba sesuaikan kata kunci pencarian atau ubah filter untuk menemukan transaksi yang dicari.'}
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
                    {isAdmin && (
                      <>
                        <span>&middot;</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          getAccountInfo(tx.userId).isSelf
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800'
                        }`}>
                          {getAccountInfo(tx.userId).isSelf ? (
                            <User className="w-2.5 h-2.5" />
                          ) : (
                            <Building2 className="w-2.5 h-2.5" />
                          )}
                          <span>{getAccountInfo(tx.userId).name}</span>
                        </span>
                      </>
                    )}
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
              {isAdmin && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Akun / Cabang:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {getAccountInfo(detailTx.userId).isSelf ? (
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <span>{getAccountInfo(detailTx.userId).label}</span>
                  </span>
                </div>
              )}
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
              Transaksi <strong className="text-slate-800 dark:text-slate-200">{deletingTx.description || deletingTx.categoryName}</strong> senilai <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(deletingTx.amount)}</strong> akan dihapus permanen dari brankas Cloud Firestore.
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setDeletingTx(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
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
