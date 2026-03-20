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
      className={`rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-200/50 ${padding ? 'p-6' : ''} ${className}`}
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
  tone: 'success' | 'info' | 'warn' | 'muted' | 'danger';
  children: ReactNode;
  size?: 'sm' | 'md';
}) {
  const map = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
    warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    muted: 'bg-gray-100 text-gray-700 ring-gray-200',
    danger: 'bg-red-50 text-red-800 ring-red-200',
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
      className={`inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
