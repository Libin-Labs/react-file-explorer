import { act } from 'react';
import { JSDOM } from 'jsdom';
export async function setupDOM() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://example.test/' }); const originals = new Map();
  function replace(name, value) { if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, writable: true, configurable: true }); }
  replace('window', dom.window); replace('document', dom.window.document); replace('IS_REACT_ACT_ENVIRONMENT', true);
  const { createRoot } = await import('react-dom/client'); const container = document.getElementById('root'); const root = createRoot(container);
  return { container, root, dom, replace, render: (node) => act(() => root.render(node)), async cleanup() { replace('window', dom.window); replace('document', dom.window.document); await act(() => root.unmount()); dom.window.close(); for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } } };
}
export const key = (node, value, options) => act(async () => { node.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })); await Promise.resolve(); });
export const click = (node, options) => act(async () => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, ...options })); await Promise.resolve(); });
export const input = (node, value) => act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })); await Promise.resolve(); });