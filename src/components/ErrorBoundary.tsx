import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ha ocurrido un error inesperado al conectar con la base de datos.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF9FB] text-[#231520] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl bg-white border border-[#F0C2D5] p-6 sm:p-8 shadow-sm text-center space-y-4">
            <h1 className="font-display text-2xl font-semibold text-[#231520]">
              Alba’s Beauty Salón · Aviso del sistema
            </h1>
            <p className="text-sm text-[#6B4C5E] leading-relaxed">
              No se pudo completar la operación solicitada. Recarga la página o vuelve al inicio para continuar.
            </p>
            {this.state.message && (
              <p className="text-xs font-mono bg-[#FFF0F5] border border-[#F5D0DF] rounded-lg p-3 text-[#831843] break-words">
                {this.state.message.slice(0, 260)}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#BE185D] hover:bg-[#9D174D] text-white text-sm font-medium transition-colors"
            >
              Recargar calendario
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
