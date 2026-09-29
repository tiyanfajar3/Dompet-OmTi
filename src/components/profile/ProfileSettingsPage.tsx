import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Lock, 
  Camera, 
  Palette, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  ShieldAlert,
  Cloud
} from 'lucide-react';
import { ThemeMode, Category, PaymentMethod } from '../../types';
import { storageService } from '../../lib/storage';
import { compressImage } from '../../lib/imageCompressor';
import { CategoryIcon } from '../common/CategoryIcon';

export const ProfileSettingsPage: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    changePassword, 
    logout, 
    theme, 
    setTheme,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    paymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    verifyCurrentPassword,
    executeFactoryReset,
    refreshData
  } = useApp();

  // Profile Form State
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Tuan Muda');
  const [username, setUsername] = useState(profile?.username || '');
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Category & Payment Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [methodName, setMethodName] = useState('');

  // Backup & Restore
  const [restoreConfirmData, setRestoreConfirmData] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Factory Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'backup_check' | 'password_verify' | 'type_confirm'>('backup_check');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Handle Profile Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 0.8);
      await updateProfile({ profilePhoto: compressed.dataUrl });
      setProfileMsg({ text: 'Foto profil Tuan Muda berhasil diperbarui', type: 'success' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch {
      setProfileMsg({ text: 'Gagal memproses foto profil', type: 'error' });
    }
  };

  // Save Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      setProfileMsg({ text: 'Nama tampilan dan username tidak boleh kosong', type: 'error' });
      return;
    }

    const success = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
    });

    if (success) {
      setProfileMsg({ text: 'Informasi profil berhasil disimpan', type: 'success' });
      setTimeout(() => setProfileMsg(null), 3000);
    } else {
      setProfileMsg({ text: 'Gagal memperbarui profil', type: 'error' });
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Kata sandi baru minimal 6 karakter', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Konfirmasi kata sandi baru tidak cocok', type: 'error' });
      return;
    }

    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({ text: 'Kata sandi berhasil diperbarui dengan aman', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } else {
      setPasswordMsg({ text: res.error || 'Gagal mengubah kata sandi', type: 'error' });
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const csv = await storageService.exportTransactionsToCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dompet-Omti-Transaksi-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengekspor data ke CSV');
    }
  };

  // Export Full JSON Backup
  const handleExportBackup = async () => {
    try {
      const backup = await storageService.exportFullBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dompet-Omti-Backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh berkas cadangan');
    }
  };

  // Select Backup File for Restore
  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) {
          setRestoreError('Format file cadangan tidak valid');
          return;
        }
        setRestoreConfirmData(parsed);
        setRestoreError(null);
      } catch {
        setRestoreError('File tidak terbaca sebagai JSON yang valid');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!restoreConfirmData) return;
    setIsRestoring(true);
    try {
      await storageService.restoreFromBackup(restoreConfirmData);
      await refreshData();
      setRestoreConfirmData(null);
      alert('Pemulihan data berhasil! Semua data telah diperbarui.');
    } catch {
      alert('Terjadi kesalahan saat memulihkan data');
    } finally {
      setIsRestoring(false);
    }
  };

  // Factory Reset Handlers
  const handleOpenResetModal = () => {
    setResetStep('backup_check');
    setResetPasswordInput('');
    setResetPasswordError(null);
    setResetConfirmText('');
    setIsResetModalOpen(true);
  };

  const handleVerifyResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError(null);

    if (!resetPasswordInput) {
      setResetPasswordError('Masukkan password Anda untuk melanjutkan.');
      return;
    }

    const isValid = await verifyCurrentPassword(resetPasswordInput);
    if (!isValid) {
      setResetPasswordError('Password salah.');
      return;
    }

    setResetStep('type_confirm');
  };

  const handleExecuteFactoryReset = async () => {
    if (resetConfirmText.trim() !== 'RESET') {
      return;
    }

    setIsResetting(true);
    try {
      const res = await executeFactoryReset(resetPasswordInput);
      if (res.success) {
        try {
          sessionStorage.setItem('dompet_omti_reset_msg', 'Factory Reset berhasil. Seluruh data Dompet Omti telah dihapus.');
        } catch {}
        setIsResetModalOpen(false);
      } else {
        alert(res.error || 'Gagal melakukan Factory Reset.');
        setIsResetting(false);
      }
    } catch {
      alert('Terjadi kendala teknis saat melakukan Factory Reset.');
      setIsResetting(false);
    }
  };

  // Categories Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      await updateCategory({
        ...editingCategory,
        name: catName.trim(),
        type: catType,
      });
    } else {
      await addCategory({
        name: catName.trim(),
        type: catType,
        icon: 'MoreHorizontal',
        color: catType === 'income' ? '#10b981' : '#f97316',
      });
    }
    setCatName('');
    setEditingCategory(null);
    setIsCatModalOpen(false);
  };

  // Payment Method Handlers
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodName.trim()) return;
    await addPaymentMethod(methodName.trim());
    setMethodName('');
    setIsMethodModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pengaturan & Profil Pemilik
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kelola profil Tuan Muda, keamanan kata sandi, tema, dan cadangan data
        </p>
      </div>

      {/* Section 1: Profil Tuan Muda */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Informasi Profil Pemilik</span>
        </h2>

        {profileMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              profileMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-slate-800 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              {profile?.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  TM
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition cursor-pointer"
              title="Ganti foto profil"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="flex-1 w-full space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Tampilan
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tuan Muda"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username Pemilik
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  autoCapitalize="none"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 2: Keamanan Kata Sandi */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Ganti Kata Sandi</span>
        </h2>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Kata sandi lama"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Sandi Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi sandi baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition cursor-pointer"
            >
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Tema Tampilan Aplikasi */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Tema Tampilan Aplikasi</span>
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Terang (Light)', icon: Sun },
            { id: 'dark', label: 'Gelap (Dark)', icon: Moon },
            { id: 'system', label: 'Otomatis Sistem', icon: Monitor },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id as ThemeMode)}
              className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                theme === item.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${theme === item.id ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                <span className="text-[10px] font-normal">{theme === item.id ? 'Aktif' : 'Pilih'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cloud Firestore Storage Status */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Penyimpanan Cloud Firestore</span>
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Terhubung Cloud
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Seluruh data transaksi, saldo, bukti struk, dan kategori tersimpan aman di cloud <strong>Firebase Firestore (dompet-omti-247cc)</strong>. Data otomatis tersinkronisasi secara real-time antar perangkat (HP, tablet, dan laptop) tanpa risiko data hilang atau reset.
        </p>
      </div>

      {/* Section 4: Cadangan & Ekspor Data */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Cadangan (Backup) & Ekspor Data</span>
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Seluruh data transaksi, bukti struk foto, kategori, anggaran, dan jadwal rutin dapat diunduh untuk keamanan data Anda.
        </p>

        {restoreError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{restoreError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition text-left cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Ekspor CSV</div>
              <div className="text-[10px] text-slate-400">Untuk Excel & Spreadsheet</div>
            </div>
          </button>

          {/* Backup Full JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition text-left cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Backup Penuh</div>
              <div className="text-[10px] text-slate-400">Simpan berkas JSON brankas</div>
            </div>
          </button>

          {/* Restore JSON */}
          <div>
            <input
              type="file"
              ref={backupInputRef}
              accept=".json"
              className="hidden"
              onChange={handleSelectBackupFile}
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition text-left cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Pulihkan Data</div>
                <div className="text-[10px] text-slate-400">Restore dari berkas cadangan</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: Kelola Kategori & Metode Pembayaran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kategori */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Kategori ({categories.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setCatType('expense');
                setIsCatModalOpen(true);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {categories.map((c) => (
              <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CategoryIcon name={c.name} className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                  <span className="text-[10px] text-slate-400">({c.type === 'income' ? 'Masuk' : 'Keluar'})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(c);
                      setCatName(c.name);
                      setCatType(c.type);
                      setIsCatModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(c.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Metode Pembayaran ({paymentMethods.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setMethodName('');
                setIsMethodModalOpen(true);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="py-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">{pm.name}</span>
                {pm.isCustom && (
                  <button
                    type="button"
                    onClick={() => deletePaymentMethod(pm.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-400">
          Tuan Muda sedang masuk di sesi aman terenkripsi.
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Brankas</span>
        </button>
      </div>

      {/* Section 6: Zona Berbahaya (Factory Reset) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Zona Berbahaya</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/40">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Factory Reset
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg leading-relaxed">
              Factory Reset akan menghapus seluruh data aplikasi secara permanen dan mengembalikan Dompet Omti ke kondisi awal.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenResetModal}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 border border-rose-300 dark:border-rose-800 rounded-xl transition cursor-pointer whitespace-nowrap"
          >
            Mulai Factory Reset...
          </button>
        </div>
      </div>

      {/* Multi-step Factory Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {resetStep === 'backup_check' && 'Peringatan Cadangan Sebelum Reset'}
                    {resetStep === 'password_verify' && 'Verifikasi Kata Sandi Pemilik'}
                    {resetStep === 'type_confirm' && 'Konfirmasi Akhir Factory Reset'}
                  </h3>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    Langkah {resetStep === 'backup_check' ? '1' : resetStep === 'password_verify' ? '2' : '3'} dari 3
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Backup Advice */}
            {resetStep === 'backup_check' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 leading-relaxed">
                  <strong>Pemberitahuan Penting:</strong>
                  <p className="mt-1 text-[11px]">
                    Disarankan melakukan backup sebelum Factory Reset karena data yang dihapus tidak dapat dikembalikan.
                  </p>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tindakan ini akan menghapus seluruh data transaksi pemasukan/pengeluaran, foto struk, kategori custom, budget bulanan, pos rutin, dan profil brankas Tuan Muda.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>Backup Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep('password_verify')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                  >
                    Lanjutkan Factory Reset
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Password Verification */}
            {resetStep === 'password_verify' && (
              <form onSubmit={handleVerifyResetPassword} className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Masukkan password Anda untuk melanjutkan.
                </p>

                {resetPasswordError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resetPasswordError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kata Sandi Pemilik
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Masukkan kata sandi brankas Anda"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500 transition"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
                  >
                    Verifikasi Password
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Type RESET confirmation */}
            {resetStep === 'type_confirm' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-medium leading-relaxed">
                  PERINGATAN: Semua data Dompet Omti akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ketik RESET untuk mengonfirmasi.
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Ketik RESET"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500 transition"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Batalkan
                  </button>
                  <button
                    type="button"
                    disabled={resetConfirmText.trim() !== 'RESET' || isResetting}
                    onClick={handleExecuteFactoryReset}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isResetting ? 'Menghapus Semua Data...' : 'Ya, Hapus Semua Data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Konfirmasi Pemulihan Data, Tuan Muda?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              File cadangan ini berisi:
              <br />
              &bull; <strong>{restoreConfirmData.transactions?.length || 0}</strong> Transaksi
              <br />
              &bull; <strong>{restoreConfirmData.categories?.length || 0}</strong> Kategori
              <br />
              &bull; <strong>{restoreConfirmData.budgets?.length || 0}</strong> Budget
              <br />
              &bull; <strong>{restoreConfirmData.recurringTransactions?.length || 0}</strong> Transaksi Rutin
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
              Peringatan: Pemulihan ini akan menggantikan data yang saat ini tersimpan di brankas dengan data dari file cadangan.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmData(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                {isRestoring ? 'Memulihkan...' : 'Lanjutkan Pemulihan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Ubah Kategori' : 'Tambah Kategori'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nama Kategori</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Investasi, Zakat, Kopi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Jenis</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="expense" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pengeluaran</option>
                  <option value="income" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pemasukan</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Metode Pembayaran
              </h3>
              <button onClick={() => setIsMethodModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nama Metode</label>
                <input
                  type="text"
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  placeholder="Contoh: BCA, GoPay, Seabank"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMethodModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
