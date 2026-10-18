import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface OpeningSplashProps {
  onComplete: () => void;
}

export const OpeningSplash: React.FC<OpeningSplashProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash for 1.5s then fade out
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onComplete();
      }, 500); // 500ms fade transition
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      onClick={() => {
        setFading(true);
        setTimeout(onComplete, 200);
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 transition-opacity duration-500 cursor-pointer select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow matching brand colors */}
      <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-cyan-600/25 via-blue-600/20 to-purple-600/25 blur-3xl rounded-full pointer-events-none -z-10 animate-pulse" />

      <div className="flex flex-col items-center space-y-6 text-center px-4 animate-fade-in">
        {/* Animated Brand Logo Container */}
        <div className="relative group">
          {/* Pulsing neon outer ring */}
          <div className="absolute -inset-2.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
          
          <img
            src="/zuzustore-logo.png"
            alt="ZuzuStore Logo"
            className="relative w-36 h-36 sm:w-44 sm:h-44 object-contain rounded-2xl shadow-2xl border border-cyan-400/30 transform hover:scale-105 transition-transform"
          />
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 tracking-tight">
            ZuzuStore
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Official Application & APK Hub</span>
          </p>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 rounded-full animate-[slideUp_1.2s_ease-in-out_infinite]" />
        </div>

        <span className="text-[10px] text-neutral-400 font-medium">
          Tap anywhere to skip
        </span>
      </div>
    </div>
  );
};
