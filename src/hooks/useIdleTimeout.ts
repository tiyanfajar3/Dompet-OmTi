import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIdleTimeoutOptions {
  /**
   * Durasi batas waktu tidak aktif sebelum auto-logout (milidetik).
   * Default: 15 menit (900_000 ms)
   */
  timeoutMs?: number;

  /**
   * Jendela waktu peringatan sebelum timeout mengeksekusi logout (milidetik).
   * Default: 60 detik (60_000 ms)
   */
  warningMs?: number;

  /**
   * Apakah idle timeout aktif (biasanya true ketika user berhasil login).
   */
  enabled?: boolean;

  /**
   * Callback yang dijalankan ketika waktu idle mencapai batas timeoutMs.
   */
  onTimeout: () => void;

  /**
   * Daftar event browser yang dipantau untuk mendeteksi aktivitas pengguna.
   * Default: ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
   */
  events?: (keyof WindowEventMap)[];
}

export interface UseIdleTimeoutReturn {
  /**
   * Menandakan apakah modal / peringatan countdown sedang aktif.
   */
  isWarningOpen: boolean;

  /**
   * Jumlah detik tersisa sebelum sesi otomatis berakhir.
   */
  remainingSeconds: number;

  /**
   * Total detik pada jendela peringatan.
   */
  warningSeconds: number;

  /**
   * Fungsi manual untuk me-reset timer dan memperpanjang sesi aktif.
   */
  resetTimer: () => void;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000; // 3 menit
const DEFAULT_WARNING_MS = 30 * 1000; // 30 detik sebelum timeout
const DEFAULT_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];

/**
 * Custom Hook untuk memantau aktivitas pengguna dan mengeksekusi auto-logout
 * jika aplikasi dibiarkan tidak aktif (idle) dalam batas waktu tertentu demi keamanan brankas.
 */
export function useIdleTimeout({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  enabled = true,
  onTimeout,
  events = DEFAULT_EVENTS,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningMs / 1000));

  const lastActiveRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  const throttleRef = useRef<number>(0);

  // Selalu simpan referensi callback timeout terbaru
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Fungsi untuk me-reset waktu keaktifan terakhir
  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    setIsWarningOpen(false);
    setRemainingSeconds(Math.round(warningMs / 1000));
  }, [warningMs]);

  useEffect(() => {
    if (!enabled) {
      setIsWarningOpen(false);
      return;
    }

    // Inisialisasi waktu keaktifan saat hook diaktifkan
    lastActiveRef.current = Date.now();

    // Event listener yang di-throttle agar tidak membebani performa browser
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle: hanya update jika sudah lewat minimal 1 detik sejak update terakhir
      if (now - throttleRef.current > 1000) {
        throttleRef.current = now;
        lastActiveRef.current = now;
        // Jika sedang di dalam mode peringatan, aktivitas pengguna akan otomatis membatalkan peringatan
        setIsWarningOpen((prev) => {
          if (prev) {
            setRemainingSeconds(Math.round(warningMs / 1000));
            return false;
          }
          return false;
        });
      }
    };

    // Daftarkan event listeners ke window
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Deteksi saat pengguna kembali membuka tab browser (misal setelah lock screen / minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed >= timeoutMs) {
          setIsWarningOpen(false);
          onTimeoutRef.current();
        }
      }
    };

    const handleFocus = () => {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed >= timeoutMs) {
        setIsWarningOpen(false);
        onTimeoutRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Timer interval yang mengecek keaktifan setiap 1 detik
    const ticker = setInterval(() => {
      const elapsed = Date.now() - lastActiveRef.current;

      // Kasus 1: Waktu idle telah melebihi batas timeout -> Eksekusi Auto-Logout
      if (elapsed >= timeoutMs) {
        setIsWarningOpen(false);
        clearInterval(ticker);
        onTimeoutRef.current();
        return;
      }

      // Kasus 2: Waktu idle memasuki jendela peringatan (warningMs)
      const warningThreshold = timeoutMs - warningMs;
      if (elapsed >= warningThreshold) {
        const timeLeftMs = Math.max(0, timeoutMs - elapsed);
        const timeLeftSec = Math.ceil(timeLeftMs / 1000);
        setIsWarningOpen(true);
        setRemainingSeconds(timeLeftSec);
      } else {
        setIsWarningOpen((prev) => (prev ? false : prev));
      }
    }, 1000);

    // Cleanup listeners saat komponen di-unmount atau saat enabled menjadi false
    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(ticker);
    };
  }, [enabled, events, timeoutMs, warningMs]);

  return {
    isWarningOpen,
    remainingSeconds,
    warningSeconds: Math.round(warningMs / 1000),
    resetTimer,
  };
}
