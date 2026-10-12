import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  AlertCircle, 
  Calculator, 
  HandCoins, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Link as LinkIcon
} from 'lucide-react';
import { TransactionType, ReceiptImage, Category, PaymentMethod, UserProfile, DebtType } from '../../types';
import { parseRupiahInput, getTodayDateString, normalizeStandardDate, formatRupiah } from '../../lib/formatters';
import { compressImage } from '../../lib/imageCompressor';
import { MiniCalculator } from './MiniCalculator';
import { storageService } from '../../lib/storage';
import { CategoryIcon, getCategoryEmoji } from '../common/CategoryIcon';
import { IconPicker } from '../common/IconPicker';

// --- Sub-components memoized to prevent re-renders ---

interface TypeSwitcherProps {
  type: TransactionType;
  onSelectType: (type: TransactionType) => void;
}
const TypeSwitcherSection = React.memo<TypeSwitcherProps>(({ type, onSelectType }) => {
  return (
    <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/60 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => onSelectType('expense')}
        className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
          type === 'expense'
            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/25 dark:bg-rose-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        }`}
      >
        <ArrowUpRight className="w-4 h-4" />
        <span>Pengeluaran</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectType('income')}
        className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
          type === 'income'
            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 dark:bg-emerald-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
        }`}
      >
        <ArrowDownLeft className="w-4 h-4" />
        <span>Pemasukan</span>
      </button>
    </div>
  );
});
TypeSwitcherSection.displayName = 'TypeSwitcherSection';

interface AccountSelectorProps {
  targetUserId: string;
  onSelectUser: (id: string) => void;
  isAdmin: boolean;
  profileDisplayName: string;
  branchUsers: UserProfile[];
  isEditing: boolean;
}
const AccountSelectorSection = React.memo<AccountSelectorProps>(({
  targetUserId,
  onSelectUser,
  isAdmin,
  profileDisplayName,
  branchUsers,
  isEditing,
}) => {
  if (!isAdmin) return null;
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 text-xs">
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
        👤 Akun / Brankas:
      </span>
      <select
        value={targetUserId}
        onChange={(e) => onSelectUser(e.target.value)}
        className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 font-semibold text-xs border-0 focus:outline-hidden cursor-pointer truncate"
      >
        <optgroup label="Akun Admin (Default)">
          <option value="owner_1" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {profileDisplayName} (Kas Pribadi)
          </option>
        </optgroup>
        {branchUsers.length > 0 && (
          <optgroup label="Akun Cabang / Tenant">
            {branchUsers.map((u) => (
              <option key={u.id} value={u.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                🏢 {u.displayName} (@{u.username})
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {isEditing && (
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium shrink-0">
          Ubah
        </span>
      )}
    </div>
  );
});
AccountSelectorSection.displayName = 'AccountSelectorSection';

interface QuickAmountChipsProps {
  hasAmount: boolean;
  onAddAmount: (val: number) => void;
  onReset: () => void;
}
const QuickAmountChips = React.memo<QuickAmountChipsProps>(({
  hasAmount,
  onAddAmount,
  onReset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {[50000, 100000, 500000, 1000000].map((val) => (
        <button
          key={val}
          type="button"
          onClick={() => onAddAmount(val)}
          className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600/80 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-600 dark:hover:text-emerald-300 transition cursor-pointer shadow-2xs"
        >
          +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
        </button>
      ))}
      {hasAmount && (
        <button
          type="button"
          onClick={onReset}
          className="px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-rose-500 transition cursor-pointer"
        >
          Reset
        </button>
      )}
    </div>
  );
});
QuickAmountChips.displayName = 'QuickAmountChips';

interface CategorySelectorProps {
  categories: Category[];
  categoryId: string;
  onSelectCategory: (id: string) => void;
  onSaveNewCategory: (name: string, icon?: string) => Promise<void>;
  type: TransactionType;
}
const CategorySelectorSection = React.memo<CategorySelectorProps>(({
  categories,
  categoryId,
  onSelectCategory,
  onSaveNewCategory,
  type,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Utensils');

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const handleSave = async () => {
    if (!newName.trim()) return;
    await onSaveNewCategory(newName.trim(), newIcon);
    setNewName('');
    setNewIcon('Utensils');
    setIsAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Kategori
        </label>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setNewIcon(type === 'income' ? 'Wallet' : 'Utensils');
          }}
          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
        >
          <Plus className="w-3 h-3" /> Tambah
        </button>
      </div>

      {isAdding ? (
        <div className="flex items-center gap-1">
          <IconPicker
            value={newIcon}
            onChange={setNewIcon}
            type={type}
            compact
          />
          <input
            type="text"
            placeholder="Nama..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center">
          <div className={`absolute left-2 z-10 pointer-events-none flex items-center justify-center w-5 h-5 rounded-md ${
            type === 'income'
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
          }`}>
            <CategoryIcon name={selectedCategory?.icon || selectedCategory?.name || 'MoreHorizontal'} className="w-3 h-3" />
          </div>
          <select
            value={categoryId}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="w-full pl-8 pr-2 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition cursor-pointer truncate"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                {getCategoryEmoji(c.icon || c.name)} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
});
CategorySelectorSection.displayName = 'CategorySelectorSection';

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  paymentMethod: string;
  onSelectMethod: (name: string) => void;
  onSaveNewMethod: (name: string) => Promise<void>;
}
const PaymentMethodSelectorSection = React.memo<PaymentMethodSelectorProps>(({
  paymentMethods,
  paymentMethod,
  onSelectMethod,
  onSaveNewMethod,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSave = async () => {
    if (!newName.trim()) return;
    await onSaveNewMethod(newName.trim());
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Metode Pembayaran
        </label>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
        >
          <Plus className="w-3 h-3" /> Baru
        </button>
      </div>

      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Contoh: BCA, GoPay"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <select
          value={paymentMethod}
          onChange={(e) => onSelectMethod(e.target.value)}
          className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition cursor-pointer truncate"
        >
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              💳 {pm.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
});
PaymentMethodSelectorSection.displayName = 'PaymentMethodSelectorSection';

interface ReceiptPhotosProps {
  receiptImages: ReceiptImage[];
  isCompressing: boolean;
  onFilesSelected: (files: FileList | null) => void;
  onAddImageByUrl: (url: string) => void;
  onRemoveImage: (id: string) => void;
}
const ReceiptPhotosSection = React.memo<ReceiptPhotosProps>(({
  receiptImages,
  isCompressing,
  onFilesSelected,
  onAddImageByUrl,
  onRemoveImage,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    onAddImageByUrl(urlInput.trim());
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-slate-400" />
          <span>Foto Bukti Struk (Opsional)</span>
        </label>
        <span className="text-[10px] text-slate-400">
          {receiptImages.length} foto terlampir
        </span>
      </div>

      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="py-1.5 px-2 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Kamera</span>
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="py-1.5 px-2 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Galeri</span>
        </button>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className={`py-1.5 px-2 text-[11px] font-medium rounded-xl border flex items-center justify-center gap-1 transition cursor-pointer ${
            showUrlInput
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Tautan</span>
        </button>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-150">
          <input
            type="url"
            placeholder="Tempel tautan/URL foto..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium cursor-pointer"
          >
            Tambah
          </button>
        </div>
      )}

      {isCompressing && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
          <span>Mengompresi foto bukti struk...</span>
        </p>
      )}

      {receiptImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-1">
          {receiptImages.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(img.id)}
                className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-md shadow-xs opacity-90 hover:opacity-100 transition cursor-pointer"
                title="Hapus foto"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate text-center">
                {img.type === 'image/url' ? 'URL' : `${Math.round(img.size / 1024)} KB`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
ReceiptPhotosSection.displayName = 'ReceiptPhotosSection';

// --- Main Modal Component ---

const TransactionFormModalComponent: React.FC = () => {
  const {
    profile,
    users,
    selectedAccountFilter,
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
    debts,
    reduceDebtBalance,
  } = useApp();

  const [type, setType] = useState<TransactionType>(modalDefaultType);
  const [targetUserId, setTargetUserId] = useState<string>('owner_1');
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
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Link to Debt / Mandatory Bill payment state
  const [linkToDebt, setLinkToDebt] = useState<boolean>(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string>('');

  // Track initialization with refs to avoid resetting user input during background snapshot syncs
  const prevIsOpenRef = useRef(false);
  const prevEditingTxIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isAddModalOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const isNewlyOpened = !prevIsOpenRef.current;
    const isEditingChanged = editingTransaction?.id !== prevEditingTxIdRef.current;

    if (isNewlyOpened || isEditingChanged) {
      prevIsOpenRef.current = true;
      prevEditingTxIdRef.current = editingTransaction?.id;

      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount);
        setNominalDisplay(
          editingTransaction.amount > 0
            ? editingTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            : ''
        );
        setDate(normalizeStandardDate(editingTransaction.date));
        setCategoryId(editingTransaction.categoryId);
        setPaymentMethod(editingTransaction.paymentMethod || 'Cash');
        setDescription(editingTransaction.description || '');
        setReceiptImages(editingTransaction.receiptImages || []);
        setLinkToDebt(!!editingTransaction.linkedDebtId);
        setSelectedDebtId(editingTransaction.linkedDebtId || '');
        const acc = storageService.getTransactionAccountId(editingTransaction, profile?.id);
        const isDefault = storageService.isDefaultAdminAccount(acc, profile?.id);
        setTargetUserId(isDefault ? 'owner_1' : acc);

        // If editing transaction with advanced fields, open advanced options by default
        const hasAdvancedData = Boolean(
          (editingTransaction.description && editingTransaction.description.trim()) ||
          (editingTransaction.receiptImages && editingTransaction.receiptImages.length > 0) ||
          editingTransaction.linkedDebtId
        );
        setShowAdvanced(hasAdvancedData);
      } else {
        setType(modalDefaultType);
        setAmount(0);
        setNominalDisplay('');
        setDate(getTodayDateString());
        const firstMatching = categories.find((c) => c.type === modalDefaultType);
        setCategoryId(firstMatching ? firstMatching.id : (categories[0]?.id || ''));
        setPaymentMethod(paymentMethods[0]?.name || 'Cash');
        setDescription('');
        setReceiptImages([]);
        setLinkToDebt(false);
        setSelectedDebtId('');
        setShowAdvanced(false);
        if (profile?.role === 'admin' && selectedAccountFilter && selectedAccountFilter !== 'all') {
          setTargetUserId(selectedAccountFilter);
        } else {
          setTargetUserId('owner_1');
        }
      }
      setShowCalculator(false);
      setError(null);
    }
  }, [isAddModalOpen, editingTransaction, modalDefaultType, categories, paymentMethods, profile, selectedAccountFilter]);

  // When type changes, ensure selected category matches the new type
  useEffect(() => {
    if (!isAddModalOpen) return;
    const currentCat = categories.find((c) => c.id === categoryId);
    if (!currentCat || currentCat.type !== type) {
      const match = categories.find((c) => c.type === type);
      if (match) {
        setCategoryId(match.id);
      }
    }
  }, [type, categories, categoryId, isAddModalOpen]);

  // Memoized computations
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  const branchUsers = useMemo(
    () => users.filter((u) => u.id !== profile?.id && u.id !== 'owner_1'),
    [users, profile?.id]
  );

  // Relevant active debts/bills for current type
  const relevantObligations = useMemo(() => {
    return debts.filter((d) => {
      const isUnpaid = d.status === 'unpaid';
      const remaining = typeof d.remainingAmount === 'number' ? d.remainingAmount : d.amount;
      if (!isUnpaid || remaining <= 0) return false;
      if (type === 'income') {
        return d.type === 'piutang';
      }
      return d.type !== 'piutang'; // 'utang', 'tagihan', or default
    });
  }, [debts, type]);

  const selectedDebt = useMemo(() => {
    return debts.find((d) => d.id === selectedDebtId);
  }, [debts, selectedDebtId]);

  // Count active fields in advanced section for badge indicator
  const advancedBadgeCount = useMemo(() => {
    let count = 0;
    if (description.trim()) count++;
    if (receiptImages.length > 0) count++;
    if (linkToDebt && selectedDebtId) count++;
    return count;
  }, [description, receiptImages.length, linkToDebt, selectedDebtId]);

  const handleSelectDebt = useCallback((debtId: string) => {
    setSelectedDebtId(debtId);
    if (!debtId) return;

    const matched = debts.find((d) => d.id === debtId);
    if (!matched) return;

    // If amount is 0, auto-fill with monthly installment or remaining amount
    if (amount <= 0) {
      const suggestedAmount = matched.monthlyInstallment && matched.monthlyInstallment > 0
        ? matched.monthlyInstallment
        : (typeof matched.remainingAmount === 'number' ? matched.remainingAmount : matched.amount);
      if (suggestedAmount > 0) {
        setAmount(suggestedAmount);
        setNominalDisplay(suggestedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      }
    }

    // Auto-fill description if currently empty
    if (!description.trim()) {
      if (matched.type === 'tagihan') {
        setDescription(`Pembayaran Tagihan: ${matched.title || matched.borrowerName}`);
      } else if (matched.type === 'utang') {
        setDescription(`Pembayaran Utang ke ${matched.borrowerName}${matched.title ? ` (${matched.title})` : ''}`);
      } else {
        setDescription(`Pelunasan Piutang: ${matched.borrowerName}`);
      }
    }
  }, [debts, amount, description]);

  // Memoized event handlers
  const handleNominalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseRupiahInput(raw);
    setAmount(parsed);
    setNominalDisplay(parsed === 0 ? '' : parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  }, []);

  const handleAddQuickAmount = useCallback((val: number) => {
    setAmount((prev) => {
      const newTotal = prev + val;
      setNominalDisplay(newTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      return newTotal;
    });
  }, []);

  const handleResetAmount = useCallback(() => {
    setAmount(0);
    setNominalDisplay('');
  }, []);

  const handleApplyCalculatorValue = useCallback((val: number) => {
    setAmount(val);
    setNominalDisplay(val === 0 ? '' : val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  }, []);

  const handleCloseCalculator = useCallback(() => {
    setShowCalculator(false);
  }, []);

  const toggleCalculator = useCallback(() => {
    setShowCalculator((prev) => !prev);
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
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
  }, []);

  const handleAddImageByUrl = useCallback((url: string) => {
    if (!url) return;
    const newImage: ReceiptImage = {
      id: `img_url_${Date.now()}`,
      dataUrl: url,
      name: 'Foto Bukti (Tautan)',
      size: 0,
      type: 'image/url',
      timestamp: new Date().toISOString(),
    };
    setReceiptImages((prev) => [...prev, newImage]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setReceiptImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleSaveInlineCategory = useCallback(async (name: string, icon?: string) => {
    const cat = await addCategory({
      name,
      type,
      icon: icon || (type === 'income' ? 'Wallet' : 'Utensils'),
      color: type === 'income' ? '#10b981' : '#f97316',
    });
    setCategoryId(cat.id);
  }, [addCategory, type]);

  const handleSaveInlineMethod = useCallback(async (name: string) => {
    const method = await addPaymentMethod(name);
    setPaymentMethod(method.name);
  }, [addPaymentMethod]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

      const finalDate = normalizeStandardDate(date);
      const targetAcc = profile?.role === 'admin' 
        ? targetUserId 
        : (editingTransaction ? storageService.getTransactionAccountId(editingTransaction, profile?.id) : (profile?.id || 'owner_1'));
      const isDefaultAccount = storageService.isDefaultAdminAccount(targetAcc, profile?.id);
      const canonicalAccount = isDefaultAccount ? 'owner_1' : targetAcc;

      let linkedDebtId: string | undefined = undefined;
      let linkedDebtType: DebtType | undefined = undefined;
      let linkedDebtName: string | undefined = undefined;

      if (linkToDebt && selectedDebtId) {
        const debtObj = debts.find((d) => d.id === selectedDebtId);
        if (debtObj) {
          linkedDebtId = debtObj.id;
          linkedDebtType = debtObj.type || (type === 'income' ? 'piutang' : 'utang');
          linkedDebtName = debtObj.title || debtObj.borrowerName;
        }
      }

      if (editingTransaction) {
        await updateTransaction({
          ...editingTransaction,
          type,
          amount,
          date: finalDate,
          categoryId,
          categoryName: catName,
          paymentMethod,
          description: description.trim(),
          receiptImages,
          linkedDebtId,
          linkedDebtType,
          linkedDebtName,
          userId: canonicalAccount,
          accountId: canonicalAccount,
          branchId: isDefaultAccount ? undefined : canonicalAccount,
          tenantId: canonicalAccount,
        });
      } else {
        await addTransaction({
          type,
          amount,
          date: finalDate,
          categoryId,
          categoryName: catName,
          paymentMethod,
          description: description.trim(),
          receiptImages,
          linkedDebtId,
          linkedDebtType,
          linkedDebtName,
          userId: canonicalAccount,
          accountId: canonicalAccount,
          branchId: isDefaultAccount ? undefined : canonicalAccount,
          tenantId: canonicalAccount,
        });

        // Automatically reduce the remaining balance of the debt/bill
        if (linkedDebtId && amount > 0) {
          await reduceDebtBalance(linkedDebtId, amount);
        }
      }

      // Close modal automatically on successful save
      closeAddModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaksi gagal disimpan ke database. Silakan coba kembali.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    date,
    categoryId,
    categories,
    profile,
    targetUserId,
    editingTransaction,
    type,
    paymentMethod,
    description,
    receiptImages,
    linkToDebt,
    selectedDebtId,
    debts,
    reduceDebtBalance,
    updateTransaction,
    addTransaction,
    closeAddModal,
  ]);

  if (!isAddModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl transition-colors ${
              type === 'expense' 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {type === 'expense' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {editingTransaction 
                  ? 'Ubah Transaksi' 
                  : (type === 'expense' ? 'Catat Pengeluaran' : 'Catat Pemasukan')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dompet Omti · Kelola Keuangan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAddModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="px-4 py-3.5 sm:px-5 sm:py-4 overflow-y-auto space-y-3 sm:space-y-3.5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Struktur Tab Jenis Transaksi (Pengeluaran: Rose | Pemasukan: Emerald) */}
          <TypeSwitcherSection type={type} onSelectType={setType} />

          {/* Akun / Brankas Target (Khusus Admin) */}
          <AccountSelectorSection
            targetUserId={targetUserId}
            onSelectUser={setTargetUserId}
            isAdmin={profile?.role === 'admin'}
            profileDisplayName={profile?.displayName || 'Tuan Muda'}
            branchUsers={branchUsers}
            isEditing={!!editingTransaction}
          />

          {/* 2. Input Utama 1: Nominal / Jumlah (Rp) - Font Paling Menonjol & Besar */}
          <div className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
            type === 'expense'
              ? 'bg-rose-50/30 dark:bg-slate-800/60 border-rose-200/80 dark:border-rose-950/60 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
              : 'bg-emerald-50/30 dark:bg-slate-800/60 border-emerald-200/80 dark:border-emerald-950/60 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Nominal Transaksi (Rp)
              </label>
              <button
                type="button"
                onClick={toggleCalculator}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  showCalculator
                    ? (type === 'expense' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white')
                    : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-600'
                }`}
              >
                <Calculator className="w-3 h-3" />
                <span>{showCalculator ? 'Tutup' : 'Kalkulator'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2 pt-1 pb-0.5">
              <span className={`text-lg sm:text-xl font-black ${
                type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={nominalDisplay}
                onChange={handleNominalChange}
                placeholder="0"
                autoFocus
                className="w-full text-2xl sm:text-3xl font-black tracking-tight tabular-nums bg-transparent border-0 p-0 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-0"
              />
            </div>

            {/* Quick Amount Chips */}
            <QuickAmountChips
              hasAmount={amount > 0}
              onAddAmount={handleAddQuickAmount}
              onReset={handleResetAmount}
            />

            {/* Interactive Mini Calculator */}
            {showCalculator && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-150">
                <MiniCalculator
                  initialValue={amount}
                  onApplyValue={handleApplyCalculatorValue}
                  onClose={handleCloseCalculator}
                />
              </div>
            )}
          </div>

          {/* 2. Input Utama 2: Kategori & Metode Pembayaran (Rapat dalam 2 Kolom Sejajar) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <CategorySelectorSection
              categories={filteredCategories}
              categoryId={categoryId}
              onSelectCategory={setCategoryId}
              onSaveNewCategory={handleSaveInlineCategory}
              type={type}
            />
            <PaymentMethodSelectorSection
              paymentMethods={paymentMethods}
              paymentMethod={paymentMethod}
              onSelectMethod={setPaymentMethod}
              onSaveNewMethod={handleSaveInlineMethod}
            />
          </div>

          {/* 2. Input Utama 3: Tanggal Transaksi (Datepicker Ringkas) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Transaksi
              </label>
              {date !== getTodayDateString() && (
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Set Hari Ini
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 transition cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Seksi "Opsi Lanjutan" (Menu Lipat / Collapsible) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Opsi Lanjutan</span>
                {advancedBadgeCount > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                    type === 'expense'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {advancedBadgeCount} aktif
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <span>{showAdvanced ? 'Tutup' : 'Buka'}</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {showAdvanced && (
              <div className="mt-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3 animate-in fade-in duration-150">
                {/* 3.1. Catatan / Keterangan Transaksi */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan / Keterangan
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Makan siang dengan klien, belanja stok, dll."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 resize-none transition"
                  />
                </div>

                {/* 3.2. Unggah / Tautan Foto Bukti Struk */}
                <ReceiptPhotosSection
                  receiptImages={receiptImages}
                  isCompressing={isCompressing}
                  onFilesSelected={handleFiles}
                  onAddImageByUrl={handleAddImageByUrl}
                  onRemoveImage={removeImage}
                />

                {/* 3.3. Tautan ke Utang / Tagihan */}
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={linkToDebt}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLinkToDebt(checked);
                        if (!checked) {
                          setSelectedDebtId('');
                        } else if (relevantObligations.length > 0 && !selectedDebtId) {
                          handleSelectDebt(relevantObligations[0].id);
                        }
                      }}
                      className={`w-4 h-4 rounded cursor-pointer ${
                        type === 'expense'
                          ? 'text-rose-600 focus:ring-rose-500'
                          : 'text-emerald-600 focus:ring-emerald-500'
                      } border-slate-300 dark:border-slate-600`}
                    />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <HandCoins className={`w-3.5 h-3.5 ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span>
                        {type === 'expense'
                          ? 'Tautkan ke Pembayaran Utang / Tagihan'
                          : 'Tautkan ke Pelunasan Piutang'}
                      </span>
                    </div>
                  </label>

                  {linkToDebt && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                      {relevantObligations.length === 0 ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {type === 'expense'
                            ? 'Tidak ada catatan utang atau tagihan aktif yang belum lunas.'
                            : 'Tidak ada catatan piutang aktif yang belum lunas.'}
                        </p>
                      ) : (
                        <>
                          <select
                            value={selectedDebtId}
                            onChange={(e) => handleSelectDebt(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition cursor-pointer truncate"
                          >
                            <option value="">
                              -- Pilih {type === 'expense' ? 'Utang atau Tagihan' : 'Piutang'} --
                            </option>
                            {relevantObligations.map((d) => {
                              const rem = typeof d.remainingAmount === 'number' ? d.remainingAmount : d.amount;
                              const typeLabel = d.type === 'tagihan' ? '📋 Tagihan' : (d.type === 'piutang' ? '🤝 Piutang' : '💸 Utang');
                              const nameLabel = d.title ? `${d.title} (${d.borrowerName})` : d.borrowerName;
                              const installmentLabel = d.monthlyInstallment ? ` · Cicilan: ${formatRupiah(d.monthlyInstallment)}/bln` : '';
                              return (
                                <option key={d.id} value={d.id}>
                                  {typeLabel}: {nameLabel} - Sisa: {formatRupiah(rem)}{installmentLabel}
                                </option>
                              );
                            })}
                          </select>

                          {selectedDebt && (
                            <div className={`p-2.5 rounded-lg text-[11px] flex items-start gap-2 ${
                              type === 'expense'
                                ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                            }`}>
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`} />
                              <div>
                                <p className="font-semibold">
                                  {selectedDebt.type === 'tagihan' ? 'Tagihan Wajib' : (selectedDebt.type === 'piutang' ? 'Piutang' : 'Utang')} terpilih: {selectedDebt.title || selectedDebt.borrowerName}
                                </p>
                                <p className="mt-0.5 opacity-90">
                                  Sisa saldo: <strong>{formatRupiah(typeof selectedDebt.remainingAmount === 'number' ? selectedDebt.remainingAmount : selectedDebt.amount)}</strong>
                                  {selectedDebt.monthlyInstallment ? ` (Target cicilan: ${formatRupiah(selectedDebt.monthlyInstallment)}/bulan)` : ''}
                                </p>
                                <p className="text-[10px] mt-1 opacity-80">
                                  ✓ Saldo akan otomatis berkurang secara real-time saat transaksi disimpan.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions (Sticky at Bottom) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 ${
                type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/25'
              }`}
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

export const TransactionFormModal = React.memo(TransactionFormModalComponent);
export const AddTransactionModal = TransactionFormModal;
export default TransactionFormModal;
