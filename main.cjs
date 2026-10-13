const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage } = require('electron');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { scanFiles, parseRange, sanitizeSettings } = require('./ui/core.cjs');
const { translate } = require('./ui/i18n.js');
const { createBackup, restoreBackup } = require('./library-backup.cjs');

if (process.env.LUMA_TEST_DATA) app.setPath('userData', process.env.LUMA_TEST_DATA);
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
protocol.registerSchemesAsPrivileged([{ scheme: 'luma-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
let win, dataDir, state, importing = false, restoring = false, backingUp = false;
app.on('second-instance', () => { if (win) { if(win.isMinimized())win.restore(); win.show(); win.focus(); } });
const defaultState = () => ({ tracks: [], playlists: [], settings: { volume: 0.7, shuffle: false, repeat: 'off', eq: [0,0,0,0,0,0,0,0,0,0], eqEnabled: false, compact: false, reducedMotion: false, visualizerEnabled: true, crossfadeSeconds:0, waveformEnabled:true, interfaceStyle: 'windows', language: 'ru' }, recent: [], lastTrack: null });
function writable() { if (restoring) throw new Error('Library restoration is in progress'); }
function persist() {
  fs.writeFileSync(path.join(dataDir, 'library.tmp'), JSON.stringify(state, null, 2));
  fs.renameSync(path.join(dataDir, 'library.tmp'), path.join(dataDir, 'library.json'));
}
function publicState() {
  return { ...state, tracks: state.tracks.map(({ storedFile, coverFile, ...t }) => ({ ...t, src: `luma-media://track/${t.id}`, cover: coverFile ? `luma-media://cover/${t.id}?v=${coverFile}` : null })) };
}
function notify(channel, value) { if (win && !win.isDestroyed()) win.webContents.send(channel, value); }
function createWindow() {
  win = new BrowserWindow({ width: 1380, height: 900, minWidth: 900, minHeight: 650, frame: false, backgroundColor: '#111217', show: false, title: 'Luma', icon: path.join(__dirname, 'ui/icon.png'), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(__dirname, 'ui/index.html'));
  win.once('ready-to-show', () => win.show());
  const windowState = () => notify('window-state', { maximized: win.isMaximized() });
  win.on('maximize', windowState);
  win.on('unmaximize', windowState);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_w, _p, done) => done(false));
}
async function digest(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex').slice(0, 32);
}
async function importPaths(paths) {
  writable();
  if (importing) throw new Error('Импорт уже идёт. Дождитесь завершения.');
  importing = true;
  let added = 0, duplicate = 0, failed = 0;
  try {
    const files = await scanFiles(paths);
    const { parseFile } = await import('music-metadata');
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      notify('import-progress', { current: index + 1, total: files.length, name: path.basename(file) });
      let copied, coverFile;
      try {
        const id = await digest(file);
        if (state.tracks.some(t => t.id === id)) { duplicate++; continue; }
        const meta = await parseFile(file, { duration: true });
        const common = meta.common, format = meta.format;
        if (!Number.isFinite(format.duration) || format.duration <= 0) throw new Error('Файл не содержит читаемого аудио');
        const ext = path.extname(file).toLowerCase();
        const storedFile = id + ext;
        copied = path.join(dataDir, 'music', storedFile);
        await fsp.copyFile(file, copied);
        const picture = common.picture?.[0];
        if (picture) {
          const img = nativeImage.createFromBuffer(picture.data);
          if (!img.isEmpty()) {
            coverFile = id + '.png';
            await fsp.writeFile(path.join(dataDir, 'covers', coverFile), img.resize({ width: 600 }).toPNG());
          }
        }
        const filename = path.basename(file, ext);
        const parts = filename.split(' - ');
        state.tracks.push({ id, title: common.title || (parts.length > 1 ? parts.slice(1).join(' - ') : filename), artist: common.artist || (parts.length > 1 ? parts[0] : 'Неизвестный исполнитель'), album: common.album || 'Без альбома', year: common.year || null, genre: common.genre?.[0] || '', trackNumber: common.track?.no || 0, duration: format.duration || 0, bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null, format: ext.slice(1).toUpperCase(), addedAt: Date.now(), favorite: false, storedFile, coverFile: coverFile || null });
        added++;
      } catch {
        failed++;
        if (copied) await fsp.unlink(copied).catch(() => {});
        if (coverFile) await fsp.unlink(path.join(dataDir, 'covers', coverFile)).catch(() => {});
      }
    }
    persist();
    const result = { added, duplicate, failed, total: files.length, library: publicState() };
    notify('library-changed', result.library);
    return result;
  } finally { importing = false; notify('import-progress', null); }
}
app.whenReady().then(() => {
  if (!ownsInstance) return;
  dataDir = app.getPath('userData');
  fs.mkdirSync(path.join(dataDir, 'music'), { recursive: true });
  fs.mkdirSync(path.join(dataDir, 'covers'), { recursive: true });
  try { const stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'library.json'), 'utf8')); const defaults = defaultState(); state = { ...defaults, ...stored, settings: { ...defaults.settings, ...sanitizeSettings(stored.settings) } }; }
  catch { state = defaultState(); }
  protocol.handle('luma-media', async request => {
    const url = new URL(request.url), id = url.pathname.slice(1);
    const track = state.tracks.find(t => t.id === id);
    if (!track || !['track', 'cover'].includes(url.hostname)) return new Response('Not found', { status: 404 });
    const name = url.hostname === 'track' ? track.storedFile : track.coverFile;
    if (!name) return new Response('Not found', { status: 404 });
    const file = path.join(dataDir, url.hostname === 'track' ? 'music' : 'covers', path.basename(name));
    try {
      const stat = await fsp.stat(file);
      const range = parseRange(request.headers.get('range'), stat.size);
      if (range === false) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
      const types = { '.mp3':'audio/mpeg', '.flac':'audio/flac', '.m4a':'audio/mp4', '.aac':'audio/aac', '.wav':'audio/wav', '.ogg':'audio/ogg', '.opus':'audio/ogg', '.webm':'audio/webm', '.png':'image/png' };
      const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes', 'Content-Length': String(range ? range.end - range.start + 1 : stat.size) };
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
      if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });
      return new Response(Readable.toWeb(fs.createReadStream(file, range || undefined)), { status: range ? 206 : 200, headers });
    } catch { return new Response('File unavailable', { status: 404 }); }
  });
  ipcMain.handle('library', () => publicState());
  ipcMain.handle('window-state', () => ({ maximized: win.isMaximized() }));
  ipcMain.handle('import-dialog', async (_e, folder) => {
    const result = await dialog.showOpenDialog(win, { title: translate(folder ? 'Добавить папку с музыкой' : 'Добавить музыку', state.settings.language), properties: folder ? ['openDirectory'] : ['openFile', 'multiSelections'], filters: [{ name: translate('Музыка', state.settings.language), extensions: ['mp3','flac','wav','m4a','aac','ogg','opus','webm'] }] });
    return result.canceled ? null : importPaths(result.filePaths);
  });
  ipcMain.handle('import-paths', (_e, paths) => {
    if (!Array.isArray(paths) || paths.length > 10000 || paths.some(p => typeof p !== 'string' || !path.isAbsolute(p))) throw new Error('Некорректный список файлов');
    return importPaths(paths);
  });
  ipcMain.handle('favorite', (_e, id) => { writable(); const t = state.tracks.find(t => t.id === id); if (t) { t.favorite = !t.favorite; persist(); } return publicState(); });
  ipcMain.handle('playlist-create', (_e, name) => { writable(); if (typeof name !== 'string' || !name.trim()) throw new Error('Введите название'); const p = { id: crypto.randomUUID(), name: name.trim().slice(0, 100), tracks: [], createdAt: Date.now() }; state.playlists.push(p); persist(); return publicState(); });
  ipcMain.handle('playlist-update', (_e, id, change) => {
    writable();
    const p = state.playlists.find(p => p.id === id);
    if (!p) throw new Error('Плейлист не найден');
    if (typeof change.name === 'string' && change.name.trim()) p.name = change.name.trim().slice(0, 100);
    if (Array.isArray(change.tracks)) p.tracks = [...new Set(change.tracks.filter(id => state.tracks.some(t => t.id === id)))];
    persist(); return publicState();
  });
  ipcMain.handle('playlist-delete', (_e, id) => { writable(); state.playlists = state.playlists.filter(p => p.id !== id); persist(); return publicState(); });
  ipcMain.handle('track-remove', (_e, id) => { writable(); state.tracks = state.tracks.filter(t => t.id !== id); state.recent = state.recent.filter(i => i !== id); state.playlists.forEach(p => p.tracks = p.tracks.filter(i => i !== id)); if (state.lastTrack === id) state.lastTrack = null; persist(); return publicState(); });
  ipcMain.handle('settings', (_e, settings) => { writable(); state.settings = { ...state.settings, ...sanitizeSettings(settings) }; persist(); return state.settings; });
  ipcMain.handle('played', (_e, id) => { writable(); if (state.tracks.some(t => t.id === id)) { state.lastTrack = id; state.recent = [id, ...state.recent.filter(i => i !== id)].slice(0, 50); persist(); } });
  ipcMain.handle('track-update', (_e, id, change) => {
    writable(); const track = state.tracks.find(t => t.id === id);
    if (!track || !change || typeof change !== 'object') throw new Error('Invalid track');
    const patch = {};
    for (const key of ['title','artist','album','genre']) {
      if (change[key] !== undefined) {
        if (typeof change[key] !== 'string' || change[key].length > 500 || (key === 'title' && !change[key].trim())) throw new Error('Invalid track text');
        patch[key] = change[key].trim();
      }
    }
    if (patch.artist === '') patch.artist = 'Неизвестный исполнитель';
    if (patch.album === '') patch.album = 'Без альбома';
    for (const key of ['year','trackNumber']) if (change[key] !== undefined) {
      if (change[key] !== null && (!Number.isInteger(change[key]) || change[key] < 0 || change[key] > 9999)) throw new Error('Invalid track number');
      patch[key] = change[key] ?? (key === 'year' ? null : 0);
    }
    if (change.coverData === null) patch.coverFile = null;
    else if (change.coverData !== undefined) {
      if (typeof change.coverData !== 'string' || change.coverData.length > 5 * 1024 * 1024 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(change.coverData)) throw new Error('Invalid cover');
      const image = nativeImage.createFromBuffer(Buffer.from(change.coverData.split(',')[1],'base64'));
      if (image.isEmpty()) throw new Error('Invalid cover');
      patch.coverFile = id + '-' + crypto.randomUUID() + '.png';
      fs.writeFileSync(path.join(dataDir,'covers',patch.coverFile),image.resize({width:600}).toPNG());
    }
    Object.assign(track,patch); persist(); return publicState();
  });
  ipcMain.handle('cover-dialog', async () => {
    const choice = await dialog.showOpenDialog(win,{title:translate('Выбрать обложку',state.settings.language),properties:['openFile'],filters:[{name:translate('Изображения',state.settings.language),extensions:['png','jpg','jpeg']}]});
    if (choice.canceled) return null;
    const stat = await fsp.stat(choice.filePaths[0]); if (stat.size > 10 * 1024 * 1024) throw new Error('Cover is too large');
    const image = nativeImage.createFromBuffer(await fsp.readFile(choice.filePaths[0])); if (image.isEmpty()) throw new Error('Invalid cover');
    return image.resize({width:600}).toDataURL();
  });
  ipcMain.handle('waveform-read', async (_e, id) => {
    if (!state.tracks.some(t => t.id === id)) return null;
    try { const peaks = JSON.parse(await fsp.readFile(path.join(dataDir,'waveforms',id + '.json'),'utf8')); return validPeaks(peaks) ? peaks : null; } catch { return null; }
  });
  ipcMain.handle('waveform-save', async (_e, id, peaks) => {
    if (!state.tracks.some(t => t.id === id) || !validPeaks(peaks)) throw new Error('Invalid waveform');
    await fsp.mkdir(path.join(dataDir,'waveforms'),{recursive:true}); await fsp.writeFile(path.join(dataDir,'waveforms',id + '.json'),JSON.stringify(peaks));
  });
  ipcMain.handle('backup-create', async () => {
    if (backingUp || restoring || importing) throw new Error('A library operation is already running');
    backingUp = true;
    try {
      const choice = await dialog.showOpenDialog(win,{title:translate('Куда сохранить резервную копию?',state.settings.language),properties:['openDirectory','createDirectory']});
      if (choice.canceled) return null;
      return await createBackup(dataDir,choice.filePaths[0],state,p => notify('backup-progress',p));
    } finally { backingUp = false; notify('backup-progress',null); }
  });
  ipcMain.handle('backup-restore', async () => {
    if (restoring || backingUp || importing) throw new Error('A library operation is already running');
    restoring = true;
    try {
      const choice = await dialog.showOpenDialog(win,{title:translate('Выбрать резервную копию Luma',state.settings.language),properties:['openDirectory']});
      if (choice.canceled) return null;
      const result = await restoreBackup(dataDir,choice.filePaths[0],defaultState(),state,p => notify('backup-progress',p));
      state = result.state; return { library:publicState(), recovery:result.recovery };
    } finally { restoring = false; notify('backup-progress',null); }
  });
  ipcMain.on('window', (_e, action) => { if (action === 'close') win.close(); if (action === 'minimize') win.minimize(); if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize(); });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
function validPeaks(value) { return Array.isArray(value) && value.length === 512 && value.every(n => Number.isFinite(n) && n >= 0 && n <= 1); }
