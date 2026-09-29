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

export function getGreetingForTuanMuda(): { greeting: string; periodText: string } {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) {
    return { greeting: 'Selamat pagi, Tuan Muda', periodText: 'Pagi yang cerah untuk meninjau keuangan Anda.' };
  } else if (hour >= 11 && hour < 15) {
    return { greeting: 'Selamat siang, Tuan Muda', periodText: 'Semoga hari Anda produktif dan berkah.' };
  } else if (hour >= 15 && hour < 18) {
    return { greeting: 'Selamat sore, Tuan Muda', periodText: 'Waktu yang tepat memeriksa catatan transaksi hari ini.' };
  } else {
    return { greeting: 'Selamat malam, Tuan Muda', periodText: 'Istirahat dengan tenang, keuangan Anda terpantau rapi.' };
  }
}

export function formatIndonesianDate(dateStr: string, options: { withDay?: boolean; shortMonth?: boolean } = {}): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const monthsFull = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dateObj = new Date(year, monthIdx, day);
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
