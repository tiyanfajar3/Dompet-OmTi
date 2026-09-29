import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Repeat, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  CreditCard
} from 'lucide-react';
import { RecurringFrequency, RecurringTransaction, TransactionType } from '../../types';
import { formatRupiah, formatIndonesianDate, getTodayDateString } from '../../lib/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

export const RecurringPage: React.FC = () => {
  const { 
    recurringTransactions, 
    categories, 
    paymentMethods, 
    addRecurringTransaction, 
    deleteRecurringTransaction, 
    executeRecurringNow 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleOpenAddModal = () => {
    setName('');
    setType('expense');
    setAmountInput('');
    const match = categories.find((c) => c.type === 'expense');
    setCategoryId(match ? match.id : (categories[0]?.id || ''));
    setPaymentMethod(paymentMethods[0]?.name || 'Bank');
    setFrequency('monthly');
    setStartDate(getTodayDateString());
    setEndDate('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10);
    if (!name.trim()) {
      setError('Nama transaksi rutin wajib diisi');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError('Nominal harus lebih dari Rp 0');
      return;
    }
    if (!categoryId) {
      setError('Kategori wajib dipilih');
      return;
    }

    try {
      await addRecurringTransaction({
        name: name.trim(),
        type,
        categoryId,
        amount,
        paymentMethod,
        frequency,
        startDate,
        endDate: endDate || undefined,
        active: true,
      });
      setIsModalOpen(false);
    } catch {
      setError('Gagal menyimpan transaksi rutin');
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      const tx = await executeRecurringNow(id);
      if (tx) {
        setToastMessage(`Transaksi "${tx.description}" berhasil dibukukan ke brankas.`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch {
      alert('Gagal mengeksekusi transaksi');
    } finally {
      setExecutingId(null);
    }
  };

  const frequencyLabels: Record<RecurringFrequency, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transaksi Berulang (Rutin)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jadwal pengeluaran & pemasukan otomatis Tuan Muda (Gaji, WiFi, Sewa, Cicilan)
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Rutin</span>
        </button>
      </div>

      {/* Recurring Cards */}
      {recurringTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <Repeat className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Belum ada transaksi berulang
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Jadwalkan pos rutin bulanan seperti Tagihan Listrik, Internet, Langganan, atau Gaji agar praktis dicatat.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
          >
            + Buat Transaksi Rutin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurringTransactions.map((rec) => {
            const cat = categories.find((c) => c.id === rec.categoryId);
            const isBusy = executingId === rec.id;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        rec.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      <CategoryIcon name={cat?.name || 'Repeat'} className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {rec.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cat?.name || 'Kategori'}
                        </span>
                        <span>&middot;</span>
                        <span>{frequencyLabels[rec.frequency]}</span>
                        <span>&middot;</span>
                        <span>{rec.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        rec.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {rec.type === 'income' ? '+ ' : '- '}
                      {formatRupiah(rec.amount)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400">
                    {rec.lastExecutedDate ? (
                      <span>Terakhir dicatat: {formatIndonesianDate(rec.lastExecutedDate, { shortMonth: true })}</span>
                    ) : (
                      <span>Mulai: {formatIndonesianDate(rec.startDate, { shortMonth: true })}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecute(rec.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900 rounded-lg flex items-center gap-1 transition"
                      title="Catat langsung transaksi ini ke pembukuan sekarang"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isBusy ? 'Memproses...' : 'Bukukan'}</span>
                    </button>
                    <button
                      onClick={() => deleteRecurringTransaction(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Hapus jadwal rutin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Buat Jadwal Transaksi Berulang
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Segmented Type Switch */}
              <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-1.5 rounded-lg font-semibold transition ${
                    type === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pengeluaran Rutin
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-1.5 rounded-lg font-semibold transition ${
                    type === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pemasukan Rutin
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Transaksi Rutin
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tagihan WiFi Indihome, Gaji Pokok, Cicilan Rumah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (IDR)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 385000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 font-bold tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frekuensi
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="daily" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Harian</option>
                    <option value="weekly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Mingguan</option>
                    <option value="monthly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Bulanan</option>
                    <option value="yearly" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Tahunan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
