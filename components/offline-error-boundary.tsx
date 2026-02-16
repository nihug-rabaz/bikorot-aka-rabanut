"use client"

import type { ReactNode } from "react"
import React from "react"

interface OfflineErrorBoundaryProps {
  children: ReactNode
}

interface OfflineErrorBoundaryState {
  hasError: boolean
}

export class OfflineErrorBoundary extends React.Component<
  OfflineErrorBoundaryProps,
  OfflineErrorBoundaryState
> {
  constructor(props: OfflineErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): OfflineErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center px-4" dir="rtl">
          <div className="max-w-md text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">
              אירעה שגיאה בתצוגת הטופס.
            </p>
            <p className="text-sm text-muted-foreground">
              נסה לרענן את העמוד. אם אתה במצב אופליין, השינויים האחרונים נשמרו מקומית.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

