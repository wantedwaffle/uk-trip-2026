const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const key = process.env.MAP_KEY || loadEnv(path.join(root, '.env')).MAP_KEY || '';
if (!key) {
  console.warn('MAP_KEY is missing. basemap.js will be written without a key, and Carto tiles will stay blank.');
}

const body = `window.MAP_KEY=${JSON.stringify(key)};\n`;
const skip = new Set(['node_modules', '.git', '.agents', '.vercel']);
let wrote = 0;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }
    if (ent.name !== 'index.html') continue;
    const html = fs.readFileSync(full, 'utf8');
    if (!html.includes('basemaps.cartocdn.com')) continue;
    fs.writeFileSync(path.join(dir, 'basemap.js'), body);
    console.log('wrote', path.relative(root, path.join(dir, 'basemap.js')));
    wrote += 1;
  }
}

walk(root);
if (!wrote) {
  console.warn('No map page found. Expected an index.html that requests basemaps.cartocdn.com.');
  process.exitCode = 1;
}
