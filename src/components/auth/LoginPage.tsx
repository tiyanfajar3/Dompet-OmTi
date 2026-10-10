import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Monitor,
  BarChart3,
  CalendarClock,
  CreditCard,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { getTimeGreeting } from '../../lib/formatters';
import { ThemeMode } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, theme, setTheme } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { greeting } = getTimeGreeting();

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
    if (isSubmitting) return;
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Mohon masukkan username');
      return;
    }
    if (!password) {
      setError('Mohon masukkan kata sandi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(cleanUsername, password);
      if (!res.success) {
        console.error('Login gagal:', res.error);
        setError(res.error || 'Username atau kata sandi tidak cocok.');
      }
    } catch (err: unknown) {
      console.error('Catch block error pada handleSubmit LoginPage:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Terjadi kendala saat memproses autentikasi: ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const leftContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const formCardVariants: Variants = {
    hidden: { opacity: 0, y: 25, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        delay: 0.2,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const features = [
    {
      icon: BarChart3,
      title: 'Pantau Kas & Transaksi Harian Real-time',
      desc: 'Catat pemasukan dan pengeluaran harian dengan kalkulasi saldo kas brankas otomatis.',
      accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-500 dark:text-emerald-400',
    },
    {
      icon: CalendarClock,
      title: 'Pengingat Tagihan Wajib Bulanan',
      desc: 'Alert tanggal jatuh tempo rutin untuk tagihan bulanan berulang tanpa memotong kas brankas.',
      accent: 'from-amber-500/20 to-orange-500/10 text-amber-500 dark:text-amber-400',
    },
    {
      icon: CreditCard,
      title: 'Pencatatan Cicilan & Utang Terstruktur',
      desc: 'Kelola tenor bulan, tanggal rutin cicilan, dan pantau histori pelunasan pinjaman secara transparan.',
      accent: 'from-cyan-500/20 to-blue-500/10 text-cyan-500 dark:text-cyan-400',
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-3xl pointer-events-none" />

      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={cycleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white backdrop-blur-md shadow-xs hover:shadow-md transition cursor-pointer"
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

      {/* Split Screen Container */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center z-10 my-auto">
        
        {/* ================= SISI KIRI: BRANDING & GREETING ================= */}
        <motion.div
          variants={leftContainerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-7 text-left"
        >
          {/* Logo with Glow & Floating Animation */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative group shrink-0"
            >
              {/* Soft glow background */}
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 to-teal-400/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 shadow-xl p-2.5 backdrop-blur-md flex items-center justify-center">
                <img
                  src="/logo-dompet.png"
                  alt="Logo Dompet Omti"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
                />
              </div>
            </motion.div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{greeting}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Dompet Omti
              </h2>
            </div>
          </motion.div>

          {/* Heading & Subtext */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Selamat Datang di{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                Dompet Omti
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Aplikasi pencatatan keuangan pribadi & manajemen kas harian yang intuitif. Pantau arus kas harian, kelola cicilan utang, serta atur pengingat tagihan wajib secara efisien dalam satu tempat.
            </p>
          </motion.div>

          {/* 3 Keunggulan Utama */}
          <motion.div variants={itemVariants} className="space-y-3 pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Fitur Unggulan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2.5">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all flex items-start gap-3.5"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${feat.accent} shrink-0 mt-0.5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {feat.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* ================= SISI KANAN: FORM LOGIN ================= */}
        <motion.div
          variants={formCardVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-5 w-full max-w-md mx-auto"
        >
          {/* Reset Success Banner */}
          {resetMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-2.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{resetMessage}</span>
            </motion.div>
          )}

          {/* Glassmorphic Login Card */}
          <div className="relative rounded-3xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-slate-900/10 dark:shadow-emerald-950/20 overflow-hidden">
            {/* Subtle card top glow */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="mb-6 space-y-1.5 relative">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Masuk ke Brankas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masukkan kredensial akun untuk mengakses catatan kas Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative">
              {error && (
                <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username Akun
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
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
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
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

              {/* Action Button with micro-interaction */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { scale: 1.015 } : {}}
                whileTap={!isSubmitting ? { scale: 0.985 } : {}}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition duration-200 disabled:opacity-60 cursor-pointer relative overflow-hidden group"
              >
                {/* Shimmer light effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Buka Dompet Omti</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Penyimpanan lokal privat & terenkripsi di browser</span>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            Dompet Omti &copy; {new Date().getFullYear()} &middot; Catat Uang &middot; Kontrol Budget
          </p>
        </motion.div>
      </div>
    </div>
  );
};
