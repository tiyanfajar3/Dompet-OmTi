import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ChevronDown, 
  Check 
} from 'lucide-react';
import { 
  CategoryIcon, 
  AVAILABLE_CATEGORY_ICONS, 
  CategoryIconMeta 
} from './CategoryIcon';

interface IconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
  label?: string;
  type?: 'income' | 'expense';
  compact?: boolean;
}

const GROUPS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'makanan', label: 'Makanan' },
  { id: 'transportasi', label: 'Transport' },
  { id: 'belanja', label: 'Belanja' },
  { id: 'rumah', label: 'Rumah' },
  { id: 'keuangan', label: 'Keuangan' },
  { id: 'kesehatan', label: 'Kesehatan' },
  { id: 'hiburan', label: 'Hiburan' },
  { id: 'lainnya', label: 'Lainnya' },
];

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  label = 'Pilih Ikon Kategori',
  type = 'expense',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');

  const selectedMeta = useMemo(() => {
    return AVAILABLE_CATEGORY_ICONS.find(
      (item) => item.id.toLowerCase() === (value || '').toLowerCase()
    ) || {
      id: value || 'MoreHorizontal',
      label: 'Lainnya',
      emoji: '🏷️',
      group: 'lainnya' as const,
    };
  }, [value]);

  const filteredIcons = useMemo(() => {
    let list = AVAILABLE_CATEGORY_ICONS;
    if (activeGroup !== 'all') {
      list = list.filter((item) => item.group === activeGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeGroup, search]);

  const handleSelect = (iconId: string) => {
    onChange(iconId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={compact ? 'inline-block' : 'space-y-1.5'}>
      {label && !compact && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      {compact ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Pilih Ikon Kategori"
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition cursor-pointer shadow-2xs ${
            type === 'income' 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100' 
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
          }`}
        >
          <CategoryIcon name={value || selectedMeta.id} className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition cursor-pointer text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
              type === 'income' 
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
            }`}>
              <CategoryIcon name={value || selectedMeta.id} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {selectedMeta.emoji} {selectedMeta.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                ID: {selectedMeta.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-500 transition shrink-0 pl-2">
            <span className="text-[11px] font-medium hidden sm:inline">Ubah</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Modal / Dialog Picker */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pilih Ikon Kategori
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih ikon representatif untuk kategori ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari ikon (misal: kopi, bensin, gaji, makan)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Group Tabs */}
              <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroup(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      activeGroup === g.id
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid */}
            <div className="p-3 overflow-y-auto flex-1 grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-80">
              {filteredIcons.map((item) => {
                const isSelected = (value || '').toLowerCase() === item.id.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition relative cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-emerald-50/50 dark:hover:bg-slate-750 hover:border-slate-300'
                    }`}
                    title={item.label}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <CategoryIcon name={item.id} className="w-5 h-5" />
                    <span className="text-[10px] font-medium text-center truncate w-full px-0.5">
                      {item.label.split(' / ')[0]}
                    </span>
                  </button>
                );
              })}

              {filteredIcons.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Tidak ada ikon yang cocok dengan kata kunci &quot;{search}&quot;.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredIcons.length} pilihan ikon</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
