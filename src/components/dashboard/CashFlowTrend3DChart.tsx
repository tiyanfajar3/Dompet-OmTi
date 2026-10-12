import React, { useState, useMemo, useRef } from 'react';
import { Activity, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { formatRupiah } from '../../lib/formatters';

export interface DailyTrendData {
  day: number;
  expense: number;
  income: number;
  net: number;
}

interface CashFlowTrend3DChartProps {
  days: DailyTrendData[];
  currentMonthName: string;
}

type TrendMode = 'all' | 'expense' | 'income';

export const CashFlowTrend3DChart: React.FC<CashFlowTrend3DChartProps> = ({
  days,
  currentMonthName,
}) => {
  const [mode, setMode] = useState<TrendMode>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart Dimensions
  const width = 640;
  const height = 210;
  const padding = { top: 25, right: 20, bottom: 35, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Max calculations
  const { maxOverall } = useMemo(() => {
    let maxExp = 0;
    let maxInc = 0;
    days.forEach((d) => {
      if (d.expense > maxExp) maxExp = d.expense;
      if (d.income > maxInc) maxInc = d.income;
    });
    const maxVal = Math.max(maxExp, maxInc, 1);
    return { maxOverall: maxVal };
  }, [days]);

  // Compute points
  const { expensePoints, incomePoints } = useMemo(() => {
    const numDays = Math.max(days.length, 1);
    const stepX = innerWidth / Math.max(numDays - 1, 1);

    const expPts = days.map((d, i) => {
      const x = padding.left + i * stepX;
      const ratio = maxOverall > 0 ? d.expense / maxOverall : 0;
      const y = padding.top + innerHeight - ratio * innerHeight;
      return { x, y, data: d };
    });

    const incPts = days.map((d, i) => {
      const x = padding.left + i * stepX;
      const ratio = maxOverall > 0 ? d.income / maxOverall : 0;
      const y = padding.top + innerHeight - ratio * innerHeight;
      return { x, y, data: d };
    });

    return { expensePoints: expPts, incomePoints: incPts };
  }, [days, innerWidth, innerHeight, padding, maxOverall]);

  // Smooth Catmull-Rom to Cubic Bézier spline helper
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const expenseLinePath = useMemo(() => buildSmoothPath(expensePoints), [expensePoints]);
  const incomeLinePath = useMemo(() => buildSmoothPath(incomePoints), [incomePoints]);

  const groundY = padding.top + innerHeight;
  const expenseAreaPath = useMemo(() => {
    if (expensePoints.length === 0) return '';
    return `${expenseLinePath} L ${expensePoints[expensePoints.length - 1].x.toFixed(1)} ${groundY} L ${expensePoints[0].x.toFixed(1)} ${groundY} Z`;
  }, [expenseLinePath, expensePoints, groundY]);

  const incomeAreaPath = useMemo(() => {
    if (incomePoints.length === 0) return '';
    return `${incomeLinePath} L ${incomePoints[incomePoints.length - 1].x.toFixed(1)} ${groundY} L ${incomePoints[0].x.toFixed(1)} ${groundY} Z`;
  }, [incomeLinePath, incomePoints, groundY]);

  // Mouse hover event handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || days.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = mouseX * scaleX;

    const relX = svgX - padding.left;
    const stepX = innerWidth / Math.max(days.length - 1, 1);
    const index = Math.round(relX / stepX);

    if (index >= 0 && index < days.length) {
      setHoveredIndex(index);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Y-axis tick values (0, 50%, 100%)
  const yTicks = [
    { value: maxOverall, y: padding.top },
    { value: Math.round(maxOverall * 0.5), y: padding.top + innerHeight * 0.5 },
    { value: 0, y: padding.top + innerHeight },
  ];

  const formatShortRupiah = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')}jt`;
    if (val >= 1000) return `${Math.round(val / 1000)}rb`;
    return `${val}`;
  };

  const hoveredDay = hoveredIndex !== null ? days[hoveredIndex] : null;
  const hoveredExpPt = hoveredIndex !== null ? expensePoints[hoveredIndex] : null;
  const hoveredIncPt = hoveredIndex !== null ? incomePoints[hoveredIndex] : null;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-10 w-44 h-44 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-44 h-44 rounded-full bg-rose-500/5 dark:bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Grafik Tren Arus Kas Harian (3D Glow)
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Depth & Gradients
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pergerakan transaksi harian {currentMonthName}
          </p>
        </div>

        {/* Mode selector pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setMode('income')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'income'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('expense')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'expense'
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full pt-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* SVG Definitions for 3D Gradients & Glow Filters */}
          <defs>
            {/* Emerald Area Gradient: 40% opacity at peak down to 0% */}
            <linearGradient id="glow-area-emerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>

            {/* Rose Area Gradient: 40% opacity down to 0% */}
            <linearGradient id="glow-area-rose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#f43f5e" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
            </linearGradient>

            {/* 3D Glow Filter for Emerald Line */}
            <filter id="filter-glow-emerald" x="-20%" y="-30%" width="140%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#10b981" floodOpacity="0.5" />
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#34d399" floodOpacity="0.7" />
            </filter>

            {/* 3D Glow Filter for Rose Line */}
            <filter id="filter-glow-rose" x="-20%" y="-30%" width="140%" height="160%">
              <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.5" />
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#fb7185" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-200/80 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 tabular-nums"
              >
                {formatShortRupiah(tick.value)}
              </text>
            </g>
          ))}

          {/* X Axis Bottom Line */}
          <line
            x1={padding.left}
            y1={groundY}
            x2={width - padding.right}
            y2={groundY}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
            strokeWidth="1.5"
          />

          {/* 1. Emerald Income Area & Line (Shown in 'all' and 'income' mode) */}
          {(mode === 'all' || mode === 'income') && (
            <g>
              <path
                d={incomeAreaPath}
                fill="url(#glow-area-emerald)"
                className="transition-opacity duration-300"
              />
              <path
                d={incomeLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#filter-glow-emerald)"
                className="transition-all duration-300"
              />
            </g>
          )}

          {/* 2. Rose Expense Area & Line (Shown in 'all' and 'expense' mode) */}
          {(mode === 'all' || mode === 'expense') && (
            <g>
              <path
                d={expenseAreaPath}
                fill="url(#glow-area-rose)"
                className="transition-opacity duration-300"
              />
              <path
                d={expenseLinePath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#filter-glow-rose)"
                className="transition-all duration-300"
              />
            </g>
          )}

          {/* Non-zero data dots highlight */}
          {days.map((d, i) => {
            const expPt = expensePoints[i];
            const incPt = incomePoints[i];
            const hasExp = (mode === 'all' || mode === 'expense') && d.expense > 0;
            const hasInc = (mode === 'all' || mode === 'income') && d.income > 0;

            return (
              <g key={d.day}>
                {hasInc && incPt && (
                  <circle
                    cx={incPt.x}
                    cy={incPt.y}
                    r="3.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="shadow-md"
                  />
                )}
                {hasExp && expPt && (
                  <circle
                    cx={expPt.x}
                    cy={expPt.y}
                    r="3.5"
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="shadow-md"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Hover Guide Beam & Pulsing Beacon */}
          {hoveredIndex !== null && (
            <g className="transition-all duration-150">
              {/* Vertical Guide Beam */}
              <line
                x1={expensePoints[hoveredIndex].x}
                y1={padding.top - 5}
                x2={expensePoints[hoveredIndex].x}
                y2={groundY}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-60"
              />

              {/* Pulsing Dot for Income */}
              {(mode === 'all' || mode === 'income') && hoveredIncPt && (
                <g>
                  <circle
                    cx={hoveredIncPt.x}
                    cy={hoveredIncPt.y}
                    r="10"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                  <circle
                    cx={hoveredIncPt.x}
                    cy={hoveredIncPt.y}
                    r="6.5"
                    fill="#10b981"
                    fillOpacity="0.4"
                  />
                  <circle
                    cx={hoveredIncPt.x}
                    cy={hoveredIncPt.y}
                    r="4"
                    fill="#ffffff"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Pulsing Dot for Expense */}
              {(mode === 'all' || mode === 'expense') && hoveredExpPt && (
                <g>
                  <circle
                    cx={hoveredExpPt.x}
                    cy={hoveredExpPt.y}
                    r="10"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                  <circle
                    cx={hoveredExpPt.x}
                    cy={hoveredExpPt.y}
                    r="6.5"
                    fill="#f43f5e"
                    fillOpacity="0.4"
                  />
                  <circle
                    cx={hoveredExpPt.x}
                    cy={hoveredExpPt.y}
                    r="4"
                    fill="#ffffff"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </g>
          )}

          {/* X Axis Date Markers */}
          {[1, 7, 14, 21, days.length].map((dayNum) => {
            const idx = Math.min(dayNum - 1, days.length - 1);
            if (idx < 0 || !expensePoints[idx]) return null;
            const pt = expensePoints[idx];
            return (
              <text
                key={dayNum}
                x={pt.x}
                y={groundY + 16}
                textAnchor="middle"
                className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 tabular-nums"
              >
                Tgl {days[idx].day}
              </text>
            );
          })}
        </svg>

        {/* Floating 3D Glassmorphic Tooltip */}
        {hoveredDay && hoveredExpPt && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-100"
            style={{
              left: `${(hoveredExpPt.x / width) * 100}%`,
              top: '0px',
              transform: `translate(${hoveredIndex! > days.length / 2 ? '-105%' : '5%'}, 5px)`,
            }}
          >
            <div className="p-2.5 rounded-xl bg-slate-900/90 dark:bg-slate-950/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md min-w-[145px] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 border-b border-slate-800 pb-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Tanggal {hoveredDay.day} {currentMonthName}</span>
              </div>
              {(mode === 'all' || mode === 'income') && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <ArrowDownLeft className="w-3 h-3" /> Masuk:
                  </span>
                  <span className="font-bold tabular-nums text-emerald-300">
                    {formatRupiah(hoveredDay.income)}
                  </span>
                </div>
              )}
              {(mode === 'all' || mode === 'expense') && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-400 flex items-center gap-1 font-medium">
                    <ArrowUpRight className="w-3 h-3" /> Keluar:
                  </span>
                  <span className="font-bold tabular-nums text-rose-300">
                    {formatRupiah(hoveredDay.expense)}
                  </span>
                </div>
              )}
              {mode === 'all' && (
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800 font-semibold">
                  <span className="text-slate-400">Net Arus Kas:</span>
                  <span className={`tabular-nums ${hoveredDay.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hoveredDay.net >= 0 ? '+' : ''}{formatRupiah(hoveredDay.net)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            Pemasukan (Glow Hijau)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" />
            Pengeluaran (Glow Merah)
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Arahkan kursor ke grafik untuk inspeksi nominal
        </span>
      </div>
    </div>
  );
};
