import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X, CheckCircle2, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warn' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 200);
    timers.current.set(id + '_exit', t);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = String(++toastId);
      setToasts((prev) => [...prev, { id, type, message }]);
      const t = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, t);
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-[360px] w-full pointer-events-none"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarn = t.type === 'warn';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-[12px] border-2 border-[#111111] shadow-hard-lg flex items-center justify-between gap-3 transition-all duration-200 ${
                t.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 slide-up'
              } ${
                isSuccess
                  ? 'bg-[#C8FF2E] text-[#111111]'
                  : isError
                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                  : isWarn
                  ? 'bg-[#FEF3C7] text-[#B45309]'
                  : 'bg-white text-[#0A0A0A]'
              }`}
              role="alert"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0" />
                ) : isError ? (
                  <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0" />
                ) : isWarn ? (
                  <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-[#0A0A0A] shrink-0" />
                )}
                <span className="mono text-[12px] font-bold leading-snug truncate">{t.message}</span>
              </div>

              <button
                onClick={() => dismiss(t.id)}
                className="w-6 h-6 rounded-[4px] flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
