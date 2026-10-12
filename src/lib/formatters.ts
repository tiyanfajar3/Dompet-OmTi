/**
 * Indonesian Currency, Date & Greeting Formatters for Dompet Omti
 */

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '- ' : ''}Rp ${formatted}`;
}

export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  // Strip non-digits
  const cleanStr = value.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleanStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function getTimeGreeting(name?: string): { greeting: string; periodText: string } {
  const hour = new Date().getHours();
  let timeStr = 'Selamat malam';
  let periodText = 'Istirahat dengan tenang, keuangan Anda terpantau rapi.';
  
  if (hour >= 4 && hour < 11) {
    timeStr = 'Selamat pagi';
    periodText = 'Pagi yang cerah untuk meninjau keuangan Anda.';
  } else if (hour >= 11 && hour < 15) {
    timeStr = 'Selamat siang';
    periodText = 'Semoga hari Anda produktif dan berkah.';
  } else if (hour >= 15 && hour < 18) {
    timeStr = 'Selamat sore';
    periodText = 'Waktu yang tepat memeriksa catatan transaksi hari ini.';
  }

  const cleanName = name?.trim();
  const greeting = cleanName ? `${timeStr}, ${cleanName}` : timeStr;

  return { greeting, periodText };
}

export function getGreetingForTuanMuda(name?: string): { greeting: string; periodText: string } {
  return getTimeGreeting(name);
}

/**
 * Generate dynamic WhatsApp registration URL based on the user's current local hour.
 * 05:00 - 10:59: "Halo Tuan Muda, selamat pagi. Saya ingin mendaftar akun baru untuk aplikasi Dompet Omti."
 * 11:00 - 14:59: "Halo Tuan Muda, selamat siang. Saya ingin mendaftar akun baru untuk aplikasi Dompet Omti."
 * 15:00 - 17:59: "Halo Tuan Muda, selamat sore. Saya ingin mendaftar akun baru untuk aplikasi Dompet Omti."
 * 18:00 - 04:59: "Halo Tuan Muda, selamat malam. Saya ingin mendaftar akun baru untuk aplikasi Dompet Omti."
 */
export function getWhatsAppRegistrationUrl(phone = '6283838747836'): string {
  const hour = new Date().getHours();
  let timeOfDay = 'malam';

  if (hour >= 5 && hour < 11) {
    timeOfDay = 'pagi';
  } else if (hour >= 11 && hour < 15) {
    timeOfDay = 'siang';
  } else if (hour >= 15 && hour < 18) {
    timeOfDay = 'sore';
  } else {
    timeOfDay = 'malam';
  }

  const message = `Halo Tuan Muda, selamat ${timeOfDay}. Saya ingin mendaftar akun baru untuk aplikasi Dompet Omti.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate dynamic WhatsApp feedback URL based on user's current local hour.
 */
export function getWhatsAppFeedbackUrl(phone = '6283838747836', username?: string): string {
  const hour = new Date().getHours();
  let timeOfDay = 'malam';

  if (hour >= 5 && hour < 11) {
    timeOfDay = 'pagi';
  } else if (hour >= 11 && hour < 15) {
    timeOfDay = 'siang';
  } else if (hour >= 15 && hour < 18) {
    timeOfDay = 'sore';
  } else {
    timeOfDay = 'malam';
  }

  const userSuffix = username ? ` (dari @${username})` : '';
  const message = `Halo Tuan Muda, selamat ${timeOfDay}. Saya ingin menyampaikan kritik/saran mengenai aplikasi Dompet Omti${userSuffix}...`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate direct Gmail Webmail compose URL based on user's current local hour and username.
 * Directly opens Gmail Web compose in the browser (mail.google.com) avoiding the Windows OS
 * 'mailto:' protocol handler chooser dialog.
 */
export function getGmailFeedbackUrl(to = 'mursast03@gmail.com', username?: string): string {
  const hour = new Date().getHours();
  let timeOfDay = 'malam';

  if (hour >= 5 && hour < 11) {
    timeOfDay = 'pagi';
  } else if (hour >= 11 && hour < 15) {
    timeOfDay = 'siang';
  } else if (hour >= 15 && hour < 18) {
    timeOfDay = 'sore';
  } else {
    timeOfDay = 'malam';
  }

  const userSuffix = username ? ` (dari @${username})` : '';
  const subject = `Kritik & Saran Dompet Omti${userSuffix}`;
  const body = `Halo Tuan Muda, selamat ${timeOfDay}.

Saya ingin menyampaikan masukan / kritik / saran / kendala terkait aplikasi Dompet Omti:

[Tuliskan pesan Anda di sini]

---
Pengirim: ${username || 'Pengguna Dompet Omti'}`;

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface ParsedDateInfo {
  dateStr: string; // Standard YYYY-MM-DD
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dateObj: Date;
  timestamp: number;
}

/**
 * Robust date parser that accepts Firestore Timestamp, Date object, Unix timestamp (s/ms),
 * or various date string formats (ISO, YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY).
 */
export function parseFlexibleDate(raw: unknown): ParsedDateInfo | null {
  if (raw === null || raw === undefined || raw === '') return null;

  let dateObj: Date | null = null;

  // Case 1: Firestore Timestamp or object with toDate() or { seconds, nanoseconds }
  if (typeof raw === 'object' && raw !== null) {
    if (typeof (raw as any).toDate === 'function') {
      try {
        dateObj = (raw as any).toDate();
      } catch {}
    } else if (raw instanceof Date) {
      dateObj = raw;
    } else if (typeof (raw as any).seconds === 'number') {
      dateObj = new Date((raw as any).seconds * 1000);
    } else if (typeof (raw as any)._seconds === 'number') {
      dateObj = new Date((raw as any)._seconds * 1000);
    }
  }

  // Case 2: Number (seconds or milliseconds)
  if (!dateObj && typeof raw === 'number' && !isNaN(raw) && raw > 0) {
    dateObj = raw < 10000000000 ? new Date(raw * 1000) : new Date(raw);
  }

  // Case 3: String
  if (!dateObj && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Check if numeric string
    if (/^\d{9,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!isNaN(num) && num > 0) {
        dateObj = num < 10000000000 ? new Date(num * 1000) : new Date(num);
      }
    }

    // Check YYYY-MM-DD or YYYY/MM/DD or ISO 8601
    if (!dateObj) {
      const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10);
        const d = parseInt(isoMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const pad = (n: number) => String(n).padStart(2, '0');
          const standardDateStr = `${y}-${pad(m)}-${pad(d)}`;
          const localDate = new Date(y, m - 1, d);
          return {
            dateStr: standardDateStr,
            year: y,
            month: m,
            day: d,
            dateObj: localDate,
            timestamp: localDate.getTime(),
          };
        }
      }
    }

    // Check DD-MM-YYYY or DD/MM/YYYY
    if (!dateObj) {
      const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const pad = (n: number) => String(n).padStart(2, '0');
          const standardDateStr = `${y}-${pad(m)}-${pad(d)}`;
          const localDate = new Date(y, m - 1, d);
          return {
            dateStr: standardDateStr,
            year: y,
            month: m,
            day: d,
            dateObj: localDate,
            timestamp: localDate.getTime(),
          };
        }
      }
    }

    // General Date parsing fallback
    if (!dateObj) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return null;
  }

  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${y}-${pad(m)}-${pad(d)}`;

  return {
    dateStr,
    year: y,
    month: m,
    day: d,
    dateObj,
    timestamp: dateObj.getTime(),
  };
}

export function normalizeStandardDate(raw: unknown, fallback?: unknown): string {
  const parsed = parseFlexibleDate(raw);
  if (parsed) return parsed.dateStr;
  if (fallback) {
    const parsedFallback = parseFlexibleDate(fallback);
    if (parsedFallback) return parsedFallback.dateStr;
  }
  return getTodayDateString();
}

export function normalizeStandardIso(raw: unknown, fallback?: unknown): string {
  const parsed = parseFlexibleDate(raw);
  if (parsed) return parsed.dateObj.toISOString();
  if (fallback) {
    const parsedFallback = parseFlexibleDate(fallback);
    if (parsedFallback) return parsedFallback.dateObj.toISOString();
  }
  return new Date().toISOString();
}

export function formatIndonesianDate(dateInput: unknown, options: { withDay?: boolean; shortMonth?: boolean } = {}): string {
  if (!dateInput) return '';
  const parsed = parseFlexibleDate(dateInput);
  if (!parsed) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const { year, month, day, dateObj } = parsed;
  const monthIdx = month - 1;

  const monthsFull = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[dateObj.getDay()];

  const monthStr = options.shortMonth ? monthsShort[monthIdx] : monthsFull[monthIdx];
  const dateText = `${day} ${monthStr} ${year}`;

  return options.withDay ? `${dayName}, ${dateText}` : dateText;
}

export function formatIndonesianMonthYear(year: number, month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${months[month - 1]} ${year}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

