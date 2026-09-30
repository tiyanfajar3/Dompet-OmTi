import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Calendar, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { TransactionType, ReceiptImage } from '../../types';
import { formatRupiah, parseRupiahInput, getTodayDateString } from '../../lib/formatters';
import { compressImage } from '../../lib/imageCompressor';
import { CategoryIcon } from '../common/CategoryIcon';

export const TransactionFormModal: React.FC = () => {
  const {
    isAddModalOpen,
    closeAddModal,
    modalDefaultType,
    editingTransaction,
    categories,
    paymentMethods,
    addTransaction,
    updateTransaction,
    addCategory,
    addPaymentMethod,
  } = useApp();

  const [type, setType] = useState<TransactionType>(modalDefaultType);
  const [nominalDisplay, setNominalDisplay] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [description, setDescription] = useState<string>('');
  const [receiptImages, setReceiptImages] = useState<ReceiptImage[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Category inline modal
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Payment Method inline modal
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Populate data when modal opens or editing
  useEffect(() => {
    if (isAddModalOpen) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount);
        setNominalDisplay(editingTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
        setDate(editingTransaction.date);
        setCategoryId(editingTransaction.categoryId);
        setPaymentMethod(editingTransaction.paymentMethod || 'Cash');
        setDescription(editingTransaction.description || '');
        setReceiptImages(editingTransaction.receiptImages || []);
      } else {
        setType(modalDefaultType);
        setAmount(0);
        setNominalDisplay('');
        setDate(getTodayDateString());
        // Default category matching type
        const firstMatching = categories.find((c) => c.type === modalDefaultType);
        setCategoryId(firstMatching ? firstMatching.id : (categories[0]?.id || ''));
        setPaymentMethod(paymentMethods[0]?.name || 'Cash');
        setDescription('');
        setReceiptImages([]);
      }
      setError(null);
    }
  }, [isAddModalOpen, editingTransaction, modalDefaultType, categories, paymentMethods]);

  // When type changes, ensure selected category matches type
  useEffect(() => {
    const currentCat = categories.find((c) => c.id === categoryId);
    if (!currentCat || currentCat.type !== type) {
      const match = categories.find((c) => c.type === type);
      if (match) {
        setCategoryId(match.id);
      }
    }
  }, [type, categories, categoryId]);

  if (!isAddModalOpen) return null;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseRupiahInput(raw);
    setAmount(parsed);
    setNominalDisplay(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const handleAddQuickAmount = (val: number) => {
    const newTotal = amount + val;
    setAmount(newTotal);
    setNominalDisplay(newTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  // Image Upload Handling
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    setError(null);
    try {
      const newImages: ReceiptImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file, 1280, 0.75);
        newImages.push({
          id: `img_${Date.now()}_${i}`,
          dataUrl: compressed.dataUrl,
          name: file.name,
          size: compressed.size,
          type: 'image/jpeg',
          timestamp: new Date().toISOString(),
        });
      }
      setReceiptImages((prev) => [...prev, ...newImages]);
    } catch {
      setError('Gagal memproses foto bukti struk');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (id: string) => {
    setReceiptImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Save Transaction directly to Cloud Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Nominal harus lebih dari Rp 0');
      return;
    }
    if (!date) {
      setError('Tanggal transaksi wajib diisi');
      return;
    }
    if (!categoryId) {
      setError('Kategori wajib dipilih');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const catName = selectedCat?.name || 'Lainnya';

      if (editingTransaction) {
        await updateTransaction({
          ...editingTransaction,
          type,
          amount,
          date,
          categoryId,
          categoryName: catName,
          paymentMethod,
          description: description.trim(),
          receiptImages,
        });
      } else {
        await addTransaction({
          type,
          amount,
          date,
          categoryId,
          categoryName: catName,
          paymentMethod,
          description: description.trim(),
          receiptImages,
        });
      }

      // Close modal ONLY after Firestore operation successfully completes
      closeAddModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaksi gagal disimpan ke database. Silakan coba kembali.';
      setError(msg);
      // Preserves all user inputs in the form
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Inline Category
  const handleSaveInlineCategory = async () => {
    if (!newCategoryName.trim()) return;
    const cat = await addCategory({
      name: newCategoryName.trim(),
      type,
      icon: 'MoreHorizontal',
      color: '#059669',
    });
    setCategoryId(cat.id);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Add Inline Payment Method
  const handleSaveInlineMethod = async () => {
    if (!newMethodName.trim()) return;
    const method = await addPaymentMethod(newMethodName.trim());
    setPaymentMethod(method.name);
    setNewMethodName('');
    setIsAddingMethod(false);
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-lg my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${type === 'expense' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              {type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTransaction ? 'Ubah Transaksi' : 'Catat Transaksi'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan keuangan untuk Tuan Muda
              </p>
            </div>
          </div>
          <button
            onClick={closeAddModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Type Switch */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Pemasukan</span>
            </button>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nominal Transaksi (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={nominalDisplay}
                onChange={handleNominalChange}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold tabular-nums text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Quick Denomination Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[50000, 100000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddQuickAmount(val)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 transition"
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(0);
                    setNominalDisplay('');
                  }}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-500 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Two Columns: Tanggal & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Kategori */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kategori
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nama kategori"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineCategory}
                    className="px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Metode Pembayaran
              </label>
              <button
                type="button"
                onClick={() => setIsAddingMethod(true)}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Metode Baru
              </button>
            </div>

            {isAddingMethod ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Contoh: BCA, Mandiri, GoPay"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveInlineMethod}
                  className="px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingMethod(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {pm.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Deskripsi / Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Deskripsi / Catatan Transaksi
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Jamuan makan malam, servis mobil, gaji, dll."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
            />
          </div>

          {/* Bukti Transaksi (Receipt Photos) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <span>Foto Bukti Transaksi (Opsional)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {receiptImages.length} foto
              </span>
            </div>

            {/* Hidden Inputs */}
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Buttons for Camera & Gallery */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ambil Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-2 px-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Pilih Galeri</span>
              </button>
            </div>

            {isCompressing && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 animate-pulse flex items-center gap-1.5">
                <span>Mengompresi bukti struk agar hemat penyimpanan...</span>
              </p>
            )}

            {/* Receipt Preview Gallery */}
            {receiptImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {receiptImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md shadow-xs opacity-90 hover:opacity-100 transition"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                      {Math.round(img.size / 1024)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-600/30 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingTransaction
                  ? 'Simpan Perubahan'
                  : 'Catat Sekarang'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
