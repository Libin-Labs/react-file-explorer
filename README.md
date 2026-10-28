# @lp-labs/react-file-explorer

React file trees with keyboard navigation, search, validated inline rename and multi-selection. React 18+ peer only; no runtime dependencies or CSS imports. Includes TypeScript, ESM, CommonJS and browser entries. This is a UI over application data, not a filesystem API.

## Installation

```sh
npm install @lp-labs/react-file-explorer
```

Requires React 18 or later in the host application and a modern browser for interactive navigation. Server-side rendering is supported. Node.js consumers require Node.js 18 or later.

## Quick Start

```jsx
import { useState } from 'react';
import FileExplorer from '@lp-labs/react-file-explorer';

export default function Example() {
  const [entries, setEntries] = useState([
    { id: 'docs', name: 'Documents', type: 'folder', children: [
      { id: 'notes', name: 'Notes.txt', type: 'file' },
    ] },
  ]);
  return (
    <FileExplorer
      entries={entries}
      onEntriesChange={setEntries}
      defaultExpandedIds={['docs']}
      onOpen={(file) => console.log(file)}
    />
  );
}
```

Replace `onOpen` with your application's file-opening or preview action. No filesystem operation happens automatically.

## Entry Data

Entries require unique string/finite numeric `id` and nonempty `name`. Optional `type` is `file` or `folder`; children imply a folder when type is omitted. Folders accept array `children`; an empty `type:'folder'` remains expandable. Custom data is preserved. `disabled` prevents interaction and `readOnly` prevents renaming. Array order is preserved. Inputs are validated iteratively for duplicates and cycles.

## FileExplorer API

| Prop | Default | Description |
| --- | --- | --- |
| `entries` / `defaultEntries` | `[]` | Controlled or initial entry tree |
| `onEntriesChange(entries, change)` | none | Renamed tree; change contains `type`, `id`, and `name` |
| `expandedIds` / `defaultExpandedIds` | `[]` | Expanded folder IDs |
| `onExpandedChange(ids, entry)` | none | Requested expansion state |
| `selectedIds` / `defaultSelectedIds` | `[]` | Selected entry IDs |
| `onSelectionChange(ids)` | none | Requested selection state |
| `query` / `defaultQuery` | `''` | Search text |
| `onQueryChange(query)` | none | Requested search text |
| `selectionMode` | `'multiple'` | `'single'` or `'multiple'` |
| `showCheckboxes` | `true` | Show entry selection controls |
| `readOnly` | `false` | Disable renaming, not navigation or selection |
| `caseSensitiveNames` | `false` | Case-sensitive sibling-name collision checks |
| `onRename(entry, name, { signal })` | none | Optional async action before local rename |
| `onOpen(entry)` | none | Open a file through application code |
| `height` | `360` | Tree viewport height in pixels |
| `indent` | `20` | Indentation per depth level in pixels |
| `label` | `'Files'` | Accessible tree label |
| `emptyContent` | `'No files'` | Empty-result content |

`renderEntry(entry, { selected, expanded, depth, folder })`, `className`, and `style` are also supported. Numeric height must be positive; indent must be nonnegative. Replace input arrays immutably when data changes. `default*` props initialize internal state only.

## Selection And Keyboard Navigation

Use controlled `entries`/`onEntriesChange` or `defaultEntries`. Selection uses `selectedIds`/`defaultSelectedIds` and `onSelectionChange`; expansion uses `expandedIds`/`defaultExpandedIds` and `onExpandedChange`. Search uses `query`/`defaultQuery` and `onQueryChange`. Apply callbacks for all controlled values. The `selectionMode` default is `multiple`; `single` is also supported. `showCheckboxes` defaults true. Plain clicks replace selection; Ctrl/Cmd-click and checkboxes toggle; Shift-click and Shift-arrow navigation extend a visible range. Ctrl/Cmd+A selects enabled visible entries. Selection does not cascade to children.

Arrow Up/Down, Home/End move focus; Right expands or enters a folder; Left collapses or moves to its parent. Enter opens files through `onOpen(entry)` or toggles folders; Space toggles selection; F2 starts rename. Double-click also opens/toggles. The tree exposes ARIA hierarchy/selection and uses an active-descendant tab stop. Custom interactive `renderEntry(entry,{selected,expanded,depth,folder})` content must supply its own accessibility behavior.

## Search

Search matches case-insensitive name substrings and retains/opens ancestor paths without modifying data. Matching paths stay forced open until search is cleared. Hidden entries are not removed from source data. The tree is not virtualized: use a virtualized-tree library for very large visible node counts.

## Rename

Rename uses a toolbar command or F2. Enter/Save submits; Escape/Cancel discards. Names are trimmed, cannot be empty, `.`/`..`, contain slashes or control characters, or duplicate sibling names. Sibling comparison is case-insensitive unless `caseSensitiveNames` is true. These are UI-level checks, not a complete OS filename policy. Optional `onRename(entry,name,{signal})` runs before applying the immutable update; reject to keep the editor open with an error. Cancellation/unmount aborts the signal and ignores late completion, but server operations must honor the signal to be canceled remotely. Validation runs again against current data after async completion. Read-only mode disables renaming, not navigation or selection.

## Helpers And Limits

Exports include pure `getVisibleEntries`, `renameEntry`, `validateName`, and `isFolder`. Rename copies only changed ancestors and preserves unrelated data. No network loader, create/delete/move, drag/drop, OS file access, previews, context menus or download operations are included. SSR emits initial rows without accessing browser globals.

## Support

Support maintenance with a [PayPal donation](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/).