import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps /map usable if MapGL throws during init. */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MapErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-surface px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Xarita vaqtincha yuklanmadi. Pastdagi ro&apos;yxatdan salon tanlang.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
