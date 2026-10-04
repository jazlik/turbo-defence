import { Component, type ReactNode } from "react";

/** A failing map module (chunk that will not load, MapLibre throwing) must never take its screen down with it. */
export default class MapErrorBoundary extends Component<
  { fallback?: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
