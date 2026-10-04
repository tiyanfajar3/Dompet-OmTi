import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, 
  Delete, 
  RotateCcw, 
  Calculator, 
  X,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { formatRupiah } from '../../lib/formatters';

interface MiniCalculatorProps {
  onApplyValue: (value: number) => void;
  initialValue?: number;
  onClose?: () => void;
}

export function evaluateArithmetic(expr: string): number {
  if (!expr || !expr.trim()) return 0;
  // Replace symbols for standard arithmetic
  const cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');

  // Tokenize numbers (including decimals) and operators
  const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens || tokens.length === 0) return 0;

  // Filter out any dangling operator at the end for preview
  const evalTokens = [...tokens];
  while (evalTokens.length > 0 && ['+', '-', '*', '/'].includes(evalTokens[evalTokens.length - 1])) {
    evalTokens.pop();
  }
  if (evalTokens.length === 0) return 0;

  // Pass 1: Multiplication and Division (left-to-right)
  const pass1: (number | string)[] = [];
  let i = 0;
  while (i < evalTokens.length) {
    const token = evalTokens[i];
    if (token === '*' || token === '/') {
      const prev = Number(pass1.pop()) || 0;
      const next = Number(evalTokens[i + 1]) || 0;
      let res = 0;
      if (token === '*') {
        res = prev * next;
      } else {
        res = next !== 0 ? prev / next : 0;
      }
      pass1.push(res);
      i += 2;
    } else if (['+', '-'].includes(token)) {
      pass1.push(token);
      i++;
    } else {
      pass1.push(Number(token) || 0);
      i++;
    }
  }

  // Pass 2: Addition and Subtraction (left-to-right)
  let result = Number(pass1[0]) || 0;
  let j = 1;
  while (j < pass1.length) {
    const op = pass1[j];
    const val = Number(pass1[j + 1]) || 0;
    if (op === '+') {
      result += val;
    } else if (op === '-') {
      result -= val;
    }
    j += 2;
  }

  if (isNaN(result) || !isFinite(result)) return 0;
  return Math.max(0, Math.round(result * 100) / 100);
}

export const MiniCalculator: React.FC<MiniCalculatorProps> = ({
  onApplyValue,
  initialValue = 0,
  onClose,
}) => {
  const [expression, setExpression] = useState<string>(
    initialValue > 0 ? initialValue.toString() : ''
  );
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // Live evaluated result
  const calculatedResult = useMemo(() => {
    return evaluateArithmetic(expression);
  }, [expression]);

  // Handle number click
  const handleNumber = useCallback((numStr: string) => {
    setExpression((prev) => {
      if (justEvaluated) {
        setJustEvaluated(false);
        return numStr === '000' ? '0' : numStr;
      }
      if (prev === '0' || prev === '') {
        if (numStr === '000') return '0';
        return numStr;
      }
      // If pressing 000, don't append if last char is operator
      if (numStr === '000') {
        const lastChar = prev.slice(-1);
        if (['+', '-', '×', '÷', '*', '/'].includes(lastChar)) {
          return prev + '0';
        }
      }
      return prev + numStr;
    });
  }, [justEvaluated]);

  // Handle operator click (+, -, *, /)
  const handleOperator = useCallback((op: string) => {
    setJustEvaluated(false);
    setExpression((prev) => {
      if (!prev) return '0 ' + op + ' ';
      const trimmed = prev.trimEnd();
      const lastChar = trimmed.slice(-1);
      if (['+', '-', '×', '÷', '*', '/'].includes(lastChar)) {
        // Replace existing operator
        return trimmed.slice(0, -1).trimEnd() + ' ' + op + ' ';
      }
      return trimmed + ' ' + op + ' ';
    });
  }, []);

  // Handle decimal dot
  const handleDot = useCallback(() => {
    setJustEvaluated(false);
    setExpression((prev) => {
      if (!prev) return '0.';
      const parts = prev.split(/[+\-×÷*/\s]+/);
      const currentNumber = parts[parts.length - 1];
      if (currentNumber.includes('.')) return prev;
      return prev + '.';
    });
  }, []);

  // Handle clear
  const handleClear = useCallback(() => {
    setExpression('');
    setJustEvaluated(false);
  }, []);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    setJustEvaluated(false);
    setExpression((prev) => {
      if (!prev) return '';
      const trimmed = prev.trimEnd();
      if (trimmed.length <= 1) return '';
      // If trailing was an operator with spaces, remove properly
      return trimmed.slice(0, -1).trimEnd();
    });
  }, []);

  // Handle equals
  const handleEquals = useCallback(() => {
    const res = evaluateArithmetic(expression);
    setExpression(res.toString());
    setJustEvaluated(true);
  }, [expression]);

  // Apply value to form input
  const handleApply = useCallback(() => {
    const targetValue = Math.round(calculatedResult);
    onApplyValue(targetValue);
    setAppliedFeedback(true);
    setTimeout(() => {
      setAppliedFeedback(false);
    }, 1500);
  }, [calculatedResult, onApplyValue]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if focus is inside an input/textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumber(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleDot();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, handleDot, handleEquals, handleBackspace, onClose]);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-inner space-y-3 transition-colors">
      {/* Top Header: Title & Close Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Mini Kalkulator Transaksi
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Tutup Kalkulator"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Screen / Display Area */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 text-right shadow-xs">
        {/* Expression line */}
        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 min-h-[16px] truncate tracking-wide">
          {expression || '0'}
        </div>
        {/* Evaluated Result Preview */}
        <div className="text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5 truncate flex items-center justify-end gap-1.5">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Hasil:</span>
          <span>{formatRupiah(calculatedResult)}</span>
        </div>
      </div>

      {/* Keypad Buttons Grid (4 columns) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-xs font-semibold select-none">
        {/* Row 1: C, Backspace, Divide, Multiply */}
        <button
          type="button"
          onClick={handleClear}
          className="h-10 sm:h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition flex items-center justify-center font-bold cursor-pointer"
          title="Hapus Semua (Clear)"
        >
          C
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-10 sm:h-11 rounded-xl bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-600/80 active:scale-95 transition flex items-center justify-center cursor-pointer"
          title="Hapus Karakter Terakhir (Backspace)"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          className="h-10 sm:h-11 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 active:scale-95 transition flex items-center justify-center text-sm font-bold cursor-pointer"
          title="Bagi (÷)"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={() => handleOperator('×')}
          className="h-10 sm:h-11 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 active:scale-95 transition flex items-center justify-center text-sm font-bold cursor-pointer"
          title="Kali (×)"
        >
          ×
        </button>

        {/* Row 2: 7, 8, 9, Minus */}
        <button
          type="button"
          onClick={() => handleNumber('7')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleNumber('8')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleNumber('9')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleOperator('-')}
          className="h-10 sm:h-11 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 active:scale-95 transition flex items-center justify-center text-sm font-bold cursor-pointer"
          title="Kurang (-)"
        >
          −
        </button>

        {/* Row 3: 4, 5, 6, Plus */}
        <button
          type="button"
          onClick={() => handleNumber('4')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleNumber('5')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleNumber('6')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleOperator('+')}
          className="h-10 sm:h-11 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 active:scale-95 transition flex items-center justify-center text-sm font-bold cursor-pointer"
          title="Tambah (+)"
        >
          +
        </button>

        {/* Row 4: 1, 2, 3, Equals */}
        <button
          type="button"
          onClick={() => handleNumber('1')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleNumber('2')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleNumber('3')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          3
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="h-10 sm:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold active:scale-95 transition flex items-center justify-center text-base cursor-pointer shadow-sm shadow-emerald-600/30"
          title="Sama Dengan (=)"
        >
          =
        </button>

        {/* Row 5: 0, 000 (Ribu shortcut), Dot (.) */}
        <button
          type="button"
          onClick={() => handleNumber('0')}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm cursor-pointer shadow-2xs"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleNumber('000')}
          className="h-10 sm:h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 transition flex items-center justify-center text-xs font-bold cursor-pointer"
          title="Tambah Tiga Nol (000)"
        >
          000
        </button>
        <button
          type="button"
          onClick={handleDot}
          className="h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-sm font-bold cursor-pointer shadow-2xs"
          title="Koma Desimal (.)"
        >
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="h-10 sm:h-11 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 transition flex items-center justify-center text-xs font-semibold cursor-pointer"
          title="Hitung Ulang"
        >
          Hitung
        </button>
      </div>

      {/* Primary Action: Tombol "Gunakan Nilai" */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleApply}
          disabled={calculatedResult <= 0}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
            appliedFeedback
              ? 'bg-teal-600 text-white shadow-teal-600/30'
              : calculatedResult > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white shadow-emerald-600/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          {appliedFeedback ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Nilai Berhasil Diterapkan ke Input!</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
              <span>Gunakan Nilai ({formatRupiah(calculatedResult)})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
