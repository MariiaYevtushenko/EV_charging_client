import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Ловить помилки рендеру в дереві маршрутів, щоб не залишати порожній екран без пояснення.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Щось пішло не так</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Сталася неочікувана помилка інтерфейсу. Спробуйте оновити сторінку або повернутися назад.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              Оновити сторінку
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Спробувати ще раз
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
