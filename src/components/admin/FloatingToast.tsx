import { useEffect, useRef, useState, type ReactNode } from 'react';

const EXIT_DURATION_MS = 380;

export type FloatingToastTone = 'success' | 'info' | 'warning';

const toneClass: Record<
  FloatingToastTone,
  { wrap: string; iconWrap: string }
> = {
  success: {
    wrap: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/98 via-white to-white text-emerald-950 shadow-emerald-900/[0.12] ring-emerald-600/10',
    iconWrap: 'bg-emerald-100/90 text-emerald-700',
  },
  info: {
    wrap: 'border-sky-200/90 bg-gradient-to-br from-sky-50/98 via-white to-white text-sky-950 shadow-sky-900/[0.1] ring-sky-600/10',
    iconWrap: 'bg-sky-100/90 text-sky-700',
  },
  warning: {
    wrap: 'border-amber-200/90 bg-gradient-to-br from-amber-50/98 via-white to-white text-amber-950 shadow-amber-900/[0.1] ring-amber-600/10',
    iconWrap: 'bg-amber-100/90 text-amber-800',
  },
};

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a2 2 0 011.664 1.11l.043.176c.07.304.255.577.527.75.62.421 1.455.243 1.86-.398l.092-.15a.75.75 0 111.299.75l-.09.15a3.5 3.5 0 01-3.772 1.59 3.48 3.48 0 01-1.12-.9 3.48 3.48 0 01-.615-1.43l-.043-.177A.5.5 0 009.253 10H9a.75.75 0 000-1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconWarn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 5zm1 9a1 1 0 11-2 0 1 1 0 012 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Спливаюча плашка з плавною появою/зникненням. Керується пропом `show` (батько зазвичай скидає через таймер).
 */
export function FloatingToast({
  show,
  tone = 'success',
  children,
  className = '',
  icon = 'auto',
}: {
  show: boolean;
  tone?: FloatingToastTone;
  children: ReactNode;
  className?: string;
  icon?: 'auto' | 'none';
}) {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);
  const contentRef = useRef<ReactNode>(null);

  useEffect(() => {
    if (show) {
      contentRef.current = children;
    }
  }, [show, children]);

  useEffect(() => {
    let exitTimer: number | undefined;
    if (show) {
      setMounted(true);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    exitTimer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => {
      if (exitTimer != null) window.clearTimeout(exitTimer);
    };
  }, [show]);

  if (!mounted) return null;

  const t = toneClass[tone];
  const body = contentRef.current ?? children;

  const iconNode =
    icon === 'none' ? null : tone === 'success' ? (
      <IconCheck className="h-4 w-4" />
    ) : tone === 'info' ? (
      <IconInfo className="h-4 w-4" />
    ) : (
      <IconWarn className="h-4 w-4" />
    );

  return (
    <div
      role="status"
      className={`
        pointer-events-none max-w-[min(100vw-2rem,22rem)] transform-gpu rounded-2xl border px-4 py-3.5 shadow-lg ring-1 backdrop-blur-[2px]
        transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${t.wrap}
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2.5 opacity-0'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {iconNode ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.iconWrap}`}
          >
            {iconNode}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5 text-sm font-medium leading-snug tracking-tight">{body}</div>
      </div>
    </div>
  );
}

/**
 * Фіксована область у правому верхньому куті (під шапкою адмінки). Усередині — один або кілька `FloatingToast`.
 */
export function FloatingToastRegion({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-none fixed top-20 right-4 z-[110] flex max-w-[min(100vw-2rem,22rem)] flex-col gap-3 sm:right-6 ${className}`}
      aria-live="polite"
    >
      {children}
    </div>
  );
}
