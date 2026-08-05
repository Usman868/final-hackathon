import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render errors so one broken panel does not white-screen the app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong',
    };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('UI ErrorBoundary:', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-semibold text-ink-900">This section could not load</h2>
          <p className="max-w-md text-sm text-ink-500">
            {this.props.soft
              ? 'Data may be unavailable. You can keep using the rest of the app.'
              : this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
