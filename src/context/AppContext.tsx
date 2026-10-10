import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { 
  UserProfile, 
  Transaction, 
  Category, 
  PaymentMethod, 
  Budget, 
  RecurringTransaction, 
  ActiveTab, 
  ThemeMode, 
  TransactionType, 
  UserRole, 
  Debt,
  DebtStatus 
} from '../types';
import { storageService, initializeDatabase, getLocalUsers } from '../lib/storage';
import { verifyPassword, hashPassword, generateSalt } from '../lib/crypto';
import { getTodayDateString } from '../lib/formatters';

interface AppContextType {
  // Auth & Profile
  profile: UserProfile | null;
  hasAccount: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedAccountFilter: string;
  setSelectedAccountFilter: (accountId: string) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerOwnerAccount: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string; alreadyExists?: boolean }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  executeFactoryReset: (password: string) => Promise<{ success: boolean; error?: string }>;

  // User Accounts Management (Tahap 2)
  users: UserProfile[];
  addUser: (userData: { username: string; password: string; displayName: string; role: UserRole }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, data: Partial<UserProfile> & { newPassword?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Debts (Utang, Piutang & Tagihan Wajib)
  debts: Debt[];
  addDebt: (data: Omit<Debt, 'id' | 'createdAt'>) => Promise<Debt>;
  updateDebt: (data: Debt) => Promise<Debt>;
  deleteDebt: (id: string) => Promise<void>;
  reduceDebtBalance: (debtId: string, amountPaid: number) => Promise<Debt | null>;

  // Transactions
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (data: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  batchReassignTransactions: (transactionIds: string[], newAccountId: string) => Promise<void>;
  batchDeleteTransactions: (transactionIds: string[]) => Promise<void>;
  firestoreError: string | null;
  clearFirestoreError: () => void;

  // Categories
  categories: Category[];
  addCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (data: Category) => Promise<Category>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Payment Methods
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (name: string, icon?: string) => Promise<PaymentMethod>;
  deletePaymentMethod: (id: string) => Promise<void>;

  // Budgets
  budgets: Budget[];
  saveBudget: (categoryId: string, amount: number) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;

  // Recurring
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (data: RecurringTransaction) => Promise<RecurringTransaction>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  executeRecurringNow: (id: string) => Promise<Transaction | null>;

  // Theme & Navigation
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Add / Edit Transaction Modal
  isAddModalOpen: boolean;
  editingTransaction: Transaction | null;
  modalDefaultType: TransactionType;
  openAddModal: (type?: TransactionType, txToEdit?: Transaction | null) => void;
  closeAddModal: () => void;

  // Data Refresh
  refreshData: (accountId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_KEY = 'dompet_omti_session';
const THEME_KEY = 'dompet_omti_theme';

// Fast helper to inspect current session from localStorage without blocking render
function getStoredValidSession(): { userId: string; username: string; role?: string; expiresAt?: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.userId && (!session.expiresAt || session.expiresAt > Date.now())) {
      return session;
    }
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  return null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization for zero-latency mobile rendering
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const session = getStoredValidSession();
      if (!session) return null;
      const localUsers = getLocalUsers();
      return localUsers.find(u => u.id === session.userId) || null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      return getLocalUsers();
    } catch {
      return [];
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!getStoredValidSession();
    } catch {
      return false;
    }
  });

  // If no session exists, isLoading is false IMMEDIATELY: renders LoginPage with 0ms delay!
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const session = getStoredValidSession();
      if (!session) return false;
      const localUsers = getLocalUsers();
      return !localUsers.some(u => u.id === session.userId);
    } catch {
      return false;
    }
  });

  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // Initialize theme from localStorage immediately
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode;
      return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('expense');

  // Active Account / Vault Filter State:
  // - Admin: 'owner_1' (Default), 'all' (Konsolidasi), atau ID akun cabang
  // - Non-admin: Terisolasi mutlak ke ID akunnya sendiri
  const [selectedAccountFilter, setSelectedAccountFilterState] = useState<string>('owner_1');

  const setSelectedAccountFilter = useCallback((accountId: string) => {
    if (!profile) return;
    if (profile.role !== 'admin') {
      setSelectedAccountFilterState(profile.id);
      return;
    }
    // Jika memilih akun admin / pemilik, standardisasi ke 'owner_1'
    if (accountId === profile.id || accountId === 'owner_1' || accountId === 'admin') {
      setSelectedAccountFilterState('owner_1');
      return;
    }
    setSelectedAccountFilterState(accountId);
  }, [profile]);

  // Sinkronisasi otomatis saat profile dimuat
  useEffect(() => {
    if (profile) {
      if (profile.role !== 'admin') {
        setSelectedAccountFilterState(profile.id);
      } else {
        setSelectedAccountFilterState((prev) => {
          if (!prev || prev === 'me' || prev === profile.id || prev === 'admin') return 'owner_1';
          return prev;
        });
      }
    }
  }, [profile]);

  const clearFirestoreError = useCallback(() => {
    setFirestoreError(null);
  }, []);

  // Apply Theme class to HTML element
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    try {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#020617' : '#ffffff');
      }
    } catch {}
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
    applyTheme(mode);
    if (profile) {
      const updated: UserProfile = { ...profile, theme: mode };
      await storageService.saveProfile(updated);
      setProfile(updated);
    }
  }, [applyTheme, profile]);

  // Session verification & background user hydration
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const session = getStoredValidSession();
      if (!session) {
        if (isMounted) {
          setIsLoading(false);
          setIsAuthenticated(false);
        }
        return;
      }

      try {
        const fetchedUser = await storageService.getUserById(session.userId);
        if (!isMounted) return;

        if (fetchedUser) {
          setProfile(fetchedUser);
          setIsAuthenticated(true);
          const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
          const activeThemeMode = savedTheme || fetchedUser.theme || 'system';
          setThemeState(activeThemeMode);
          applyTheme(activeThemeMode);
        } else {
          // If user not found in remote or local storage
          const localUsers = getLocalUsers();
          const fallbackUser = localUsers.find(u => u.id === session.userId);
          if (fallbackUser) {
            setProfile(fallbackUser);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem(SESSION_KEY);
            setIsAuthenticated(false);
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn('Session verification fallback note:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [applyTheme]);

  // Authenticated Data Realtime Synchronization
  // Runs ONLY when user is authenticated, avoiding wasteful blocking and unneeded network usage on login page
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;
    let unsubs: Array<() => void> = [];

    // Background seed default database items if needed without blocking UI
    initializeDatabase().catch((err) => {
      console.warn('Background database initialization note:', err);
    });

    // Attach Realtime Subscriptions so data stays automatically synchronized across devices
    // Note: Firestore onSnapshot immediately delivers the current state on its first snapshot callback,
    // eliminating the need for an expensive duplicate refreshData() fetch on startup.
    const unsubTx = storageService.subscribeTransactions(
      (txs) => {
        if (isMounted) {
          setTransactions(txs);
          setFirestoreError(null);
        }
      },
      (err) => {
        if (isMounted) {
          setFirestoreError(err.message);
        }
      },
      'all'
    );

    const unsubCat = storageService.subscribeCategories((cats) => {
      if (isMounted) setCategories(cats);
    });

    const unsubPm = storageService.subscribePaymentMethods((pms) => {
      if (isMounted) setPaymentMethods(pms);
    });

    const unsubBg = storageService.subscribeBudgets((bgs) => {
      if (isMounted) setBudgets(bgs);
    });

    const unsubRec = storageService.subscribeRecurringTransactions((recs) => {
      if (isMounted) setRecurringTransactions(recs);
    });

    const unsubDebts = storageService.subscribeDebts((debtList) => {
      if (isMounted) {
        const map = new Map<string, Debt>();
        debtList.forEach((d) => {
          if (d && d.id) map.set(d.id, d);
        });
        setDebts(Array.from(map.values()));
      }
    });

    const unsubUsers = storageService.subscribeUsers((updatedUsers) => {
      if (isMounted) {
        setUsers(updatedUsers);
        setProfile((prev) => {
          if (!prev) return null;
          const matched = updatedUsers.find((u) => u.id === prev.id);
          if (!matched) {
            localStorage.removeItem(SESSION_KEY);
            setIsAuthenticated(false);
            return null;
          }
          return matched;
        });
      }
    });

    unsubs = [unsubTx, unsubCat, unsubPm, unsubBg, unsubRec, unsubDebts, unsubUsers];

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, [isAuthenticated]);

  // Listen to system dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Manual refresh helper
  const refreshData = useCallback(async (accountId?: string) => {
    try {
      setFirestoreError(null);
      const [allUsers, txs, cats, pms, bgs, recs, debtList] = await Promise.all([
        storageService.getAllUsers(),
        storageService.getTransactions(accountId || 'all'),
        storageService.getCategories(),
        storageService.getPaymentMethods(),
        storageService.getBudgets(),
        storageService.getRecurringTransactions(),
        storageService.getDebts(),
      ]);

      setUsers(allUsers);
      setTransactions(txs);
      setCategories(cats);
      setPaymentMethods(pms);
      setBudgets(bgs);
      setRecurringTransactions(recs);
      setDebts(debtList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan data dengan Cloud Firestore.';
      console.error('Error refreshing data from Firestore:', err);
      setFirestoreError(msg);
    }
  }, []);

  // Login handler
  const login = useCallback(async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const allUsers = await storageService.getAllUsers();

    if (allUsers.length === 0) {
      return { success: false, error: 'Belum ada akun yang terdaftar. Silakan inisialisasi akun Anda.' };
    }

    const matchedUser = allUsers.find(u => u.username.toLowerCase() === cleanUser);
    if (!matchedUser) {
      return { success: false, error: 'Username atau kata sandi tidak cocok.' };
    }

    const isValid = await verifyPassword(pass, matchedUser.passwordHash, matchedUser.salt);
    if (!isValid) {
      return { success: false, error: 'Kata sandi tidak sesuai. Silakan coba kembali.' };
    }

    // Set secure session (7 days)
    const session = {
      userId: matchedUser.id,
      username: matchedUser.username,
      role: matchedUser.role || 'user',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setIsAuthenticated(true);
    setProfile(matchedUser);

    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
    const activeThemeMode = savedTheme || matchedUser.theme || 'system';
    setThemeState(activeThemeMode);
    applyTheme(activeThemeMode);

    return { success: true };
  }, [applyTheme]);

  // Register owner account
  const registerOwnerAccount = useCallback(async (
    username: string,
    pass: string,
    displayName = 'Tuan Muda'
  ): Promise<{ success: boolean; error?: string; alreadyExists?: boolean }> => {
    if (!username.trim()) {
      return { success: false, error: 'Username wajib diisi' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Kata sandi minimal 6 karakter' };
    }

    try {
      const existingOwner = await storageService.getProfile('owner_1');
      if (existingOwner) {
        console.warn('Akun pemilik sudah terdaftar di Firestore/localStorage:', existingOwner.username);
        setUsers([existingOwner]);
        return {
          success: false,
          error: `Akun pemilik ("${existingOwner.username}") sudah terdaftar di Firestore. Tampilan dialihkan ke mode login biasa.`,
          alreadyExists: true,
        };
      }

      const newProfile = await storageService.createOwnerProfile(username, pass, displayName);
      const session = {
        userId: newProfile.id,
        username: newProfile.username,
        role: 'admin',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setProfile(newProfile);
      setUsers([newProfile]);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err: unknown) {
      console.error('Detail error registerOwnerAccount:', err);
      const detailMsg = err instanceof Error ? err.message : String(err);
      return { 
        success: false, 
        error: `Gagal membuat akun pemilik: ${detailMsg}` 
      };
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setProfile(null);
    setTransactions([]);
    setDebts([]);
    setBudgets([]);
    setRecurringTransactions([]);
    setActiveTab('dashboard');
  }, []);

  // User Accounts Management
  const addUser = useCallback(async (userData: {
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<{ success: boolean; error?: string }> => {
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Hanya Super Admin yang diizinkan menambah akun pengguna.' };
    }

    const cleanUser = userData.username.trim().toLowerCase();
    if (!cleanUser) {
      return { success: false, error: 'Username wajib diisi.' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      return { success: false, error: 'Username hanya boleh memuat huruf, angka, titik, strip, atau underscore.' };
    }
    if (!userData.displayName.trim()) {
      return { success: false, error: 'Nama tampilan wajib diisi.' };
    }
    if (userData.password.length < 6) {
      return { success: false, error: 'Kata sandi minimal 6 karakter.' };
    }

    const allUsers = await storageService.getAllUsers();
    if (allUsers.some(u => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: 'Username sudah digunakan oleh akun lain.' };
    }

    try {
      const salt = generateSalt();
      const passwordHash = await hashPassword(userData.password, salt);
      const now = new Date().toISOString();
      const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newUser: UserProfile = {
        id: newId,
        username: cleanUser,
        displayName: userData.displayName.trim(),
        profilePhoto: '',
        passwordHash,
        salt,
        theme: 'system',
        role: userData.role || 'user',
        createdAt: now,
        updatedAt: now,
      };

      await storageService.saveUser(newUser);
      setUsers(prev => [...prev.filter(u => u.id !== newId), newUser]);
      return { success: true };
    } catch {
      return { success: false, error: 'Terjadi kegagalan saat menyimpan akun pengguna ke Cloud Firestore.' };
    }
  }, [profile?.role]);

  const updateUser = useCallback(async (
    userId: string,
    data: Partial<UserProfile> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Hanya Super Admin yang diizinkan mengubah data akun pengguna.' };
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Akun tidak ditemukan.' };
    }

    if (data.username && data.username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const cleanUser = data.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
        return { success: false, error: 'Format username tidak valid.' };
      }
      if (users.some(u => u.id !== userId && u.username.toLowerCase() === cleanUser)) {
        return { success: false, error: 'Username sudah digunakan oleh akun lain.' };
      }
      data.username = cleanUser;
    }

    if (data.role && data.role !== 'admin' && targetUser.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'Sistem harus memiliki minimal satu Super Admin.' };
      }
    }

    try {
      let newHash = targetUser.passwordHash;
      let newSalt = targetUser.salt;
      if (data.newPassword) {
        if (data.newPassword.length < 6) {
          return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
        }
        newSalt = generateSalt();
        newHash = await hashPassword(data.newPassword, newSalt);
      }

      const updatedUser: UserProfile = {
        ...targetUser,
        ...data,
        id: targetUser.id,
        passwordHash: newHash,
        salt: newSalt,
        updatedAt: new Date().toISOString(),
      };

      await storageService.saveUser(updatedUser);
      setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));

      if (profile && profile.id === userId) {
        setProfile(updatedUser);
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Gagal memperbarui data akun pengguna.' };
    }
  }, [profile, users]);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Hanya Super Admin yang diizinkan menghapus akun pengguna.' };
    }

    if (profile?.id === userId) {
      return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' };
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Akun tidak ditemukan.' };
    }

    if (targetUser.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'Tidak dapat menghapus satu-satunya Super Admin di sistem.' };
      }
    }

    try {
      await storageService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } catch {
      return { success: false, error: 'Gagal menghapus akun pengguna dari Cloud Firestore.' };
    }
  }, [profile?.id, profile?.role, users]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;
    const updated: UserProfile = { ...profile, ...data };
    await storageService.saveProfile(updated);
    setProfile(updated);
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    return true;
  }, [profile]);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile) return { success: false, error: 'Profil tidak ditemukan' };
    const isValid = await verifyPassword(currentPassword, profile.passwordHash, profile.salt);
    if (!isValid) {
      return { success: false, error: 'Kata sandi saat ini salah' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal 6 karakter' };
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const updated: UserProfile = {
      ...profile,
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveProfile(updated);
    setProfile(updated);
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    return { success: true };
  }, [profile]);

  const verifyCurrentPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!profile) return false;
    return verifyPassword(password, profile.passwordHash, profile.salt);
  }, [profile]);

  const executeFactoryReset = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: 'Tidak ada profil pemilik yang terdaftar.' };
    }

    if (profile.role !== 'admin') {
      return { success: false, error: 'Hanya Super Admin (Tuan Muda) yang dapat melakukan Factory Reset.' };
    }

    const isMatch = await verifyPassword(password, profile.passwordHash, profile.salt);
    if (!isMatch) {
      return { success: false, error: 'Password salah. Tindakan reset dibatalkan.' };
    }

    try {
      await storageService.factoryResetStorage();
      setProfile(null);
      setUsers([]);
      setIsAuthenticated(false);
      setTransactions([]);
      setBudgets([]);
      setRecurringTransactions([]);
      setActiveTab('dashboard');

      const [cats, pms] = await Promise.all([
        storageService.getCategories(),
        storageService.getPaymentMethods(),
      ]);
      setCategories(cats);
      setPaymentMethods(pms);

      return { success: true };
    } catch {
      return { success: false, error: 'Terjadi kegagalan saat menjalankan Factory Reset.' };
    }
  }, [profile]);

  // Transactions CRUD
  const addTransaction = useCallback(async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> => {
    if (data.amount <= 0) {
      throw new Error('Nominal transaksi harus lebih dari Rp 0.');
    }
    if (!data.date) {
      throw new Error('Tanggal transaksi wajib diisi.');
    }
    if (!data.categoryId) {
      throw new Error('Kategori transaksi wajib dipilih.');
    }

    const now = new Date().toISOString();
    const cat = categories.find(c => c.id === data.categoryId);
    const catName = cat?.name || data.categoryName || 'Lainnya';
    const newDocId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const targetAccountId = (profile?.role === 'admin' && (data.accountId || data.userId))
      ? (data.accountId || data.userId)
      : (profile?.id || 'owner_1');
    const defaultAccount = storageService.getActiveDefaultAccountId(profile?.id);
    const isDefault = storageService.isDefaultAdminAccount(targetAccountId, defaultAccount);
    const canonicalAccount = isDefault ? 'owner_1' : targetAccountId;

    const newTx: Transaction = {
      ...data,
      id: newDocId,
      userId: canonicalAccount,
      accountId: canonicalAccount,
      tenantId: canonicalAccount,
      branchId: isDefault ? undefined : canonicalAccount,
      categoryId: data.categoryId,
      categoryName: catName,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await storageService.saveTransaction(newTx, profile?.id);

    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== saved.id);
      return [saved, ...filtered].sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    });

    return saved;
  }, [categories, profile?.id, profile?.role]);

  const updateTransaction = useCallback(async (data: Transaction): Promise<Transaction> => {
    if (!data.id) {
      throw new Error('ID dokumen transaksi tidak ditemukan untuk diubah.');
    }
    if (data.amount <= 0) {
      throw new Error('Nominal transaksi harus lebih dari Rp 0.');
    }
    if (!data.date) {
      throw new Error('Tanggal transaksi wajib diisi.');
    }

    if (profile?.role === 'user') {
      const existing = transactions.find(t => t.id === data.id);
      if (existing && (existing.userId || 'owner_1') !== profile.id) {
        throw new Error('Anda tidak berhak mengubah transaksi milik pengguna lain.');
      }
    }

    const cat = categories.find(c => c.id === data.categoryId);
    const catName = cat?.name || data.categoryName || 'Lainnya';

    const targetAccountId = (profile?.role === 'admin' && (data.accountId || data.userId))
      ? (data.accountId || data.userId)
      : (data.accountId || data.userId || profile?.id || 'owner_1');
    const defaultAccount = storageService.getActiveDefaultAccountId(profile?.id);
    const isDefault = storageService.isDefaultAdminAccount(targetAccountId, defaultAccount);
    const canonicalAccount = isDefault ? 'owner_1' : targetAccountId;

    const updatedTx: Transaction = {
      ...data,
      userId: canonicalAccount,
      accountId: canonicalAccount,
      tenantId: canonicalAccount,
      branchId: isDefault ? undefined : canonicalAccount,
      categoryName: catName,
      updatedAt: new Date().toISOString(),
    };

    const saved = await storageService.saveTransaction(updatedTx, profile?.id);

    setTransactions((prev) =>
      prev.map((t) => (t.id === data.id ? saved : t)).sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      })
    );

    return saved;
  }, [categories, profile?.id, profile?.role, transactions]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('ID transaksi tidak valid untuk dihapus.');
    }

    if (profile?.role === 'user') {
      const existing = transactions.find(t => t.id === id);
      if (existing && (existing.userId || 'owner_1') !== profile.id) {
        throw new Error('Anda tidak berhak menghapus transaksi milik pengguna lain.');
      }
    }

    await storageService.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, [profile?.id, profile?.role, transactions]);

  const batchReassignTransactions = useCallback(async (
    transactionIds: string[],
    newAccountId: string
  ): Promise<void> => {
    if (profile?.role !== 'admin') {
      throw new Error('Hanya Super Admin yang diizinkan memindahkan transaksi secara massal.');
    }
    if (!transactionIds.length) return;

    await storageService.batchReassignTransactions(transactionIds, newAccountId, profile.id);

    const defaultAccount = storageService.getActiveDefaultAccountId(profile.id);
    const isDefault = storageService.isDefaultAdminAccount(newAccountId, defaultAccount);
    const canonicalAccount = isDefault ? 'owner_1' : newAccountId.trim();
    const idSet = new Set(transactionIds);
    const now = new Date().toISOString();

    setTransactions((prev) =>
      prev.map((t) => {
        if (idSet.has(t.id)) {
          return {
            ...t,
            accountId: canonicalAccount,
            userId: canonicalAccount,
            tenantId: canonicalAccount,
            branchId: isDefault ? undefined : canonicalAccount,
            updatedAt: now,
          };
        }
        return t;
      })
    );
  }, [profile?.id, profile?.role]);

  const batchDeleteTransactions = useCallback(async (transactionIds: string[]): Promise<void> => {
    if (profile?.role !== 'admin') {
      throw new Error('Hanya Super Admin yang diizinkan menghapus transaksi secara massal.');
    }
    if (!transactionIds.length) return;

    await storageService.batchDeleteTransactions(transactionIds);

    const idSet = new Set(transactionIds);
    setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
  }, [profile?.role]);

  // Categories CRUD
  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    const newCat: Category = {
      ...data,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveCategory(newCat);
    setCategories(prev => [...prev.filter(c => c.id !== newCat.id), newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback(async (data: Category): Promise<Category> => {
    await storageService.saveCategory(data);
    setCategories(prev => prev.map(c => (c.id === data.id ? data : c)));
    return data;
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const count = transactions.filter(t => t.categoryId === id).length;
    if (count > 0) {
      const fallbackCat = categories.find(c => c.name === 'Lainnya' && c.id !== id);
      if (fallbackCat) {
        const affectedTxs = transactions.filter(t => t.categoryId === id);
        for (const tx of affectedTxs) {
          await storageService.saveTransaction({
            ...tx,
            categoryId: fallbackCat.id,
            categoryName: tx.categoryName || fallbackCat.name,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    await storageService.deleteCategory(id);
    const relatedBudget = budgets.find(b => b.categoryId === id);
    if (relatedBudget) {
      await storageService.deleteBudget(relatedBudget.id);
      setBudgets(prev => prev.filter(b => b.id !== relatedBudget.id));
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    return { success: true };
  }, [transactions, categories, budgets]);

  // Payment Methods CRUD
  const addPaymentMethod = useCallback(async (name: string, icon = 'CreditCard'): Promise<PaymentMethod> => {
    const newPm: PaymentMethod = {
      id: `pm_${Date.now()}`,
      name: name.trim(),
      icon,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    await storageService.savePaymentMethod(newPm);
    setPaymentMethods(prev => [...prev.filter(p => p.id !== newPm.id), newPm]);
    return newPm;
  }, []);

  const deletePaymentMethod = useCallback(async (id: string): Promise<void> => {
    await storageService.deletePaymentMethod(id);
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
  }, []);

  // Budgets CRUD
  const saveBudget = useCallback(async (categoryId: string, amount: number): Promise<Budget> => {
    const existing = budgets.find(b => b.categoryId === categoryId);
    const budgetObj: Budget = {
      id: existing ? existing.id : `b_${Date.now()}`,
      categoryId,
      amount,
      period: 'monthly',
    };
    await storageService.saveBudget(budgetObj);
    setBudgets(prev => [...prev.filter(b => b.id !== budgetObj.id), budgetObj]);
    return budgetObj;
  }, [budgets]);

  const deleteBudget = useCallback(async (id: string): Promise<void> => {
    await storageService.deleteBudget(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  // Recurring Transactions CRUD
  const addRecurringTransaction = useCallback(async (
    data: Omit<RecurringTransaction, 'id' | 'createdAt'>
  ): Promise<RecurringTransaction> => {
    const newRec: RecurringTransaction = {
      ...data,
      id: `rec_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveRecurringTransaction(newRec);
    setRecurringTransactions(prev => [...prev.filter(r => r.id !== newRec.id), newRec]);
    return newRec;
  }, []);

  const updateRecurringTransaction = useCallback(async (
    data: RecurringTransaction
  ): Promise<RecurringTransaction> => {
    await storageService.saveRecurringTransaction(data);
    setRecurringTransactions(prev => prev.map(r => (r.id === data.id ? data : r)));
    return data;
  }, []);

  const deleteRecurringTransaction = useCallback(async (id: string): Promise<void> => {
    await storageService.deleteRecurringTransaction(id);
    setRecurringTransactions(prev => prev.filter(r => r.id !== id));
  }, []);

  const executeRecurringNow = useCallback(async (id: string): Promise<Transaction | null> => {
    const rec = recurringTransactions.find(r => r.id === id);
    if (!rec) return null;

    const cat = categories.find(c => c.id === rec.categoryId);
    const today = getTodayDateString();

    const newTx: Transaction = {
      id: `tx_${Date.now()}_rec`,
      type: rec.type,
      categoryId: rec.categoryId,
      categoryName: cat?.name || 'Rutin',
      amount: rec.amount,
      date: today,
      description: `${rec.name} (Otomatis Rutin)`,
      paymentMethod: rec.paymentMethod || 'Bank',
      receiptImages: [],
      isRecurringInstance: true,
      recurringId: rec.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storageService.saveTransaction(newTx);
    await storageService.saveRecurringTransaction({
      ...rec,
      lastExecutedDate: today,
    });
    setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id)]);
    return newTx;
  }, [recurringTransactions, categories]);

  // Modal helpers
  const openAddModal = useCallback((type: TransactionType = 'expense', txToEdit: Transaction | null = null) => {
    setModalDefaultType(type);
    setEditingTransaction(txToEdit);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  }, []);

  // Debts CRUD
  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> => {
    const newDebt = await storageService.addDebt({
      ...debtData,
      userId: debtData.userId || profile?.id || 'owner_1',
    });
    return newDebt;
  }, [profile?.id]);

  const updateDebt = useCallback(async (debt: Debt): Promise<Debt> => {
    const updated = await storageService.updateDebt(debt);
    return updated;
  }, []);

  const deleteDebt = useCallback(async (id: string): Promise<void> => {
    await storageService.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
  }, []);

  const reduceDebtBalance = useCallback(async (debtId: string, amountPaid: number): Promise<Debt | null> => {
    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt) return null;

    const currentRemaining = typeof targetDebt.remainingAmount === 'number'
      ? targetDebt.remainingAmount
      : targetDebt.amount;
    const newRemaining = Math.max(0, currentRemaining - amountPaid);
    const newStatus: DebtStatus = newRemaining <= 0 ? 'paid' : 'unpaid';

    const updatedDebt: Debt = {
      ...targetDebt,
      remainingAmount: newRemaining,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    const saved = await storageService.updateDebt(updatedDebt);
    setDebts(prev => prev.map(d => d.id === debtId ? saved : d));
    return saved;
  }, [debts]);

  // Visible debts memoized
  const visibleDebts = useMemo(() => {
    if (!profile) return [];
    if (profile.role !== 'admin') {
      const source = debts.filter(d => (d.userId || 'owner_1') === profile.id);
      const map = new Map<string, Debt>();
      source.forEach(d => {
        if (d && d.id) map.set(d.id, d);
      });
      return Array.from(map.values());
    }
    if (selectedAccountFilter === 'all') {
      const map = new Map<string, Debt>();
      debts.forEach(d => {
        if (d && d.id) map.set(d.id, d);
      });
      return Array.from(map.values());
    }
    const target = selectedAccountFilter || profile.id || 'owner_1';
    const source = debts.filter(d => {
      const account = d.userId || 'owner_1';
      if (target === 'owner_1' || target === profile.id) {
        return account === 'owner_1' || account === profile.id;
      }
      return account === target;
    });
    const map = new Map<string, Debt>();
    source.forEach(d => {
      if (d && d.id) map.set(d.id, d);
    });
    return Array.from(map.values());
  }, [debts, profile, selectedAccountFilter]);

  // Visible transactions memoized
  const visibleTransactions = useMemo(() => {
    if (!profile) return [];
    if (profile.role !== 'admin') {
      return transactions.filter(t => storageService.matchesAccount(t, profile.id, profile.id));
    }
    if (selectedAccountFilter === 'all') {
      return transactions;
    }
    const target = selectedAccountFilter || 'owner_1';
    return transactions.filter(t => storageService.matchesAccount(t, target, profile.id));
  }, [transactions, profile, selectedAccountFilter]);

  // Context value object memoized to protect all consumers from unnecessary re-renders
  const contextValue = useMemo<AppContextType>(() => ({
    profile,
    users,
    hasAccount: users.length > 0 || profile !== null,
    isAuthenticated,
    isLoading,
    selectedAccountFilter,
    setSelectedAccountFilter,
    login,
    registerOwnerAccount,
    logout,
    addUser,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword,
    verifyCurrentPassword,
    executeFactoryReset,
    debts: visibleDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    reduceDebtBalance,
    transactions: visibleTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    batchReassignTransactions,
    batchDeleteTransactions,
    firestoreError,
    clearFirestoreError,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    paymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    budgets,
    saveBudget,
    deleteBudget,
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    executeRecurringNow,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    isAddModalOpen,
    editingTransaction,
    modalDefaultType,
    openAddModal,
    closeAddModal,
    refreshData,
  }), [
    profile,
    users,
    isAuthenticated,
    isLoading,
    selectedAccountFilter,
    setSelectedAccountFilter,
    login,
    registerOwnerAccount,
    logout,
    addUser,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword,
    verifyCurrentPassword,
    executeFactoryReset,
    visibleDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    reduceDebtBalance,
    visibleTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    batchReassignTransactions,
    batchDeleteTransactions,
    firestoreError,
    clearFirestoreError,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    paymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    budgets,
    saveBudget,
    deleteBudget,
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    executeRecurringNow,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    isAddModalOpen,
    editingTransaction,
    modalDefaultType,
    openAddModal,
    closeAddModal,
    refreshData,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
