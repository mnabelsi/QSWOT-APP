import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#ffebee', margin: 20, borderRadius: 8 }}>
          <h1>Fatal React Crash Detected</h1>
          <p style={{ fontWeight: 600 }}>{this.state.error?.message}</p>
          <pre style={{ overflow: 'auto', fontSize: 11, marginTop: 10 }}>{this.state.error?.stack}</pre>
          <button 
            style={{ marginTop: 20, padding: 10, background: 'red', color: 'white', borderRadius: 4 }}
            onClick={() => { localStorage.clear(); window.location.reload(); }}
          >
            Clear Local Storage & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
