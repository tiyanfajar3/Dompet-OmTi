import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  ReceiptText, 
  BarChart3, 
  PieChart, 
  User, 
  Plus 
} from 'lucide-react';
import { ActiveTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openAddModal } = useApp();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Beranda', icon: LayoutDashboard },
    { id: 'transactions' as ActiveTab, label: 'Transaksi', icon: ReceiptText },
    // Center is FAB
    { id: 'reports' as ActiveTab, label: 'Laporan', icon: BarChart3 },
    { id: 'budgets' as ActiveTab, label: 'Anggaran', icon: PieChart },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="relative flex items-center justify-around h-15 px-2">
        {/* Left items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}

        {/* Center Floating Action Button (+ Tambah Transaksi) */}
        <div className="relative -top-3 px-2 flex items-center justify-center">
          <button
            onClick={() => openAddModal('expense')}
            aria-label="Tambah Transaksi"
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer border-3 border-slate-50 dark:border-slate-900"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
        </div>

        {/* Right items */}
        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}

        {/* Profile Item */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'profile'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] mt-0.5 whitespace-nowrap">Profil</span>
        </button>
      </div>
    </div>
  );
};
