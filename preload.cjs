const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('luma', {
  library: () => ipcRenderer.invoke('library'),
  importDialog: folder => ipcRenderer.invoke('import-dialog', Boolean(folder)),
  importDrop: files => ipcRenderer.invoke('import-paths', Array.from(files, f => webUtils.getPathForFile(f)).filter(Boolean)),
  favorite: id => ipcRenderer.invoke('favorite', id),
  createPlaylist: name => ipcRenderer.invoke('playlist-create', name),
  updatePlaylist: (id, change) => ipcRenderer.invoke('playlist-update', id, change),
  deletePlaylist: id => ipcRenderer.invoke('playlist-delete', id),
  removeTrack: id => ipcRenderer.invoke('track-remove', id),
  settings: value => ipcRenderer.invoke('settings', value),
  played: id => ipcRenderer.invoke('played', id),
  window: action => ipcRenderer.send('window', action),
  windowState: () => ipcRenderer.invoke('window-state'),
  onWindowState: fn => { const listener = (_e, value) => fn(value); ipcRenderer.on('window-state', listener); return () => ipcRenderer.removeListener('window-state', listener); },
  onProgress: fn => { const listener = (_e, p) => fn(p); ipcRenderer.on('import-progress', listener); return () => ipcRenderer.removeListener('import-progress', listener); },
  onLibrary: fn => { const listener = (_e, p) => fn(p); ipcRenderer.on('library-changed', listener); return () => ipcRenderer.removeListener('library-changed', listener); }
});
