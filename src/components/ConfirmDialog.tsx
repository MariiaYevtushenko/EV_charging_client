import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { DangerButton, OutlineButton, PrimaryButton } from './station-admin/Primitives';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger — червона основна дія; neutral — зелена як у звичайному підтвердженні */
  variant?: 'danger' | 'neutral';
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};


// Універсальне модальне підтвердження 
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Підтвердити',
  cancelLabel = 'Скасувати',
  variant = 'neutral',
  busy = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        aria-label={cancelLabel}
        disabled={busy}
        onClick={() => !busy && onClose()}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <h2 id={titleId} className="text-lg font-bold text-gray-900">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-gray-600">{description}</div>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <OutlineButton type="button" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </OutlineButton>
          {variant === 'danger' ? (
            <DangerButton type="button" disabled={busy} onClick={() => void onConfirm()}>
              {confirmLabel}
            </DangerButton>
          ) : (
            <PrimaryButton type="button" disabled={busy} onClick={() => void onConfirm()}>
              {confirmLabel}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
