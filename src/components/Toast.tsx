import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((t) => {
        const bgColors = {
          success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          warning: 'bg-amber-50 border-amber-300 text-amber-900',
          error: 'bg-rose-50 border-rose-300 text-rose-900',
          info: 'bg-blue-50 border-blue-300 text-blue-900',
        }[t.type];

        const iconColor = {
          success: 'text-emerald-600',
          warning: 'text-amber-600',
          error: 'text-rose-600',
          info: 'text-blue-600',
        }[t.type];

        return (
          <div
            key={t.id}
            id={`toast-${t.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${bgColors}`}
          >
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {t.type === 'error' && <XCircle className="w-5 h-5" />}
              {t.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight">{t.title}</h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{t.message}</p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
