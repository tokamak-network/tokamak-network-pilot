'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const variantStyles: Record<ToastVariant, { icon: React.ElementType; className: string }> = {
  error: {
    icon: AlertCircle,
    className: 'border-destructive/30 bg-destructive/5 text-destructive',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-success-border bg-success-bg text-success',
  },
  info: {
    icon: Info,
    className: 'border-primary/30 bg-primary/5 text-primary',
  },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const config = variantStyles[toast.variant];
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg transition-all duration-200',
        config.className,
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0',
      )}
    >
      <IconComponent className="size-4 mt-0.5 shrink-0" />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 200);
        }}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
