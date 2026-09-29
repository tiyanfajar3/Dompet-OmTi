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

const DB_NAME = 'dompet_omti_db';
const DB_VERSION = 1;

const STORES = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'payment_methods',
  BUDGETS: 'budgets',
  RECURRING: 'recurring_transactions',
  PROFILE: 'user_profile',
};

// Open or create IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const transStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        transStore.createIndex('date', 'date', { unique: false });
        transStore.createIndex('type', 'type', { unique: false });
        transStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PAYMENT_METHODS)) {
        db.createObjectStore(STORES.PAYMENT_METHODS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.BUDGETS)) {
        db.createObjectStore(STORES.BUDGETS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.RECURRING)) {
        db.createObjectStore(STORES.RECURRING, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
      }
    };
  });
}

// Generic Store Helpers
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function putInStore<T>(storeName: string, item: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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

// Initialize DB with seed data if fresh
export async function initializeDatabase(): Promise<void> {
  const existingCategories = await getAllFromStore<Category>(STORES.CATEGORIES);
  const now = new Date().toISOString();

  // 1. Categories
  let categoryMap: Record<string, string> = {};
  if (existingCategories.length === 0) {
    let catIndex = 1;
    for (const item of DEFAULT_EXPENSE_CATEGORIES) {
      const id = `cat_exp_${catIndex++}`;
      await putInStore(STORES.CATEGORIES, {
        id,
        name: item.name,
        type: 'expense',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
      categoryMap[item.name] = id;
    }
    for (const item of DEFAULT_INCOME_CATEGORIES) {
      const id = `cat_inc_${catIndex++}`;
      await putInStore(STORES.CATEGORIES, {
        id,
        name: item.name,
        type: 'income',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
      categoryMap[item.name] = id;
    }
  } else {
    existingCategories.forEach(c => {
      categoryMap[c.name] = c.id;
    });
  }

  // 2. Payment Methods
  const existingMethods = await getAllFromStore<PaymentMethod>(STORES.PAYMENT_METHODS);
  if (existingMethods.length === 0) {
    let pmIndex = 1;
    for (const pm of DEFAULT_PAYMENT_METHODS) {
      await putInStore(STORES.PAYMENT_METHODS, {
        id: `pm_${pmIndex++}`,
        name: pm.name,
        icon: pm.icon,
        isCustom: false,
        createdAt: now,
      });
    }
  }

  // 3. User Profile: Do not seed default plaintext or known password.
  // Profile will be created by the owner during initial setup or after factory reset.
  const profiles = await getAllFromStore<UserProfile>(STORES.PROFILE);

  // 4. Default monthly budgets and seed transactions only on first virgin run
  const isAlreadySeeded = localStorage.getItem('dompet_omti_seeded');
  if (!isAlreadySeeded) {
    localStorage.setItem('dompet_omti_seeded', 'true');
    const existingBudgets = await getAllFromStore<Budget>(STORES.BUDGETS);
    if (existingBudgets.length === 0 && categoryMap['Makanan']) {
      await putInStore(STORES.BUDGETS, {
        id: 'b_1',
        categoryId: categoryMap['Makanan'],
        amount: 2500000,
        period: 'monthly',
      });
      if (categoryMap['Transportasi']) {
        await putInStore(STORES.BUDGETS, {
          id: 'b_2',
          categoryId: categoryMap['Transportasi'],
          amount: 800000,
          period: 'monthly',
        });
      }
      if (categoryMap['Pulsa & Internet']) {
        await putInStore(STORES.BUDGETS, {
          id: 'b_3',
          categoryId: categoryMap['Pulsa & Internet'],
          amount: 450000,
          period: 'monthly',
        });
      }
      if (categoryMap['Belanja']) {
        await putInStore(STORES.BUDGETS, {
          id: 'b_4',
          categoryId: categoryMap['Belanja'],
          amount: 1500000,
          period: 'monthly',
        });
      }
    }

    // 5. Seed initial recurring transaction template
    const existingRecurring = await getAllFromStore<RecurringTransaction>(STORES.RECURRING);
    if (existingRecurring.length === 0 && categoryMap['Gaji']) {
      await putInStore(STORES.RECURRING, {
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
      if (categoryMap['Pulsa & Internet']) {
        await putInStore(STORES.RECURRING, {
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
    }

    // 6. Seed sample transactions for current month on very first launch
    const existingTransactions = await getAllFromStore<Transaction>(STORES.TRANSACTIONS);
    if (existingTransactions.length === 0) {
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
        await putInStore(STORES.TRANSACTIONS, {
          id: `tx_${Date.now()}_${tIndex++}`,
          ...item,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}

// Storage Public API
export const storageService = {
  // Profile
  async getProfile(): Promise<UserProfile | null> {
    const list = await getAllFromStore<UserProfile>(STORES.PROFILE);
    return list[0] || null;
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    profile.updatedAt = new Date().toISOString();
    return putInStore(STORES.PROFILE, profile);
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const items = await getAllFromStore<Transaction>(STORES.TRANSACTIONS);
    // Sort latest date first by default
    return items.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  async saveTransaction(transaction: Transaction): Promise<Transaction> {
    return putInStore(STORES.TRANSACTIONS, transaction);
  },

  async deleteTransaction(id: string): Promise<void> {
    return deleteFromStore(STORES.TRANSACTIONS, id);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return getAllFromStore<Category>(STORES.CATEGORIES);
  },

  async saveCategory(category: Category): Promise<Category> {
    return putInStore(STORES.CATEGORIES, category);
  },

  async deleteCategory(id: string): Promise<void> {
    return deleteFromStore(STORES.CATEGORIES, id);
  },

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return getAllFromStore<PaymentMethod>(STORES.PAYMENT_METHODS);
  },

  async savePaymentMethod(method: PaymentMethod): Promise<PaymentMethod> {
    return putInStore(STORES.PAYMENT_METHODS, method);
  },

  async deletePaymentMethod(id: string): Promise<void> {
    return deleteFromStore(STORES.PAYMENT_METHODS, id);
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return getAllFromStore<Budget>(STORES.BUDGETS);
  },

  async saveBudget(budget: Budget): Promise<Budget> {
    return putInStore(STORES.BUDGETS, budget);
  },

  async deleteBudget(id: string): Promise<void> {
    return deleteFromStore(STORES.BUDGETS, id);
  },

  // Recurring
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    return getAllFromStore<RecurringTransaction>(STORES.RECURRING);
  },

  async saveRecurringTransaction(rec: RecurringTransaction): Promise<RecurringTransaction> {
    return putInStore(STORES.RECURRING, rec);
  },

  async deleteRecurringTransaction(id: string): Promise<void> {
    return deleteFromStore(STORES.RECURRING, id);
  },

  // Full Backup Export
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

  // Restore from Backup Data
  async restoreFromBackup(backup: BackupData): Promise<void> {
    if (!backup || !Array.isArray(backup.transactions) || !Array.isArray(backup.categories)) {
      throw new Error('Format file cadangan tidak valid atau rusak');
    }

    // Clear existing stores
    await clearStore(STORES.TRANSACTIONS);
    await clearStore(STORES.CATEGORIES);
    await clearStore(STORES.PAYMENT_METHODS);
    await clearStore(STORES.BUDGETS);
    await clearStore(STORES.RECURRING);

    // Populate categories
    for (const cat of backup.categories) {
      await putInStore(STORES.CATEGORIES, cat);
    }

    // Populate payment methods
    for (const pm of (backup.paymentMethods || [])) {
      await putInStore(STORES.PAYMENT_METHODS, pm);
    }

    // Populate transactions
    for (const tx of backup.transactions) {
      await putInStore(STORES.TRANSACTIONS, tx);
    }

    // Populate budgets
    for (const b of (backup.budgets || [])) {
      await putInStore(STORES.BUDGETS, b);
    }

    // Populate recurring
    for (const rec of (backup.recurringTransactions || [])) {
      await putInStore(STORES.RECURRING, rec);
    }

    // If profile has updates
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

    // Add UTF-8 BOM for Excel compatibility
    return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  },

  // Create initial owner profile
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
    await putInStore(STORES.PROFILE, newProfile);
    return newProfile;
  },

  // Factory Reset: Purge all user data and re-initialize clean default categories and payment methods
  async factoryResetStorage(): Promise<void> {
    // 1. Purge all IndexedDB Object Stores
    await clearStore(STORES.TRANSACTIONS);
    await clearStore(STORES.CATEGORIES);
    await clearStore(STORES.PAYMENT_METHODS);
    await clearStore(STORES.BUDGETS);
    await clearStore(STORES.RECURRING);
    await clearStore(STORES.PROFILE);

    // 2. Re-populate clean default categories
    const now = new Date().toISOString();
    let catIndex = 1;
    for (const item of DEFAULT_EXPENSE_CATEGORIES) {
      await putInStore(STORES.CATEGORIES, {
        id: `cat_exp_${catIndex++}`,
        name: item.name,
        type: 'expense',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
    }
    for (const item of DEFAULT_INCOME_CATEGORIES) {
      await putInStore(STORES.CATEGORIES, {
        id: `cat_inc_${catIndex++}`,
        name: item.name,
        type: 'income',
        icon: item.icon,
        color: item.color,
        createdAt: now,
      });
    }

    // 3. Re-populate clean default payment methods
    let pmIndex = 1;
    for (const pm of DEFAULT_PAYMENT_METHODS) {
      await putInStore(STORES.PAYMENT_METHODS, {
        id: `pm_${pmIndex++}`,
        name: pm.name,
        icon: pm.icon,
        isCustom: false,
        createdAt: now,
      });
    }

    // 4. Remove local sessions and mark seeded
    localStorage.removeItem('dompet_omti_session');
    localStorage.removeItem('dompet_omti_theme');
    localStorage.setItem('dompet_omti_seeded', 'true');
  },
};
