const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createReadStream } = require('node:fs');
const { sanitizeSettings } = require('./ui/core.cjs');
const { MAX_LENGTH: MAX_LYRICS } = require('./ui/lyrics.js');
const {validateSources} = require('./ui/services.js');

const audioName = /^[a-f0-9]{32}\.(mp3|flac|wav|m4a|aac|ogg|opus|webm)$/;
const coverName = /^[a-f0-9]{32}(?:-[a-f0-9-]{36})?\.png$/;
const inside = (root, file) => { const relative = path.relative(root, file); return relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative); };
async function checksum(file) { const hash = crypto.createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex'); }
async function regular(file) { const stat = await fs.lstat(file); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid backup file'); return stat; }
function validateLibrary(value, defaults) {
  if (!value || !Array.isArray(value.tracks) || !Array.isArray(value.playlists) || value.tracks.length > 100000 || value.playlists.length > 10000) throw new Error('Invalid library catalog');
  const ids = new Set();
  const tracks = value.tracks.map(t => {
    if (!t || !/^[a-f0-9]{32}$/.test(t.id) || ids.has(t.id) || !audioName.test(t.storedFile) || !t.storedFile.startsWith(t.id + '.') || (t.coverFile && (!coverName.test(t.coverFile) || !t.coverFile.startsWith(t.id)))) throw new Error('Invalid track in backup');
    if (![t.title,t.artist,t.album,t.genre || ''].every(v => typeof v === 'string') || !t.title.trim() || !Number.isFinite(t.duration) || t.duration <= 0) throw new Error('Invalid track metadata');
    ids.add(t.id);
    if (t.lyrics != null && (typeof t.lyrics !== 'string' || t.lyrics.length > MAX_LYRICS || t.lyrics.includes('\u0000'))) throw new Error('Invalid lyrics in backup');
    return { id:t.id, title:t.title, artist:t.artist, album:t.album, genre:t.genre || '', year:Number.isInteger(t.year) && t.year >= 0 && t.year <= 9999 ? t.year : null, trackNumber:Number.isInteger(t.trackNumber) && t.trackNumber >= 0 ? t.trackNumber : 0, duration:t.duration, bitrate:Number.isFinite(t.bitrate) ? t.bitrate : null, format:path.extname(t.storedFile).slice(1).toUpperCase(), addedAt:Number.isFinite(t.addedAt) ? t.addedAt : Date.now(), favorite:Boolean(t.favorite), storedFile:t.storedFile, coverFile:t.coverFile || null, lyrics:t.lyrics || null, lyricsOffset:Number.isFinite(t.lyricsOffset) ? Math.max(-30,Math.min(30,t.lyricsOffset)) : 0 };
  });
  const playlistIds = new Set();
  const playlists = value.playlists.map(p => {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(p.id) || playlistIds.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || !Array.isArray(p.tracks)) throw new Error('Invalid playlist in backup');
    playlistIds.add(p.id);
    return { id:p.id, name:p.name, createdAt:Number.isFinite(p.createdAt) ? p.createdAt : Date.now(), tracks:[...new Set(p.tracks.filter(id => ids.has(id)))] };
  });
  return { tracks, playlists, onlineSources:validateSources(value.onlineSources), recent:Array.isArray(value.recent) ? [...new Set(value.recent.filter(id => ids.has(id)))].slice(0,50) : [], lastTrack:ids.has(value.lastTrack) ? value.lastTrack : null, settings:{ ...defaults.settings, ...sanitizeSettings(value.settings) } };
}
function requiredFiles(state) { return [...new Set(state.tracks.flatMap(t => ['music/' + t.storedFile, ...(t.coverFile ? ['covers/' + t.coverFile] : [])]))]; }
function safeEntry(name) { return name === 'library.json' || (name.startsWith('music/') && audioName.test(name.slice(6))) || (name.startsWith('covers/') && coverName.test(name.slice(7))); }
async function createBackup(dataDir, parent, state, progress = () => {}) {
  dataDir = path.resolve(dataDir); parent = path.resolve(parent);
  if (parent === dataDir || inside(dataDir, parent)) throw new Error('Choose a folder outside the active library');
  const folder = path.join(parent, 'Luma-backup-' + new Date().toISOString().replace(/[:.]/g,'-') + '-' + crypto.randomUUID().slice(0,8));
  return writeBackup(dataDir, folder, state, progress);
}
async function writeBackup(dataDir, folder, state, progress = () => {}) {
  const snapshot = structuredClone(state), names = requiredFiles(snapshot), entries = [];
  await fs.mkdir(folder, { recursive:false });
  try {
    await fs.mkdir(path.join(folder,'music')); await fs.mkdir(path.join(folder,'covers'));
    await fs.writeFile(path.join(folder,'library.json'),JSON.stringify(snapshot,null,2));
    for (const [index, name] of ['library.json', ...names].entries()) {
      if (!safeEntry(name)) throw new Error('Invalid library file');
      if (name !== 'library.json') { await regular(path.join(dataDir,name)); await fs.copyFile(path.join(dataDir,name),path.join(folder,name)); }
      const stat = await regular(path.join(folder,name));
      entries.push({ path:name, size:stat.size, sha256:await checksum(path.join(folder,name)) });
      progress({ current:index + 1, total:names.length + 1 });
    }
    await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({ format:'luma-library-backup', version:1, createdAt:new Date().toISOString(), files:entries },null,2));
    return { folder, tracks:snapshot.tracks.length };
  } catch (error) {
    // This unique folder was created by this operation and contains no user files.
    await fs.rm(folder,{recursive:true,force:true}).catch(() => {}); throw error;
  }
}
async function restoreBackup(dataDir, folder, defaults, currentState, progress = () => {}) {
  dataDir = path.resolve(dataDir); folder = path.resolve(folder);
  if (folder === dataDir || (inside(dataDir,folder) && !inside(path.join(dataDir,'backups'),folder))) throw new Error('Choose a backup folder, not the active library');
  const rootStat = await fs.lstat(folder); if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Invalid backup folder');
  const manifestFile = path.join(folder,'manifest.json'); const manifestStat = await regular(manifestFile);
  if (manifestStat.size > 32 * 1024 * 1024) throw new Error('Backup manifest is too large');
  const manifest = JSON.parse(await fs.readFile(manifestFile,'utf8'));
  if (manifest.format !== 'luma-library-backup' || manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length > 200001) throw new Error('Unsupported backup');
  const seen = new Set();
  for (const file of manifest.files) {
    if (!file || typeof file.path !== 'string' || !safeEntry(file.path) || seen.has(file.path) || !Number.isSafeInteger(file.size) || file.size < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid backup manifest');
    seen.add(file.path);
  }
  if (!seen.has('library.json')) throw new Error('Missing library catalog');
  for (const name of ['music','covers']) { const stat = await fs.lstat(path.join(folder,name)); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Invalid backup directory'); }
  const stage = path.join(dataDir,'.restore-' + crypto.randomUUID());
  const rollback = path.join(dataDir,'.rollback-' + crypto.randomUUID());
  await fs.mkdir(stage); await fs.mkdir(path.join(stage,'music')); await fs.mkdir(path.join(stage,'covers'));
  const moved = [], installed = [];
  let recovery;
  try {
    for (const [index, file] of manifest.files.entries()) {
      const source = path.join(folder,file.path); const stat = await regular(source);
      if (stat.size !== file.size || (file.path === 'library.json' && file.size > 16 * 1024 * 1024)) throw new Error('Backup file size mismatch');
      await fs.copyFile(source,path.join(stage,file.path));
      if (await checksum(path.join(stage,file.path)) !== file.sha256) throw new Error('Backup checksum mismatch');
      progress({ current:index + 1,total:manifest.files.length });
    }
    const restored = validateLibrary(JSON.parse(await fs.readFile(path.join(stage,'library.json'),'utf8')),defaults);
    if (requiredFiles(restored).some(name => !seen.has(name))) throw new Error('Backup is missing music or covers');
    await fs.writeFile(path.join(stage,'library.json'),JSON.stringify(restored,null,2));
    const recoveryRoot = path.join(dataDir,'backups'); await fs.mkdir(recoveryRoot,{recursive:true});
    recovery = await writeBackup(dataDir,path.join(recoveryRoot,'Before-restore-' + Date.now() + '-' + crypto.randomUUID().slice(0,8)),currentState);
    await fs.mkdir(rollback);
    for (const name of ['music','covers','library.json']) {
      try { await fs.rename(path.join(dataDir,name),path.join(rollback,name)); moved.push(name); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await fs.rename(path.join(stage,name),path.join(dataDir,name)); installed.push(name);
    }
    await fs.rm(rollback,{recursive:true,force:true}).catch(() => {});
    return { state:restored, recovery:recovery.folder };
  } catch (error) {
    for (const name of installed.reverse()) await fs.rename(path.join(dataDir,name),path.join(stage,name));
    for (const name of moved.reverse()) await fs.rename(path.join(rollback,name),path.join(dataDir,name));
    await fs.rm(rollback,{recursive:true,force:true}).catch(() => {});
    throw error;
  } finally { await fs.rm(stage,{recursive:true,force:true}).catch(() => {}); }
}
module.exports = { createBackup, restoreBackup, validateLibrary };
