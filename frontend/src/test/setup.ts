import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom lacks the browser APIs Mantine relies on.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

window.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// jsdom lays nothing out, so every element measures 0. Leaflet would then show no marker, so its map gets a size;
// every other element keeps measuring 0, as before.
for (const [property, size] of [
  ['clientWidth', 800],
  ['clientHeight', 600],
] as const) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('leaflet-container') ? size : 0;
    },
  });
}

// A Select that opens with a value scrolls the selected option into view.
Element.prototype.scrollIntoView = () => undefined;

// What `findBy` and `waitFor` wait for appears after a render, which with the whole suite running in parallel can take
// longer than the default second.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
});
