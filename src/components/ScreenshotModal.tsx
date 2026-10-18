import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshots: string[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  appName: string;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  screenshots,
  activeIndex,
  onSelectIndex,
  appName,
}) => {
  if (!isOpen || screenshots.length === 0) return null;

  const currentImage = screenshots[activeIndex] || screenshots[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectIndex((activeIndex - 1 + screenshots.length) % screenshots.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectIndex((activeIndex + 1) % screenshots.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main image */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center max-h-[75vh]">
          <img
            src={currentImage}
            alt={`${appName} preview ${activeIndex + 1}`}
            className="max-h-[75vh] w-auto object-contain rounded-xl"
            referrerPolicy="no-referrer"
          />

          {screenshots.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-neutral-700/60 transition-transform active:scale-95"
                aria-label="Previous preview"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-neutral-700/60 transition-transform active:scale-95"
                aria-label="Next preview"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Selector */}
        {screenshots.length > 1 && (
          <div className="flex items-center gap-2 mt-4">
            {screenshots.map((thumb, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIndex(idx)}
                className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  activeIndex === idx
                    ? 'border-cyan-400 opacity-100 scale-105'
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={thumb}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
