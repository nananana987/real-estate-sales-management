import { useState, useEffect } from 'react';

// BeforeInstallPromptEvent interface
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Service Worker Registration
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // GitHub Pages等のサブディレクトリ公開時でも正しく解決できるよう動的URLを生成
      const swUrl = new URL('sw.js', window.location.href).href;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          // Check for worker updates
          reg.update();
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

// Hook for PWA installation state and offline detection
export function usePwa() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Check standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Listen to beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen to online / offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
      return false;
    }
  };

  const isInIframe = (() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return {
    isInstallable: !!installPrompt,
    isStandalone,
    isOnline,
    isInIframe,
    openInNewTab,
    triggerInstall,
  };
}
