import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

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
    setToasts((t) => t.map((x) => x.id === id ? { ...x, exiting: true } : x));
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 200);
    timers.current.set(id + '_exit', t);
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, type, message }]);
    const t = setTimeout(() => dismiss(id), 4000);
    timers.current.set(id, t);
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="toast-container" role="log" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}${t.exiting ? ' exiting' : ''}`} role="alert">
            <span className="toast-dot" />
            <span className="flex-1 text-[12px]">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="btn-ghost w-[18px] h-[18px] flex items-center justify-center rounded"
              aria-label="Dismiss"
            >
              <X className="w-[10px] h-[10px]" style={{ color: 'var(--color-ink-3)' }} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
