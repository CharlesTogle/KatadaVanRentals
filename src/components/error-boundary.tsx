import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f7f9ff] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Something went wrong</h1>
            <p className="mt-3 text-sm font-medium text-[#071f52]/58">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
              className="mt-6 inline-flex rounded-2xl bg-[#e92935] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#c91f2a]"
            >
              Go home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
