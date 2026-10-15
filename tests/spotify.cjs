const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=fs.promises;
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {SpotDL,downloadAsset}=require('../spotdl-download.cjs');
const project=path.resolve(__dirname,'..'),fixture=path.join(__dirname,'fixtures','spotdl.cjs');
const root=path.join(path.resolve(process.env.LUMA_TEST_ROOT||path.resolve(project,'../../work')),'spotify-'+Date.now());
const dataDir=path.join(root,'data'),backups=path.join(root,'backups');fs.mkdirSync(backups,{recursive:true});
const url='https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
let app,page;const errors=[];
const wait=async predicate=>{for(let i=0;i<200;i++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Timed out waiting for download fixture');};
async function unit(){
  const bytes=Buffer.from('pinned fixture'),asset={url:'https://example.test/tool',size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  const file=path.join(root,'verified-tool');let calls=0;
  await downloadAsset(asset,file,new AbortController().signal,()=>calls++,async()=>new Response(bytes));assert.deepEqual(fs.readFileSync(file),bytes);assert.ok(calls);
  const corrupt=path.join(root,'corrupt-tool');await assert.rejects(downloadAsset({...asset,sha256:'0'.repeat(64)},corrupt,new AbortController().signal,()=>{},async()=>new Response(bytes)));assert.equal(fs.existsSync(corrupt),false);
  await assert.rejects(downloadAsset(asset,corrupt,new AbortController().signal,()=>{},async()=>new Response('x'.repeat(bytes.length+1))));assert.equal(fs.existsSync(corrupt),false);
  let mode='success';const imports=[];
  const manager=new SpotDL({dataDir:path.join(root,'unit'),notify:()=>{},importFiles:async files=>{imports.push(files);return {added:files.length,duplicate:0,failed:0};}});
  manager.prepare=async()=>({spotdl:'fixture',directory:root,ffmpeg:'fixture'});
  manager.launch=(_exec,args,options)=>spawn(process.execPath,[fixture,...args],{...options,env:{...options.env,LUMA_FIXTURE_MODE:mode}});
  for(const value of ['--config','https://soundcloud.com/forss/flickermood','file:///C:/secrets',url+'; calc.exe'])assert.throws(()=>manager.start(value));
  manager.start(url);assert.throws(()=>manager.start(url),/already|уже/);await manager.pending;assert.equal(manager.snapshot().phase,'done');assert.equal(imports.at(-1).length,2);
  mode='partial';manager.start(url);await manager.pending;assert.equal(manager.snapshot().phase,'partial');assert.equal(manager.snapshot().failed,1);assert.equal(imports.at(-1).length,1);
  mode='cancel';manager.start(url);await wait(()=>manager.snapshot().completed===1);manager.cancel();await manager.pending;assert.equal(manager.snapshot().phase,'cancelled');assert.equal(imports.at(-1).length,1,'Cancellation must not import the unfinished file');assert.equal(manager.child,null);
  mode='metadata-error';const before=imports.length;manager.start(url);await manager.pending;assert.equal(manager.snapshot().phase,'error');assert.equal(imports.length,before);assert.ok(manager.snapshot().logs.some(line=>line.includes('unavailable')));
  mode='empty';manager.start(url);await manager.pending;assert.equal(manager.snapshot().phase,'error','A zero exit code with no audio must be an error');assert.equal(manager.snapshot().failed,2);assert.equal(imports.length,before);
}
async function launch(){
  const env={...process.env,LUMA_TEST_DATA:dataDir};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({args:process.env.LUMA_TEST_EXEC?[]:[project],executablePath:process.env.LUMA_TEST_EXEC||undefined,env,timeout:60000});
  page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.waitForSelector('.hero');
  await app.evaluate(({app},{node,fixture,root})=>{
    const load=process.getBuiltinModule('module').createRequire(process.getBuiltinModule('path').join(app.getAppPath(),'main.cjs'));
    const {SpotDL}=load('./spotdl-download.cjs');
    global.spotifyFixtureMode='success';
    SpotDL.prototype.prepare=async()=>({spotdl:'fixture',directory:root,ffmpeg:'fixture'});
    SpotDL.prototype.launch=function(_exec,args,options){return process.getBuiltinModule('child_process').spawn(node,[fixture,...args],{...options,env:{...options.env,LUMA_FIXTURE_MODE:global.spotifyFixtureMode}});};
  },{node:process.execPath,fixture,root});
}
async function start(){
  await page.locator('#importButton').click();await page.locator('.modal [data-action="spotify-import"]').click();
  assert.equal(await page.locator('.modal-header h2').textContent(),'Spotify');await page.locator('#spotifyURL').fill(url);await page.locator('#spotifyName').fill('My Spotify playlist');await page.locator('#spotifyImportSubmit').click();
  await wait(()=>page.evaluate(async()=>{const job=await api.spotifyStatus();return job&&!['preparing','metadata','downloading','importing','cancelling'].includes(job.phase);}));
}
(async()=>{
  await unit();await launch();await start();
  let library=await page.evaluate(()=>api.library());assert.equal(library.tracks.length,2);assert.equal(library.playlists[0].name,'My Spotify playlist');assert.equal(library.playlists[0].tracks.length,2);
  assert.equal(await page.locator('.spotify-status h3').textContent(),'Музыка добавлена');assert.equal(await page.locator('#serviceFrame').count(),0);
  await page.locator('[data-action="spotify-library"]').click();await page.evaluate(async()=>{await playTrack(db.tracks[0].id,db.tracks.map(t=>t.id));});await wait(()=>page.evaluate(()=>!audio.paused&&audio.currentTime>0));
  await page.evaluate(()=>navigate('services'));await start();library=await page.evaluate(()=>api.library());assert.equal(library.tracks.length,2,'Repeated downloads must deduplicate local files');assert.equal(library.playlists.length,1,'Repeated imports must reuse the source playlist');assert.equal((await page.evaluate(()=>api.spotifyStatus())).duplicate,2);
  await page.evaluate(async()=>{await changePreference('language','en','languageSelect');closeModal();navigate('services');});assert.equal(await page.locator('.spotify-status h3').textContent(),'Music added');
  await page.evaluate(()=>showSpotifyImport());assert.equal(await page.locator('#spotifyImportSubmit').textContent(),'Add to library');assert.ok((await page.locator('.online-import-note').last().textContent()).includes('YouTube'));
  await page.locator('#spotifyURL').fill('https://soundcloud.com/forss/flickermood');await page.locator('#spotifyImportSubmit').click();assert.ok((await page.locator('#spotifyImportError').textContent()).includes('Spotify'));await page.keyboard.press('Escape');
  await app.evaluate(()=>{global.spotifyFixtureMode='cancel';});await page.evaluate(async url=>{spotifyJob=await api.startSpotify(url,'Cancel test');renderSpotifyStatus();},url);
  await wait(()=>page.evaluate(async()=>(await api.spotifyStatus()).completed===1));
  await assert.rejects(page.evaluate(()=>api.restoreBackup()),/operation|операци/i);
  await page.locator('[data-action="spotify-cancel"]').click();await wait(()=>page.evaluate(async()=>(await api.spotifyStatus()).phase==='cancelled'));
  assert.equal((await page.evaluate(()=>api.library())).tracks.length,2);
  await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},backups);
  const backup=await page.evaluate(()=>api.createBackup());const catalog=JSON.parse(fs.readFileSync(path.join(backup.folder,'library.json'),'utf8'));assert.equal(catalog.tracks.length,2);assert.equal(catalog.playlists[0].tracks.length,2);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),900);
  const screenshots=path.resolve(process.env.LUMA_SCREENSHOT_DIR||path.resolve(project,'..'));fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'Luma-spotify-en.png')});
  await app.close();await launch();assert.equal((await page.evaluate(()=>api.library())).tracks.length,2);assert.equal(await page.evaluate(()=>audio.paused),true);assert.equal(await page.evaluate(()=>api.spotifyStatus()),null,'Do not restart downloads or contact services at startup');
  assert.deepEqual(errors,[]);await app.close();console.log(JSON.stringify({passed:true,checks:['pinned download integrity and bounded size','real child-process success, partial results, failure and cancellation','unfinished audio excluded','Spotify button imports local playable tracks and playlist','duplicates and repeat imports','backup includes downloaded audio','restore blocked during downloads','Russian and English labels','minimum window width','restart without automatic network or playback']},null,2));
})().catch(async error=>{console.error(error);if(app)await app.close().catch(()=>{});process.exitCode=1;});
