import test from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleEntries, renameEntry } from '../src/model.js';
const sample = () => [{ id: 'folder', name: 'Docs', type: 'folder', children: [{ id: 'one', name: 'One.txt' }, { id: 'two', name: 'Two.txt' }] }, { id: 'last', name: 'Last.txt' }];
test('filtering reveals matching ancestor paths without losing original nodes', () => {
  assert.deepEqual(getVisibleEntries(sample()).rows.map((row) => row.entry.id), ['folder', 'last']);
  assert.deepEqual(getVisibleEntries(sample(), { query: 'one' }).rows.map((row) => row.entry.id), ['folder', 'one']);
});
test('rename is immutable, preserves siblings and rejects collisions/traversal', () => {
  const entries = sample(); const next = renameEntry(entries, 'one', 'Renamed.txt');
  assert.equal(next[0].children[0].name, 'Renamed.txt'); assert.equal(entries[0].children[0].name, 'One.txt'); assert.equal(next[1], entries[1]);
  assert.throws(() => renameEntry(entries, 'one', 'two.TXT'), /sibling/);
  assert.throws(() => renameEntry(entries, 'one', '../bad'), /slashe/);
});