import Explorer, { type FileEntry } from '../src/index.js';
interface Entry extends FileEntry { owner: string; children?: Entry[] }
const entries: Entry[] = [{ id: 'one', name: 'One.txt', owner: 'Sam' }];
export const sample = <Explorer entries={entries} renderEntry={(entry) => `${entry.name} (${entry.owner})`} onRename={async (_, name, { signal }) => { signal.throwIfAborted(); console.log(name); }} />;