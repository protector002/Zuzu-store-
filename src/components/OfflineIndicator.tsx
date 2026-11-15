import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-xl border shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-all ${
        isOnline
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          : 'bg-amber-950/95 border-amber-500/50 text-amber-200'
      }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Back online — syncing catalog</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Offline mode — browsing cached apps</span>
        </>
      )}
    </div>
  );
};
