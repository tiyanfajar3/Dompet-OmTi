import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Sun, 
  Moon, 
  Monitor, 
  Wallet,
  Menu,
  X,
  LayoutDashboard,
  ReceiptText,
  HandCoins,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { ActiveTab, ThemeMode } from '../../types';

export const Navbar: React.FC = () => {
  const { 
    profile, 
    activeTab, 
    setActiveTab, 
    openAddModal, 
    theme, 
    setTheme,
    debts,
    logout 
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close drawer when tab is changed
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const unpaidDebtsCount = debts ? debts.filter(d => d.status === 'unpaid').length : 0;

  const navItems: { 
    id: ActiveTab; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    description: string; 
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Beranda & saldo kas' },
    { id: 'transactions', label: 'Transaksi', icon: ReceiptText, description: 'Riwayat & filter pembukuan' },
    { id: 'debts', label: 'Utang & Piutang', icon: HandCoins, description: 'Utang, piutang & tagihan wajib', badge: unpaidDebtsCount },
    { id: 'reports', label: 'Laporan', icon: BarChart3, description: 'Statistik & analisis arus kas' },
    { id: 'profile', label: 'Pengaturan', icon: Settings, description: 'Profil, cabang & cadangan' },
  ];

  const cycleTheme = () => {
    const next: ThemeMode = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark / Brand Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Dompet Omti
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {profile?.role === 'admin' ? 'Tuan Muda' : (profile?.displayName || 'Pengguna')}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`relative px-3 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-tight">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary actions & Mobile Menu Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme switcher */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={`Mode Tema: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Monitor className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Quick Add Button */}
          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Tambah Transaksi</span>
            <span className="sm:hidden">Catat</span>
          </button>

          {/* Profile Avatar Trigger (Desktop) */}
          <button
            onClick={() => handleSelectTab('profile')}
            className="hidden sm:flex relative w-8 h-8 rounded-full ring-2 ring-emerald-500/30 overflow-hidden bg-slate-200 dark:bg-slate-800 items-center justify-center shrink-0 cursor-pointer"
            title={profile?.displayName ? `Profil ${profile.displayName}` : 'Profil'}
          >
            {profile?.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={profile.displayName || 'Pengguna'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-800 text-white text-xs font-bold flex items-center justify-center uppercase">
                {profile?.displayName ? profile.displayName.substring(0, 2) : (profile?.role === 'admin' ? 'TM' : 'US')}
              </div>
            )}
          </button>

          {/* Mobile Hamburger Toggle Button (md:hidden) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer relative"
            aria-label={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu Navigasi'}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-900 dark:text-white" />
            ) : (
              <Menu className="w-5 h-5 text-slate-900 dark:text-white" />
            )}
            {unpaidDebtsCount > 0 && !isMobileMenuOpen && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE NAVIGATION DRAWER (Slide-over overlay for screens < md) */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />
      )}

      <div
        className={`md:hidden fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header: User Profile Info */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full ring-2 ring-emerald-500/30 overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {profile?.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.displayName || 'Pengguna'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-800 text-white text-xs font-bold flex items-center justify-center uppercase">
                  {profile?.displayName ? profile.displayName.substring(0, 2) : (profile?.role === 'admin' ? 'TM' : 'US')}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {profile?.displayName || 'Pengguna'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  @{profile?.username || 'user'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                  {profile?.role === 'admin' ? 'Tuan Muda' : 'Cabang'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Menu Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Menu Navigasi
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-tight truncate">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}

          {/* Quick Action Button inside drawer */}
          <div className="pt-3 pb-1">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAddModal('expense');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Catat Transaksi Baru</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
          {/* Theme Selector */}
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Tema Tampilan</span>
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-md transition ${theme === 'light' ? 'bg-white text-amber-500 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Terang"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-md transition ${theme === 'dark' ? 'bg-slate-700 text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-md transition ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Sistem"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </header>
  );
};
