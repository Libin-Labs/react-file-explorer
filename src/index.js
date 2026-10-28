'use client';
import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getVisibleEntries, renameEntry, validateName } from './model.js';
export { getVisibleEntries, renameEntry, validateName, isFolder } from './model.js';

export function FileExplorer({ entries: controlledEntries, defaultEntries = [], onEntriesChange, onRename, onOpen,
  expandedIds: controlledExpanded, defaultExpandedIds = [], onExpandedChange, selectedIds: controlledSelected, defaultSelectedIds = [], onSelectionChange,
  query: controlledQuery, defaultQuery = '', onQueryChange, selectionMode = 'multiple', showCheckboxes = true, readOnly = false,
  caseSensitiveNames = false, height = 360, indent = 20, label = 'Files', emptyContent = 'No files', renderEntry, className, style,
}) {
  if (!['single', 'multiple'].includes(selectionMode)) throw new TypeError('selectionMode must be single or multiple.');
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(indent) || indent < 0) throw new RangeError('height must be positive and indent nonnegative.');
  const [internalEntries, setEntries] = useState(defaultEntries); const entries = controlledEntries ?? internalEntries;
  const [internalExpanded, setExpanded] = useState(defaultExpandedIds); const expanded = controlledExpanded ?? internalExpanded;
  const [internalSelected, setSelected] = useState(defaultSelectedIds); const selected = controlledSelected ?? internalSelected;
  const [internalQuery, setQuery] = useState(defaultQuery); const query = controlledQuery ?? internalQuery;
  const model = useMemo(() => getVisibleEntries(entries, { expandedIds: expanded, query }), [entries, expanded, query]);
  const selectedSet = new Set(selected.filter((id) => model.byId.has(id)));
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const root = useRef(null); const renameInput = useRef(null); const anchor = useRef(null); const pending = useRef(null); const mounted = useRef(false); const latest = useRef(entries); latest.current = entries;
  const generatedId = useId();
  const active = model.rowById.get(activeId) ?? model.rows.find((row) => selectedSet.has(row.entry.id) && !row.entry.disabled) ?? model.rows.find((row) => !row.entry.disabled);
  const rowId = (row) => `${generatedId}-${typeof row.entry.id}-${Array.from(String(row.entry.id), (character) => character.codePointAt(0).toString(16)).join('-')}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);
  useEffect(() => { if (editing) { renameInput.current?.focus(); renameInput.current?.select(); } }, [editing?.id]);
  useEffect(() => { if (active) document.getElementById(rowId(active))?.scrollIntoView?.({ block: 'nearest' }); }, [active?.entry.id]);

  function focus(row) { if (!row || row.entry.disabled) return; setActiveId(row.entry.id); root.current?.focus({ preventScroll: true }); }
  function toggle(row) {
    if (!row.folder || row.entry.disabled) return;
    const next = new Set(expanded); if (row.expanded) next.delete(row.entry.id); else next.add(row.entry.id);
    if (controlledExpanded === undefined) setExpanded([...next]); onExpandedChange?.([...next], row.entry); focus(row);
  }
  function select(row, event, additive = false) {
    if (row.entry.disabled) return;
    let next = new Set(selectedSet);
    const start = model.rowById.get(anchor.current);
    if (selectionMode === 'single') next = additive && next.has(row.entry.id) ? new Set() : new Set([row.entry.id]);
    else if (event?.shiftKey && start) {
      if (!event.ctrlKey && !event.metaKey) next.clear();
      const low = Math.min(start.rowIndex, row.rowIndex); const high = Math.max(start.rowIndex, row.rowIndex);
      for (let index = low; index <= high; index += 1) if (!model.rows[index].entry.disabled) next.add(model.rows[index].entry.id);
    } else if (additive || event?.ctrlKey || event?.metaKey) { if (next.has(row.entry.id)) next.delete(row.entry.id); else next.add(row.entry.id); }
    else next = new Set([row.entry.id]);
    if (!event?.shiftKey) anchor.current = row.entry.id;
    if (controlledSelected === undefined) setSelected([...next]); onSelectionChange?.([...next]); focus(row);
  }
  function startRename(row) { if (!row || row.entry.disabled || row.entry.readOnly || readOnly) return; setActiveId(row.entry.id); setEditing({ id: row.entry.id, value: row.entry.name }); setError(null); }
  function cancelRename() { pending.current?.abort(); pending.current = null; setBusy(false); setEditing(null); setError(null); root.current?.focus(); }
  async function submitRename(event) {
    event.preventDefault(); if (!editing || pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError(null);
    try {
      const name = validateName(editing.value);
      renameEntry(latest.current, editing.id, name, { caseSensitive: caseSensitiveNames });
      const entry = model.byId.get(editing.id)?.entry;
      if (!entry || entry.disabled || entry.readOnly || readOnly) throw new Error('Entry cannot be renamed.');
      await onRename?.(entry, name, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      const next = renameEntry(latest.current, editing.id, name, { caseSensitive: caseSensitiveNames });
      if (controlledEntries === undefined) setEntries(next);
      onEntriesChange?.(next, { type: 'rename', id: editing.id, name }); setEditing(null); root.current?.focus();
    } catch (failure) { if (mounted.current && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { if (pending.current === controller) { pending.current = null; if (mounted.current) setBusy(false); } }
  }
  function open(row) { if (row.entry.disabled) return; if (row.folder) toggle(row); else onOpen?.(row.entry); }
  function nextEnabled(index, step) { for (let cursor = index; cursor >= 0 && cursor < model.rows.length; cursor += step) if (!model.rows[cursor].entry.disabled) return model.rows[cursor]; return null; }
  function navigate(event) {
    if (event.target !== event.currentTarget || !active) return;
    const movements = { ArrowDown: () => nextEnabled(active.rowIndex + 1, 1), ArrowUp: () => nextEnabled(active.rowIndex - 1, -1), Home: () => nextEnabled(0, 1), End: () => nextEnabled(model.rows.length - 1, -1) };
    if (movements[event.key]) {
      event.preventDefault(); const next = movements[event.key](); if (!next) return;
      if (event.shiftKey && selectionMode === 'multiple') { if (anchor.current === null) anchor.current = active.entry.id; select(next, event); } else focus(next);
      return;
    }
    if (event.key === 'ArrowRight') { event.preventDefault(); if (active.folder && !active.expanded) toggle(active); else { const child = nextEnabled(active.rowIndex + 1, 1); if (child && child.depth > active.depth) focus(child); } return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (active.folder && active.expanded) toggle(active); else focus(model.rowById.get(active.parentId)); return; }
    if (event.key === ' ') { event.preventDefault(); select(active, event, true); }
    if (event.key === 'Enter') { event.preventDefault(); open(active); }
    if (event.key === 'F2') { event.preventDefault(); startRename(active); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && selectionMode === 'multiple') { event.preventDefault(); const ids = model.rows.filter((row) => !row.entry.disabled).map((row) => row.entry.id); if (controlledSelected === undefined) setSelected(ids); onSelectionChange?.(ids); }
  }
  const rows = model.rows.map((row) => {
    const entry = row.entry; const chosen = selectedSet.has(entry.id); const isActive = active?.entry.id === entry.id;
    const content = editing?.id === entry.id ? createElement('form', { onSubmit: submitRename, onKeyDown: (event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); cancelRename(); } }, style: { display: 'flex', gap: 4, minWidth: 0, flex: 1 } },
      createElement('input', { ref: renameInput, value: editing.value, 'aria-label': 'New name', 'aria-invalid': Boolean(error), disabled: busy, onChange: (event) => setEditing({ ...editing, value: event.currentTarget.value }), style: { minWidth: 0, flex: 1, font: 'inherit' } }),
      createElement('button', { type: 'submit', disabled: busy }, 'Save'), createElement('button', { type: 'button', onClick: cancelRename }, 'Cancel')) : createElement('span', { title: entry.name, style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, renderEntry ? renderEntry(entry, { selected: chosen, expanded: row.expanded, depth: row.depth, folder: row.folder }) : entry.name);
    return createElement('div', { key: rowId(row), id: rowId(row), role: 'treeitem', 'aria-level': row.depth + 1, 'aria-posinset': row.position, 'aria-setsize': row.setSize, 'aria-selected': chosen, 'aria-expanded': row.folder ? row.expanded : undefined, 'aria-disabled': entry.disabled || undefined,
      onClick: (event) => { if (!event.target.closest?.('button,input,form,a,select,textarea')) select(row, event); }, onDoubleClick: (event) => { if (!event.target.closest?.('button,input,form,a,select,textarea')) open(row); },
      style: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 32, padding: '4px 8px', paddingLeft: row.depth * indent + 4, boxSizing: 'border-box', background: chosen ? 'Highlight' : undefined, color: chosen ? 'HighlightText' : undefined, outline: isActive ? '1px solid currentColor' : undefined, outlineOffset: -1, opacity: entry.disabled ? 0.5 : 1 },
    }, row.folder ? createElement('button', { type: 'button', tabIndex: -1, disabled: entry.disabled, title: `${row.expanded ? 'Collapse' : 'Expand'} ${entry.name}`, 'aria-label': `${row.expanded ? 'Collapse' : 'Expand'} ${entry.name}`, onClick: () => toggle(row), style: { width: 20, height: 20, flexShrink: 0, padding: 0, border: 0, background: 'transparent', color: 'inherit' } }, row.expanded ? '-' : '+') : createElement('span', { 'aria-hidden': true, style: { width: 20, flexShrink: 0 } }),
    showCheckboxes && createElement('input', { type: 'checkbox', tabIndex: -1, checked: chosen, disabled: entry.disabled, 'aria-label': `Select ${entry.name}`, onClick: (event) => event.stopPropagation(), onChange: () => select(row, undefined, true) }), content);
  });
  const selectedEntry = selectedSet.size === 1 ? model.byId.get([...selectedSet][0]) : null;
  return createElement('div', { className, style: { minWidth: 0, letterSpacing: 0, ...style } },
    createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' } }, createElement('input', { type: 'search', 'aria-label': 'Search files', value: query, onChange: (event) => { const next = event.currentTarget.value; if (controlledQuery === undefined) setQuery(next); onQueryChange?.(next); }, style: { minWidth: 0, flex: 1, font: 'inherit', padding: 6 } }), createElement('button', { type: 'button', disabled: readOnly || !selectedEntry || selectedEntry.entry.disabled || selectedEntry.entry.readOnly, onClick: () => startRename(selectedEntry) }, 'Rename')),
    createElement('div', { ref: root, role: 'tree', tabIndex: 0, 'aria-label': label, 'aria-multiselectable': selectionMode === 'multiple' || undefined, 'aria-activedescendant': active ? rowId(active) : undefined, onKeyDown: navigate, style: { height, overflow: 'auto', position: 'relative' } }, rows.length ? rows : createElement('div', { role: 'status' }, emptyContent)),
    error && createElement('div', { role: 'alert' }, error));
}
export default FileExplorer;