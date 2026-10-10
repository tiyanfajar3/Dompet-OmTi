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
  userId?: string; // ID of the user who owns this transaction
  accountId?: string; // Account ID for multi-tenant isolation
  tenantId?: string; // Branch / Tenant ID
  branchId?: string; // Branch / Tenant ID fallback
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
  linkedDebtId?: string;
  linkedDebtType?: DebtType;
  linkedDebtName?: string;
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
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  passwordHash: string;
  salt: string;
  theme: ThemeMode;
  role: UserRole;
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
    role?: UserRole;
  };
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  debts?: Debt[];
}

export type DebtStatus = 'unpaid' | 'paid';
export type DebtType = 'piutang' | 'utang' | 'tagihan';

export interface Debt {
  id: string;
  userId: string;
  type?: DebtType; // 'piutang' (uang dipinjam orang), 'utang' (kita pinjam dari orang), 'tagihan' (kewajiban rutin/nafkah/dll). Default: 'piutang'
  title?: string; // Judul/keperluan utang atau nama tagihan wajib (contoh: "Utang Modal ke Ayah", "Biaya Nafkah Keluarga")
  borrowerName: string; // Pihak terkait (peminjam untuk piutang, pemberi pinjaman untuk utang, pihak/tujuan tagihan)
  amount: number; // Total nominal utang / piutang / tagihan
  remainingAmount?: number; // Sisa saldo yang belum dibayar / lunas
  monthlyInstallment?: number; // Target cicilan bulanan (contoh: Rp 1.500.000 / bln)
  tenorMonths?: number; // Tenor / jangka waktu cicilan dalam bulan (contoh: 12)
  dueDay?: number; // Tanggal rutin per bulan (1 - 31) untuk utang & tagihan wajib
  dueDate: string; // YYYY-MM-DD
  notes?: string;
  status: DebtStatus;
  proofUrl?: string; // string opsional untuk foto bukti
  createdAt: string;
  updatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'transactions' | 'debts' | 'reports' | 'profile';
