import React from 'react';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  maxSeconds?: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  maxSeconds = 30,
  onStayLoggedIn,
  onLogout,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onStayLoggedIn}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-all"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden text-center z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-amber-500/15 dark:bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Glowing Icon Header */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Peringatan Sesi Tidak Aktif
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Demi menjaga kerahasiaan brankas keuangan Anda, sesi login akan otomatis berakhir karena tidak ada aktivitas selama beberapa waktu.
            </p>

            {/* Visual Countdown Box */}
            <div className="my-5 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4 animate-spin [animation-duration:8s]" />
                <span>Sisa Waktu Sesi</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {remainingSeconds} <span className="text-base font-medium">detik</span>
              </div>
              <div className="w-full bg-amber-200/60 dark:bg-amber-900/40 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, (remainingSeconds / maxSeconds) * 100))}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onStayLoggedIn}
                className="w-full sm:flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tetap Masuk (Lanjutkan)</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto py-2.5 px-4 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
