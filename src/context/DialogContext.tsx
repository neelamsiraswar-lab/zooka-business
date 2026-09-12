import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Trash2,
  HelpCircle,
  Check,
} from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'primary' | 'error';

export interface ConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: 'trash' | 'warning' | 'info' | 'question' | 'check';
}

export interface AlertDialogOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  variant?: DialogVariant;
}

export interface PromptDialogOptions {
  title: string;
  message?: string | React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface DialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions | string) => Promise<void>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  // Modal Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'confirm' | 'alert' | 'prompt'>('alert');
  const [variant, setVariant] = useState<DialogVariant>('info');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<React.ReactNode>('');
  const [confirmText, setConfirmText] = useState<string>('OK');
  const [cancelText, setCancelText] = useState<string>('Cancel');
  const [iconType, setIconType] = useState<string>('info');
  const [promptInput, setPromptInput] = useState<string>('');
  const [promptPlaceholder, setPromptPlaceholder] = useState<string>('');
  const [promptRequired, setPromptRequired] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const resolveRef = useRef<((value: any) => void) | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toastMethods = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    warning: (msg: string) => addToast(msg, 'warning'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogType('confirm');
      setTitle(options.title || 'Confirm Action');
      setMessage(options.message);
      setConfirmText(options.confirmText || 'Confirm');
      setCancelText(options.cancelText || 'Cancel');
      setVariant(options.variant || (options.icon === 'trash' ? 'danger' : 'warning'));
      setIconType(options.icon || (options.variant === 'danger' ? 'trash' : 'warning'));
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogType('alert');
      if (typeof options === 'string') {
        setTitle('Notification');
        setMessage(options);
        setConfirmText('OK');
        setVariant('info');
        setIconType('info');
      } else {
        setTitle(options.title || (options.variant === 'error' || options.variant === 'danger' ? 'Notice' : 'Alert'));
        setMessage(options.message);
        setConfirmText(options.confirmText || 'OK');
        setVariant(options.variant || 'info');
        setIconType(
          options.variant === 'danger' || options.variant === 'error'
            ? 'warning'
            : options.variant === 'success'
            ? 'check'
            : 'info'
        );
      }
      setIsOpen(true);
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogType('prompt');
      setTitle(options.title || 'Input Required');
      setMessage(options.message || '');
      setPromptInput(options.defaultValue || '');
      setPromptPlaceholder(options.placeholder || '');
      setPromptRequired(Boolean(options.required));
      setPromptError(null);
      setConfirmText(options.confirmText || 'Submit');
      setCancelText(options.cancelText || 'Cancel');
      setVariant('primary');
      setIconType('question');
      setIsOpen(true);
    });
  }, []);

  const handleClose = (result: any) => {
    if (dialogType === 'prompt' && result !== null && promptRequired && !promptInput.trim()) {
      setPromptError('This field cannot be empty');
      return;
    }
    setIsOpen(false);
    if (resolveRef.current) {
      if (dialogType === 'confirm') {
        resolveRef.current(Boolean(result));
      } else if (dialogType === 'prompt') {
        resolveRef.current(result ? promptInput : null);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
      case 'error':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          btn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-900/20',
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-900/20',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          btn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-900/20',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt, toast: toastMethods }}>
      {children}

      {/* Modern App Dialog Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 text-slate-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Header Icon + Title */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${variantStyles.iconBg}`}>
                {iconType === 'trash' && <Trash2 className="w-6 h-6" />}
                {iconType === 'warning' && <AlertTriangle className="w-6 h-6" />}
                {iconType === 'check' && <CheckCircle2 className="w-6 h-6" />}
                {iconType === 'question' && <HelpCircle className="w-6 h-6" />}
                {iconType === 'info' && <Info className="w-6 h-6" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                {message && (
                  <div className="text-sm text-slate-300 mt-1.5 leading-relaxed break-words">
                    {message}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleClose(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Input Field if type is prompt */}
            {dialogType === 'prompt' && (
              <div className="space-y-1.5 pt-2">
                <input
                  type="text"
                  autoFocus
                  value={promptInput}
                  placeholder={promptPlaceholder}
                  onChange={(e) => {
                    setPromptInput(e.target.value);
                    if (promptError) setPromptError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleClose(true);
                    if (e.key === 'Escape') handleClose(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {promptError && <p className="text-xs text-rose-400 font-medium">{promptError}</p>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {(dialogType === 'confirm' || dialogType === 'prompt') && (
                <button
                  type="button"
                  onClick={() => handleClose(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 cursor-pointer"
                >
                  {cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${variantStyles.btn}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modern Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-medium animate-in slide-in-from-bottom-5 duration-200 ${
              t.type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : t.type === 'error'
                ? 'bg-slate-900 border-rose-500/40 text-rose-300'
                : t.type === 'warning'
                ? 'bg-slate-900 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
