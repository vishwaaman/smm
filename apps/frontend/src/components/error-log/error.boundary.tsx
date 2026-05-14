'use client';

import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { reportError } from '@gitroom/frontend/components/error-log/error.reporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, 'frontend');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-[40px] text-textColor">
          <div className="text-center">
            <p className="text-[18px] font-[600]">Something went wrong</p>
            <p className="text-sm text-textItemBlur mt-[8px]">
              The error has been logged. Please refresh the page.
            </p>
            <button
              className="mt-[16px] px-[16px] py-[8px] bg-forth text-white rounded-[8px] text-sm"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const GlobalErrorListener: React.FC = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportError(new Error(event.message), 'frontend');
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      reportError(err, 'frontend');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
  return null;
};
