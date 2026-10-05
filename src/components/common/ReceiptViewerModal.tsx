import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import { ReceiptImage } from '../../types';

interface ReceiptViewerModalProps {
  images: ReceiptImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  title = 'Bukti Transaksi',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Sync index and zoom when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex]);

  const handleNext = useCallback(() => {
    if (!images || images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
  }, [images]);

  const handlePrev = useCallback(() => {
    if (!images || images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
  }, [images]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const downloadReceipt = () => {
    if (!currentImage?.dataUrl) return;
    const link = document.createElement('a');
    link.href = currentImage.dataUrl;
    link.download = currentImage.name || `bukti-transaksi-${Date.now()}.jpg`;
    link.click();
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-md select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-black/60 text-white border-b border-white/10 shrink-0 gap-2">
        {/* Left: Tombol Kembali & Info Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition cursor-pointer min-h-[42px] min-w-[42px] text-xs font-semibold shrink-0"
            title="Kembali (Esc)"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-xs">
              {title}
            </span>
            {images.length > 1 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 shrink-0 font-medium tabular-nums border border-white/10">
                {currentIndex + 1} / {images.length}
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls & Enlarged Close "X" Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-1 text-[11px] font-semibold text-white/80 hover:text-white transition cursor-pointer tabular-nums"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={downloadReceipt}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition cursor-pointer min-h-[42px] min-w-[42px] text-xs font-semibold border border-white/10"
            title="Unduh foto bukti"
            aria-label="Unduh foto bukti"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Unduh</span>
          </button>

          {/* Tombol Tutup "X" dengan Area Sentuh (Hitbox) Luas */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 active:bg-rose-500/50 text-rose-200 hover:text-white border border-rose-500/30 transition cursor-pointer min-h-[42px] min-w-[42px] text-xs font-bold shadow-xs ml-1"
            title="Tutup Preview (Esc)"
            aria-label="Tutup Preview"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden sm:inline">Tutup</span>
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        onClick={(e) => {
          // If clicking outside the image in the dark backdrop, close preview
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-6 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/95 text-white backdrop-blur-md transition cursor-pointer border border-white/20 flex items-center justify-center shadow-xl"
              title="Foto Sebelumnya (Panah Kiri)"
              aria-label="Foto Sebelumnya"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-6 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/95 text-white backdrop-blur-md transition cursor-pointer border border-white/20 flex items-center justify-center shadow-xl"
              title="Foto Selanjutnya (Panah Kanan)"
              aria-label="Foto Selanjutnya"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="max-h-full max-w-full flex items-center justify-center overflow-auto p-1">
          <img
            src={currentImage.dataUrl}
            alt={currentImage.name || 'Bukti Transaksi'}
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-h-[72vh] sm:max-h-[76vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl transition-transform duration-200 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Bottom Action Footer with Clear "Kembali / Tutup" Button */}
      <div className="px-4 py-3 sm:py-3.5 bg-black/75 backdrop-blur-md border-t border-white/10 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Thumbnail Strip (if multiple images) */}
          {images.length > 1 ? (
            <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full scrollbar-thin">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoomLevel(1);
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    idx === currentIndex 
                      ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105' 
                      : 'border-transparent opacity-60 hover:opacity-90'
                  }`}
                  title={`Lihat Bukti ke-${idx + 1}`}
                >
                  <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
              <span>Klik area di luar foto atau tekan <strong>Esc</strong> untuk menutup</span>
            </div>
          )}

          {/* Action Buttons: Unduh & Tombol Tutup/Kembali yang Besar */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={downloadReceipt}
              className="sm:hidden flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-xs transition cursor-pointer min-h-[46px] border border-white/15"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Foto</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition cursor-pointer min-h-[46px] shadow-lg shadow-emerald-950/40 border border-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
              title="Tutup pratinjau bukti transaksi"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tutup / Kembali</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
