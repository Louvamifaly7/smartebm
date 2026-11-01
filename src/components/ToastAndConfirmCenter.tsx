import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, RotateCcw, Trash2 } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  undoLabel?: string;
  onUndo?: () => void;
  durationMs?: number;
}

export interface ConfirmDialogRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onUndoAfterConfirm?: () => void;
  undoMessage?: string;
}

const TOAST_EVENT = 'ebm:toast';
const CONFIRM_EVENT = 'ebm:confirm';

export function showAppToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, {
      detail: {
        ...toast,
        id: `toast-${Math.random().toString(36).slice(2, 10)}`,
      },
    })
  );
}

export function requestAppConfirm(req: ConfirmDialogRequest) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ConfirmDialogRequest>(CONFIRM_EVENT, { detail: req }));
}

export const ToastAndConfirmCenter: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogRequest | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const custom = e as CustomEvent<ToastItem>;
      const item = custom.detail;
      setToasts((prev) => [item, ...prev.slice(0, 4)]);
      const timeout = item.durationMs ?? (item.onUndo ? 7000 : 4200);
      setTimeout(() => {
        removeToast(item.id);
      }, timeout);
    };

    const handleConfirm = (e: Event) => {
      const custom = e as CustomEvent<ConfirmDialogRequest>;
      setConfirmDialog(custom.detail);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    window.addEventListener(CONFIRM_EVENT, handleConfirm);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      window.removeEventListener(CONFIRM_EVENT, handleConfirm);
    };
  }, [removeToast]);

  const handleConfirmExecute = () => {
    if (!confirmDialog) return;
    const current = confirmDialog;
    setConfirmDialog(null);
    current.onConfirm();
    if (current.onUndoAfterConfirm) {
      showAppToast({
        type: 'info',
        title: current.undoMessage || 'Élément supprimé',
        message: 'Vous pouvez annuler cette opération pendant 7 secondes.',
        undoLabel: 'Annuler la suppression',
        onUndo: current.onUndoAfterConfirm,
        durationMs: 7500,
      });
    }
  };

  return (
    <>
      {/* Discrete Bottom-Right Toast Stack */}
      <div className="fixed bottom-16 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-2 sm:px-0">
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isWarn = t.type === 'warning';
          const isSuccess = t.type === 'success';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl transition-all duration-150 ${
                isError
                  ? 'bg-rose-950 text-white border-rose-700'
                  : isWarn
                  ? 'bg-amber-950 text-white border-amber-700'
                  : isSuccess
                  ? 'bg-slate-900 text-white border-emerald-500/60'
                  : 'bg-slate-900 text-white border-slate-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isError ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : isWarn ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-snug">{t.title}</div>
                {t.message && <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{t.message}</div>}
                {t.onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      t.onUndo?.();
                      removeToast(t.id);
                      showAppToast({
                        type: 'success',
                        title: 'Action annulée',
                        message: 'Les données ont été restaurées avec succès.',
                      });
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t.undoLabel || 'Annuler'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Clean Custom Confirmation Modal (replaces browser confirm()) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.variant === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                {confirmDialog.cancelLabel || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer ${
                  confirmDialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
