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
import { db, OperationType, handleFirestoreError, testFirestoreConnection } from './firebase';

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

// Fallback helper to migrate any legacy IndexedDB data if it existed on the client
async function readLegacyIndexedDB(): Promise<{
  profile: UserProfile | null;
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
}> {
  try {
    const dbs = await indexedDB.databases?.() || [];
    const hasOldDb = dbs.some(d => d.name === 'dompet_omti_db');
    if (!hasOldDb && !indexedDB) return { profile: null, transactions: [], categories: [], paymentMethods: [], budgets: [], recurring: [] };

    return new Promise((resolve) => {
      const req = indexedDB.open('dompet_omti_db', 1);
      req.onerror = () => resolve({ profile: null, transactions: [], categories: [], paymentMethods: [], budgets: [], recurring: [] });
      req.onsuccess = () => {
        const idb = req.result;
        const result: any = { profile: null, transactions: [], categories: [], paymentMethods: [], budgets: [], recurring: [] };
        const stores = idb.objectStoreNames;

        let pending = 0;
        const checkDone = () => {
          if (pending === 0) resolve(result);
        };

        const fetchStore = (storeName: string, targetKey: string) => {
          if (stores.contains(storeName)) {
            pending++;
            try {
              const tx = idb.transaction(storeName, 'readonly');
              const r = tx.objectStore(storeName).getAll();
              r.onsuccess = () => {
                result[targetKey] = r.result || [];
                if (targetKey === 'profile') {
                  result.profile = result.profile[0] || null;
                }
                pending--;
                checkDone();
              };
              r.onerror = () => {
                pending--;
                checkDone();
              };
            } catch {
              pending--;
              checkDone();
            }
          }
        };

        fetchStore('user_profile', 'profile');
        fetchStore('transactions', 'transactions');
        fetchStore('categories', 'categories');
        fetchStore('payment_methods', 'paymentMethods');
        fetchStore('budgets', 'budgets');
        fetchStore('recurring_transactions', 'recurring');

        if (pending === 0) resolve(result);
      };
    });
  } catch {
    return { profile: null, transactions: [], categories: [], paymentMethods: [], budgets: [], recurring: [] };
  }
}

// Initialize Firestore Database with seed or migrated data
export async function initializeDatabase(): Promise<void> {
  await testFirestoreConnection();

  try {
    // Check if Firestore already contains categories
    const catSnap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    const now = new Date().toISOString();

    if (catSnap.empty) {
      // Check if we can migrate existing data from IndexedDB
      const legacy = await readLegacyIndexedDB();
      const hasLegacyData = legacy.transactions.length > 0 || legacy.categories.length > 0 || legacy.profile !== null;

      if (hasLegacyData) {
        console.info('Migrasi data lokal ke Firestore Database Dompet Omti...');
        const batch = writeBatch(db);

        // Migrate profile
        if (legacy.profile) {
          batch.set(doc(db, COLLECTIONS.PROFILE, 'owner_1'), cleanFirestoreData(legacy.profile));
        }

        // Migrate categories
        for (const cat of legacy.categories) {
          batch.set(doc(db, COLLECTIONS.CATEGORIES, cat.id), cleanFirestoreData(cat));
        }

        // Migrate payment methods
        for (const pm of legacy.paymentMethods) {
          batch.set(doc(db, COLLECTIONS.PAYMENT_METHODS, pm.id), cleanFirestoreData(pm));
        }

        // Migrate budgets
        for (const b of legacy.budgets) {
          batch.set(doc(db, COLLECTIONS.BUDGETS, b.id), cleanFirestoreData(b));
        }

        // Migrate recurring
        for (const rec of legacy.recurring) {
          batch.set(doc(db, COLLECTIONS.RECURRING, rec.id), cleanFirestoreData(rec));
        }

        // Migrate transactions (up to 400 in batch)
        for (const tx of legacy.transactions.slice(0, 400)) {
          batch.set(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), cleanFirestoreData(tx));
        }

        await batch.commit();
        console.info('Migrasi ke Firestore berhasil diselesaikan.');
        return;
      }

      // Fresh Firestore setup: seed default categories & payment methods
      const batch = writeBatch(db);
      const categoryMap: Record<string, string> = {};

      let catIndex = 1;
      for (const item of DEFAULT_EXPENSE_CATEGORIES) {
        const id = `cat_exp_${catIndex++}`;
        categoryMap[item.name] = id;
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
        categoryMap[item.name] = id;
        batch.set(doc(db, COLLECTIONS.CATEGORIES, id), {
          id,
          name: item.name,
          type: 'income',
          icon: item.icon,
          color: item.color,
          createdAt: now,
        });
      }

      // Seed payment methods
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

      // Default monthly budgets
      if (categoryMap['Makanan']) {
        batch.set(doc(db, COLLECTIONS.BUDGETS, 'b_1'), {
          id: 'b_1',
          categoryId: categoryMap['Makanan'],
          amount: 2500000,
          period: 'monthly',
        });
      }
      if (categoryMap['Transportasi']) {
        batch.set(doc(db, COLLECTIONS.BUDGETS, 'b_2'), {
          id: 'b_2',
          categoryId: categoryMap['Transportasi'],
          amount: 800000,
          period: 'monthly',
        });
      }
      if (categoryMap['Pulsa & Internet']) {
        batch.set(doc(db, COLLECTIONS.BUDGETS, 'b_3'), {
          id: 'b_3',
          categoryId: categoryMap['Pulsa & Internet'],
          amount: 450000,
          period: 'monthly',
        });
      }
      if (categoryMap['Belanja']) {
        batch.set(doc(db, COLLECTIONS.BUDGETS, 'b_4'), {
          id: 'b_4',
          categoryId: categoryMap['Belanja'],
          amount: 1500000,
          period: 'monthly',
        });
      }

      // Default recurring transactions
      if (categoryMap['Gaji']) {
        batch.set(doc(db, COLLECTIONS.RECURRING, 'rec_1'), {
          id: 'rec_1',
          name: 'Gaji Bulanan',
          type: 'income',
          categoryId: categoryMap['Gaji'],
          amount: 18500000,
          paymentMethod: 'Transfer',
          frequency: 'monthly',
          startDate: `${new Date().getFullYear()}-01-25`,
          active: true,
          createdAt: now,
        });
      }
      if (categoryMap['Pulsa & Internet']) {
        batch.set(doc(db, COLLECTIONS.RECURRING, 'rec_2'), {
          id: 'rec_2',
          name: 'Langganan WiFi & Internet Rumah',
          type: 'expense',
          categoryId: categoryMap['Pulsa & Internet'],
          amount: 385000,
          paymentMethod: 'Bank',
          frequency: 'monthly',
          startDate: `${new Date().getFullYear()}-01-10`,
          active: true,
          createdAt: now,
        });
      }

      // Sample transactions
      const today = new Date();
      const curYear = today.getFullYear();
      const curMonth = String(today.getMonth() + 1).padStart(2, '0');

      const sampleData: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [
        {
          type: 'income',
          categoryId: categoryMap['Gaji'] || 'cat_inc_1',
          categoryName: 'Gaji',
          amount: 18500000,
          date: `${curYear}-${curMonth}-01`,
          description: 'Gaji Pokok & Tunjangan Eksekutif',
          paymentMethod: 'Transfer',
          receiptImages: [],
        },
        {
          type: 'income',
          categoryId: categoryMap['Bonus'] || 'cat_inc_2',
          categoryName: 'Bonus',
          amount: 4500000,
          date: `${curYear}-${curMonth}-15`,
          description: 'Dividen & Keuntungan Investasi',
          paymentMethod: 'Bank',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Makanan'] || 'cat_exp_1',
          categoryName: 'Makanan',
          amount: 420000,
          date: `${curYear}-${curMonth}-02`,
          description: 'Jamuan Makan Siang Bisnis',
          paymentMethod: 'Debit',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Belanja'] || 'cat_exp_3',
          categoryName: 'Belanja',
          amount: 850000,
          date: `${curYear}-${curMonth}-05`,
          description: 'Belanja Bulanan & Kebutuhan Pribadi',
          paymentMethod: 'Kredit',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Pulsa & Internet'] || 'cat_exp_5',
          categoryName: 'Pulsa & Internet',
          amount: 385000,
          date: `${curYear}-${curMonth}-10`,
          description: 'Tagihan Fiber Internet High-Speed',
          paymentMethod: 'Bank',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Transportasi'] || 'cat_exp_2',
          categoryName: 'Transportasi',
          amount: 250000,
          date: `${curYear}-${curMonth}-12`,
          description: 'Bahan Bakar & Tol',
          paymentMethod: 'E-wallet',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Makanan'] || 'cat_exp_1',
          categoryName: 'Makanan',
          amount: 165000,
          date: `${curYear}-${curMonth}-18`,
          description: 'Kopi & Snack Santai Sore',
          paymentMethod: 'Cash',
          receiptImages: [],
        },
        {
          type: 'expense',
          categoryId: categoryMap['Kesehatan'] || 'cat_exp_7',
          categoryName: 'Kesehatan',
          amount: 320000,
          date: `${curYear}-${curMonth}-22`,
          description: 'Vitamin dan Suplemen Kesehatan',
          paymentMethod: 'Debit',
          receiptImages: [],
        },
      ];

      let tIndex = 1;
      for (const item of sampleData) {
        const id = `tx_${Date.now()}_${tIndex++}`;
        batch.set(doc(db, COLLECTIONS.TRANSACTIONS, id), {
          id,
          ...item,
          createdAt: now,
          updatedAt: now,
        });
      }

      await batch.commit();
      console.info('Database Firestore Dompet Omti berhasil diinisialisasi.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'initializeDatabase');
  }
}

// Storage Public API backed by Firestore Cloud Database
export const storageService = {
  // Profile
  async getProfile(): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.PROFILE}/owner_1`);
      return null;
    }
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      const updated = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'), cleanFirestoreData(updated), { merge: true });
      return updated;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PROFILE}/owner_1`);
      return profile;
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
      const items = snap.docs.map(d => d.data() as Transaction);
      return items.sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TRANSACTIONS);
      return [];
    }
  },

  async saveTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      await setDoc(
        doc(db, COLLECTIONS.TRANSACTIONS, transaction.id), 
        cleanFirestoreData(transaction), 
        { merge: true }
      );
      return transaction;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TRANSACTIONS}/${transaction.id}`);
      return transaction;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.TRANSACTIONS}/${id}`);
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
      return snap.docs.map(d => d.data() as Category);
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
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CATEGORIES}/${category.id}`);
      return category;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CATEGORIES}/${id}`);
    }
  },

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.PAYMENT_METHODS));
      return snap.docs.map(d => d.data() as PaymentMethod);
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
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PAYMENT_METHODS}/${method.id}`);
      return method;
    }
  },

  async deletePaymentMethod(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PAYMENT_METHODS}/${id}`);
    }
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.BUDGETS));
      return snap.docs.map(d => d.data() as Budget);
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
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BUDGETS}/${budget.id}`);
      return budget;
    }
  },

  async deleteBudget(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BUDGETS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.BUDGETS}/${id}`);
    }
  },

  // Recurring
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.RECURRING));
      return snap.docs.map(d => d.data() as RecurringTransaction);
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
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.RECURRING}/${rec.id}`);
      return rec;
    }
  },

  async deleteRecurringTransaction(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.RECURRING, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.RECURRING}/${id}`);
    }
  },

  // Real-time Subscriptions with onSnapshot for instant cloud sync across devices
  subscribeTransactions(callback: (items: Transaction[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.TRANSACTIONS),
      (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as Transaction);
        items.sort((a, b) => {
          const cmp = (b.date || '').localeCompare(a.date || '');
          if (cmp !== 0) return cmp;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TRANSACTIONS);
      }
    );
  },

  subscribeCategories(callback: (items: Category[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.CATEGORIES),
      (snapshot) => {
        const items = snapshot.docs.map(d => d.data() as Category);
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
        const items = snapshot.docs.map(d => d.data() as PaymentMethod);
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
        const items = snapshot.docs.map(d => d.data() as Budget);
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
        const items = snapshot.docs.map(d => d.data() as RecurringTransaction);
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
          callback(snapshot.data() as UserProfile);
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

    // Clear existing docs in each collection
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

    // Save categories
    for (const cat of backup.categories) {
      await this.saveCategory(cat);
    }

    // Save payment methods
    for (const pm of (backup.paymentMethods || [])) {
      await this.savePaymentMethod(pm);
    }

    // Save transactions
    for (const tx of backup.transactions) {
      await this.saveTransaction(tx);
    }

    // Save budgets
    for (const b of (backup.budgets || [])) {
      await this.saveBudget(b);
    }

    // Save recurring
    for (const rec of (backup.recurringTransactions || [])) {
      await this.saveRecurringTransaction(rec);
    }

    // Update profile if included
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

    // Re-populate clean default categories
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

    // Re-populate clean default payment methods
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

    // Clear local session markers
    localStorage.removeItem('dompet_omti_session');
    localStorage.removeItem('dompet_omti_theme');
  },
};
