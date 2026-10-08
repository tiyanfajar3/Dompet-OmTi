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
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Wallet,
  Receipt,
  Coins
} from 'lucide-react';
import { Debt, DebtStatus, DebtType, ReceiptImage } from '../../types';
import { formatRupiah, parseRupiahInput, formatIndonesianDate, getTodayDateString } from '../../lib/formatters';
import { compressImage } from '../../lib/imageCompressor';
import { ReceiptViewerModal } from '../common/ReceiptViewerModal';

export const DebtsPage: React.FC = () => {
  const { 
    debts, 
    addDebt, 
    updateDebt, 
    deleteDebt, 
    reduceDebtBalance, 
    addTransaction,
    categories,
    paymentMethods, 
    profile 
  } = useApp();

  // Active Category Section: 'all' | 'utang' | 'piutang' | 'tagihan'
  const [activeSection, setActiveSection] = useState<'all' | DebtType>('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('all');
  const [sortBy, setSortBy] = useState<'due_asc' | 'due_desc' | 'amount_desc' | 'amount_asc' | 'created_desc'>('due_asc');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<DebtType>('utang');
  const [title, setTitle] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [remainingAmountStr, setRemainingAmountStr] = useState('');
  const [monthlyInstallmentStr, setMonthlyInstallmentStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DebtStatus>('unpaid');
  const [proofUrl, setProofUrl] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Payment Modal State
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payDate, setPayDate] = useState(getTodayDateString());
  const [payNotes, setPayNotes] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Delete modal state
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Proof viewer modal
  const [viewerImages, setViewerImages] = useState<ReceiptImage[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState('');

  // Deduplicated debts
  const uniqueDebts = useMemo(() => {
    const map = new Map<string, Debt>();
    debts.forEach((debt) => {
      if (debt && debt.id) {
        map.set(debt.id, {
          ...debt,
          type: debt.type || 'piutang',
          remainingAmount: typeof debt.remainingAmount === 'number' ? debt.remainingAmount : debt.amount,
        });
      }
    });
    return Array.from(map.values());
  }, [debts]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalUtang = 0;
    let sisaUtang = 0;
    let totalCicilanUtang = 0;
    let utangCount = 0;
    let utangUnpaidCount = 0;

    let totalPiutang = 0;
    let sisaPiutang = 0;
    let piutangCount = 0;
    let piutangUnpaidCount = 0;

    let totalTagihan = 0;
    let sisaTagihan = 0;
    let tagihanCount = 0;
    let tagihanUnpaidCount = 0;

    uniqueDebts.forEach((d) => {
      const type = d.type || 'piutang';
      const total = d.amount || 0;
      const rem = typeof d.remainingAmount === 'number' ? d.remainingAmount : total;
      const isUnpaid = d.status === 'unpaid';

      if (type === 'utang') {
        totalUtang += total;
        if (isUnpaid) sisaUtang += rem;
        if (isUnpaid && d.monthlyInstallment) totalCicilanUtang += d.monthlyInstallment;
        utangCount++;
        if (isUnpaid) utangUnpaidCount++;
      } else if (type === 'tagihan') {
        totalTagihan += total;
        if (isUnpaid) sisaTagihan += rem;
        tagihanCount++;
        if (isUnpaid) tagihanUnpaidCount++;
      } else {
        // Piutang
        totalPiutang += total;
        if (isUnpaid) sisaPiutang += rem;
        piutangCount++;
        if (isUnpaid) piutangUnpaidCount++;
      }
    });

    return {
      totalUtang,
      sisaUtang,
      totalCicilanUtang,
      utangCount,
      utangUnpaidCount,
      totalPiutang,
      sisaPiutang,
      piutangCount,
      piutangUnpaidCount,
      totalTagihan,
      sisaTagihan,
      tagihanCount,
      tagihanUnpaidCount,
      totalKewajiban: sisaUtang + sisaTagihan,
    };
  }, [uniqueDebts]);

  // Filtered & Sorted items
  const filteredDebts = useMemo(() => {
    return uniqueDebts
      .filter((debt) => {
        const debtType = debt.type || 'piutang';

        // Section tab filter
        if (activeSection !== 'all' && debtType !== activeSection) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && debt.status !== statusFilter) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (debt.borrowerName || '').toLowerCase().includes(q);
          const matchTitle = (debt.title || '').toLowerCase().includes(q);
          const matchNotes = (debt.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchNotes) return false;
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
          return (b.remainingAmount || b.amount) - (a.remainingAmount || a.amount);
        }
        if (sortBy === 'amount_asc') {
          return (a.remainingAmount || a.amount) - (b.remainingAmount || b.amount);
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [uniqueDebts, activeSection, statusFilter, searchQuery, sortBy]);

  // Open Form Modal for Create
  const handleOpenCreate = (defaultType?: DebtType) => {
    const targetType = defaultType || (activeSection !== 'all' ? activeSection : 'utang');
    setEditingDebt(null);
    setFormType(targetType);
    setTitle('');
    setBorrowerName('');
    setAmountStr('');
    setRemainingAmountStr('');
    setMonthlyInstallmentStr('');
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
    setFormType(debt.type || 'piutang');
    setTitle(debt.title || '');
    setBorrowerName(debt.borrowerName || '');
    setAmountStr(debt.amount ? debt.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
    const rem = typeof debt.remainingAmount === 'number' ? debt.remainingAmount : debt.amount;
    setRemainingAmountStr(rem ? rem.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
    setMonthlyInstallmentStr(
      debt.monthlyInstallment ? debt.monthlyInstallment.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
    );
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
      console.error('Error compressing proof image:', err);
      setFormError('Gagal memproses gambar bukti. Silakan coba lagi.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Handle Form Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanTitle = title.trim();
    const cleanName = borrowerName.trim();
    const parsedAmount = parseRupiahInput(amountStr);
    const parsedRem = remainingAmountStr ? parseRupiahInput(remainingAmountStr) : parsedAmount;
    const parsedInstallment = monthlyInstallmentStr ? parseRupiahInput(monthlyInstallmentStr) : undefined;

    if (parsedAmount <= 0) {
      setFormError('Total nominal harus lebih dari Rp 0.');
      return;
    }

    if (formType === 'utang' && !cleanName && !cleanTitle) {
      setFormError('Nama pemberi pinjaman atau keperluan utang wajib diisi.');
      return;
    }

    if (formType === 'piutang' && !cleanName) {
      setFormError('Nama peminjam wajib diisi.');
      return;
    }

    if (formType === 'tagihan' && !cleanTitle) {
      setFormError('Nama tagihan / kewajiban wajib diisi.');
      return;
    }

    if (!dueDate) {
      setFormError('Tanggal jatuh tempo wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalRemaining = Math.max(0, parsedRem);
      const finalStatus: DebtStatus = finalRemaining <= 0 ? 'paid' : status;

      const debtPayload: Omit<Debt, 'id' | 'createdAt'> = {
        userId: profile?.id || 'owner_1',
        type: formType,
        title: cleanTitle,
        borrowerName: cleanName || cleanTitle,
        amount: parsedAmount,
        remainingAmount: finalRemaining,
        monthlyInstallment: parsedInstallment && parsedInstallment > 0 ? parsedInstallment : undefined,
        dueDate,
        notes: notes.trim(),
        status: finalStatus,
        proofUrl: proofUrl || '',
      };

      if (editingDebt) {
        await updateDebt({
          ...editingDebt,
          ...debtPayload,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDebt(debtPayload);
      }

      setIsFormModalOpen(false);
      setEditingDebt(null);
    } catch (err: unknown) {
      console.error('Error saving debt record:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan. Silakan periksa koneksi Anda.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Payment Trigger
  const handleOpenPayment = (debt: Debt) => {
    setPayingDebt(debt);
    const rem = typeof debt.remainingAmount === 'number' ? debt.remainingAmount : debt.amount;
    const defaultPay = debt.monthlyInstallment && debt.monthlyInstallment > 0 && debt.monthlyInstallment <= rem
      ? debt.monthlyInstallment
      : rem;
    setPayAmountStr(defaultPay ? defaultPay.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
    setPayMethod(paymentMethods[0]?.name || 'Cash');
    setPayDate(getTodayDateString());
    setPayNotes('');
    setPayError(null);
  };

  // Submit Quick Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || isPaying) return;

    const payVal = parseRupiahInput(payAmountStr);
    if (payVal <= 0) {
      setPayError('Nominal pembayaran harus lebih dari Rp 0.');
      return;
    }

    setIsPaying(true);
    setPayError(null);

    try {
      // 1. Find or choose matching expense category
      const targetCat = categories.find((c) => 
        c.type === 'expense' && (
          c.name.toLowerCase().includes('cicilan') || 
          c.name.toLowerCase().includes('tagihan') ||
          c.name.toLowerCase().includes('utang')
        )
      ) || categories.find((c) => c.type === 'expense') || { id: 'cat_exp_1', name: 'Tagihan' };

      const desc = payNotes.trim() || (
        payingDebt.type === 'tagihan'
          ? `Pembayaran Tagihan: ${payingDebt.title || payingDebt.borrowerName}`
          : `Cicilan Utang ke ${payingDebt.borrowerName}${payingDebt.title ? ` (${payingDebt.title})` : ''}`
      );

      // 2. Add expense transaction linked to this debt
      await addTransaction({
        type: 'expense',
        amount: payVal,
        date: payDate,
        categoryId: targetCat.id,
        categoryName: targetCat.name,
        paymentMethod: payMethod || 'Cash',
        description: desc,
        receiptImages: [],
        linkedDebtId: payingDebt.id,
        linkedDebtType: payingDebt.type || 'utang',
        linkedDebtName: payingDebt.title || payingDebt.borrowerName,
      });

      // 3. Automatically reduce debt remaining balance
      await reduceDebtBalance(payingDebt.id, payVal);

      setPayingDebt(null);
    } catch (err: unknown) {
      console.error('Error executing quick payment:', err);
      setPayError(err instanceof Error ? err.message : 'Gagal memproses pembayaran.');
    } finally {
      setIsPaying(false);
    }
  };

  // Toggle Debt Status (Lunas / Belum Lunas)
  const handleToggleStatus = async (debt: Debt) => {
    const isCurrentlyPaid = debt.status === 'paid';
    const nextStatus: DebtStatus = isCurrentlyPaid ? 'unpaid' : 'paid';
    const nextRemaining = isCurrentlyPaid 
      ? (typeof debt.remainingAmount === 'number' && debt.remainingAmount > 0 ? debt.remainingAmount : debt.amount)
      : 0;

    try {
      await updateDebt({
        ...debt,
        status: nextStatus,
        remainingAmount: nextRemaining,
        updatedAt: new Date().toISOString(),
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
        name: `bukti-${debt.type || 'dokumen'}-${(debt.borrowerName || debt.title || 'file').replace(/\s+/g, '_')}.jpg`,
        size: 0,
        type: 'image/jpeg',
        timestamp: debt.createdAt || new Date().toISOString(),
      },
    ]);
    setViewerTitle(`Bukti Dokumen - ${debt.title || debt.borrowerName}`);
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
      console.error('Failed to delete debt record:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const todayStr = getTodayDateString();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <HandCoins className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Utang, Piutang & Tagihan Wajib</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pinjaman yang harus dibayar, hak piutang Anda, serta pengingat tagihan rutin secara terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate('utang')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Catat Utang</span>
          </button>
          <button
            onClick={() => handleOpenCreate('piutang')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Catat Piutang</span>
          </button>
          <button
            onClick={() => handleOpenCreate('tagihan')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Tagihan</span>
          </button>
        </div>
      </div>

      {/* Segmented Section Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl max-w-xl">
        <button
          type="button"
          onClick={() => setActiveSection('all')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Semua</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-normal">
            {uniqueDebts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('utang')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'utang'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Utang Kita</span>
          {stats.utangUnpaidCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSection === 'utang' ? 'bg-rose-700 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'}`}>
              {stats.utangUnpaidCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('piutang')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'piutang'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          <span>Piutang (Hak)</span>
          {stats.piutangUnpaidCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSection === 'piutang' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'}`}>
              {stats.piutangUnpaidCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('tagihan')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'tagihan'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tagihan Wajib</span>
          {stats.tagihanUnpaidCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSection === 'tagihan' ? 'bg-amber-700 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'}`}>
              {stats.tagihanUnpaidCount}
            </span>
          )}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Utang Kita (Kewajiban) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              <span>Sisa Utang Kita</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
              {formatRupiah(stats.sisaUtang)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{stats.utangUnpaidCount} catatan belum lunas</span>
              {stats.totalCicilanUtang > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Cicilan: {formatRupiah(stats.totalCicilanUtang)}/bln
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Piutang (Hak Kita) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HandCoins className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sisa Piutang (Hak)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatRupiah(stats.sisaPiutang)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{stats.piutangUnpaidCount} pinjaman belum kembali</span>
              <span>Total: {formatRupiah(stats.totalPiutang)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tagihan Wajib & Kewajiban Bulanan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Tagihan Wajib Aktif</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
              {formatRupiah(stats.sisaTagihan)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{stats.tagihanUnpaidCount} tagihan perlu diselesaikan</span>
              <span>Total: {formatRupiah(stats.totalTagihan)}</span>
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
            placeholder="Cari nama orang, judul utang, atau tagihan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="paid">Sudah Lunas</option>
          </select>

          {/* Sort order */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="due_asc">Jatuh Tempo Terdekat</option>
            <option value="due_desc">Jatuh Tempo Terjauh</option>
            <option value="amount_desc">Nominal Tertinggi</option>
            <option value="amount_asc">Nominal Terendah</option>
            <option value="created_desc">Terbaru Dibuat</option>
          </select>
        </div>
      </div>

      {/* Debt / Bill Cards Grid */}
      {filteredDebts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <HandCoins className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tidak ada data yang ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || activeSection !== 'all'
              ? 'Tidak ada catatan yang cocok dengan filter atau kata kunci pencarian Anda.'
              : 'Belum ada catatan utang, piutang, maupun tagihan wajib tersimpan di brankas ini.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => handleOpenCreate('utang')}
              className="px-3.5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 cursor-pointer"
            >
              + Catat Utang
            </button>
            <button
              onClick={() => handleOpenCreate('piutang')}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer"
            >
              + Catat Piutang
            </button>
            <button
              onClick={() => handleOpenCreate('tagihan')}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 cursor-pointer"
            >
              + Tagihan Wajib
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDebts.map((item) => {
            const itemType = item.type || 'piutang';
            const isUtang = itemType === 'utang';
            const isTagihan = itemType === 'tagihan';
            const isPiutang = itemType === 'piutang';

            const total = item.amount || 0;
            const remaining = typeof item.remainingAmount === 'number' ? item.remainingAmount : total;
            const paid = Math.max(0, total - remaining);
            const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;

            const isPaid = item.status === 'paid' || remaining <= 0;
            const isOverdue = !isPaid && item.dueDate && item.dueDate < todayStr;
            const isDueToday = !isPaid && item.dueDate && item.dueDate === todayStr;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 relative ${
                  isPaid
                    ? 'border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/10'
                    : isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Header: Type Badge & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                      isUtang
                        ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                        : isTagihan
                        ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                        : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                    }`}>
                      {isUtang && <CreditCard className="w-3 h-3" />}
                      {isTagihan && <FileText className="w-3 h-3" />}
                      {isPiutang && <HandCoins className="w-3 h-3" />}
                      <span>{isUtang ? 'Utang Kita' : isTagihan ? 'Tagihan Wajib' : 'Piutang'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      title="Klik untuk mengubah status"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                        isPaid
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800'
                          : isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Lunas</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>{isOverdue ? 'Lewat Tempo' : isDueToday ? 'Hari Ini' : 'Belum Lunas'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Title & Person Name */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {item.title || item.borrowerName}
                    </h3>
                    {item.title && item.borrowerName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                        <span>Pihak: {item.borrowerName}</span>
                      </p>
                    )}
                  </div>

                  {/* Financial Figures & Progress */}
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isPaid ? 'Total Nilai:' : 'Sisa Belum Dibayar:'}
                      </span>
                      <span className={`text-base font-bold tabular-nums ${
                        isPaid 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : isUtang 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {formatRupiah(isPaid ? total : remaining)}
                      </span>
                    </div>

                    {!isPaid && total !== remaining && (
                      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                        <span>Total: {formatRupiah(total)}</span>
                        <span>Terbayar: {formatRupiah(paid)} ({progressPercent}%)</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPaid 
                            ? 'bg-emerald-500' 
                            : isUtang 
                            ? 'bg-rose-500' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Monthly Installment info (for utang) */}
                    {item.monthlyInstallment && item.monthlyInstallment > 0 && !isPaid && (
                      <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-500" />
                          <span>Target Cicilan:</span>
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          {formatRupiah(item.monthlyInstallment)} / bulan
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Due Date Indicator */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jatuh tempo:</span>
                    <span className={`font-semibold ${
                      isOverdue 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : isDueToday 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {formatIndonesianDate(item.dueDate)}
                    </span>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {item.proofUrl && (
                      <button
                        type="button"
                        onClick={() => handlePreviewProof(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                        title="Lihat foto bukti"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Ubah data"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingDebt(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                      title="Hapus data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Action: Bayar / Cicil (Khusus Utang & Tagihan belum lunas) */}
                  {!isPaid && (isUtang || isTagihan) && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(item)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Bayar / Cicil</span>
                    </button>
                  )}

                  {!isPaid && isPiutang && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tandai Lunas</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH / UBAH CATATAN                            */}
      {/* ======================================================== */}
      {isFormModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {editingDebt 
                      ? 'Ubah Catatan' 
                      : formType === 'utang' 
                      ? 'Catat Utang Baru' 
                      : formType === 'tagihan' 
                      ? 'Catat Tagihan Wajib Baru' 
                      : 'Catat Piutang Baru'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Isi data kewajiban, hak piutang, atau jadwal tagihan dengan rapi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Segmented Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jenis Catatan
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('utang')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === 'utang'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Utang Kita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('piutang')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === 'piutang'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Piutang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('tagihan')}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formType === 'tagihan'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tagihan Wajib</span>
                  </button>
                </div>
              </div>

              {/* Two Column Names: Title & Party Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formType === 'utang' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Pemberi Pinjaman <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        placeholder="Contoh: Ayah, Bank Mandiri, Budi"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Keperluan / Judul Utang
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Contoh: Modal Usaha, Renovasi Rumah"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                      />
                    </div>
                  </>
                ) : formType === 'tagihan' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Tagihan / Kewajiban <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Contoh: Biaya Nafkah Keluarga, SPP"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Pihak / Penerima (Opsional)
                      </label>
                      <input
                        type="text"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        placeholder="Contoh: Keluarga, Sekolah, PLN"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Peminjam <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        placeholder="Contoh: Budi Santoso, Rekan Kerja"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Keperluan / Judul Piutang
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Contoh: Pinjaman Darurat, Talangan"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Total Nominal & Sisa Saldo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountStr}
                      onChange={(e) => {
                        const parsed = parseRupiahInput(e.target.value);
                        setAmountStr(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                        if (!editingDebt || !remainingAmountStr) {
                          setRemainingAmountStr(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                        }
                      }}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 tabular-nums"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sisa Belum Dibayar (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={remainingAmountStr}
                      onChange={(e) => {
                        const parsed = parseRupiahInput(e.target.value);
                        setRemainingAmountStr(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                      }}
                      placeholder="Sama dengan total nominal"
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Installment & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formType === 'utang' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Cicilan Bulanan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={monthlyInstallmentStr}
                        onChange={(e) => {
                          const parsed = parseRupiahInput(e.target.value);
                          setMonthlyInstallmentStr(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                        }}
                        placeholder="Contoh: 1.500.000 / bln"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500 tabular-nums"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status Pelunasan
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as DebtStatus)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="unpaid">Belum Lunas</option>
                      <option value="paid">Sudah Lunas</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      required
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan, kesepakatan, nomor rekening, dll."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Bukti Foto Dokumen / Perjanjian */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Foto Bukti Dokumen / Perjanjian (Opsional)
                </label>
                {proofUrl ? (
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={proofUrl} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        Foto Bukti Terlampir
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofUrl(undefined)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-500 hover:border-emerald-500 dark:hover:border-emerald-500 transition cursor-pointer bg-slate-50/50 dark:bg-slate-800/30">
                    {isCompressing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>{isCompressing ? 'Mengompres foto...' : 'Unggah Foto Bukti'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDebt ? 'Simpan Perubahan' : 'Simpan Catatan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BAYAR / CICIL LANGSUNG                           */}
      {/* ======================================================== */}
      {payingDebt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPayingDebt(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Bayar {payingDebt.type === 'tagihan' ? 'Tagihan Wajib' : 'Utang'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {payingDebt.title || payingDebt.borrowerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 text-xs">
              {payError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Debt overview box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Sisa Saldo Saat Ini:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatRupiah(typeof payingDebt.remainingAmount === 'number' ? payingDebt.remainingAmount : payingDebt.amount)}
                  </span>
                </div>
                {payingDebt.monthlyInstallment && (
                  <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-400">
                    <span>Target Cicilan Bulanan:</span>
                    <span className="font-semibold">{formatRupiah(payingDebt.monthlyInstallment)}</span>
                  </div>
                )}
              </div>

              {/* Amount to pay */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payAmountStr}
                    onChange={(e) => {
                      const parsed = parseRupiahInput(e.target.value);
                      setPayAmountStr(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                    }}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Metode Pembayaran
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.name}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tanggal Bayar
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Contoh: Cicilan bulan Oktober via transfer"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                ✓ Sistem akan otomatis mencatat pengeluaran di buku kas dan mengurangi sisa saldo utang/tagihan ini.
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPaying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Konfirmasi Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: KONFIRMASI HAPUS                                  */}
      {/* ======================================================== */}
      {deletingDebt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeletingDebt(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Catatan?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus catatan{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingDebt.title || deletingDebt.borrowerName}
                </strong>
                ? Data yang telah dihapus tidak dapat dipulihkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDebt(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Viewer Bukti */}
      <ReceiptViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={viewerImages}
        title={viewerTitle}
      />
    </div>
  );
};
