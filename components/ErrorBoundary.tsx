import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-200 p-6">
          <div className="max-w-lg w-full bg-slate-800 border border-red-500/50 rounded-xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-red-500 mb-4 font-display">System Malfunction</h1>
            <p className="mb-4 text-slate-300">
              The application encountered a critical error and could not load.
            </p>
            
            <div className="bg-black/50 p-4 rounded-md mb-6 overflow-x-auto">
              <code className="text-red-300 text-sm font-mono">
                {this.state.error?.toString()}
              </code>
            </div>

            <div className="space-y-2 text-sm text-slate-400">
              <p><strong>Potential Fixes:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>If you just deployed to Vercel, ensure <code>API_KEY</code> is set in Environment Variables.</li>
                <li>Clear your browser cache and refresh.</li>
                <li>If importing a file, the file format might be corrupted.</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;