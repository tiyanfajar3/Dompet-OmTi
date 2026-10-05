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
  Building2,
  ArrowLeftRight,
  Check,
  Printer
} from 'lucide-react';
import { Transaction, ReceiptImage, TransactionType } from '../../types';
import { formatRupiah, formatIndonesianDate, parseFlexibleDate } from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';
import { storageService } from '../../lib/storage';
import { PrintReportModal } from '../reports/PrintReportModal';

export const TransactionListPage: React.FC = () => {
  const { 
    profile,
    users,
    transactions, 
    categories, 
    paymentMethods, 
    deleteTransaction, 
    updateTransaction,
    batchReassignTransactions,
    batchDeleteTransactions,
    openAddModal,
    selectedAccountFilter,
    setSelectedAccountFilter
  } = useApp();

  const isAdmin = profile?.role === 'admin';
  const currentAdminId = profile?.id || 'owner_1';

  // Filter Akun / Cabang (Khusus Admin):
  // Disinkronkan secara global dengan selectedAccountFilter pada AppContext
  const filterAccount = selectedAccountFilter;
  const setFilterAccount = setSelectedAccountFilter;

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
    storageService.getTransactions(targetQueryAccount, profile?.id)
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
      targetQueryAccount,
      profile?.id
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
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'account_asc' | 'account_desc'>('date_desc');

  // Filter expand toggle on mobile
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modals
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<ReceiptImage[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modal & Logika Pindah Akun / Cabang Transaksi (Khusus Admin)
  const [reassigningTx, setReassigningTx] = useState<Transaction | null>(null);
  const [reassignTargetAccountId, setReassignTargetAccountId] = useState<string>('owner_1');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [reassignSuccessToast, setReassignSuccessToast] = useState<string | null>(null);

  const openReassignModal = (tx: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentAcc = storageService.getTransactionAccountId(tx, profile?.id);
    const isDefault = storageService.isDefaultAdminAccount(currentAcc, profile?.id);
    setReassignTargetAccountId(isDefault ? 'owner_1' : currentAcc);
    setReassignError(null);
    setReassigningTx(tx);
  };

  const handleConfirmReassign = async () => {
    if (!reassigningTx) return;
    setIsReassigning(true);
    setReassignError(null);
    try {
      const isDefault = storageService.isDefaultAdminAccount(reassignTargetAccountId, profile?.id);
      const canonicalAccount = isDefault ? 'owner_1' : reassignTargetAccountId;

      const updated = await updateTransaction({
        ...reassigningTx,
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefault ? undefined : canonicalAccount,
      });

      // Update state kueri lokal secara realtime
      setQueriedTransactions((prev) =>
        prev.map((t) => (t.id === reassigningTx.id ? updated : t))
      );

      const targetInfo = getAccountInfo(canonicalAccount);
      setReassignSuccessToast(`Transaksi berhasil dipindahkan ke "${targetInfo.name}" secara permanen.`);
      setTimeout(() => setReassignSuccessToast(null), 3500);
      setReassigningTx(null);
    } catch (err: any) {
      setReassignError(err.message || 'Gagal memindahkan akun transaksi.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();
    const todayStr = `${curYear}-${pad(curMonth)}-${pad(curDay)}`;

    // 7 hari terakhir
    const sevenDaysAgoDate = new Date(curYear, curMonth - 1, curDay - 7);
    const sevenDaysAgoStr = `${sevenDaysAgoDate.getFullYear()}-${pad(sevenDaysAgoDate.getMonth() + 1)}-${pad(sevenDaysAgoDate.getDate())}`;

    // Gunakan data transaksi hasil kueri Firestore via getTransactions / subscribeTransactions
    // dengan fallback ke transactions dari context agar data tidak pernah kosong/flicker
    const baseList = queriedTransactions.length > 0
      ? queriedTransactions
      : (transactions.length > 0 ? transactions : queriedTransactions);

    return baseList.filter((tx) => {
      // 0. Isolasi Data Akun / Tenant & Filter Akun Khusus Admin (AND logic)
      if (!isAdmin) {
        // Akun cabang/tenant biasa HANYA boleh melihat transaksi miliknya sendiri secara otomatis
        if (!storageService.matchesAccount(tx, profile?.id || 'owner_1', profile?.id)) {
          return false;
        }
      } else {
        // Akun Admin ("Tuan Muda")
        // Default: HANYA menampilkan transaksi milik Admin itu sendiri (bersih dari transaksi cabang lain)
        // Transaksi dari akun/cabang lain HANYA akan muncul apabila Admin sengaja mengubah pilihan filter
        if (filterAccount !== 'all') {
          if (!storageService.matchesAccount(tx, filterAccount, profile?.id)) {
            return false;
          }
        }
      }

      // 1. Text Search (description, category name, payment method, atau nama akun cabang) (AND logic)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const catMatch = (tx.categoryName || '').toLowerCase().includes(q);
        const pmMatch = (tx.paymentMethod || '').toLowerCase().includes(q);
        const accountMatch = isAdmin ? getAccountInfo(tx.userId).name.toLowerCase().includes(q) : false;
        if (!descMatch && !catMatch && !pmMatch && !accountMatch) return false;
      }

      // 2. Type filter (AND logic)
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }

      // 3. Category filter (AND logic)
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) {
        return false;
      }

      // 4. Payment method filter (AND logic)
      if (filterPaymentMethod !== 'all' && tx.paymentMethod !== filterPaymentMethod) {
        return false;
      }

      // 5. Nominal Range (AND logic)
      if (minAmount && tx.amount < parseInt(minAmount, 10)) {
        return false;
      }
      if (maxAmount && tx.amount > parseInt(maxAmount, 10)) {
        return false;
      }

      // 6. Rentang Waktu (AND logic)
      // Mampu membaca berbagai format tanggal transaksi (string ISO, timestamp Firestore, milidetik, objek Date)
      // tanpa crash dan tanpa kehilangan riwayat transaksi dari bulan-bulan lalu.
      if (filterDatePreset !== 'all') {
        const parsed = parseFlexibleDate(tx.date || tx.createdAt);
        if (!parsed) {
          // Jika tanggal anomali, jangan sembunyikan transaksi dari riwayat
          return true;
        }

        const { dateStr: cleanDate, year: txYear, month: txMonth } = parsed;

        if (filterDatePreset === 'today') {
          if (cleanDate !== todayStr) return false;
        } else if (filterDatePreset === '7days') {
          if (cleanDate < sevenDaysAgoStr || cleanDate > todayStr) return false;
        } else if (filterDatePreset === 'this_month') {
          if (txYear !== curYear || txMonth !== curMonth) return false;
        } else if (filterDatePreset === 'last_month') {
          const lastM = curMonth === 1 ? 12 : curMonth - 1;
          const lastMY = curMonth === 1 ? curYear - 1 : curYear;
          if (txYear !== lastMY || txMonth !== lastM) return false;
        } else if (filterDatePreset === 'custom') {
          if (customStartDate && cleanDate < customStartDate) return false;
          if (customEndDate && cleanDate > customEndDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const parsedA = parseFlexibleDate(a.date || a.createdAt);
      const parsedB = parseFlexibleDate(b.date || b.createdAt);
      const timeA = parsedA ? parsedA.timestamp : 0;
      const timeB = parsedB ? parsedB.timestamp : 0;

      if (sortBy === 'date_desc') {
        if (timeB !== timeA) return timeB - timeA;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'date_asc') {
        if (timeA !== timeB) return timeA - timeB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      if (sortBy === 'account_asc') {
        const nameA = getAccountInfo(a.userId).name.toLowerCase();
        const nameB = getAccountInfo(b.userId).name.toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        if (cmp !== 0) return cmp;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'account_desc') {
        const nameA = getAccountInfo(a.userId).name.toLowerCase();
        const nameB = getAccountInfo(b.userId).name.toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        if (cmp !== 0) return cmp;
        return (b.date || '').localeCompare(a.date || '');
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

  // Seleksi Massal (Bulk Selection) & Batch Actions Khusus Admin
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isBatchReassignOpen, setIsBatchReassignOpen] = useState(false);
  const [batchTargetAccountId, setBatchTargetAccountId] = useState('owner_1');
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Clear selection saat filter berubah agar tidak ada transaksi tersembunyi yang terpilih tanpa sengaja
  useEffect(() => {
    setSelectedTxIds(new Set());
  }, [filterAccount, filterType, filterCategory, filterPaymentMethod, filterDatePreset, customStartDate, customEndDate, minAmount, maxAmount, searchQuery]);

  const isAllSelected = filteredTransactions.length > 0 && selectedTxIds.size >= filteredTransactions.length && filteredTransactions.every(t => selectedTxIds.has(t.id));
  const isPartiallySelected = selectedTxIds.size > 0 && !isAllSelected;

  const toggleSelectTx = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedTxIds(new Set());
  };

  const selectedSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let total = 0;
    const baseList = queriedTransactions.length > 0 ? queriedTransactions : transactions;
    baseList.forEach((t) => {
      if (selectedTxIds.has(t.id)) {
        total += t.amount;
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
    });
    return { count: selectedTxIds.size, total, income, expense };
  }, [selectedTxIds, queriedTransactions, transactions]);

  const handleConfirmBatchReassign = async () => {
    if (selectedTxIds.size === 0) return;
    setIsBatchSubmitting(true);
    setBatchError(null);
    try {
      const txIdList = Array.from(selectedTxIds);
      const isDefault = storageService.isDefaultAdminAccount(batchTargetAccountId, profile?.id);
      const canonicalAccount = isDefault ? 'owner_1' : batchTargetAccountId;

      await batchReassignTransactions(txIdList, canonicalAccount);

      // Update state kueri lokal secara realtime
      const idSet = new Set(txIdList);
      setQueriedTransactions((prev) =>
        prev.map((t) => {
          if (idSet.has(t.id)) {
            return {
              ...t,
              accountId: canonicalAccount,
              userId: canonicalAccount,
              tenantId: canonicalAccount,
              branchId: isDefault ? undefined : canonicalAccount,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      const targetInfo = getAccountInfo(canonicalAccount);
      setReassignSuccessToast(`${txIdList.length} transaksi berhasil dipindahkan ke "${targetInfo.name}" secara permanen.`);
      setTimeout(() => setReassignSuccessToast(null), 3500);
      setSelectedTxIds(new Set());
      setIsBatchReassignOpen(false);
    } catch (err: any) {
      setBatchError(err.message || 'Gagal memindahkan transaksi terpilih.');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedTxIds.size === 0) return;
    setIsBatchSubmitting(true);
    setBatchError(null);
    try {
      const txIdList = Array.from(selectedTxIds);
      await batchDeleteTransactions(txIdList);

      const idSet = new Set(txIdList);
      setQueriedTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));

      setReassignSuccessToast(`${txIdList.length} transaksi berhasil dihapus secara permanen.`);
      setTimeout(() => setReassignSuccessToast(null), 3500);
      setSelectedTxIds(new Set());
      setIsBatchDeleteOpen(false);
    } catch (err: any) {
      setBatchError(err.message || 'Gagal menghapus transaksi terpilih.');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

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
      setFilterAccount('owner_1');
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Cetak Rekap Laporan PDF (Format Buku Rekening)"
          >
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            <span>Cetak Rekap PDF</span>
          </button>

          <button
            onClick={() => openAddModal('expense')}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
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
                <option value="owner_1">
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
                  {isAdmin && (
                    <>
                      <option value="account_asc">Akun / Cabang (A - Z)</option>
                      <option value="account_desc">Akun / Cabang (Z - A)</option>
                    </>
                  )}
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

      {/* Filter Result Stats Banner & Pilih Semua */}
      <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          {/* Checkbox Pilih Semua Khusus Admin */}
          {isAdmin && filteredTransactions.length > 0 && (
            <div className="flex items-center pr-2.5 border-r border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition select-none"
                title={isAllSelected ? "Batalkan semua pilihan" : "Pilih semua transaksi"}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                  isAllSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                    : isPartiallySelected
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-500 text-indigo-600'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                }`}>
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {isPartiallySelected && <div className="w-2 h-0.5 bg-indigo-600 rounded-full" />}
                </div>
                <span>
                  {isAllSelected ? 'Batal Pilih' : 'Pilih Semua'}
                </span>
              </button>
            </div>
          )}

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
              className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                selectedTxIds.has(tx.id)
                  ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-400/50'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Left Zone: Checkbox (Admin) + Category Icon & Details */}
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {isAdmin && (
                  <div
                    className="shrink-0 pt-0.5 sm:pt-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleSelectTx(tx.id, e)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                        selectedTxIds.has(tx.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                      }`}
                      title={selectedTxIds.has(tx.id) ? "Batalkan pilihan transaksi ini" : "Pilih transaksi ini"}
                    >
                      {selectedTxIds.has(tx.id) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </div>
                )}

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
                        <button
                          type="button"
                          onClick={(e) => openReassignModal(tx, e)}
                          title="Klik untuk memindahkan transaksi ini ke akun/cabang lain"
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer hover:ring-1 hover:ring-indigo-400 ${
                            getAccountInfo(tx.userId).isSelf
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800'
                          }`}
                        >
                          {getAccountInfo(tx.userId).isSelf ? (
                            <User className="w-2.5 h-2.5" />
                          ) : (
                            <Building2 className="w-2.5 h-2.5" />
                          )}
                          <span>{getAccountInfo(tx.userId).name}</span>
                          <ArrowLeftRight className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
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
                  {isAdmin && (
                    <button
                      onClick={(e) => openReassignModal(tx, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      title="Pindahkan transaksi ke akun / cabang lain"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  )}
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
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Akun / Cabang:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {getAccountInfo(detailTx.userId).isSelf ? (
                        <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                      <span>{getAccountInfo(detailTx.userId).label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const t = detailTx;
                        setDetailTx(null);
                        openReassignModal(t);
                      }}
                      className="px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                      title="Pindahkan transaksi ini ke akun/cabang lain"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Ubah Akun</span>
                    </button>
                  </div>
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

      {/* Modal Pindah Akun / Cabang Khusus Admin */}
      {reassigningTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pindahkan Akun Transaksi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ubah kepemilikan akun / cabang transaksi ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReassigningTx(null);
                  setReassignError(null);
                }}
                disabled={isReassigning}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Transaksi yang Dipindahkan */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Deskripsi:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {reassigningTx.description || reassigningTx.categoryName || 'Transaksi'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Nominal:</span>
                <span className={`font-bold tabular-nums ${reassigningTx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {reassigningTx.type === 'income' ? '+ ' : '- '}
                  {formatRupiah(reassigningTx.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Tanggal:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatIndonesianDate(reassigningTx.date, { withDay: true })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Akun Saat Ini:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  {getAccountInfo(reassigningTx.userId).isSelf ? (
                    <User className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Building2 className="w-3 h-3 text-indigo-600" />
                  )}
                  <span>{getAccountInfo(reassigningTx.userId).name}</span>
                </span>
              </div>
            </div>

            {/* Pilihan Akun / Cabang Tujuan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Akun / Cabang Tujuan:
              </label>
              <select
                value={reassignTargetAccountId}
                onChange={(e) => setReassignTargetAccountId(e.target.value)}
                disabled={isReassigning}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border-2 border-indigo-500/70 dark:border-indigo-500/60 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <optgroup label="Akun Admin (Default)">
                  <option value="owner_1">
                    👤 {profile?.displayName || 'Tuan Muda'} (Kas Pribadi Admin)
                  </option>
                </optgroup>
                {branchUsers.length > 0 && (
                  <optgroup label="Akun Cabang / Tenant">
                    {branchUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        🏢 {u.displayName} (@{u.username})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                Data akan tersimpan permanen di Cloud Firestore. Saldo brankas dan laporan keuangan akun terkait akan langsung terhitung akurat.
              </p>
            </div>

            {reassignError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{reassignError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReassigningTx(null);
                  setReassignError(null);
                }}
                disabled={isReassigning}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                disabled={isReassigning}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isReassigning && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isReassigning ? 'Menyimpan...' : 'Simpan & Pindahkan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toolbar untuk Seleksi Massal (Khusus Admin) */}
      {isAdmin && selectedTxIds.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              {selectedTxIds.size}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>{selectedTxIds.size} Transaksi Terpilih</span>
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                Total: {formatRupiah(selectedSummary.total)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBatchTargetAccountId('owner_1');
                setBatchError(null);
                setIsBatchReassignOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Pindahkan seluruh transaksi yang dipilih ke akun/cabang lain"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Ubah Akun / Pindahkan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchError(null);
                setIsBatchDeleteOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Hapus seluruh transaksi yang dipilih"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus Terpilih</span>
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Batalkan pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog Pindah Akun Massal (Batch Transfer) */}
      {isBatchReassignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pindahkan {selectedTxIds.size} Transaksi Terpilih
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pindahkan transaksi massal ke akun / cabang tujuan
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBatchReassignOpen(false);
                  setBatchError(null);
                }}
                disabled={isBatchSubmitting}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Seleksi */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Jumlah Transaksi:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTxIds.size} transaksi terpilih
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Total Nominal:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatRupiah(selectedSummary.total)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Masuk: {formatRupiah(selectedSummary.income)}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Keluar: {formatRupiah(selectedSummary.expense)}
                </span>
              </div>
            </div>

            {/* Dropdown Akun / Cabang Tujuan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Akun / Cabang Tujuan:
              </label>
              <select
                value={batchTargetAccountId}
                onChange={(e) => setBatchTargetAccountId(e.target.value)}
                disabled={isBatchSubmitting}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border-2 border-indigo-500/70 dark:border-indigo-500/60 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <optgroup label="Akun Admin (Default)">
                  <option value="owner_1">
                    👤 {profile?.displayName || 'Tuan Muda'} (Kas Pribadi Admin)
                  </option>
                </optgroup>
                {branchUsers.length > 0 && (
                  <optgroup label="Akun Cabang / Tenant">
                    {branchUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        🏢 {u.displayName} (@{u.username})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                Seluruh {selectedTxIds.size} transaksi terpilih akan dipindahkan secara permanen ke Cloud Firestore. Laporan keuangan dan saldo brankas masing-masing akun otomatis disinkronkan.
              </p>
            </div>

            {batchError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBatchReassignOpen(false);
                  setBatchError(null);
                }}
                disabled={isBatchSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchReassign}
                disabled={isBatchSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isBatchSubmitting && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isBatchSubmitting ? 'Memindahkan...' : `Pindahkan ${selectedTxIds.size} Transaksi`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Hapus Massal (Batch Delete) */}
      {isBatchDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hapus {selectedTxIds.size} Transaksi Terpilih?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Anda akan menghapus <strong className="text-slate-800 dark:text-slate-200">{selectedTxIds.size} transaksi</strong> senilai total <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(selectedSummary.total)}</strong> secara permanen dari Cloud Firestore. Tindakan ini tidak dapat dibatalkan.
            </p>

            {batchError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBatchDeleteOpen(false);
                  setBatchError(null);
                }}
                disabled={isBatchSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isBatchSubmitting && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isBatchSubmitting ? 'Menghapus...' : `Ya, Hapus (${selectedTxIds.size})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {reassignSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{reassignSuccessToast}</span>
        </div>
      )}

      {/* Modal Cetak Rekap Laporan PDF (Buku Rekening) */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultPeriod={filterDatePreset === 'custom' ? 'custom' : filterDatePreset === 'all' ? 'all' : 'this_month'}
        defaultStartDate={customStartDate}
        defaultEndDate={customEndDate}
      />
    </div>
  );
};
