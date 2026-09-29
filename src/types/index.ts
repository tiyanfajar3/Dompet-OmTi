export type TransactionType = 'income' | 'expense';

export interface ReceiptImage {
  id: string;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  categoryId: string;
  categoryName?: string; // Cache for display when category is deleted/modified
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: string;
  receiptImages: ReceiptImage[];
  isRecurringInstance?: boolean;
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
}

export type BudgetPeriod = 'monthly';

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate?: string;
  endDate?: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  name: string;
  type: TransactionType;
  categoryId: string;
  amount: number;
  paymentMethod: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  lastExecutedDate?: string;
  active: boolean;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  passwordHash: string;
  salt: string;
  theme: ThemeMode;
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  appName: string;
  version: string;
  exportedAt: string;
  userProfile?: {
    username: string;
    displayName: string;
    profilePhoto: string;
    theme: ThemeMode;
  };
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
}

export type ActiveTab = 'dashboard' | 'transactions' | 'reports' | 'budgets' | 'recurring' | 'profile';
