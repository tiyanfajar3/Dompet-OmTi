import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Search, 
  HandCoins, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Eye, 
  Check,
  Calendar,
  FileText,
  Loader2
} from 'lucide-react';
import { Debt, DebtStatus, ReceiptImage } from '../../types';
import { formatRupiah, parseRupiahInput, formatIndonesianDate, getTodayDateString } from '../../lib/formatters';
import { compressImage } from '../../lib/imageCompressor';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';

export const DebtsPage: React.FC = () => {
  const { debts, addDebt, updateDebt, deleteDebt, profile } = useApp();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('all');
  const [sortBy, setSortBy] = useState<'due_asc' | 'due_desc' | 'amount_desc' | 'amount_asc' | 'created_desc'>('due_asc');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Form Fields
  const [borrowerName, setBorrowerName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DebtStatus>('unpaid');
  const [proofUrl, setProofUrl] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Proof viewer modal
  const [viewerImages, setViewerImages] = useState<ReceiptImage[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState('');

  // Statistics
  const stats = useMemo(() => {
    let unpaidTotal = 0;
    let paidTotal = 0;
    const borrowerSet = new Set<string>();

    const debtMap = new Map<string, Debt>();
    debts.forEach((debt) => {
      if (debt && debt.id) {
        debtMap.set(debt.id, debt);
      }
    });
    const uniqueDebts = Array.from(debtMap.values());

    uniqueDebts.forEach((debt) => {
      if (debt.borrowerName && debt.borrowerName.trim()) {
        borrowerSet.add(debt.borrowerName.trim().toLowerCase());
      }
      if (debt.status === 'unpaid') {
        unpaidTotal += debt.amount || 0;
      } else {
        paidTotal += debt.amount || 0;
      }
    });

    return {
      unpaidTotal,
      paidTotal,
      borrowerCount: borrowerSet.size,
      totalCount: uniqueDebts.length,
      unpaidCount: uniqueDebts.filter(d => d.status === 'unpaid').length,
      paidCount: uniqueDebts.filter(d => d.status === 'paid').length,
    };
  }, [debts]);

  // Filtered & Sorted Debts
  const filteredDebts = useMemo(() => {
    const debtMap = new Map<string, Debt>();
    debts.forEach((debt) => {
      if (debt && debt.id) {
        debtMap.set(debt.id, debt);
      }
    });
    const uniqueDebts = Array.from(debtMap.values());

    return uniqueDebts
      .filter((debt) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (debt.borrowerName || '').toLowerCase().includes(q);
          const matchNotes = (debt.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && debt.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due_asc') {
          return (a.dueDate || '').localeCompare(b.dueDate || '');
        }
        if (sortBy === 'due_desc') {
          return (b.dueDate || '').localeCompare(a.dueDate || '');
        }
        if (sortBy === 'amount_desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'amount_asc') {
          return a.amount - b.amount;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [debts, searchQuery, statusFilter, sortBy]);

  // Open Form Modal for Create
  const handleOpenCreate = () => {
    setEditingDebt(null);
    setBorrowerName('');
    setAmountStr('');
    setDueDate(getTodayDateString());
    setNotes('');
    setStatus('unpaid');
    setProofUrl(undefined);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setBorrowerName(debt.borrowerName);
    setAmountStr(formatRupiah(debt.amount).replace('Rp ', ''));
    setDueDate(debt.dueDate);
    setNotes(debt.notes || '');
    setStatus(debt.status);
    setProofUrl(debt.proofUrl);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Handle Image Upload with Compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Harap pilih file gambar (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      setFormError(null);
      const compressed = await compressImage(file, 1200, 0.75);
      setProofUrl(compressed.dataUrl);
    } catch (err: unknown) {
      console.error('Error compressing debt proof image:', err);
      setFormError('Gagal memproses gambar bukti. Silakan coba lagi.');
    } finally {
      setIsCompressing(false);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  // Handle Form Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = borrowerName.trim();
    const parsedAmount = parseRupiahInput(amountStr);

    if (!cleanName) {
      setFormError('Nama peminjam wajib diisi.');
      return;
    }
    if (parsedAmount <= 0) {
      setFormError('Nominal piutang harus lebih besar dari 0.');
      return;
    }
    if (!dueDate) {
      setFormError('Tanggal jatuh tempo wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingDebt) {
        await updateDebt({
          ...editingDebt,
          borrowerName: cleanName,
          amount: parsedAmount,
          dueDate,
          notes: notes.trim(),
          status,
          proofUrl: proofUrl || undefined,
        });
      } else {
        await addDebt({
          userId: profile?.id || 'owner_1',
          borrowerName: cleanName,
          amount: parsedAmount,
          dueDate,
          notes: notes.trim(),
          status,
          proofUrl: proofUrl || undefined,
        });
      }
      setIsFormModalOpen(false);
    } catch (err: unknown) {
      console.error('Failed to save debt:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan piutang.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick toggle status (Lunas / Belum Lunas)
  const handleToggleStatus = async (debt: Debt) => {
    try {
      const nextStatus: DebtStatus = debt.status === 'paid' ? 'unpaid' : 'paid';
      await updateDebt({
        ...debt,
        status: nextStatus,
      });
    } catch (err) {
      console.error('Failed to toggle debt status:', err);
    }
  };

  // Open Proof Preview Viewer
  const handlePreviewProof = (debt: Debt) => {
    if (!debt.proofUrl) return;
    setViewerImages([
      {
        id: debt.id,
        dataUrl: debt.proofUrl,
        name: `bukti-piutang-${debt.borrowerName.replace(/\s+/g, '_')}.jpg`,
        size: 0,
        type: 'image/jpeg',
        timestamp: debt.createdAt || new Date().toISOString(),
      },
    ]);
    setViewerTitle(`Bukti Piutang - ${debt.borrowerName}`);
    setIsViewerOpen(true);
  };

  // Delete Debt
  const handleDeleteConfirm = async () => {
    if (!deletingDebt) return;
    setIsDeleting(true);
    try {
      await deleteDebt(deletingDebt.id);
      setDeletingDebt(null);
    } catch (err) {
      console.error('Failed to delete debt:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const todayStr = getTodayDateString();

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <HandCoins className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Catatan Piutang
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau pinjaman uang yang Anda berikan, tenggat jatuh tempo, dan bukti transaksi peminjam.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Catat Piutang Baru
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Piutang Belum Lunas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Belum Lunas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatRupiah(stats.unpaidTotal)}
            </div>
            <div className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium flex items-center gap-1">
              <span>{stats.unpaidCount} catatan belum diselesaikan</span>
            </div>
          </div>
        </div>

        {/* Card 2: Jumlah Peminjam */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jumlah Peminjam
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.borrowerCount} <span className="text-base font-medium text-slate-500 dark:text-slate-400">Orang</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total {stats.totalCount} riwayat pinjaman
            </div>
          </div>
        </div>

        {/* Card 3: Total Piutang Sudah Lunas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sudah Lunas
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatRupiah(stats.paidTotal)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {stats.paidCount} catatan telah selesai dibayar
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama peminjam atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({debts.length})
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'unpaid'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              Belum Lunas ({stats.unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              Lunas ({stats.paidCount})
            </button>
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
          >
            <option value="due_asc">Jatuh Tempo Terdekat</option>
            <option value="due_desc">Jatuh Tempo Terjauh</option>
            <option value="amount_desc">Nominal Terbesar</option>
            <option value="amount_asc">Nominal Terkecil</option>
            <option value="created_desc">Terbaru Dicatat</option>
          </select>
        </div>
      </div>

      {/* Debts Table & Cards */}
      {filteredDebts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {searchQuery || statusFilter !== 'all' ? 'Tidak Ada Catatan yang Cocok' : 'Belum Ada Catatan Piutang'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Coba sesuaikan kata kunci pencarian atau ubah filter status piutang Anda.'
              : 'Mulai catat uang yang dipinjam oleh kerabat atau rekanan beserta bukti foto dan jatuh temponya.'}
          </p>
          {(searchQuery || statusFilter !== 'all') ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
            >
              Reset Filter
            </button>
          ) : (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Piutang Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Peminjam</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4">Jatuh Tempo</th>
                  <th className="py-3.5 px-4">Catatan</th>
                  <th className="py-3.5 px-4">Bukti</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredDebts.map((debt) => {
                  const isPaid = debt.status === 'paid';
                  const isOverdue = !isPaid && debt.dueDate < todayStr;
                  const isDueToday = !isPaid && debt.dueDate === todayStr;

                  return (
                    <tr
                      key={debt.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Peminjam */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {debt.borrowerName.substring(0, 2)}
                          </div>
                          <div>
                            <p className="leading-tight">{debt.borrowerName}</p>
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                              Dicatat: {formatIndonesianDate(debt.createdAt.split('T')[0], { shortMonth: true })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nominal */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatRupiah(debt.amount)}
                      </td>

                      {/* Jatuh Tempo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className={`text-xs font-medium ${
                            isOverdue 
                              ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                              : isDueToday 
                              ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {formatIndonesianDate(debt.dueDate, { shortMonth: true })}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                            Terlambat
                          </span>
                        )}
                        {isDueToday && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            Hari Ini
                          </span>
                        )}
                      </td>

                      {/* Catatan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {debt.notes ? (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={debt.notes}>
                            {debt.notes}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Bukti Foto */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {debt.proofUrl ? (
                          <button
                            onClick={() => handlePreviewProof(debt)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
                            title="Lihat Foto Bukti"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Tidak ada</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(debt)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                          }`}
                          title={`Klik untuk ubah status ke ${isPaid ? 'Belum Lunas' : 'Lunas'}`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Lunas
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              Belum Lunas
                            </>
                          )}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleStatus(debt)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title={isPaid ? 'Tandai Belum Lunas' : 'Tandai Sudah Lunas'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(debt)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit Catatan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingDebt(debt)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {filteredDebts.map((debt) => {
              const isPaid = debt.status === 'paid';
              const isOverdue = !isPaid && debt.dueDate < todayStr;
              const isDueToday = !isPaid && debt.dueDate === todayStr;

              return (
                <div key={debt.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                        {debt.borrowerName.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                          {debt.borrowerName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Tempo: {formatIndonesianDate(debt.dueDate, { shortMonth: true })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-base text-slate-900 dark:text-white">
                        {formatRupiah(debt.amount)}
                      </div>
                      <button
                        onClick={() => handleToggleStatus(debt)}
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPaid ? 'Lunas' : 'Belum Lunas'}
                      </button>
                    </div>
                  </div>

                  {/* Overdue alert badge on mobile */}
                  {isOverdue && (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Jatuh tempo terlewati ({formatIndonesianDate(debt.dueDate)})</span>
                    </div>
                  )}
                  {isDueToday && (
                    <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Jatuh tempo hari ini!</span>
                    </div>
                  )}

                  {/* Notes snippet */}
                  {debt.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                      {debt.notes}
                    </p>
                  )}

                  {/* Proof button and actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div>
                      {debt.proofUrl ? (
                        <button
                          onClick={() => handlePreviewProof(debt)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Lihat Bukti Foto
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Tanpa bukti foto</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(debt)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingDebt(debt)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Piutang */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingDebt ? 'Edit Catatan Piutang' : 'Catat Piutang Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama Peminjam */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Peminjam <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Contoh: Budi Santoso, Om Heri"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Jumlah Nominal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nominal Piutang (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => {
                      const num = parseRupiahInput(e.target.value);
                      setAmountStr(num > 0 ? num.toLocaleString('id-ID') : '');
                    }}
                    className="w-full pl-11 pr-4 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Tanggal Jatuh Tempo & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isSubmitting}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status Pelunasan
                  </label>
                  <select
                    value={status}
                    disabled={isSubmitting}
                    onChange={(e) => setStatus(e.target.value as DebtStatus)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="unpaid">Belum Lunas</option>
                    <option value="paid">Sudah Lunas</option>
                  </select>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="Contoh: Untuk keperluan renovasi rumah, janji transfer via BCA"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Lampiran Bukti Foto (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lampiran Bukti Transaksi / Chat (Opsional)
                </label>

                {proofUrl ? (
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={proofUrl}
                        alt="Bukti Piutang"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Foto bukti terlampir
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Telah dikompresi otomatis
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setViewerImages([
                            {
                              id: 'temp_proof',
                              dataUrl: proofUrl,
                              name: 'bukti-piutang.jpg',
                              size: 0,
                              type: 'image/jpeg',
                              timestamp: new Date().toISOString(),
                            },
                          ]);
                          setViewerTitle('Pratinjau Bukti Piutang');
                          setIsViewerOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        title="Lihat Pratinjau"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setProofUrl(undefined)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition disabled:opacity-50"
                        title="Hapus Bukti"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing || isSubmitting}
                      className="hidden"
                    />
                    {isCompressing ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengompresi gambar...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1 transition" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          Klik untuk upload foto bukti transfer / perjanjian
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          JPG, PNG, atau WebP (otomatis dikompres)
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingDebt ? 'Perbarui Piutang' : 'Simpan Piutang'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hapus Catatan Piutang?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan piutang atas nama{' '}
              <strong className="text-slate-800 dark:text-slate-200">{deletingDebt.borrowerName}</strong> sebesar{' '}
              <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(deletingDebt.amount)}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingDebt(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-xl shadow-xs shadow-rose-600/20 transition cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Viewer Lightbox Modal */}
      <ReceiptViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={viewerImages}
        title={viewerTitle}
      />
    </div>
  );
};
