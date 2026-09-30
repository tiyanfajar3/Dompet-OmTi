import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { TransactionListPage } from './components/transactions/TransactionListPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { BudgetPage } from './components/budgets/BudgetPage';
import { RecurringPage } from './components/recurring/RecurringPage';
import { ProfileSettingsPage } from './components/profile/ProfileSettingsPage';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { Wallet, AlertCircle, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, activeTab, firestoreError, clearFirestoreError } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse mb-4">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm font-semibold tracking-tight text-slate-200">
          Membuka Brankas Dompet Omti...
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Menyiapkan data keuangan pribadi Tuan Muda
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500 selection:text-white pb-20 md:pb-6">
      <OfflineIndicator />

      {/* Global Firestore Error Notification */}
      {firestoreError && (
        <div className="bg-rose-500 dark:bg-rose-600 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            <span className="font-medium">{firestoreError}</span>
          </div>
          <button 
            onClick={clearFirestoreError} 
            className="p-1 hover:bg-white/20 rounded transition cursor-pointer"
            title="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'transactions' && <TransactionListPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'budgets' && <BudgetPage />}
        {activeTab === 'recurring' && <RecurringPage />}
        {activeTab === 'profile' && <ProfileSettingsPage />}
      </main>

      <BottomNav />
      <TransactionFormModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
