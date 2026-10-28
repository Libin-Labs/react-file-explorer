import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as element } from 'react';
import { setupDOM, key, click, input } from './helpers/dom.js';
import Explorer from '../src/index.js';
let ui;
beforeEach(async () => { ui = await setupDOM(); });
afterEach(async () => ui.cleanup());
const entries = () => [{ id: 'docs', name: 'Docs', type: 'folder', children: [{ id: 'one', name: 'One.txt' }, { id: 'two', name: 'Two.txt' }] }, { id: 'last', name: 'Last.txt' }];
const tree = () => ui.container.querySelector('[role="tree"]');
const rows = () => [...ui.container.querySelectorAll('[role="treeitem"]')];
test('keyboard expands folders, opens files and supports multiple selection', async () => {
  const selected = []; const opened = [];
  await ui.render(element(Explorer, { defaultEntries: entries(), onSelectionChange: (ids) => selected.push(ids), onOpen: (entry) => opened.push(entry.id) }));
  await key(tree(), 'ArrowRight'); assert.equal(rows().length, 4);
  await key(tree(), 'ArrowRight'); await key(tree(), 'Enter'); assert.deepEqual(opened, ['one']);
  await click(rows()[1]); await click(rows()[2], { ctrlKey: true }); assert.deepEqual(selected.at(-1), ['one', 'two']);
  await key(tree(), 'a', { ctrlKey: true }); assert.deepEqual(selected.at(-1), ['docs', 'one', 'two', 'last']);
});
test('search retains ancestors and does not remove source data', async () => {
  await ui.render(element(Explorer, { defaultEntries: entries() }));
  await input(ui.container.querySelector('[aria-label="Search files"]'), 'two');
  assert.equal(rows().length, 2); assert.ok(rows()[1].textContent.includes('Two.txt'));
  await input(ui.container.querySelector('[aria-label="Search files"]'), '');
  assert.equal(rows().length, 2);
});
test('F2 edits inline, duplicate validation keeps editor open, and successful rename commits', async () => {
  const changes = [];
  await ui.render(element(Explorer, { defaultEntries: entries(), defaultExpandedIds: ['docs'], onEntriesChange: (next) => changes.push(next) }));
  await click(rows()[1]); await key(tree(), 'F2');
  await input(ui.container.querySelector('[aria-label="New name"]'), 'Two.txt');
  await act(async () => { ui.container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
  assert.ok(ui.container.querySelector('[role="alert"]').textContent.includes('sibling'));
  await input(ui.container.querySelector('[aria-label="New name"]'), 'Renamed.txt');
  await act(async () => { ui.container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
  assert.equal(changes[0][0].children[0].name, 'Renamed.txt');
  assert.equal(ui.container.querySelector('[aria-label="New name"]'), null);
});
test('cancel aborts async rename and ignores late completion', async () => {
  let resolve; let signal; const changes = [];
  await ui.render(element(Explorer, { defaultEntries: entries(), defaultExpandedIds: ['docs'], onRename: (_, name, options) => { signal = options.signal; return new Promise((done) => { resolve = done; }); }, onEntriesChange: (next) => changes.push(next) }));
  await click(rows()[1]); await key(tree(), 'F2'); await input(ui.container.querySelector('[aria-label="New name"]'), 'Changed.txt');
  await act(() => ui.container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  await click([...ui.container.querySelectorAll('button')].find((button) => button.textContent === 'Cancel'));
  assert.equal(signal.aborted, true);
  await act(async () => resolve()); assert.equal(changes.length, 0);
});