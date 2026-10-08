import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  ReceiptText, 
  HandCoins,
  LayoutGrid,
  BarChart3, 
  Settings,
  User, 
  Plus,
  X,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  LogOut
} from 'lucide-react';
import { ActiveTab, ThemeMode } from '../../types';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    openAddModal, 
    debts, 
    profile, 
    theme, 
    setTheme, 
    logout 
  } = useApp();

  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Close sheet when activeTab changes
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMoreSheetOpen(false);
  };

  // Close sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when bottom sheet is open
  useEffect(() => {
    if (isMoreSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreSheetOpen]);

  const unpaidDebtsCount = debts ? debts.filter(d => d.status === 'unpaid').length : 0;

  // Active status check for "Lainnya" button
  const isMoreTabActive = ['reports', 'profile'].includes(activeTab);

  const moreMenuItems: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'reports', label: 'Laporan Keuangan', description: 'Analisis kas & perbandingan', icon: BarChart3 },
    { id: 'profile', label: 'Pengaturan & Profil', description: 'Akun, cabang & sistem', icon: Settings },
    { id: 'dashboard', label: 'Beranda / Dashboard', description: 'Ringkasan saldo & kas', icon: LayoutDashboard },
    { id: 'transactions', label: 'Daftar Transaksi', description: 'Riwayat pembukuan kas', icon: ReceiptText },
    { id: 'debts', label: 'Utang & Tagihan', description: 'Utang, piutang & tagihan wajib', icon: HandCoins, badge: unpaidDebtsCount },
  ];

  return (
    <>
      {/* ======================================================== */}
      {/* PRIMARY MOBILE BOTTOM NAVIGATION BAR                     */}
      {/* ======================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg shadow-slate-900/10 transition-colors">
        <div className="relative flex items-center justify-between h-15 px-2 max-w-md mx-auto">
          {/* Tab 1: Beranda */}
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Beranda</span>
          </button>

          {/* Tab 2: Transaksi */}
          <button
            onClick={() => handleSelectTab('transactions')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ReceiptText className={`w-5 h-5 ${activeTab === 'transactions' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Transaksi</span>
          </button>

          {/* Tab 3: Center FAB (+ Catat Transaksi) */}
          <div className="relative -top-3.5 px-1.5 flex items-center justify-center">
            <button
              onClick={() => openAddModal('expense')}
              aria-label="Tambah Transaksi Baru"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer border-3 border-slate-50 dark:border-slate-950"
            >
              <Plus className="w-6 h-6 stroke-[2.8]" />
            </button>
          </div>

          {/* Tab 4: Piutang (with badge) */}
          <button
            onClick={() => handleSelectTab('debts')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
              activeTab === 'debts'
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <HandCoins className={`w-5 h-5 ${activeTab === 'debts' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
              {unpaidDebtsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unpaidDebtsCount > 9 ? '9+' : unpaidDebtsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Piutang</span>
          </button>

          {/* Tab 5: Lainnya (Opens Sheet for Laporan, Anggaran, Rutin, Pengaturan, dll.) */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
              isMoreTabActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <LayoutGrid className={`w-5 h-5 ${isMoreTabActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
              {isMoreTabActive && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Lainnya</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE "MENU LAINNYA" BOTTOM SHEET DRAWER                */}
      {/* ======================================================== */}
      {isMoreSheetOpen && (
        <div 
          onClick={() => setIsMoreSheetOpen(false)}
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${
          isMoreSheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Menu Navigasi & Fitur
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih menu untuk berpindah halaman di Dompet Omti
            </p>
          </div>
          <button
            onClick={() => setIsMoreSheetOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of Menus */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            {moreMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex flex-col p-3 rounded-2xl text-left border transition cursor-pointer relative ${
                    isActive
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold leading-snug line-clamp-1">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Add Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIsMoreSheetOpen(false);
                openAddModal('expense');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-98 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Catat Transaksi Baru</span>
            </button>
          </div>
        </div>

        {/* Sheet Footer: Theme & Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {/* Theme switcher */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md transition ${theme === 'light' ? 'bg-white text-amber-500 shadow-xs' : 'text-slate-500'}`}
              title="Terang"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md transition ${theme === 'dark' ? 'bg-slate-700 text-emerald-400 shadow-xs' : 'text-slate-500'}`}
              title="Gelap"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-md transition ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
              title="Sistem"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              setIsMoreSheetOpen(false);
              if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
                logout();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>
    </>
  );
};
