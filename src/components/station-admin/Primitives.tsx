import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function AppCard({
  children,
  className = '',
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-emerald-100/80 bg-white/95 shadow-sm shadow-gray-200/50 ring-1 ring-emerald-950/[0.04] backdrop-blur-sm transition-shadow duration-300 hover:shadow-md ${padding ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
  size = 'sm',
}: {
  tone: 'success' | 'info' | 'warn' | 'muted' | 'danger' | 'dark';
  children: ReactNode;
  size?: 'sm' | 'md';
}) {
  const map = {
    success: 'bg-emerald-50 text-emerald-900 ring-emerald-200/90 shadow-sm shadow-emerald-900/5',
    info: 'bg-sky-50 text-sky-900 ring-sky-200/90 shadow-sm shadow-sky-900/5',
    warn: 'bg-amber-50 text-amber-950 ring-amber-200/90 shadow-sm shadow-amber-900/5',
    muted: 'bg-slate-100 text-slate-700 ring-slate-200/90 shadow-sm',
    danger: 'bg-red-50 text-red-900 ring-red-200/90 shadow-sm shadow-red-900/5',
    dark: 'bg-slate-900 text-white ring-slate-700 shadow-sm shadow-slate-900/20',
  };
  const sizeClass =
    size === 'md'
      ? 'min-h-[42px] rounded-xl px-3.5 py-2 text-sm'
      : 'rounded-full px-2.5 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold ring-1 ring-inset ${sizeClass} ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl border border-emerald-200/90 bg-white/90 px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/80 active:scale-[0.99] motion-reduce:active:scale-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
