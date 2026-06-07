import '@testing-library/jest-dom/vitest';

// Radix UI primitives (e.g. Slider) use ResizeObserver which jsdom doesn't implement.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
