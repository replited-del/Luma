const fs = require('node:fs').promises;
const path = require('node:path');
const extensions = new Set(['.mp3','.flac','.wav','.m4a','.aac','.ogg','.opus','.webm']);
async function scanFiles(paths) {
  const files = new Set();
  async function visit(p) {
    let s; try { s = await fs.lstat(p); } catch { return; }
    if (s.isSymbolicLink()) return;
    if (s.isDirectory()) { for (const name of await fs.readdir(p)) await visit(path.join(p, name)); }
    else if (s.isFile() && extensions.has(path.extname(p).toLowerCase())) files.add(path.resolve(p));
  }
  for (const p of paths) await visit(p);
  return [...files];
}
function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return false;
  return { start, end };
}
function sanitizeSettings(value) {
  const result = {};
  if (!value || typeof value !== 'object') return result;
  if (Number.isFinite(value.volume)) result.volume = Math.min(1, Math.max(0, value.volume));
  for (const name of ['shuffle','eqEnabled','compact','reducedMotion','visualizerEnabled','waveformEnabled']) if (typeof value[name] === 'boolean') result[name] = value[name];
  if (Number.isFinite(value.crossfadeSeconds)) result.crossfadeSeconds = Math.min(12,Math.max(0,value.crossfadeSeconds));
  if (['off','all','one'].includes(value.repeat)) result.repeat = value.repeat;
  if (['windows','macos'].includes(value.interfaceStyle)) result.interfaceStyle = value.interfaceStyle;
  if (['ru','en'].includes(value.language)) result.language = value.language;
  if (Array.isArray(value.eq) && value.eq.length === 10 && value.eq.every(Number.isFinite)) result.eq = value.eq.map(v => Math.min(12, Math.max(-12, v)));
  return result;
}
module.exports = { scanFiles, parseRange, sanitizeSettings };
