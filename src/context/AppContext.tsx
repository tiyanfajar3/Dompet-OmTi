import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  Debt 
} from '../types';
import { storageService, initializeDatabase } from '../lib/storage';
import { verifyPassword, hashPassword, generateSalt } from '../lib/crypto';
import { getTodayDateString } from '../lib/formatters';

interface AppContextType {
  // Auth & Profile
  profile: UserProfile | null;
  hasAccount: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
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

  // Debts (Catatan Piutang)
  debts: Debt[];
  addDebt: (data: Omit<Debt, 'id' | 'createdAt'>) => Promise<Debt>;
  updateDebt: (data: Debt) => Promise<Debt>;
  deleteDebt: (id: string) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (data: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Load all data directly from Firestore
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

      // Check active session if available
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session && session.userId && session.expiresAt > Date.now()) {
            const activeUser = allUsers.find(u => u.id === session.userId);
            if (activeUser) {
              setProfile(activeUser);
              const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
              const activeThemeMode = savedTheme || activeUser.theme || 'system';
              setThemeState(activeThemeMode);
              applyTheme(activeThemeMode);
            }
          }
        } catch {}
      }

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
  }, [applyTheme]);

  // Initial Load, Auth Session Check & Firestore Realtime Sync
  useEffect(() => {
    let isMounted = true;
    let unsubs: Array<() => void> = [];

    const init = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
        if (!isMounted) return;

        // Fetch users first
        const allUsers = await storageService.getAllUsers();
        if (isMounted) {
          setUsers(allUsers);
        }

        // Check active session in localStorage
        const storedSession = localStorage.getItem(SESSION_KEY);
        let currentUser: UserProfile | null = null;
        if (storedSession) {
          try {
            const session = JSON.parse(storedSession);
            if (session && session.userId && session.expiresAt > Date.now()) {
              currentUser = allUsers.find(u => u.id === session.userId) || await storageService.getUserById(session.userId);
              if (currentUser && isMounted) {
                setProfile(currentUser);
                setIsAuthenticated(true);
                const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
                const activeThemeMode = savedTheme || currentUser.theme || 'system';
                setThemeState(activeThemeMode);
                applyTheme(activeThemeMode);
              } else {
                localStorage.removeItem(SESSION_KEY);
                if (isMounted) {
                  setIsAuthenticated(false);
                  setProfile(null);
                }
              }
            } else {
              localStorage.removeItem(SESSION_KEY);
              if (isMounted) {
                setIsAuthenticated(false);
                setProfile(null);
              }
            }
          } catch {
            localStorage.removeItem(SESSION_KEY);
            if (isMounted) {
              setIsAuthenticated(false);
              setProfile(null);
            }
          }
        }

        await refreshData();

        // Attach Realtime Subscriptions so data stays automatically synchronized across devices
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

        // Realtime sync for users & active profile
        const unsubUsers = storageService.subscribeUsers((updatedUsers) => {
          if (isMounted) {
            setUsers(updatedUsers);
            setProfile((prev) => {
              if (!prev) return null;
              const matched = updatedUsers.find(u => u.id === prev.id);
              if (!matched) {
                // If the user's account was deleted
                localStorage.removeItem(SESSION_KEY);
                setIsAuthenticated(false);
                return null;
              }
              return matched;
            });
          }
        });

        unsubs = [unsubTx, unsubCat, unsubPm, unsubBg, unsubRec, unsubDebts, unsubUsers];
      } catch (e: unknown) {
        console.error('Failed to initialize Dompet Omti Firestore database:', e);
        if (isMounted) {
          const msg = e instanceof Error ? e.message : 'Gagal menginisialisasi koneksi Cloud Firestore.';
          setFirestoreError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => {
        try {
          unsub();
        } catch {}
      });
    };
  }, []); // Run once on mount to prevent duplicate listeners

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

  // Login handler supporting multi-user
  const login = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
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
  };

  // Register / Initial Setup owner account
  const registerOwnerAccount = async (
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
      // 1. Periksa apakah akun pemilik sudah terdaftar sebelumnya di Firestore atau localStorage
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

      // 2. Buat akun pemilik baru (didukung fallback localStorage jika Firestore gagal)
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
      await refreshData();
      return { success: true };
    } catch (err: unknown) {
      console.error('Detail error registerOwnerAccount:', err);
      const detailMsg = err instanceof Error ? err.message : String(err);
      return { 
        success: false, 
        error: `Gagal membuat akun pemilik: ${detailMsg}` 
      };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setProfile(null);
    setActiveTab('dashboard');
  };

  // CRUD Data Akun Pengguna (Tahap 2)
  const addUser = async (userData: {
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
  };

  const updateUser = async (
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

    // Uniqueness check if username changed
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

    // Role check: prevent removing the last admin
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
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
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
  };

  // Update Profile
  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;
    const updated: UserProfile = { ...profile, ...data };
    await storageService.saveProfile(updated);
    setProfile(updated);
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    return true;
  };

  // Change Password
  const changePassword = async (
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
  };

  // Verify current password for dangerous operations
  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    if (!profile) return false;
    return verifyPassword(password, profile.passwordHash, profile.salt);
  };

  // Factory Reset
  const executeFactoryReset = async (password: string): Promise<{ success: boolean; error?: string }> => {
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

      // Re-fetch default categories and methods
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
  };

  // Transactions CRUD backed by Cloud Firestore
  const addTransaction = async (
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

    const newTx: Transaction = {
      ...data,
      id: newDocId,
      userId: profile?.id || 'owner_1',
      categoryId: data.categoryId,
      categoryName: catName,
      createdAt: now,
      updatedAt: now,
    };

    // Save directly to Cloud Firestore document first; throws on failure
    await storageService.saveTransaction(newTx);

    // After Firestore confirms success, immediately update React state
    setTransactions((prev) => {
      const filtered = prev.filter((t) => t.id !== newTx.id);
      return [newTx, ...filtered].sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    });

    return newTx;
  };

  const updateTransaction = async (data: Transaction): Promise<Transaction> => {
    if (!data.id) {
      throw new Error('ID dokumen transaksi tidak ditemukan untuk diubah.');
    }
    if (data.amount <= 0) {
      throw new Error('Nominal transaksi harus lebih dari Rp 0.');
    }
    if (!data.date) {
      throw new Error('Tanggal transaksi wajib diisi.');
    }

    // Role check: Pengguna biasa hanya boleh mengedit transaksi miliknya sendiri
    if (profile?.role === 'user') {
      const existing = transactions.find(t => t.id === data.id);
      if (existing && (existing.userId || 'owner_1') !== profile.id) {
        throw new Error('Anda tidak berhak mengubah transaksi milik pengguna lain.');
      }
    }

    const cat = categories.find(c => c.id === data.categoryId);
    const catName = cat?.name || data.categoryName || 'Lainnya';
    const updatedTx: Transaction = {
      ...data,
      userId: data.userId || profile?.id || 'owner_1',
      categoryName: catName,
      updatedAt: new Date().toISOString(),
    };

    // Save update to Cloud Firestore document; throws on failure
    await storageService.saveTransaction(updatedTx);

    // After Firestore confirms success, immediately update React state
    setTransactions((prev) =>
      prev.map((t) => (t.id === data.id ? updatedTx : t)).sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      })
    );

    return updatedTx;
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('ID transaksi tidak valid untuk dihapus.');
    }

    // Role check: Pengguna biasa hanya boleh menghapus transaksi miliknya sendiri
    if (profile?.role === 'user') {
      const existing = transactions.find(t => t.id === id);
      if (existing && (existing.userId || 'owner_1') !== profile.id) {
        throw new Error('Anda tidak berhak menghapus transaksi milik pengguna lain.');
      }
    }

    // Delete directly from Cloud Firestore document; throws on failure
    await storageService.deleteTransaction(id);

    // After Firestore confirms success, immediately update React state
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Categories CRUD
  const addCategory = async (data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    const newCat: Category = {
      ...data,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveCategory(newCat);
    await refreshData();
    return newCat;
  };

  const updateCategory = async (data: Category): Promise<Category> => {
    await storageService.saveCategory(data);
    await refreshData();
    return data;
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
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
    }
    await refreshData();
    return { success: true };
  };

  // Payment Methods CRUD
  const addPaymentMethod = async (name: string, icon = 'CreditCard'): Promise<PaymentMethod> => {
    const newPm: PaymentMethod = {
      id: `pm_${Date.now()}`,
      name: name.trim(),
      icon,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    await storageService.savePaymentMethod(newPm);
    await refreshData();
    return newPm;
  };

  const deletePaymentMethod = async (id: string): Promise<void> => {
    await storageService.deletePaymentMethod(id);
    await refreshData();
  };

  // Budgets CRUD
  const saveBudget = async (categoryId: string, amount: number): Promise<Budget> => {
    const existing = budgets.find(b => b.categoryId === categoryId);
    const budgetObj: Budget = {
      id: existing ? existing.id : `b_${Date.now()}`,
      categoryId,
      amount,
      period: 'monthly',
    };
    await storageService.saveBudget(budgetObj);
    await refreshData();
    return budgetObj;
  };

  const deleteBudget = async (id: string): Promise<void> => {
    await storageService.deleteBudget(id);
    await refreshData();
  };

  // Recurring Transactions CRUD
  const addRecurringTransaction = async (
    data: Omit<RecurringTransaction, 'id' | 'createdAt'>
  ): Promise<RecurringTransaction> => {
    const newRec: RecurringTransaction = {
      ...data,
      id: `rec_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveRecurringTransaction(newRec);
    await refreshData();
    return newRec;
  };

  const updateRecurringTransaction = async (
    data: RecurringTransaction
  ): Promise<RecurringTransaction> => {
    await storageService.saveRecurringTransaction(data);
    await refreshData();
    return data;
  };

  const deleteRecurringTransaction = async (id: string): Promise<void> => {
    await storageService.deleteRecurringTransaction(id);
    await refreshData();
  };

  const executeRecurringNow = async (id: string): Promise<Transaction | null> => {
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
    await refreshData();
    return newTx;
  };

  // Modal helpers
  const openAddModal = (type: TransactionType = 'expense', txToEdit: Transaction | null = null) => {
    setModalDefaultType(type);
    setEditingTransaction(txToEdit);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  // Debts CRUD
  const addDebt = async (debtData: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> => {
    const newDebt = await storageService.addDebt({
      ...debtData,
      userId: debtData.userId || profile?.id || 'owner_1',
    });
    // Tidak menambahkan state manual secara lokal di sini untuk mencegah double render/duplikasi,
    // karena listener realtime Firestore (subscribeDebts) akan mengupdate state secara otomatis.
    return newDebt;
  };

  const updateDebt = async (debt: Debt): Promise<Debt> => {
    const updated = await storageService.updateDebt(debt);
    return updated;
  };

  const deleteDebt = async (id: string): Promise<void> => {
    await storageService.deleteDebt(id);
  };

  // Visible debts filtered by role:
  // - Admin (Tuan Muda): Super Admin dengan akses penuh (melihat seluruh piutang)
  // - User (Pengguna Biasa): Hanya mengelola piutang miliknya sendiri
  const visibleDebts = React.useMemo(() => {
    if (!profile) return [];
    const source = profile.role === 'admin'
      ? debts
      : debts.filter(d => d.userId === profile.id);
    const map = new Map<string, Debt>();
    source.forEach(d => {
      if (d && d.id) map.set(d.id, d);
    });
    return Array.from(map.values());
  }, [debts, profile]);

  // Visible transactions filtered by role:
  // - Admin (Tuan Muda): Super Admin dengan akses penuh (melihat seluruh transaksi)
  // - User (Pengguna Biasa): Hanya mengelola transaksi miliknya sendiri
  const visibleTransactions = React.useMemo(() => {
    if (!profile) return [];
    if (profile.role === 'admin') {
      return transactions;
    }
    return transactions.filter(t => (t.userId || 'owner_1') === profile.id);
  }, [transactions, profile]);

  return (
    <AppContext.Provider
      value={{
        profile,
        users,
        hasAccount: users.length > 0 || profile !== null,
        isAuthenticated,
        isLoading,
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
        transactions: visibleTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
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
      }}
    >
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
