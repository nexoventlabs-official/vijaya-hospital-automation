/**
 * Tiny .env editor that preserves comments / blank lines and only mutates the
 * keys you supply. Used by setup-all / create-flow / generate-flow-keys.
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function readLines() {
  if (!fs.existsSync(ENV_PATH)) return [];
  return fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
}

function setKeys(updates) {
  const lines = readLines();
  const seen = new Set();
  const out = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (!m) return line;
    const key = m[1];
    if (updates[key] !== undefined) {
      seen.add(key);
      const v = String(updates[key]);
      const needsQuotes = v.includes(' ') || v.includes('\\n');
      return `${key}=${needsQuotes ? '"' + v + '"' : v}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) {
      const val = String(v);
      const needsQuotes = val.includes(' ') || val.includes('\\n');
      out.push(`${k}=${needsQuotes ? '"' + val + '"' : val}`);
    }
  }
  fs.writeFileSync(ENV_PATH, out.join('\n'));
}

module.exports = { setKeys };
