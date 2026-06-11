import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            background: '#f7f3ed',
            color: '#3a2a1e',
            fontFamily: 'sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
            Oops! 出了點問題
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#8a7262', marginBottom: '20px' }}>
            應用程式發生錯誤，請重新整理頁面。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#c23a2e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            重新整理
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
