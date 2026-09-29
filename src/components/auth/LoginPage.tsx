import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, User, Eye, EyeOff, ArrowRight, Wallet, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react';
import { getGreetingForTuanMuda } from '../../lib/formatters';
import { ThemeMode } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, hasAccount, registerOwnerAccount, theme, setTheme } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { greeting } = getGreetingForTuanMuda();

  const cycleTheme = () => {
    const next: ThemeMode = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
  };

  // Check if factory reset notification flag exists in sessionStorage
  const [resetMessage] = useState<string | null>(() => {
    try {
      const msg = sessionStorage.getItem('dompet_omti_reset_msg');
      if (msg) {
        sessionStorage.removeItem('dompet_omti_reset_msg');
        return msg;
      }
    } catch {}
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Mohon masukkan username pemilik');
      return;
    }
    if (!password) {
      setError('Mohon masukkan kata sandi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!hasAccount) {
        // Initial setup flow
        if (password.length < 6) {
          setError('Kata sandi minimal 6 karakter');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Konfirmasi kata sandi tidak cocok');
          setIsSubmitting(false);
          return;
        }

        const res = await registerOwnerAccount(username, password, 'Tuan Muda');
        if (!res.success) {
          setError(res.error || 'Gagal membuat akun pemilik');
        }
      } else {
        // Standard login flow
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Autentikasi gagal');
        }
      }
    } catch {
      setError('Terjadi kendala saat memproses autentikasi. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={cycleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white backdrop-blur-md shadow-xs transition cursor-pointer"
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
      </div>

      <div className="w-full max-w-md">
        {/* Brand Lockup */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dompet Omti
          </h1>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {hasAccount ? greeting : 'Selamat Datang, Tuan Muda'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {hasAccount
              ? 'Akses privat brankas keuangan pribadi Anda'
              : 'Atur akun pemilik untuk mengamankan brankas pribadi Anda'}
          </p>
        </div>

        {/* Reset Success Banner */}
        {resetMessage && (
          <div className="mb-4 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username Pemilik
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={!hasAccount ? 'Buat kata sandi baru (min. 6 karakter)' : 'Masukkan kata sandi'}
                  autoComplete={!hasAccount ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!hasAccount && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ulangi Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi kata sandi"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{!hasAccount ? 'Buat Akun & Buka Brankas' : 'Buka Dompet Omti'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
          Dompet Omti &copy; {new Date().getFullYear()} &middot; Catat Uang &middot; Kontrol Budget
        </p>
      </div>
    </div>
  );
};
