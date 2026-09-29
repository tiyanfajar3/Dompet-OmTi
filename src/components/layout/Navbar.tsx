import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Sun, 
  Moon, 
  Monitor, 
  Wallet,
  Sparkles
} from 'lucide-react';
import { ActiveTab, ThemeMode } from '../../types';

export const Navbar: React.FC = () => {
  const { 
    profile, 
    activeTab, 
    setActiveTab, 
    openAddModal, 
    theme, 
    setTheme 
  } = useApp();

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Transaksi' },
    { id: 'reports', label: 'Laporan' },
    { id: 'budgets', label: 'Anggaran' },
    { id: 'recurring', label: 'Rutin' },
    { id: 'profile', label: 'Pengaturan' },
  ];

  const cycleTheme = () => {
    const next: ThemeMode = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')}
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
                Tuan Muda
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
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary actions */}
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
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Tambah Transaksi</span>
            <span className="sm:hidden">Catat</span>
          </button>

          {/* Profile Avatar / Trigger */}
          <button
            onClick={() => setActiveTab('profile')}
            className="relative w-8 h-8 rounded-full ring-2 ring-emerald-500/30 overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
            title="Profil Tuan Muda"
          >
            {profile?.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={profile.displayName || 'Tuan Muda'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-800 text-white text-xs font-bold flex items-center justify-center">
                TM
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
