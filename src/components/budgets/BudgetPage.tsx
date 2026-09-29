import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  PieChart, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle,
  X,
  Target
} from 'lucide-react';
import { formatRupiah, formatIndonesianMonthYear } from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

export const BudgetPage: React.FC = () => {
  const { 
    budgets, 
    categories, 
    transactions, 
    saveBudget, 
    deleteBudget 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Calculate actual spending for each category in current month
  const categorySpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        const parts = tx.date.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (y === currentYear && m === currentMonth) {
            map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
          }
        }
      }
    });
    return map;
  }, [transactions, currentYear, currentMonth]);

  // Merge budgets with spending and category details
  const budgetItems = useMemo(() => {
    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const spent = categorySpendingMap[b.categoryId] || 0;
      const remaining = b.amount - spent;
      const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percent >= 100) {
        status = 'danger';
      } else if (percent >= 80) {
        status = 'warning';
      }

      return {
        ...b,
        categoryName: cat?.name || 'Kategori',
        categoryIcon: cat?.icon || 'MoreHorizontal',
        spent,
        remaining,
        percent,
        status,
      };
    });
  }, [budgets, categories, categorySpendingMap]);

  // Overall budget progress
  const overall = useMemo(() => {
    let totalBudget = 0;
    let totalSpent = 0;
    budgetItems.forEach((b) => {
      totalBudget += b.amount;
      totalSpent += b.spent;
    });
    const totalRemaining = totalBudget - totalSpent;
    const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    return { totalBudget, totalSpent, totalRemaining, overallPercent };
  }, [budgetItems]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleOpenAddModal = (existingCategoryId?: string, existingAmount?: number) => {
    setError(null);
    if (existingCategoryId) {
      setSelectedCategoryId(existingCategoryId);
      setBudgetAmountInput(existingAmount ? existingAmount.toString() : '');
    } else {
      // Find first category without a budget
      const unusedCat = expenseCategories.find((c) => !budgets.some((b) => b.categoryId === c.id));
      setSelectedCategoryId(unusedCat ? unusedCat.id : (expenseCategories[0]?.id || ''));
      setBudgetAmountInput('');
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseInt(budgetAmountInput.replace(/[^0-9]/g, ''), 10);
    if (!selectedCategoryId) {
      setError('Pilih kategori');
      return;
    }
    if (isNaN(num) || num <= 0) {
      setError('Nominal budget harus lebih dari Rp 0');
      return;
    }

    try {
      await saveBudget(selectedCategoryId, num);
      setIsModalOpen(false);
    } catch {
      setError('Gagal menyimpan target budget');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Anggaran & Kontrol Budget
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kendalikan batas pengeluaran bulanan Tuan Muda ({formatIndonesianMonthYear(currentYear, currentMonth)})
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Atur Budget Baru</span>
        </button>
      </div>

      {/* Overall Budget Progress Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Total Penggunaan Anggaran Bulan Ini
            </span>
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
            {overall.overallPercent}% Digunakan
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              overall.overallPercent >= 100
                ? 'bg-rose-600'
                : overall.overallPercent >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(overall.overallPercent, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Terpakai:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {formatRupiah(overall.totalSpent)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Sisa Anggaran:</span>
            <span
              className={`font-bold tabular-nums ${
                overall.totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatRupiah(overall.totalRemaining)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Plafon Total:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {formatRupiah(overall.totalBudget)}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Items Grid */}
      {budgetItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <PieChart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Belum ada budget yang ditentukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Atur plafon anggaran untuk kategori seperti Makanan, Transportasi, atau Belanja agar keuangan tetap terkontrol.
          </p>
          <button
            onClick={() => handleOpenAddModal()}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
          >
            + Buat Budget Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition shadow-xs ${
                item.status === 'danger'
                  ? 'border-rose-300 dark:border-rose-900/60'
                  : item.status === 'warning'
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <CategoryIcon name={item.categoryName} className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.categoryName}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      Plafon: {formatRupiah(item.amount)}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5">
                  {item.status === 'danger' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      <span>Over Budget</span>
                    </span>
                  ) : item.status === 'warning' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Hampir Penuh</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      <span>Aman</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenAddModal(item.categoryId, item.amount)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition ml-1"
                    title="Ubah budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBudget(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Hapus budget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.status === 'danger'
                      ? 'bg-rose-500'
                      : item.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>

              {/* Numbers */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                <span>
                  Terpakai: <strong className="text-slate-900 dark:text-white tabular-nums">{formatRupiah(item.spent)}</strong>
                </span>
                <span>
                  Sisa: <strong className={`tabular-nums ${item.remaining < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{formatRupiah(item.remaining)}</strong>
                </span>
                <span className="font-bold tabular-nums">
                  {item.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Atur Plafon Budget Kategori
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Kategori Pengeluaran
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plafon Anggaran per Bulan (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={budgetAmountInput}
                    onChange={(e) => setBudgetAmountInput(e.target.value)}
                    placeholder="Contoh: 1500000"
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
                >
                  Simpan Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
