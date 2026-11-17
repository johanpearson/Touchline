/** jsdom lacks ResizeObserver and matchMedia; Radix popper and Motion read them. */
export function installBrowserStubs(options: { reducedMotion?: boolean; phone?: boolean } = {}) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? Boolean(options.reducedMotion) : Boolean(options.phone),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
