const { _electron:electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sanitizeSettings } = require('../ui/core.cjs');
const project = path.resolve(__dirname,'..');
const testRoot = path.join(path.resolve(process.env.LUMA_TEST_ROOT || path.resolve(project,'../../work')),'features-' + Date.now());
const dataDir = path.join(testRoot,'data'), fixtures = path.join(testRoot,'fixtures'), backups = path.join(testRoot,'backups');
const screenshotDir = path.resolve(process.env.LUMA_SCREENSHOT_DIR || path.resolve(project,'..'));
for (const dir of [dataDir,fixtures,backups,screenshotDir]) fs.mkdirSync(dir,{recursive:true});
function makeWav(file,frequency,envelope) {
  const rate=16000, samples=rate*16, bytes=Buffer.alloc(samples*2), header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+bytes.length,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes.length,40);
  for(let i=0;i<samples;i++)bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*i/rate)*(envelope ? [100,700,300,1000][Math.floor(i/(rate*4))] : 400)),i*2);
  fs.writeFileSync(file,Buffer.concat([header,bytes]));
}
const firstFile=path.join(fixtures,'Aster - Night Drive.wav'),secondFile=path.join(fixtures,'Luma - Slow Morning.wav');
makeWav(firstFile,220,true);makeWav(secondFile,2000,false);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalHash=hash(firstFile),errors=[];
let app,page;
async function launch() {
  const env={...process.env,LUMA_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({args:process.env.LUMA_TEST_EXEC?[]:[project],executablePath:process.env.LUMA_TEST_EXEC || undefined,env,timeout:60000});
  page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForSelector('.hero');
}
async function choose(folder) {await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},folder);}
async function settings(change) {
  await page.evaluate(async change=>{if(change.language){await changePreference('language',change.language,'languageSelect');closeModal();}const rest={...change};delete rest.language;saveSettings(rest);},change);
  await page.waitForFunction(async change=>{const saved=(await window.luma.library()).settings;return Object.entries(change).every(([key,value])=>saved[key]===value);},change);
}
async function seekToEnd(seconds) {await page.evaluate(seconds=>{audio.currentTime=audio.duration-seconds;},seconds);}
async function snapshot() {return page.evaluate(()=>window.luma.library());}
(async()=>{
  assert.deepEqual(sanitizeSettings({crossfadeSeconds:40,waveformEnabled:false}),{crossfadeSeconds:12,waveformEnabled:false});
  assert.deepEqual(sanitizeSettings({crossfadeSeconds:-2,waveformEnabled:'false'}),{crossfadeSeconds:0});
  await launch();const initial=await snapshot();assert.equal(initial.settings.crossfadeSeconds,0);assert.equal(initial.settings.waveformEnabled,true);
  await choose(fixtures);const imported=await page.evaluate(()=>window.luma.importDialog(true));assert.equal(imported.added,2);
  const first=imported.library.tracks.find(track=>track.title==='Night Drive'),second=imported.library.tracks.find(track=>track.title==='Slow Morning');
  await page.evaluate(id=>playTrack(id,[id]),first.id);
  await page.waitForFunction(()=>waveform.loadedId===currentId&&waveform.peaks?.length===512);
  const peaks=await page.evaluate(()=>waveform.peaks);
  assert.ok(Math.max(...peaks.slice(128,255))>Math.max(...peaks.slice(0,127))*5,'Waveform must reflect the actual amplitude envelope');
  assert.ok(Math.max(...peaks.slice(384))>Math.max(...peaks.slice(256,383))*2);
  assert.equal(await page.locator('#waveformSeek.waveform-ready').count(),1);
  const waveformFile=path.join(dataDir,'waveforms',first.id+'.json');assert.ok(fs.existsSync(waveformFile));
  await page.locator('#seek').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.ok(await page.locator('#audio').evaluate(el=>el.currentTime>=8&&el.currentTime<9),'Waveform seeking must control audio');
  await settings({waveformEnabled:false});assert.equal(await page.locator('#trackWaveform').isVisible(),false);assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);
  await settings({waveformEnabled:true});await page.waitForFunction(()=>waveform.peaks?.length===512);

  // Edit through the actual context menu and native artwork picker while playing.
  await page.locator('[data-view="library"]').first().click();
  await page.locator(`[data-menu="${first.id}"]`).click();await page.locator(`[data-edit-track="${first.id}"]`).click();
  await page.locator('#editTitle').fill('Night Drive — edited <tag> & song');await page.locator('#editArtist').fill('Aster edited');await page.locator('#editAlbum').fill('Late hours');await page.locator('#editGenre').fill('Ambient');await page.locator('#editYear').fill('2026');await page.locator('#editTrackNumber').fill('3');
  await choose(path.join(project,'ui/icon.png'));await page.locator('#editCoverChoose').click();await page.waitForSelector('#editCoverPreview img');
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(screenshotDir,'Luma-track-editor-ru.png')});
  await page.locator('#saveTrackInfo').click();await page.waitForSelector('#trackEditForm',{state:'detached'});
  const edited=(await snapshot()).tracks.find(track=>track.id===first.id);
  assert.equal(edited.title,'Night Drive — edited <tag> & song');assert.equal(edited.year,2026);assert.equal(edited.trackNumber,3);assert.equal(edited.genre,'Ambient');assert.ok(edited.cover.includes('?v='));
  assert.equal(await page.locator('#nowTitle').textContent(),edited.title);assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);assert.equal(hash(firstFile),originalHash);
  assert.equal(hash(path.join(dataDir,'music',first.id+'.wav')),originalHash);
  await page.locator('#nowCover').click();assert.equal(await page.locator('.now-playing h2').textContent(),edited.title);
  await page.evaluate(async id=>updateLibrary(await api.updateTrack(id,{title:'Night Drive revised'})),first.id);assert.equal(await page.locator('.now-playing h2').textContent(),'Night Drive revised');await page.keyboard.press('Escape');
  const invalid=await page.evaluate(async id=>{try{await api.updateTrack(id,{title:'   ',year:-1});return false;}catch{return true;}},first.id);assert.equal(invalid,true);assert.equal((await snapshot()).tracks.find(t=>t.id===first.id).title,'Night Drive revised');

  await settings({language:'en',crossfadeSeconds:2});
  await page.evaluate(id=>showTrackEditor(id),first.id);assert.equal(await page.locator('#modalRoot .modal-header h2').textContent(),'Track information');assert.equal(await page.locator('#editCoverChoose').textContent(),'Choose cover');
  await page.evaluate(()=>document.querySelector('#toast').hidden=true);await page.waitForTimeout(300);
  await page.screenshot({path:path.join(screenshotDir,'Luma-track-editor-en.png')});await page.keyboard.press('Escape');
  await page.evaluate(()=>showSettings());assert.equal(await page.locator('#crossfadeSeconds').inputValue(),'2');assert.equal(await page.locator('#createBackup').textContent(),'Create backup');
  await page.waitForTimeout(300);
  await page.screenshot({path:path.join(screenshotDir,'Luma-settings-1.3-en.png')});await page.keyboard.press('Escape');
  await page.waitForTimeout(100);await page.screenshot({path:path.join(screenshotDir,'Luma-waveform-en.png')});

  // A real automatic overlap: both decks play with complementary audio gains.
  await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(1.8);
  await page.waitForFunction(id=>currentId===id&&playback.fading,second.id);
  const overlap=await page.evaluate(()=>({playing:playback.decks.filter(deck=>!deck.paused).length,gains:playback.decks.map(deck=>playback.nodes.get(deck).gain.value)}));
  assert.equal(overlap.playing,2);assert.ok(overlap.gains.every(value=>value>=0&&value<=1));assert.ok(Math.abs(overlap.gains.reduce((sum,n)=>sum+n,0)-1)<.02);
  await settings({volume:.3});assert.deepEqual(await page.evaluate(()=>playback.decks.map(deck=>deck.volume)),[.3,.3]);
  await page.waitForFunction(()=>!playback.fading&&playback.other().paused);assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);
  await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(1.6);await page.waitForFunction(()=>playback.fading);await page.locator('#play').click();
  assert.equal(await page.evaluate(()=>playback.decks.every(deck=>deck.paused)),true);assert.equal(await page.evaluate(()=>playback.fading),false);
  await page.locator('#play').click();assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);assert.equal(await page.evaluate(()=>playback.other().paused),true);
  await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(1.6);await page.waitForFunction(()=>playback.fading);
  await settings({crossfadeSeconds:0});assert.equal(await page.evaluate(()=>playback.other().paused),true);assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);
  await settings({crossfadeSeconds:2,repeat:'one'});await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(.5);
  await page.waitForFunction(id=>currentId===id&&audio.currentTime<1,first.id);assert.equal(await page.evaluate(()=>playback.fading),false);
  await settings({repeat:'off'});await page.evaluate(id=>playTrack(id,[id]),second.id);await seekToEnd(.4);await page.waitForFunction(()=>audio.ended);assert.equal(await page.evaluate(()=>playback.fading),false);
  await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(1.6);await page.waitForFunction(()=>playback.fading);
  await page.evaluate(id=>playTrack(id),first.id);assert.equal(await page.evaluate(()=>playback.other().paused&&!playback.fading),true);await page.locator('#play').click();

  await page.evaluate(async id=>{updateLibrary(await api.favorite(id));const created=await api.createPlaylist('Backup playlist');updateLibrary(await api.updatePlaylist(created.playlists.at(-1).id,{tracks:db.tracks.map(track=>track.id)}));},first.id);
  await settings({volume:.42,crossfadeSeconds:3,waveformEnabled:true});
  await page.evaluate(({first,second})=>playTrack(first,[first,second]),{first:first.id,second:second.id});await seekToEnd(3.2);
  await app.evaluate(()=>{const fileOps=process.getBuiltinModule('fs').promises;globalThis.realCopyFile=fileOps.copyFile;fileOps.copyFile=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,400));return globalThis.realCopyFile(...args);};});
  await choose(backups);await page.evaluate(()=>showSettings());await page.locator('#createBackup').click();await page.waitForSelector('.backup-path');
  assert.equal(await page.evaluate(()=>currentId),second.id,'Playback must advance while the library is being backed up');
  assert.equal(await page.locator('#audio').evaluate(el=>el.paused),false);
  await app.evaluate(()=>{process.getBuiltinModule('fs').promises.copyFile=globalThis.realCopyFile;delete globalThis.realCopyFile;});
  const backupFolder=await page.locator('.backup-path').inputValue();assert.ok(backupFolder.startsWith(backups+path.sep));
  const catalog=JSON.parse(fs.readFileSync(path.join(backupFolder,'library.json'),'utf8'));assert.equal(catalog.tracks.length,2);assert.equal(catalog.playlists[0].tracks.length,2);
  const manifest=JSON.parse(fs.readFileSync(path.join(backupFolder,'manifest.json'),'utf8'));assert.equal(manifest.format,'luma-library-backup');assert.equal(manifest.files.length,4);assert.equal(hash(path.join(backupFolder,'music',first.id+'.wav')),originalHash);
  await page.keyboard.press('Escape');await page.locator('#play').click();
  await page.evaluate(async({first,second})=>{updateLibrary(await api.updateTrack(first,{title:'Changed after backup',coverData:null}));updateLibrary(await api.removeTrack(second));}, {first:first.id,second:second.id});
  await settings({volume:.19,crossfadeSeconds:0,waveformEnabled:false});const beforeRestore=await snapshot();
  // Corruption and path traversal must fail before touching the current library.
  const damaged=path.join(backups,'damaged');fs.cpSync(backupFolder,damaged,{recursive:true});const corruptFile=path.join(damaged,'music',first.id+'.wav'),corruptBytes=fs.readFileSync(corruptFile);corruptBytes[100]^=255;fs.writeFileSync(corruptFile,corruptBytes);
  await choose(damaged);const rejected=await page.evaluate(async()=>{try{await api.restoreBackup();return false;}catch{return true;}});assert.equal(rejected,true);assert.deepEqual(await snapshot(),beforeRestore);
  const traversal=path.join(backups,'traversal');fs.cpSync(backupFolder,traversal,{recursive:true});const malicious=structuredClone(manifest);malicious.files[1].path='../outside.wav';fs.writeFileSync(path.join(traversal,'manifest.json'),JSON.stringify(malicious));
  await choose(traversal);const unsafe=await page.evaluate(async()=>{try{await api.restoreBackup();return false;}catch{return true;}});assert.equal(unsafe,true);assert.deepEqual(await snapshot(),beforeRestore);
  // Simulate a failed directory swap and verify rollback, not just validation.
  await choose(backupFolder);
  await app.evaluate((_,target)=>{const fileOps=process.getBuiltinModule('fs').promises;globalThis.realRename=fileOps.rename;fileOps.rename=async(from,to)=>{if(from.includes('.restore-')&&to===target)throw new Error('Simulated filesystem failure');return globalThis.realRename(from,to);};},path.join(dataDir,'covers'));
  const rolledBack=await page.evaluate(async()=>{try{await api.restoreBackup();return false;}catch{return true;}});
  await app.evaluate(()=>{process.getBuiltinModule('fs').promises.rename=globalThis.realRename;delete globalThis.realRename;});
  assert.equal(rolledBack,true);assert.deepEqual(await snapshot(),beforeRestore);assert.equal(hash(path.join(dataDir,'music',first.id+'.wav')),originalHash);
  await choose(backupFolder);await page.evaluate(()=>showSettings());await page.locator('#restoreBackup').click();assert.equal(await page.locator('#modalRoot .modal-header h2').textContent(),'Restore library?');await page.locator('#confirmRestore').click();await page.waitForSelector('.backup-path');
  const recovery=await page.locator('.backup-path').inputValue();assert.ok(recovery.startsWith(path.join(dataDir,'backups')+path.sep));
  const recovered=JSON.parse(fs.readFileSync(path.join(recovery,'library.json'),'utf8'));assert.equal(recovered.tracks.length,1);assert.equal(recovered.tracks[0].title,'Changed after backup');
  const restored=await snapshot();assert.equal(restored.tracks.length,2);assert.equal(restored.tracks.find(t=>t.id===first.id).title,'Night Drive revised');assert.ok(restored.tracks.find(t=>t.id===first.id).cover);assert.equal(restored.settings.volume,.42);assert.equal(restored.settings.crossfadeSeconds,3);assert.equal(restored.settings.waveformEnabled,true);assert.equal(restored.tracks.find(t=>t.id===first.id).favorite,true);assert.equal(restored.playlists[0].tracks.length,2);assert.equal(hash(path.join(dataDir,'music',first.id+'.wav')),originalHash);assert.equal(hash(firstFile),originalHash);
  await page.keyboard.press('Escape');await page.evaluate(id=>playTrack(id,[id]),second.id);await page.waitForFunction(()=>audio.currentTime>.1);await page.locator('#play').click();
  await app.close();await launch();const restarted=await snapshot();assert.equal(restarted.settings.crossfadeSeconds,3);assert.equal(restarted.settings.waveformEnabled,true);assert.equal(restarted.tracks.find(t=>t.id===first.id).title,'Night Drive revised');
  await page.evaluate(id=>playTrack(id,[id]),first.id);await page.waitForFunction(()=>waveform.peaks?.length===512);assert.deepEqual(await page.evaluate(()=>waveform.peaks),peaks);await page.locator('#play').click();
  assert.deepEqual(errors,[]);await app.close();
  console.log(JSON.stringify({passed:true,checks:['actual audio waveform and cache','waveform seeking and toggle','metadata and artwork editing without altering originals','editor localization and validation','real crossfade overlap and volume','pause and manual skip during crossfade','disable crossfade and repeat behavior','complete backup without interrupting playback','reject corrupted and unsafe backups','rollback after a failed restore swap','restore music, artwork, catalog and preferences','automatic recovery backup','playback and persistence after restore'],screenshots:screenshotDir},null,2));
})().catch(async error=>{console.error(error);if(app)await app.close().catch(()=>{});process.exitCode=1;});
