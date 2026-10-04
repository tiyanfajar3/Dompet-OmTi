import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
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

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
  };

  const downloadReceipt = () => {
    const link = document.createElement('a');
    link.href = currentImage.dataUrl;
    link.download = currentImage.name || `bukti-transaksi-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 text-white border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{title}</span>
          {images.length > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90">
              {currentIndex + 1} dari {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="Perbesar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="Perkecil"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={downloadReceipt}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="Unduh foto"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="max-h-full max-w-full flex items-center justify-center overflow-auto transition-transform duration-200">
          <img
            src={currentImage.dataUrl}
            alt={currentImage.name || 'Bukti Struk'}
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform"
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip if multiple */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-black/50 overflow-x-auto border-t border-white/10">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                idx === currentIndex ? 'border-emerald-500 scale-105' : 'border-transparent opacity-60'
              }`}
            >
              <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
