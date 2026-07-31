import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

const RELOAD_FLAG = "eb-chunk-reloaded";

function isChunkLoadError(error?: Error): boolean {
  const message = String(error?.message || "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    error?.name === "ChunkLoadError"
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Stale chunk after a new deploy: auto-recover by reloading once so the
    // browser fetches the latest index.html + correct chunk references.
    if (isChunkLoadError(error)) {
      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG);
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return;
      }
    } else {
      // Normal render: clear the flag so a future chunk error can reload again.
      window.sessionStorage.removeItem(RELOAD_FLAG);
    }
  }

  render() {
    if (this.state.hasError) {
      // While a chunk-error reload is in flight, show a friendly loading state
      // instead of the scary error screen.
      if (isChunkLoadError(this.state.error) && !window.sessionStorage.getItem(RELOAD_FLAG + "-shown")) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#0088ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">正在更新到最新版本...</span>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-xl font-bold text-destructive">应用出错了</h1>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#0088ff] text-white rounded-lg text-sm">
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
