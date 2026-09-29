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
  TransactionType 
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
  registerOwnerAccount: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  executeFactoryReset: (password: string) => Promise<{ success: boolean; error?: string }>;

  // Transactions
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (data: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

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
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_KEY = 'dompet_omti_session';
const THEME_KEY = 'dompet_omti_theme';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);

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
      const updated = { ...profile, theme: mode };
      await storageService.saveProfile(updated);
      setProfile(updated);
    }
  }, [applyTheme, profile]);

  // Load all data
  const refreshData = useCallback(async () => {
    try {
      const [p, txs, cats, pms, bgs, recs] = await Promise.all([
        storageService.getProfile(),
        storageService.getTransactions(),
        storageService.getCategories(),
        storageService.getPaymentMethods(),
        storageService.getBudgets(),
        storageService.getRecurringTransactions(),
      ]);

      if (p) {
        setProfile(p);
        // If theme saved in localStorage exists, it takes precedence or sync
        const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
        const activeThemeMode = savedTheme || p.theme || 'system';
        setThemeState(activeThemeMode);
        applyTheme(activeThemeMode);
      } else {
        setProfile(null);
      }

      setTransactions(txs);
      setCategories(cats);
      setPaymentMethods(pms);
      setBudgets(bgs);
      setRecurringTransactions(recs);
    } catch (err) {
      console.error('Error refreshing data from storage:', err);
    }
  }, [applyTheme]);

  // Initial Load & Auth Session Check
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
        await refreshData();

        // Check active session in localStorage
        const storedSession = localStorage.getItem(SESSION_KEY);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session && session.userId && session.expiresAt > Date.now()) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem(SESSION_KEY);
            setIsAuthenticated(false);
          }
        }
      } catch (e) {
        console.error('Failed to initialize Dompet Omti database:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [refreshData]);

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

  // Login handler
  const login = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const storedProfile = await storageService.getProfile();

    if (!storedProfile) {
      return { success: false, error: 'Profil pemilik belum dibuat. Silakan inisialisasi akun Anda.' };
    }

    if (storedProfile.username.toLowerCase() !== cleanUser) {
      return { success: false, error: 'Username tidak sesuai untuk pemilik akun ini' };
    }

    const isValid = await verifyPassword(pass, storedProfile.passwordHash, storedProfile.salt);
    if (!isValid) {
      return { success: false, error: 'Kata sandi tidak sesuai. Silakan coba kembali.' };
    }

    // Set secure session (7 days)
    const session = {
      userId: storedProfile.id,
      username: storedProfile.username,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setIsAuthenticated(true);
    setProfile(storedProfile);
    return { success: true };
  };

  // Register / Initial Setup owner account
  const registerOwnerAccount = async (
    username: string,
    pass: string,
    displayName = 'Tuan Muda'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!username.trim()) {
      return { success: false, error: 'Username wajib diisi' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Kata sandi minimal 6 karakter' };
    }

    try {
      const newProfile = await storageService.createOwnerProfile(username, pass, displayName);
      const session = {
        userId: newProfile.id,
        username: newProfile.username,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setProfile(newProfile);
      setIsAuthenticated(true);
      await refreshData();
      return { success: true };
    } catch {
      return { success: false, error: 'Gagal membuat akun pemilik' };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Update Profile
  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;
    const updated = { ...profile, ...data };
    await storageService.saveProfile(updated);
    setProfile(updated);
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

    const isMatch = await verifyPassword(password, profile.passwordHash, profile.salt);
    if (!isMatch) {
      return { success: false, error: 'Password salah. Tindakan reset dibatalkan.' };
    }

    try {
      await storageService.factoryResetStorage();
      setProfile(null);
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

  // Transactions CRUD
  const addTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> => {
    const now = new Date().toISOString();
    const cat = categories.find(c => c.id === data.categoryId);
    const newTx: Transaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      categoryName: cat?.name || data.categoryName || 'Lainnya',
      createdAt: now,
      updatedAt: now,
    };
    await storageService.saveTransaction(newTx);
    await refreshData();
    return newTx;
  };

  const updateTransaction = async (data: Transaction): Promise<Transaction> => {
    const cat = categories.find(c => c.id === data.categoryId);
    const updatedTx: Transaction = {
      ...data,
      categoryName: cat?.name || data.categoryName || 'Lainnya',
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveTransaction(updatedTx);
    await refreshData();
    return updatedTx;
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    await storageService.deleteTransaction(id);
    await refreshData();
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

  return (
    <AppContext.Provider
      value={{
        profile,
        hasAccount: profile !== null,
        isAuthenticated,
        isLoading,
        login,
        registerOwnerAccount,
        logout,
        updateProfile,
        changePassword,
        verifyCurrentPassword,
        executeFactoryReset,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
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
