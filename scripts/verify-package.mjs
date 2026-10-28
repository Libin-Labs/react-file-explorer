import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root = resolve('.'); const pkg = JSON.parse(await readFile('package.json', 'utf8')); const npm = process.env.npm_execpath; assert.ok(npm, 'Run using npm run test:package.');
const temp = await mkdtemp(join(tmpdir(), 'file-explorer-consumer-')); const run = (args) => execFileSync(process.execPath, [npm, ...args, '--dry-run=false'], { encoding: 'utf8' });
try {
  const [packed] = JSON.parse(run(['pack', root, '--ignore-scripts', '--json', '--pack-destination', temp])); const files = new Set(packed.files.map((file) => file.path));
  for (const name of ['dist/index.js', 'dist/cjs/index.js', 'dist/cjs/package.json', 'dist/index.d.ts']) assert.ok(files.has(name), name);
  run(['install', '--prefix', temp, '--ignore-scripts', '--offline', '--no-audit', '--no-fund', join(temp, packed.filename), join(root, 'node_modules/react'), join(root, 'node_modules/react-dom')]);
  const require = createRequire(join(temp, 'consumer.cjs')); const api = require(pkg.name); assert.equal(api, require(join(temp, 'node_modules', pkg.name)));
  const { createElement } = require('react'); const { renderToString } = require('react-dom/server'); assert.match(renderToString(createElement(api.default, { defaultEntries: [{ id: 'one', name: 'Installed.txt' }] })), /Installed.txt/);
  const code = `import assert from 'node:assert/strict'; import {createElement} from 'react'; import {renderToString} from 'react-dom/server'; import Explorer from ${JSON.stringify(pkg.name)}; assert.match(renderToString(createElement(Explorer,{defaultEntries:[{id:'one',name:'Installed.txt'}]})),/Installed.txt/);`;
  execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: temp, stdio: 'pipe' }); console.log(`${pkg.name}: packed files and isolated ESM/CJS SSR consumers verified.`);
} finally { await rm(temp, { recursive: true, force: true }); }