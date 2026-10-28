export const isFolder = (entry) => entry.type === 'folder' || (entry.type !== 'file' && entry.children !== undefined);

export function indexEntries(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Entries must be an array.');
  const all = []; const byId = new Map(); const stack = [];
  function push(nodes, parentIndex, depth) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) stack.push({ entry: nodes[index], parentIndex, depth, position: index, setSize: nodes.length });
  }
  push(entries, -1, 0);
  while (stack.length) {
    const item = stack.pop(); const entry = item.entry;
    if (!entry || !['string', 'number'].includes(typeof entry.id) || entry.id === '' || (typeof entry.id === 'number' && !Number.isFinite(entry.id)) || typeof entry.name !== 'string' || !entry.name.trim()) throw new TypeError('Every entry needs a valid id and name.');
    if (byId.has(entry.id)) throw new TypeError('Duplicate id or circular entry tree.');
    if (entry.type !== undefined && !['file', 'folder'].includes(entry.type)) throw new TypeError('Entry type must be file or folder.');
    if (entry.children !== undefined && (!Array.isArray(entry.children) || !isFolder(entry))) throw new TypeError('Only folders may have array children.');
    const record = { ...item, index: all.length, folder: isFolder(entry) }; all.push(record); byId.set(entry.id, record);
    if (record.folder) push(entry.children ?? [], record.index, record.depth + 1);
  }
  return { all, byId };
}

export function getVisibleEntries(entries, { expandedIds = [], query = '' } = {}) {
  const model = indexEntries(entries); const expanded = new Set(expandedIds); const term = query.trim().toLocaleLowerCase(); const included = new Set();
  if (term) for (let index = model.all.length - 1; index >= 0; index -= 1) {
    const record = model.all[index];
    if (record.entry.name.toLocaleLowerCase().includes(term) || included.has(index)) { included.add(index); if (record.parentIndex >= 0) included.add(record.parentIndex); }
  }
  const rows = []; const visible = new Set(); const sizes = new Map(); const positions = new Map();
  for (const record of model.all) if (!term || included.has(record.index)) sizes.set(record.parentIndex, (sizes.get(record.parentIndex) ?? 0) + 1);
  for (const record of model.all) {
    if (term && !included.has(record.index)) continue;
    const parent = model.all[record.parentIndex];
    if (parent && (!visible.has(parent.index) || (!term && !expanded.has(parent.entry.id)))) continue;
    visible.add(record.index); const position = (positions.get(record.parentIndex) ?? 0) + 1; positions.set(record.parentIndex, position);
    rows.push({ ...record, parentId: parent?.entry.id ?? null, rowIndex: rows.length, expanded: record.folder && (Boolean(term) || expanded.has(record.entry.id)), position, setSize: sizes.get(record.parentIndex) });
  }
  return { ...model, rows, rowById: new Map(rows.map((row) => [row.entry.id, row])) };
}

export function validateName(name) {
  const normalized = name.trim();
  if (!normalized || normalized === '.' || normalized === '..' || /[\x00-\x1f\x7f/\\]/.test(normalized)) throw new TypeError('Names cannot be empty, traversal segments, or contain slashes/control characters.');
  return normalized;
}

export function renameEntry(entries, id, name, { caseSensitive = false } = {}) {
  const model = indexEntries(entries); let record = model.byId.get(id);
  if (!record) throw new Error('The entry no longer exists.');
  const normalized = validateName(name);
  const siblings = record.parentIndex < 0 ? entries : model.all[record.parentIndex].entry.children;
  const comparable = (value) => caseSensitive ? value : value.toLocaleLowerCase();
  if (siblings.some((entry) => entry.id !== id && comparable(entry.name) === comparable(normalized))) throw new Error('A sibling already has that name.');
  let next = { ...record.entry, name: normalized };
  while (record.parentIndex >= 0) {
    const parent = model.all[record.parentIndex]; const children = parent.entry.children.slice(); children[record.position] = next; next = { ...parent.entry, children }; record = parent;
  }
  const result = entries.slice(); result[record.position] = next; return result;
}