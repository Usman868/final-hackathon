import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Shows install banner when browser fires beforeinstallprompt (Chrome/Android).
 * iOS: shows manual “Add to Home Screen” tip once.
 */
export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed') === '1') return;

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone;
    if (isIos && !isStandalone) {
      setIosTip(true);
      setVisible(true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-lg sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Install MaintainIQ</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {iosTip && !deferred
              ? 'On iPhone: Share → Add to Home Screen for floor use.'
              : 'Add to your home screen for quick access on the floor.'}
          </p>
          <div className="mt-3 flex gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-600"
            >
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-ink-400 hover:text-ink-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
