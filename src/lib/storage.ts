import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Category, 
  PaymentMethod, 
  Transaction, 
  Budget, 
  RecurringTransaction, 
  UserProfile, 
  BackupData 
} from '../types';
import { generateSalt, hashPassword } from './crypto';
import { db, OperationType, handleFirestoreError, testFirestoreConnection, ensureAuthenticated } from './firebase';

export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'payment_methods',
  BUDGETS: 'budgets',
  RECURRING: 'recurring_transactions',
  PROFILE: 'user_profile',
} as const;

// Helper to remove any undefined fields before saving to Firestore
function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.map(item => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
      } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        clean[key] = cleanFirestoreData(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

// Initial Default Data Generators
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Makanan', icon: 'Utensils', color: '#f97316' },
  { name: 'Transportasi', icon: 'Car', color: '#3b82f6' },
  { name: 'Belanja', icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Tagihan', icon: 'Receipt', color: '#ef4444' },
  { name: 'Pulsa & Internet', icon: 'Wifi', color: '#06b6d4' },
  { name: 'Hiburan', icon: 'Film', color: '#8b5cf6' },
  { name: 'Kesehatan', icon: 'HeartPulse', color: '#10b981' },
  { name: 'Pendidikan', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Cicilan', icon: 'CreditCard', color: '#f59e0b' },
  { name: 'Kebutuhan Rumah', icon: 'Home', color: '#14b8a6' },
  { name: 'Lainnya', icon: 'MoreHorizontal', color: '#64748b' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Gaji', icon: 'Briefcase', color: '#10b981' },
  { name: 'Bonus', icon: 'Gift', color: '#059669' },
  { name: 'Usaha', icon: 'Store', color: '#0284c7' },
  { name: 'Transfer', icon: 'ArrowDownLeft', color: '#6366f1' },
  { name: 'Pendapatan Lain', icon: 'TrendingUp', color: '#8b5cf6' },
  { name: 'Lainnya', icon: 'MoreHorizontal', color: '#64748b' },
];

export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Cash', icon: 'Banknote' },
  { name: 'Bank', icon: 'Building2' },
  { name: 'E-wallet', icon: 'Smartphone' },
  { name: 'Debit', icon: 'CreditCard' },
  { name: 'Kredit', icon: 'CreditCard' },
  { name: 'Transfer', icon: 'Send' },
  { name: 'Lainnya', icon: 'Wallet' },
];

// Initialize Firestore Database with seed or verify existing data
export async function initializeDatabase(): Promise<void> {
  await ensureAuthenticated();

  try {
    // Check if Firestore already contains categories
    const catSnap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    const now = new Date().toISOString();

    // If categories do not exist, seed default categories & payment methods
    if (catSnap.empty) {
      console.info('Menginisialisasi kategori default di Firestore...');
      const batch = writeBatch(db);

      let catIndex = 1;
      for (const item of DEFAULT_EXPENSE_CATEGORIES) {
        const id = `cat_exp_${catIndex++}`;
        batch.set(doc(db, COLLECTIONS.CATEGORIES, id), {
          id,
          name: item.name,
          type: 'expense',
          icon: item.icon,
          color: item.color,
          createdAt: now,
        });
      }

      for (const item of DEFAULT_INCOME_CATEGORIES) {
        const id = `cat_inc_${catIndex++}`;
        batch.set(doc(db, COLLECTIONS.CATEGORIES, id), {
          id,
          name: item.name,
          type: 'income',
          icon: item.icon,
          color: item.color,
          createdAt: now,
        });
      }

      let pmIndex = 1;
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        const id = `pm_${pmIndex++}`;
        batch.set(doc(db, COLLECTIONS.PAYMENT_METHODS, id), {
          id,
          name: pm.name,
          icon: pm.icon,
          isCustom: false,
          createdAt: now,
        });
      }

      await batch.commit();
      console.info('Kategori default berhasil dibuat di Firestore.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'initializeDatabase');
  }
}

// Storage Public API directly backed by Cloud Firestore
export const storageService = {
  // Profile
  async getProfile(): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'));
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
        } as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.PROFILE}/owner_1`);
      return null;
    }
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      const updated: UserProfile = {
        ...profile,
        id: 'owner_1',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'), cleanFirestoreData(updated), { merge: true });
      return updated;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PROFILE}/owner_1`);
      throw new Error(err.error || 'Gagal menyimpan profil ke Firestore.');
    }
  },

  // Transactions CRUD backed completely by Firestore
  async getTransactions(): Promise<Transaction[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
      const items: Transaction[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, // Guarantee Firestore Document ID is always preserved
          type: data.type || 'expense',
          categoryId: data.categoryId || 'cat_exp_1',
          categoryName: data.categoryName || data.category || 'Lainnya',
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          description: data.description || '',
          paymentMethod: data.paymentMethod || 'Cash',
          receiptImages: Array.isArray(data.receiptImages) ? data.receiptImages : [],
          isRecurringInstance: !!data.isRecurringInstance,
          recurringId: data.recurringId,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
        };
      });

      return items.sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TRANSACTIONS);
      throw new Error(err.error || 'Gagal memuat daftar transaksi dari Cloud Firestore.');
    }
  },

  async saveTransaction(transaction: Transaction): Promise<Transaction> {
    if (!transaction.id) {
      throw new Error('ID dokumen transaksi tidak valid.');
    }

    try {
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transaction.id);
      const dataToSave = cleanFirestoreData({
        id: transaction.id,
        type: transaction.type,
        date: transaction.date,
        category: transaction.categoryName || 'Lainnya',
        categoryId: transaction.categoryId,
        categoryName: transaction.categoryName || 'Lainnya',
        amount: Number(transaction.amount) || 0,
        description: transaction.description || '',
        paymentMethod: transaction.paymentMethod || 'Cash',
        receiptImages: Array.isArray(transaction.receiptImages) ? transaction.receiptImages : [],
        isRecurringInstance: !!transaction.isRecurringInstance,
        recurringId: transaction.recurringId,
        createdAt: transaction.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Write directly to Cloud Firestore document
      await setDoc(docRef, dataToSave, { merge: true });
      return {
        ...transaction,
        updatedAt: dataToSave.updatedAt,
      };
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TRANSACTIONS}/${transaction.id}`);
      throw new Error(err.error || 'Transaksi gagal disimpan ke database Firestore.');
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('ID transaksi tidak valid untuk dihapus.');
    }

    try {
      await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.TRANSACTIONS}/${id}`);
      throw new Error(err.error || 'Transaksi gagal dihapus dari database Firestore.');
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
      return snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
      } as Category));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.CATEGORIES);
      return [];
    }
  },

  async saveCategory(category: Category): Promise<Category> {
    try {
      await setDoc(
        doc(db, COLLECTIONS.CATEGORIES, category.id), 
        cleanFirestoreData(category), 
        { merge: true }
      );
      return category;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CATEGORIES}/${category.id}`);
      throw new Error(err.error || 'Gagal menyimpan kategori ke Firestore.');
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CATEGORIES}/${id}`);
      throw new Error(err.error || 'Gagal menghapus kategori dari Firestore.');
    }
  },

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.PAYMENT_METHODS));
      return snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
      } as PaymentMethod));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PAYMENT_METHODS);
      return [];
    }
  },

  async savePaymentMethod(method: PaymentMethod): Promise<PaymentMethod> {
    try {
      await setDoc(
        doc(db, COLLECTIONS.PAYMENT_METHODS, method.id), 
        cleanFirestoreData(method), 
        { merge: true }
      );
      return method;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PAYMENT_METHODS}/${method.id}`);
      throw new Error(err.error || 'Gagal menyimpan metode pembayaran.');
    }
  },

  async deletePaymentMethod(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PAYMENT_METHODS}/${id}`);
      throw new Error(err.error || 'Gagal menghapus metode pembayaran.');
    }
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.BUDGETS));
      return snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
      } as Budget));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.BUDGETS);
      return [];
    }
  },

  async saveBudget(budget: Budget): Promise<Budget> {
    try {
      await setDoc(
        doc(db, COLLECTIONS.BUDGETS, budget.id), 
        cleanFirestoreData(budget), 
        { merge: true }
      );
      return budget;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BUDGETS}/${budget.id}`);
      throw new Error(err.error || 'Gagal menyimpan anggaran.');
    }
  },

  async deleteBudget(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BUDGETS, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.BUDGETS}/${id}`);
      throw new Error(err.error || 'Gagal menghapus anggaran.');
    }
  },

  // Recurring
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.RECURRING));
      return snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
      } as RecurringTransaction));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.RECURRING);
      return [];
    }
  },

  async saveRecurringTransaction(rec: RecurringTransaction): Promise<RecurringTransaction> {
    try {
      await setDoc(
        doc(db, COLLECTIONS.RECURRING, rec.id), 
        cleanFirestoreData(rec), 
        { merge: true }
      );
      return rec;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.RECURRING}/${rec.id}`);
      throw new Error(err.error || 'Gagal menyimpan transaksi rutin.');
    }
  },

  async deleteRecurringTransaction(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.RECURRING, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.RECURRING}/${id}`);
      throw new Error(err.error || 'Gagal menghapus transaksi rutin.');
    }
  },

  // Real-time Subscriptions with onSnapshot for instant cloud sync across devices
  subscribeTransactions(callback: (items: Transaction[]) => void, onError?: (err: Error) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.TRANSACTIONS),
      (snapshot) => {
        const items: Transaction[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || 'expense',
            categoryId: data.categoryId || 'cat_exp_1',
            categoryName: data.categoryName || data.category || 'Lainnya',
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            description: data.description || '',
            paymentMethod: data.paymentMethod || 'Cash',
            receiptImages: Array.isArray(data.receiptImages) ? data.receiptImages : [],
            isRecurringInstance: !!data.isRecurringInstance,
            recurringId: data.recurringId,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          };
        });
        items.sort((a, b) => {
          const cmp = (b.date || '').localeCompare(a.date || '');
          if (cmp !== 0) return cmp;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        callback(items);
      },
      (error) => {
        const err = handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TRANSACTIONS);
        if (onError) onError(new Error(err.error));
      }
    );
  },

  subscribeCategories(callback: (items: Category[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.CATEGORIES),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
        } as Category));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.CATEGORIES);
      }
    );
  },

  subscribePaymentMethods(callback: (items: PaymentMethod[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.PAYMENT_METHODS),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
        } as PaymentMethod));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PAYMENT_METHODS);
      }
    );
  },

  subscribeBudgets(callback: (items: Budget[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.BUDGETS),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
        } as Budget));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.BUDGETS);
      }
    );
  },

  subscribeRecurringTransactions(callback: (items: RecurringTransaction[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.RECURRING),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
        } as RecurringTransaction));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.RECURRING);
      }
    );
  },

  subscribeProfile(callback: (profile: UserProfile | null) => void): () => void {
    return onSnapshot(
      doc(db, COLLECTIONS.PROFILE, 'owner_1'),
      (snapshot) => {
        if (snapshot.exists()) {
          callback({
            ...snapshot.data(),
            id: snapshot.id,
          } as UserProfile);
        } else {
          callback(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.PROFILE}/owner_1`);
      }
    );
  },

  // Full Backup Export from Firestore
  async exportFullBackup(): Promise<BackupData> {
    const profile = await this.getProfile();
    const transactions = await this.getTransactions();
    const categories = await this.getCategories();
    const paymentMethods = await this.getPaymentMethods();
    const budgets = await this.getBudgets();
    const recurringTransactions = await this.getRecurringTransactions();

    return {
      appName: 'Dompet Omti',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userProfile: profile ? {
        username: profile.username,
        displayName: profile.displayName,
        profilePhoto: profile.profilePhoto,
        theme: profile.theme,
      } : undefined,
      transactions,
      categories,
      paymentMethods,
      budgets,
      recurringTransactions,
    };
  },

  // Restore from Backup Data to Firestore
  async restoreFromBackup(backup: BackupData): Promise<void> {
    if (!backup || !Array.isArray(backup.transactions) || !Array.isArray(backup.categories)) {
      throw new Error('Format file cadangan tidak valid atau rusak');
    }

    const clearCollection = async (collName: string) => {
      const snap = await getDocs(collection(db, collName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    };

    await clearCollection(COLLECTIONS.TRANSACTIONS);
    await clearCollection(COLLECTIONS.CATEGORIES);
    await clearCollection(COLLECTIONS.PAYMENT_METHODS);
    await clearCollection(COLLECTIONS.BUDGETS);
    await clearCollection(COLLECTIONS.RECURRING);

    for (const cat of backup.categories) {
      await this.saveCategory(cat);
    }

    for (const pm of (backup.paymentMethods || [])) {
      await this.savePaymentMethod(pm);
    }

    for (const tx of backup.transactions) {
      await this.saveTransaction(tx);
    }

    for (const b of (backup.budgets || [])) {
      await this.saveBudget(b);
    }

    for (const rec of (backup.recurringTransactions || [])) {
      await this.saveRecurringTransaction(rec);
    }

    if (backup.userProfile) {
      const currentProfile = await this.getProfile();
      if (currentProfile) {
        currentProfile.displayName = backup.userProfile.displayName || currentProfile.displayName;
        currentProfile.profilePhoto = backup.userProfile.profilePhoto || currentProfile.profilePhoto;
        currentProfile.theme = backup.userProfile.theme || currentProfile.theme;
        await this.saveProfile(currentProfile);
      }
    }
  },

  // CSV Export for Transactions
  async exportTransactionsToCSV(): Promise<string> {
    const transactions = await this.getTransactions();
    const categories = await this.getCategories();
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Jenis',
      'Kategori',
      'Nominal (Rp)',
      'Metode Pembayaran',
      'Deskripsi / Catatan',
      'Jumlah Bukti Foto',
      'Waktu Dibuat',
    ];

    const escapeCsv = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = transactions.map(tx => {
      const catName = catMap.get(tx.categoryId) || tx.categoryName || 'Lainnya';
      const jenis = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      const photoCount = tx.receiptImages ? tx.receiptImages.length : 0;
      return [
        escapeCsv(tx.id),
        escapeCsv(tx.date),
        escapeCsv(jenis),
        escapeCsv(catName),
        escapeCsv(tx.amount),
        escapeCsv(tx.paymentMethod),
        escapeCsv(tx.description),
        escapeCsv(photoCount),
        escapeCsv(tx.createdAt),
      ].join(';');
    });

    return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  },

  // Create initial owner profile in Firestore
  async createOwnerProfile(username: string, password: string, displayName = 'Tuan Muda'): Promise<UserProfile> {
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      id: 'owner_1',
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      profilePhoto: '',
      passwordHash,
      salt,
      theme: 'system',
      createdAt: now,
      updatedAt: now,
    };
    await this.saveProfile(newProfile);
    return newProfile;
  },

  // Factory Reset in Firestore
  async factoryResetStorage(): Promise<void> {
    const clearCollection = async (collName: string) => {
      const snap = await getDocs(collection(db, collName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    };

    await clearCollection(COLLECTIONS.TRANSACTIONS);
    await clearCollection(COLLECTIONS.CATEGORIES);
    await clearCollection(COLLECTIONS.PAYMENT_METHODS);
    await clearCollection(COLLECTIONS.BUDGETS);
    await clearCollection(COLLECTIONS.RECURRING);
    await deleteDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'));

    const now = new Date().toISOString();
    let catIndex = 1;
    for (const item of DEFAULT_EXPENSE_CATEGORIES) {
      const id = `cat_exp_${catIndex++}`;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
        id,
        name: item.name,
        type: 'expense',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
    }
    for (const item of DEFAULT_INCOME_CATEGORIES) {
      const id = `cat_inc_${catIndex++}`;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
        id,
        name: item.name,
        type: 'income',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
    }

    let pmIndex = 1;
    for (const pm of DEFAULT_PAYMENT_METHODS) {
      const id = `pm_${pmIndex++}`;
      await setDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, id), {
        id,
        name: pm.name,
        icon: pm.icon,
        isCustom: false,
        createdAt: now,
      });
    }

    localStorage.removeItem('dompet_omti_session');
    localStorage.removeItem('dompet_omti_theme');
  },
};
