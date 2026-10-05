import { formatRupiah, formatIndonesianDate } from './formatters';

export interface ReportPrintItem {
  no: number;
  date: string;
  rawDate: string;
  description: string;
  hasReceipt: boolean;
  categoryName: string;
  type: 'income' | 'expense';
  incomeAmount: number;
  expenseAmount: number;
  runningBalance: number;
}

export interface ReportCategorySummary {
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ReportPrintData {
  accountName: string;
  accountRoleLabel: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedDate: string;
  generatedBy: string;
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  finalBalance: number;
  netCashflow: number;
  items: ReportPrintItem[];
  topExpenseCategory: ReportCategorySummary | null;
  categoryBreakdown: ReportCategorySummary[];
}

/**
 * Menghasilkan markup HTML lengkap dan siap cetak (A4)
 * dengan format buku rekening bank dan analisis keuangan di bagian bawah.
 */
export function generateReportHtml(data: ReportPrintData): string {
  const isNetPositive = data.netCashflow >= 0;
  const netLabel = data.netCashflow > 0 ? 'Surplus Kas (+)' : data.netCashflow < 0 ? 'Defisit Kas (-)' : 'Imbang';

  const rowsHtml = data.items.length === 0
    ? `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
          Tidak ada transaksi pada periode yang dipilih (${data.startDate} s/d ${data.endDate}).
        </td>
      </tr>
    `
    : data.items.map((item) => `
      <tr>
        <td style="text-align: center; font-variant-numeric: tabular-nums;">${item.no}</td>
        <td style="white-space: nowrap; font-variant-numeric: tabular-nums;">${item.date}</td>
        <td>
          <div style="font-weight: 500; color: #0f172a;">${escapeHtml(item.description)}</div>
          ${item.hasReceipt ? '<div style="font-size: 8.5pt; color: #4f46e5; font-weight: 600; margin-top: 1px;">*Gambar terlampir</div>' : ''}
        </td>
        <td style="white-space: nowrap; color: #334155;">${escapeHtml(item.categoryName)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: ${item.incomeAmount > 0 ? '600' : 'normal'}; color: ${item.incomeAmount > 0 ? '#15803d' : '#94a3b8'};">
          ${item.incomeAmount > 0 ? formatRupiah(item.incomeAmount) : '-'}
        </td>
        <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: ${item.expenseAmount > 0 ? '600' : 'normal'}; color: ${item.expenseAmount > 0 ? '#b91c1c' : '#94a3b8'};">
          ${item.expenseAmount > 0 ? formatRupiah(item.expenseAmount) : '-'}
        </td>
        <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #0f172a;">
          ${formatRupiah(item.runningBalance)}
        </td>
      </tr>
    `).join('');

  const categoryBreakdownHtml = data.categoryBreakdown.length === 0
    ? '<div style="font-size: 9pt; color: #64748b; font-style: italic;">Tidak ada catatan pengeluaran pada periode ini.</div>'
    : `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
        ${data.categoryBreakdown.slice(0, 5).map((cat) => `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9pt; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px;">
            <span style="color: #334155; font-weight: 500;">${escapeHtml(cat.name)} (${cat.count}x)</span>
            <div style="text-align: right;">
              <strong style="color: #0f172a;">${formatRupiah(cat.amount)}</strong>
              <span style="color: #64748b; font-size: 8pt; margin-left: 4px;">(${cat.percentage}%)</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  return `
    <div class="print-container">
      <!-- Kop Dokumen Resmi -->
      <div class="header-section">
        <div class="company-brand">
          <div class="brand-title">DOMPET OMTI</div>
          <div class="brand-subtitle">BUKU REKENING & REKAP LAPORAN KEUANGAN</div>
        </div>
        <div class="document-badge">
          DOKUMEN RESMI PEMBUKUAN
        </div>
      </div>

      <div class="header-divider"></div>

      <!-- Info Identitas & Periode -->
      <table class="meta-table">
        <tr>
          <td style="width: 15%; font-weight: 600; color: #475569;">Akun / Entitas</td>
          <td style="width: 35%; font-weight: 700; color: #0f172a;">: ${escapeHtml(data.accountName)} <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">(${escapeHtml(data.accountRoleLabel)})</span></td>
          <td style="width: 15%; font-weight: 600; color: #475569;">Tanggal Cetak</td>
          <td style="width: 35%; color: #0f172a;">: ${escapeHtml(data.generatedDate)}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #475569;">Periode Buku</td>
          <td style="font-weight: 600; color: #0f172a;">: ${escapeHtml(data.periodLabel)} (${data.startDate} s/d ${data.endDate})</td>
          <td style="font-weight: 600; color: #475569;">Dicetak Oleh</td>
          <td style="color: #0f172a;">: ${escapeHtml(data.generatedBy)}</td>
        </tr>
      </table>

      <!-- Ringkasan Saldo Buku Rekening -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-label">Saldo Awal Periode</div>
          <div class="card-value">${formatRupiah(data.initialBalance)}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Total Masuk (Kredit)</div>
          <div class="card-value income-color">+ ${formatRupiah(data.totalIncome)}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Total Keluar (Debet)</div>
          <div class="card-value expense-color">- ${formatRupiah(data.totalExpense)}</div>
        </div>
        <div class="summary-card final-balance-card">
          <div class="card-label">Saldo Akhir Periode</div>
          <div class="card-value highlight-color">${formatRupiah(data.finalBalance)}</div>
        </div>
      </div>

      <!-- Tabel Mutasi Transaksi (Buku Rekening) -->
      <table class="statement-table">
        <thead>
          <tr>
            <th style="width: 36px; text-align: center;">No</th>
            <th style="width: 90px;">Tanggal</th>
            <th>Keterangan / Deskripsi Transaksi</th>
            <th style="width: 110px;">Kategori</th>
            <th style="width: 110px; text-align: right;">Masuk (Rp)</th>
            <th style="width: 110px; text-align: right;">Keluar (Rp)</th>
            <th style="width: 115px; text-align: right;">Saldo (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <!-- Baris Saldo Awal -->
          <tr class="initial-balance-row">
            <td style="text-align: center;">-</td>
            <td style="white-space: nowrap; font-variant-numeric: tabular-nums;">${data.startDate}</td>
            <td style="font-weight: 700; color: #1e293b;">SALDO AWAL PERIODE</td>
            <td style="color: #64748b;">Saldo Bawaan</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #0f172a;">${formatRupiah(data.initialBalance)}</td>
          </tr>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4" style="text-align: right; font-weight: 700;">TOTAL MUTASI PERIODE</td>
            <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #15803d;">
              ${formatRupiah(data.totalIncome)}
            </td>
            <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: #b91c1c;">
              ${formatRupiah(data.totalExpense)}
            </td>
            <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; color: #047857;">
              ${formatRupiah(data.finalBalance)}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Catatan Kaki Khusus Struk/Foto -->
      <div class="table-footnote">
        *<strong>Catatan Lampiran</strong>: Tanda <em>*Gambar terlampir</em> menandakan struk/nota fisik telah diarsipkan secara digital di brankas aplikasi Dompet Omti dan tidak dimuat dalam lembar cetak demi kebersihan dan efisiensi dokumen.
      </div>

      <!-- Bagian Analisis Keuangan Otomatis (Bagian Bawah) -->
      <div class="analysis-section">
        <div class="analysis-header">
          ANALISIS KEUANGAN PERIODE
        </div>
        
        <div class="analysis-grid">
          <!-- Card 1: Ringkasan Arus Kas & Laba Bersih -->
          <div class="analysis-card">
            <div class="analysis-card-title">1. Ringkasan Arus Kas & Laba Bersih</div>
            <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 9pt;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Total Pemasukan:</span>
                <strong style="color: #15803d;">${formatRupiah(data.totalIncome)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Total Pengeluaran:</span>
                <strong style="color: #b91c1c;">${formatRupiah(data.totalExpense)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 2px;">
                <span style="font-weight: 600; color: #1e293b;">Selisih Bersih (${netLabel}):</span>
                <strong style="font-size: 10pt; color: ${isNetPositive ? '#15803d' : '#b91c1c'};">
                  ${isNetPositive ? '+ ' : ''}${formatRupiah(data.netCashflow)}
                </strong>
              </div>
              <div style="font-size: 8pt; color: #64748b; margin-top: 4px; line-height: 1.3;">
                ${isNetPositive 
                  ? 'Kondisi keuangan surplus: Pemasukan melampaui pengeluaran operasional pada periode ini.'
                  : 'Kondisi keuangan defisit: Pengeluaran melampaui pemasukan pada periode ini.'}
              </div>
            </div>
          </div>

          <!-- Card 2: Pengeluaran Terbesar (Top Expense) -->
          <div class="analysis-card">
            <div class="analysis-card-title">2. Kategori Pengeluaran Terbesar (Top Expense)</div>
            ${data.topExpenseCategory ? `
              <div style="margin-top: 6px; font-size: 9pt;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 11pt; font-weight: 700; color: #b91c1c;">${escapeHtml(data.topExpenseCategory.name)}</span>
                  <strong style="font-size: 10pt; color: #0f172a;">${formatRupiah(data.topExpenseCategory.amount)}</strong>
                </div>
                <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
                  Menyerap <strong>${data.topExpenseCategory.percentage}%</strong> dari seluruh pengeluaran periode ini (${data.topExpenseCategory.count} kali transaksi).
                </div>
                <div style="margin-top: 8px; font-size: 8.5pt; font-weight: 600; color: #334155;">Peringkat Kategori Pengeluaran:</div>
                ${categoryBreakdownHtml}
              </div>
            ` : `
              <div style="font-size: 9pt; color: #64748b; font-style: italic; margin-top: 6px;">
                Tidak ada data pengeluaran yang tercatat pada rentang waktu ini.
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Lembar Pengesahan / Catatan Sistem -->
      <div class="footer-sign-section">
        <div style="font-size: 8pt; color: #64748b; max-width: 60%;">
          Laporan ini dicetak secara otomatis dan tersinkronisasi dengan database brankas Cloud Firestore aplikasi <strong>Dompet Omti</strong>. Data telah diverifikasi secara sistematis.
        </div>
        <div style="text-align: center; min-width: 140px;">
          <div style="font-size: 8.5pt; color: #475569; margin-bottom: 35px;">Petugas Pembukuan,</div>
          <div style="font-weight: 700; font-size: 9.5pt; color: #0f172a; border-top: 1px solid #94a3b8; padding-top: 3px;">
            ${escapeHtml(data.generatedBy)}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Memicu dialog cetak PDF browser melalui iframe tersembunyi
 * sehingga dokumen tampil bersih, rapi, dan langsung siap diunduh sebagai PDF.
 */
export function printReport(data: ReportPrintData): void {
  const content = generateReportHtml(data);
  const title = `Rekap_Buku_Rekening_${data.accountName.replace(/[^a-zA-Z0-9]/g, '_')}_${data.startDate}_sd_${data.endDate}`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 9pt;
          line-height: 1.35;
        }
        .print-container {
          width: 100%;
          max-width: 100%;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .brand-title {
          font-size: 16pt;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #047857;
        }
        .brand-subtitle {
          font-size: 9.5pt;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.2px;
          margin-top: 1px;
        }
        .document-badge {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 7.5pt;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .header-divider {
          height: 3px;
          background: linear-gradient(90deg, #059669, #10b981, #6ee7b7);
          margin-bottom: 10px;
          border-radius: 2px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-bottom: 12px;
        }
        .meta-table td {
          padding: 2.5px 4px;
          vertical-align: top;
        }
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .summary-card {
          border: 1px solid #cbd5e1;
          background-color: #f8fafc;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .final-balance-card {
          border-color: #10b981;
          background-color: #ecfdf5;
        }
        .card-label {
          font-size: 7.5pt;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.3px;
        }
        .card-value {
          font-size: 11pt;
          font-weight: 800;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
          color: #0f172a;
        }
        .income-color { color: #15803d; }
        .expense-color { color: #b91c1c; }
        .highlight-color { color: #047857; }

        .statement-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-bottom: 6px;
          page-break-inside: auto;
        }
        .statement-table thead {
          display: table-header-group;
        }
        .statement-table th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          padding: 6px 8px;
          text-align: left;
          border: 1px solid #0f172a;
          font-size: 8pt;
          letter-spacing: 0.2px;
        }
        .statement-table td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .statement-table tbody tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .statement-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .initial-balance-row {
          background-color: #f1f5f9 !important;
          font-style: italic;
        }
        .total-row td {
          background-color: #f1f5f9;
          border-top: 2px solid #94a3b8;
          border-bottom: 2px solid #94a3b8;
          padding: 7px 8px;
        }
        .table-footnote {
          font-size: 7.5pt;
          color: #64748b;
          margin-bottom: 14px;
          line-height: 1.35;
        }
        .analysis-section {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 12px;
          background-color: #fafafa;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .analysis-header {
          font-size: 9.5pt;
          font-weight: 800;
          letter-spacing: 0.3px;
          color: #0f172a;
          border-bottom: 2px solid #059669;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .analysis-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .analysis-card-title {
          font-size: 8.5pt;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 3px;
        }
        .footer-sign-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 400);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
