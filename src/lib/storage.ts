import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { 
  Category, 
  PaymentMethod, 
  Transaction, 
  Budget, 
  RecurringTransaction, 
  UserProfile, 
  BackupData,
  Debt,
  DebtStatus 
} from '../types';
import { generateSalt, hashPassword } from './crypto';
import { db, OperationType, handleFirestoreError, testFirestoreConnection, ensureAuthenticated } from './firebase';
import { normalizeStandardDate, normalizeStandardIso, parseFlexibleDate } from './formatters';

export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'payment_methods',
  BUDGETS: 'budgets',
  RECURRING: 'recurring_transactions',
  PROFILE: 'user_profile',
  DEBTS: 'debts',
} as const;

// Helper to remove any undefined fields before saving to Firestore
function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.map(item => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
      } else if (
        val !== null && 
        typeof val === 'object' && 
        !(val instanceof Date) &&
        (val.constructor === Object || !val.constructor)
      ) {
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

// Fallback key for users & profile in localStorage
export const LOCAL_STORAGE_USERS_KEY = 'dompet_omti_users_fallback';

export function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Gagal membaca users dari localStorage fallback:', err);
    return [];
  }
}

export function saveLocalUser(user: UserProfile): void {
  try {
    const current = getLocalUsers();
    const map = new Map<string, UserProfile>();
    current.forEach(u => map.set(u.id, u));
    map.set(user.id, user);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(Array.from(map.values())));
  } catch (err) {
    console.warn('Gagal menyimpan user ke localStorage fallback:', err);
  }
}

export function deleteLocalUser(userId: string): void {
  try {
    const current = getLocalUsers();
    const filtered = current.filter(u => u.id !== userId);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Gagal menghapus user dari localStorage fallback:', err);
  }
}

export const MAIN_ADMIN_ACCOUNT_ID = 'owner_1';

// Helper periksa apakah ID merujuk ke Akun Admin / Akun Default / Pemilik
export function isDefaultAdminAccount(id?: string | null, activeAdminId?: string): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  if (clean === MAIN_ADMIN_ACCOUNT_ID || clean === 'admin' || clean === 'default' || clean === 'me') {
    return true;
  }
  if (activeAdminId && id.trim() === activeAdminId.trim()) {
    const adminClean = activeAdminId.trim().toLowerCase();
    if (adminClean === MAIN_ADMIN_ACCOUNT_ID || adminClean === 'admin' || adminClean === 'default') {
      return true;
    }
  }
  try {
    const sessionRaw = localStorage.getItem('dompet_omti_session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session && session.userId === id.trim() && session.role === 'admin') {
        return true;
      }
    }
  } catch {}
  try {
    const rawUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (rawUsers) {
      const users: UserProfile[] = JSON.parse(rawUsers);
      const matched = users.find(u => u.id === id.trim());
      if (matched && matched.role === 'admin') return true;
    }
  } catch {}
  return false;
}

// Helper mendapatkan ID akun utama/default yang sedang aktif saat ini
export function getActiveDefaultAccountId(providedId?: string): string {
  if (providedId && providedId !== 'all' && isDefaultAdminAccount(providedId)) {
    return providedId.trim();
  }
  try {
    const sessionRaw = localStorage.getItem('dompet_omti_session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session && session.userId && (!session.expiresAt || session.expiresAt > Date.now())) {
        if (session.role === 'admin' || isDefaultAdminAccount(session.userId)) {
          return session.userId.trim();
        }
      }
    }
  } catch {}
  return MAIN_ADMIN_ACCOUNT_ID;
}

// Helper mendapatkan accountId yang valid dari transaksi.
// Menangani fallback data lama (single-account era) yang belum memiliki accountId.
// Sesuai ketentuan: Transaksi lama tanpa accountId secara default masuk ke akun Admin / Kas Utama ('owner_1'),
// BUKAN ke akun cabang/kios yang sedang dibuka (seperti Kios Sukamulya).
export function getTransactionAccountId(tx: any, activeAccountId?: string): string {
  const defaultAdminAccount = MAIN_ADMIN_ACCOUNT_ID;

  if (!tx || typeof tx !== 'object') {
    return defaultAdminAccount;
  }

  // 1. Cek field accountId eksplisit terlebih dahulu (primary source of truth saat akun diubah/dipindahkan)
  const rawAcc = tx.accountId ?? tx.account_id;
  if (rawAcc !== undefined && rawAcc !== null) {
    const accStr = String(rawAcc).trim();
    if (accStr !== '' && accStr !== 'null' && accStr !== 'undefined' && accStr !== 'default') {
      if (isDefaultAdminAccount(accStr)) {
        return defaultAdminAccount;
      }
      return accStr;
    }
  }

  // 2. Cek field branchId eksplisit (jika ada transaksi cabang yang memiliki branchId spesifik)
  const rawBranch = tx.branchId ?? tx.branch_id;
  if (rawBranch !== undefined && rawBranch !== null) {
    const branchStr = String(rawBranch).trim();
    if (
      branchStr !== '' && 
      branchStr !== 'null' && 
      branchStr !== 'undefined' && 
      branchStr !== 'default' &&
      !isDefaultAdminAccount(branchStr)
    ) {
      return branchStr;
    }
  }

  // 3. Cek field tenantId eksplisit
  const rawTenant = tx.tenantId;
  if (rawTenant !== undefined && rawTenant !== null) {
    const tenantStr = String(rawTenant).trim();
    if (tenantStr !== '' && tenantStr !== 'null' && tenantStr !== 'undefined' && tenantStr !== 'default') {
      if (isDefaultAdminAccount(tenantStr)) {
        return defaultAdminAccount;
      }
      return tenantStr;
    }
  }

  // 4. Cek field userId
  const rawUser = tx.userId;
  if (rawUser !== undefined && rawUser !== null) {
    const userStr = String(rawUser).trim();
    if (userStr !== '' && userStr !== 'null' && userStr !== 'undefined' && userStr !== 'default') {
      if (isDefaultAdminAccount(userStr)) {
        return defaultAdminAccount;
      }
      return userStr;
    }
  }

  // 5. FALLBACK TRANSAKSI LAMA (Single-Account Era):
  // Transaksi lama tidak memiliki accountId, branchId, atau tenantId.
  // Secara mutlak masuk ke Akun Admin / Kas Utama ('owner_1') agar tidak salah masuk ke akun cabang/kios yang sedang dibuka!
  return defaultAdminAccount;
}

// Helper untuk mengekstrak ID cabang spesifik dari transaksi.
// Mengembalikan null jika transaksi milik Admin / Kas Pribadi / Transaksi warisan lama (legacy).
export function getTransactionBranch(tx: Transaction | any, activeAdminId?: string): string | null {
  const defaultAccount = getActiveDefaultAccountId(activeAdminId);
  const acc = getTransactionAccountId(tx, defaultAccount);
  if (isDefaultAdminAccount(acc, defaultAccount) || acc === MAIN_ADMIN_ACCOUNT_ID) {
    return null;
  }
  return acc;
}

// Storage Public API backed by Cloud Firestore with local storage fallback
export const storageService = {
  // Profile & User Accounts
  async getProfile(userId = 'owner_1'): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROFILE, userId));
      if (snap.exists()) {
        const data = snap.data();
        const profile = {
          ...data,
          id: snap.id,
          role: (data.role as any) || (snap.id === 'owner_1' ? 'admin' : 'user'),
        } as UserProfile;
        saveLocalUser(profile);
        return profile;
      }
    } catch (error) {
      console.warn(`Firestore getProfile gagal untuk ${userId}, mencoba fallback localStorage:`, error);
      handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.PROFILE}/${userId}`);
    }

    const localUsers = getLocalUsers();
    return localUsers.find(u => u.id === userId) || null;
  },

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const docId = profile.id || 'owner_1';
    const updated: UserProfile = {
      ...profile,
      id: docId,
      role: profile.role || (docId === 'owner_1' ? 'admin' : 'user'),
      updatedAt: new Date().toISOString(),
    };

    // Selalu simpan ke localStorage fallback terlebih dahulu
    saveLocalUser(updated);

    try {
      await setDoc(doc(db, COLLECTIONS.PROFILE, docId), cleanFirestoreData(updated), { merge: true });
      return updated;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PROFILE}/${docId}`);
      console.warn(`Firestore saveProfile gagal untuk ${docId}, data tetap aman di fallback localStorage:`, err);
      return updated;
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const userMap = new Map<string, UserProfile>();

    // 1. Muat pengguna dari localStorage fallback
    const localUsers = getLocalUsers();
    localUsers.forEach(u => userMap.set(u.id, u));

    // 2. Muat pengguna dari Firestore
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.PROFILE));
      snap.docs.forEach(d => {
        const data = d.data();
        const user: UserProfile = {
          ...data,
          id: d.id,
          role: (data.role as any) || (d.id === 'owner_1' ? 'admin' : 'user'),
        } as UserProfile;
        userMap.set(d.id, user);
        saveLocalUser(user);
      });
    } catch (error) {
      console.warn('Firestore getAllUsers gagal, menggunakan data dari fallback localStorage:', error);
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PROFILE);
    }

    // 3. Jika dokumen owner_1 belum ada di list (misal collection query diblokir oleh rules),
    // periksa langsung dokumen owner_1 secara individual
    if (!userMap.has('owner_1')) {
      try {
        const ownerSnap = await getDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'));
        if (ownerSnap.exists()) {
          const data = ownerSnap.data();
          const ownerUser: UserProfile = {
            ...data,
            id: ownerSnap.id,
            role: (data.role as any) || 'admin',
          } as UserProfile;
          userMap.set(ownerUser.id, ownerUser);
          saveLocalUser(ownerUser);
        }
      } catch (err) {
        // Abaikan jika tidak ada akses
      }
    }

    return Array.from(userMap.values());
  },

  async getUserById(id: string): Promise<UserProfile | null> {
    return this.getProfile(id);
  },

  async saveUser(user: UserProfile): Promise<UserProfile> {
    return this.saveProfile(user);
  },

  async deleteUser(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('ID pengguna tidak valid.');
    }
    deleteLocalUser(id);
    try {
      await deleteDoc(doc(db, COLLECTIONS.PROFILE, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PROFILE}/${id}`);
      throw new Error(err.error || 'Gagal menghapus pengguna dari Firestore.');
    }
  },

  getActiveDefaultAccountId(providedId?: string): string {
    return getActiveDefaultAccountId(providedId);
  },

  getTransactionAccountId(tx: any, activeAccountId?: string): string {
    return getTransactionAccountId(tx, activeAccountId);
  },

  isDefaultAdminAccount(id?: string | null, activeAdminId?: string): boolean {
    return isDefaultAdminAccount(id, activeAdminId);
  },

  getTransactionBranch(tx: Transaction | any, activeAdminId?: string): string | null {
    return getTransactionBranch(tx, activeAdminId);
  },

  // Helper mencocokkan kepemilikan akun transaksi dengan filter akun:
  // - targetAccountId === 'all': mengembalikan true untuk semua transaksi (Konsolidasi Global)
  // - targetAccountId adalah Default/Admin: mengembalikan true untuk transaksi Admin dan seluruh data lama/legacy (tanpa accountId)
  // - targetAccountId adalah Cabang: mengembalikan true HANYA jika transaksi terikat secara spesifik ke cabang tersebut
  matchesAccount(tx: Transaction | string, targetAccountId: string, activeAdminId?: string): boolean {
    if (!targetAccountId || targetAccountId === 'all') return true;

    const defaultAccount = getActiveDefaultAccountId(activeAdminId);
    const isTargetDefault = isDefaultAdminAccount(targetAccountId, defaultAccount);

    const txAccount = typeof tx === 'string'
      ? (isDefaultAdminAccount(tx, defaultAccount) ? MAIN_ADMIN_ACCOUNT_ID : tx.trim())
      : getTransactionAccountId(tx, defaultAccount);

    if (isTargetDefault) {
      return isDefaultAdminAccount(txAccount, defaultAccount);
    }

    return txAccount === targetAccountId.trim();
  },

  // Transactions CRUD backed completely by Firestore
  async getTransactions(accountId?: string, activeAdminId?: string): Promise<Transaction[]> {
    try {
      const defaultAccount = getActiveDefaultAccountId(activeAdminId);
      const snap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
      const items: Transaction[] = snap.docs.map(d => {
        const data = d.data();
        const resolvedAccount = getTransactionAccountId(data, defaultAccount);
        const branchId = getTransactionBranch(data, defaultAccount);

        const normalizedDate = normalizeStandardDate(data.date, data.createdAt || data.timestamp || data.tanggal || data.created_at);
        const normalizedCreatedAt = normalizeStandardIso(data.createdAt, data.date || data.timestamp);
        const normalizedUpdatedAt = normalizeStandardIso(data.updatedAt || data.createdAt, normalizedCreatedAt);

        return {
          id: d.id, // Guarantee Firestore Document ID is always preserved
          userId: resolvedAccount,
          accountId: resolvedAccount,
          branchId: branchId ? branchId : undefined,
          tenantId: resolvedAccount,
          type: data.type || 'expense',
          categoryId: data.categoryId || 'cat_exp_1',
          categoryName: data.categoryName || data.category || 'Lainnya',
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          date: normalizedDate,
          description: data.description || '',
          paymentMethod: data.paymentMethod || 'Cash',
          receiptImages: Array.isArray(data.receiptImages) ? data.receiptImages : [],
          isRecurringInstance: !!data.isRecurringInstance,
          recurringId: data.recurringId,
          createdAt: normalizedCreatedAt,
          updatedAt: normalizedUpdatedAt,
        };
      });

      const sorted = items.sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      // 1. Ketika filter dropdown diset ke "Semua Akun / Cabang" (all) atau tanpa accountId (mode Admin konsolidasi),
      // aplikasi mengambil SEMUA data transaksi dari Firestore tanpa membatasi hanya pada user/akun tertentu saja.
      if (!accountId || accountId === 'all') {
        return sorted;
      }

      // 2. Ketika dipilih akun/cabang spesifik, kueri memfilter transaksi berdasarkan accountId yang sesuai
      // dengan fallback otomatis data lama (single-account) ke akun default utama.
      return sorted.filter(t => this.matchesAccount(t, accountId, defaultAccount));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TRANSACTIONS);
      throw new Error(err.error || 'Gagal memuat daftar transaksi dari Cloud Firestore.');
    }
  },

  async saveTransaction(transaction: Transaction, activeAdminId?: string): Promise<Transaction> {
    if (!transaction.id) {
      throw new Error('ID dokumen transaksi tidak valid.');
    }

    try {
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transaction.id);
      const defaultAccount = getActiveDefaultAccountId(activeAdminId);
      const targetAccount = getTransactionAccountId(transaction, defaultAccount);
      const isDefaultAccount = isDefaultAdminAccount(targetAccount, defaultAccount);
      const canonicalAccount = isDefaultAccount ? 'owner_1' : targetAccount;

      const dataToSave = cleanFirestoreData({
        id: transaction.id,
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefaultAccount ? deleteField() : canonicalAccount,
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
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefaultAccount ? undefined : canonicalAccount,
        updatedAt: dataToSave.updatedAt,
      };
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TRANSACTIONS}/${transaction.id}`);
      throw new Error(err.error || 'Transaksi gagal disimpan ke database Firestore.');
    }
  },

  // Helper khusus Admin untuk memindahkan akun/cabang transaksi secara langsung & permanen ke Firestore
  async reassignTransactionAccount(transactionId: string, newAccountId: string, activeAdminId?: string): Promise<Transaction> {
    if (!transactionId) {
      throw new Error('ID dokumen transaksi tidak valid.');
    }

    try {
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      const defaultAccount = getActiveDefaultAccountId(activeAdminId);
      const isDefault = isDefaultAdminAccount(newAccountId, defaultAccount);
      const canonicalAccount = isDefault ? 'owner_1' : newAccountId.trim();

      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error('Dokumen transaksi tidak ditemukan di database Cloud Firestore.');
      }

      const existingData = snap.data();
      const updatedAt = new Date().toISOString();

      const patchData = cleanFirestoreData({
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefault ? deleteField() : canonicalAccount,
        updatedAt,
      });

      await setDoc(docRef, patchData, { merge: true });

      return {
        id: transactionId,
        ...existingData,
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefault ? undefined : canonicalAccount,
        updatedAt,
      } as Transaction;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.TRANSACTIONS}/${transactionId}`);
      throw new Error(err.error || 'Gagal memindahkan akun transaksi di Cloud Firestore.');
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

  // Batch Reassign: Memindahkan banyak transaksi sekaligus ke akun/cabang target secara atomik menggunakan writeBatch
  async batchReassignTransactions(transactionIds: string[], newAccountId: string, activeAdminId?: string): Promise<{ success: boolean; count: number }> {
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const defaultAccount = getActiveDefaultAccountId(activeAdminId);
      const isDefault = isDefaultAdminAccount(newAccountId, defaultAccount);
      const canonicalAccount = isDefault ? 'owner_1' : newAccountId.trim();
      const updatedAt = new Date().toISOString();

      const patchData = cleanFirestoreData({
        accountId: canonicalAccount,
        userId: canonicalAccount,
        tenantId: canonicalAccount,
        branchId: isDefault ? deleteField() : canonicalAccount,
        updatedAt,
      });

      // Bagi transaksi menjadi batch-batch berukuran maksimal 400 (di bawah batas Firestore 500)
      const chunkSize = 400;
      for (let i = 0; i < transactionIds.length; i += chunkSize) {
        const chunk = transactionIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const txId of chunk) {
          if (txId) {
            const docRef = doc(db, COLLECTIONS.TRANSACTIONS, txId);
            batch.set(docRef, patchData, { merge: true });
          }
        }
        await batch.commit();
      }

      return { success: true, count: transactionIds.length };
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.TRANSACTIONS);
      throw new Error(err.error || 'Gagal memindahkan transaksi terpilih secara massal.');
    }
  },

  // Batch Delete: Menghapus banyak transaksi sekaligus menggunakan writeBatch
  async batchDeleteTransactions(transactionIds: string[]): Promise<{ success: boolean; count: number }> {
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const chunkSize = 400;
      for (let i = 0; i < transactionIds.length; i += chunkSize) {
        const chunk = transactionIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const txId of chunk) {
          if (txId) {
            const docRef = doc(db, COLLECTIONS.TRANSACTIONS, txId);
            batch.delete(docRef);
          }
        }
        await batch.commit();
      }

      return { success: true, count: transactionIds.length };
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.TRANSACTIONS);
      throw new Error(err.error || 'Gagal menghapus transaksi terpilih secara massal.');
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

  // Debts (Piutang) CRUD backed by Firestore
  async getDebts(userId?: string): Promise<Debt[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.DEBTS));
      const debtMap = new Map<string, Debt>();
      snap.docs.forEach((d) => {
        if (!d.id) return;
        const data = d.data();
        debtMap.set(d.id, {
          id: d.id,
          userId: data.userId || 'owner_1',
          borrowerName: data.borrowerName || '',
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          dueDate: data.dueDate || new Date().toISOString().split('T')[0],
          notes: data.notes || '',
          status: (data.status as DebtStatus) || 'unpaid',
          proofUrl: data.proofUrl || '',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      const sorted = Array.from(debtMap.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      if (userId) {
        return sorted.filter(d => d.userId === userId);
      }
      return sorted;
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.LIST, COLLECTIONS.DEBTS);
      throw new Error(err.error || 'Gagal memuat catatan piutang dari Firestore.');
    }
  },

  async saveDebt(debt: Debt): Promise<Debt> {
    if (!debt.id) {
      throw new Error('ID dokumen piutang tidak valid.');
    }
    try {
      const docRef = doc(db, COLLECTIONS.DEBTS, debt.id);
      const dataToSave = cleanFirestoreData({
        id: debt.id,
        userId: debt.userId || 'owner_1',
        borrowerName: debt.borrowerName.trim(),
        amount: Number(debt.amount) || 0,
        dueDate: debt.dueDate,
        notes: debt.notes || '',
        status: debt.status || 'unpaid',
        proofUrl: debt.proofUrl || '',
        createdAt: debt.createdAt || new Date().toISOString(),
      });
      await setDoc(docRef, dataToSave, { merge: true });
      return {
        ...debt,
        ...dataToSave,
      };
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.DEBTS}/${debt.id}`);
      throw new Error(err.error || 'Gagal menyimpan catatan piutang ke Firestore.');
    }
  },

  async addDebt(debtData: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> {
    const id = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDebt: Debt = {
      ...debtData,
      id,
      createdAt: new Date().toISOString(),
    };
    return this.saveDebt(newDebt);
  },

  async updateDebt(debt: Debt): Promise<Debt> {
    return this.saveDebt(debt);
  },

  async deleteDebt(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID piutang tidak valid untuk dihapus.');
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.DEBTS, id));
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.DEBTS}/${id}`);
      throw new Error(err.error || 'Gagal menghapus catatan piutang dari Firestore.');
    }
  },

  subscribeTransactions(
    callback: (items: Transaction[]) => void, 
    onError?: (err: Error) => void, 
    accountId?: string,
    activeAdminId?: string
  ): () => void {
    const defaultAccount = getActiveDefaultAccountId(activeAdminId);
    return onSnapshot(
      collection(db, COLLECTIONS.TRANSACTIONS),
      (snapshot) => {
        let items: Transaction[] = snapshot.docs.map(d => {
          const data = d.data();
          const resolvedAccount = getTransactionAccountId(data, defaultAccount);
          const branchId = getTransactionBranch(data, defaultAccount);

          const normalizedDate = normalizeStandardDate(data.date, data.createdAt || data.timestamp || data.tanggal || data.created_at);
          const normalizedCreatedAt = normalizeStandardIso(data.createdAt, data.date || data.timestamp);
          const normalizedUpdatedAt = normalizeStandardIso(data.updatedAt || data.createdAt, normalizedCreatedAt);

          return {
            id: d.id,
            userId: resolvedAccount,
            accountId: resolvedAccount,
            branchId: branchId ? branchId : undefined,
            tenantId: resolvedAccount,
            type: data.type || 'expense',
            categoryId: data.categoryId || 'cat_exp_1',
            categoryName: data.categoryName || data.category || 'Lainnya',
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
            date: normalizedDate,
            description: data.description || '',
            paymentMethod: data.paymentMethod || 'Cash',
            receiptImages: Array.isArray(data.receiptImages) ? data.receiptImages : [],
            isRecurringInstance: !!data.isRecurringInstance,
            recurringId: data.recurringId,
            createdAt: normalizedCreatedAt,
            updatedAt: normalizedUpdatedAt,
          };
        });
        items.sort((a, b) => {
          const cmp = (b.date || '').localeCompare(a.date || '');
          if (cmp !== 0) return cmp;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        // 1. Ketika filter dropdown diset ke "Semua Akun / Cabang" (all) atau tanpa accountId (mode Admin konsolidasi),
        // aplikasi mengambil SEMUA data transaksi dari Firestore tanpa membatasi hanya pada user/akun tertentu saja.
        if (!accountId || accountId === 'all') {
          callback(items);
          return;
        }

        // 2. Ketika dipilih akun/cabang spesifik, kueri memfilter transaksi berdasarkan accountId yang sesuai
        // dengan fallback otomatis data lama (single-account) ke akun default utama.
        const filtered = items.filter(t => this.matchesAccount(t, accountId, defaultAccount));
        callback(filtered);
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
    return this.subscribeUserProfile('owner_1', callback);
  },

  subscribeUserProfile(userId: string, callback: (profile: UserProfile | null) => void): () => void {
    return onSnapshot(
      doc(db, COLLECTIONS.PROFILE, userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback({
            ...data,
            id: snapshot.id,
            role: (data.role as any) || (snapshot.id === 'owner_1' ? 'admin' : 'user'),
          } as UserProfile);
        } else {
          callback(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.PROFILE}/${userId}`);
      }
    );
  },

  subscribeUsers(callback: (users: UserProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.PROFILE),
      (snapshot) => {
        const items = snapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            role: (data.role as any) || (d.id === 'owner_1' ? 'admin' : 'user'),
          } as UserProfile;
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PROFILE);
      }
    );
  },

  subscribeDebts(callback: (debts: Debt[]) => void, onError?: (err: Error) => void): () => void {
    return onSnapshot(
      collection(db, COLLECTIONS.DEBTS),
      (snapshot) => {
        const debtMap = new Map<string, Debt>();
        snapshot.docs.forEach((d) => {
          if (!d.id) return;
          const data = d.data();
          debtMap.set(d.id, {
            id: d.id,
            userId: data.userId || 'owner_1',
            borrowerName: data.borrowerName || '',
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
            dueDate: data.dueDate || new Date().toISOString().split('T')[0],
            notes: data.notes || '',
            status: (data.status as DebtStatus) || 'unpaid',
            proofUrl: data.proofUrl || undefined,
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        const items: Debt[] = Array.from(debtMap.values());
        items.sort((a, b) => {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        callback(items);
      },
      (error) => {
        const err = handleFirestoreError(error, OperationType.LIST, COLLECTIONS.DEBTS);
        if (onError) onError(new Error(err.error));
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
    const debts = await this.getDebts();

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
      debts,
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
    await clearCollection(COLLECTIONS.DEBTS);

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

    for (const d of (backup.debts || [])) {
      await this.saveDebt(d);
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

  // Create initial owner profile in Firestore with automatic localStorage fallback
  async createOwnerProfile(username: string, password: string, displayName = 'Tuan Muda'): Promise<UserProfile> {
    // 1. Cek apakah akun pemilik sudah ada di Firestore atau localStorage
    const existing = await this.getProfile('owner_1');
    if (existing) {
      console.info('Akun pemilik sudah ada sebelumnya:', existing.username);
      return existing;
    }

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
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    // Selalu simpan ke localStorage fallback terlebih dahulu
    saveLocalUser(newProfile);

    // Coba simpan ke Cloud Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.PROFILE, 'owner_1'), cleanFirestoreData(newProfile), { merge: true });
      console.info('Akun pemilik berhasil dibuat dan disimpan ke Cloud Firestore.');
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PROFILE}/owner_1`);
      console.warn('Firestore gagal menyimpan akun pemilik. Data berhasil disimpan ke fallback localStorage:', err);
    }

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
    await clearCollection(COLLECTIONS.DEBTS);
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

    localStorage.removeItem(LOCAL_STORAGE_USERS_KEY);
    localStorage.removeItem('dompet_omti_session');
    localStorage.removeItem('dompet_omti_theme');
  },
};
