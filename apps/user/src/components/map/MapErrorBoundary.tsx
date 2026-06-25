import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; retryKey: number };

/** Keeps /map usable if MapGL throws during init. */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MapErrorBoundary]", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null, retryKey: this.state.retryKey + 1 });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Xarita vaqtincha yuklanmadi. Pastdagi ro&apos;yxatdan salon tanlang.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-bold text-background active:scale-[0.98]"
          >
            Qayta urinish
          </button>
        </div>
      );
    }
    return <div key={this.state.retryKey} className="h-full w-full">{this.props.children}</div>;
  }
}
