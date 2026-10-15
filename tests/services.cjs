const {_electron:electron} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parse,validateSources} = require('../ui/services.js');
const {resolveSource,metadata} = require('../service-import.cjs');
const {validateLibrary} = require('../library-backup.cjs');
const project = path.resolve(__dirname,'..');
const root = path.join(path.resolve(process.env.LUMA_TEST_ROOT || path.resolve(project,'../../work')),'services-'+Date.now());
const dataDir = path.join(root,'data'), backups = path.join(root,'backups');
const screenshots = path.resolve(process.env.LUMA_SCREENSHOT_DIR || path.resolve(project,'..'));
for (const dir of [dataDir,backups,screenshots]) fs.mkdirSync(dir,{recursive:true});
const spotify = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
const cloud = 'https://soundcloud.com/forss/flickermood';
const wav = Buffer.alloc(44+16000*20*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for (let i=0;i<16000*20;i++) wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*220/16000)*200),44+i*2);
const localFile = path.join(root,'Luma - Offline.wav'); fs.writeFileSync(localFile,wav);
let app,page; const errors = [], network = [];
async function launch() {
  const env = {...process.env,LUMA_TEST_DATA:dataDir}; delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({args:process.env.LUMA_TEST_EXEC?[]:[project],executablePath:process.env.LUMA_TEST_EXEC || undefined,env,timeout:60000});
  page = await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',async route => {
    const url = route.request().url(); network.push(url);
    if (url.startsWith('https://open.spotify.com/embed/') || url.startsWith('https://w.soundcloud.com/player/')) {
      await route.fulfill({contentType:'text/html',body:`<!doctype html><html><body style="background:#202126;color:white;font:16px sans-serif;padding:32px"><h1>Provider test fixture</h1><p>Offline fixture for player isolation and audio handoff tests.</p><audio controls src="data:audio/wav;base64,${wav.toString('base64')}"></audio><button id="play" onclick="document.querySelector('audio').play()">Play fixture</button></body></html>`});
    } else await route.abort();
  });
  await page.waitForSelector('.hero');
  await app.evaluate(() => {
    global.fetch = async url => {
      if (global.offlineMetadata) throw new Error('Offline test');
      return new Response(JSON.stringify({title:url.startsWith('https://open.spotify.com') ? 'Evening Favorites' : 'Flickermood by Forss',html:'<script>throw new Error("must never execute")</script>'}),{headers:{'content-type':'application/json'}});
    };
  });
}
async function add(url,name='') {
  await page.evaluate(()=>showOnlineImport());await page.locator('#onlineURL').fill(url);
  if (name) await page.locator('#onlineName').fill(name);
  await page.locator('#onlineImportSubmit').click();await page.waitForSelector('#serviceFrame');
  await page.frameLocator('#serviceFrame').locator('#play').waitFor();
}
async function choose(folder) { await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},folder); }
(async()=>{
  assert.equal(parse(spotify+'?si=tracking').url,spotify);
  assert.equal(parse('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M').url,spotify);
  assert.equal(parse(spotify.replace('/playlist/','/intl-de/embed/playlist/')).url,spotify);
  assert.equal(parse('https://m.soundcloud.com/forss/flickermood?utm_campaign=x').url,cloud);
  assert.equal(parse('https://soundcloud.com/forss/sets/album').kind,'playlist');
  for (const url of ['javascript:alert(1)','file:///C:/secrets','https://open.spotify.com.evil.test/playlist/x','https://user@open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M','http://soundcloud.com/forss/flickermood','https://soundcloud.com:8080/forss/flickermood','https://soundcloud.com/forss/flickermood/s-secret','https://soundcloud.com/forss/flickermood?secret_token=secret','https://soundcloud.com/forss/likes','https://soundcloud.com/search/songs','https://open.spotify.com/artist/123','https://localhost/forss/flickermood']) assert.equal(parse(url),null,url);
  const short = await resolveSource('https://spotify.link/abc123',async()=>new Response(null,{status:302,headers:{location:spotify}}));assert.equal(short.url,spotify);
  let redirects = 0;await assert.rejects(resolveSource('https://on.soundcloud.com/abc123',async()=>{redirects++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});}));assert.equal(redirects,1);
  await assert.rejects(resolveSource('https://spotify.link/abc123',async()=>new Response(null,{status:302,headers:{location:cloud}})));
  await assert.rejects(metadata(parse(spotify),async()=>new Response('x'.repeat(65537))));
  assert.equal(await metadata(parse(spotify),async()=>new Response(JSON.stringify({title:'<script>safe title</script>',html:'unsafe ignored'}))),'<script>safe title</script>');
  assert.deepEqual(validateSources(undefined),[]);
  assert.deepEqual(validateLibrary({tracks:[],playlists:[]},{settings:{}}).onlineSources,[],'Old backups must remain compatible');
  assert.throws(()=>validateSources([{id:'123',url:spotify,title:'x'}]));
  await launch();assert.equal(network.length,0,'Starting Luma must not contact services');
  await choose(localFile);const imported = await page.evaluate(async()=>{const result=await api.importDialog(false);updateLibrary(result.library);return result;});const trackId = imported.library.tracks[0].id;
  await page.evaluate(async id=>{await changePreference('language','en','languageSelect');closeModal();await playTrack(id,[id]);},trackId);
  await page.waitForFunction(()=>!audio.paused && audio.currentTime > 0);
  await page.locator('[data-view="services"]').click();await page.locator('[data-action="online-import"]').click();await page.locator('#onlineURL').fill('https://evil.test/fake');await page.locator('#onlineImportSubmit').click();assert.ok((await page.locator('#onlineImportError').textContent()).startsWith('Paste a public'));await page.keyboard.press('Escape');
  await add(spotify);const saved = await page.evaluate(()=>api.library());assert.equal(saved.tracks.length,1);assert.equal(saved.onlineSources.length,1);assert.equal(saved.onlineSources[0].title,'Evening Favorites');const firstId=saved.onlineSources[0].id;
  assert.equal(await page.evaluate(()=>audio.paused),true,'Opening an online player pauses both local decks');assert.equal(await page.evaluate(()=>playback.decks.every(deck=>deck.paused)),true);
  await page.frameLocator('#serviceFrame').locator('#play').click();await page.waitForFunction(()=>document.body.classList.contains('online-active'));
  const fixtureFrame=page.frames().find(frame=>frame.url().startsWith('https://open.spotify.com/embed/'));
  await fixtureFrame.waitForFunction(()=>!document.querySelector('audio').paused && document.querySelector('audio').currentTime>0);
  assert.deepEqual(await fixtureFrame.evaluate(()=>({require:typeof require,luma:typeof window.luma})),{require:'undefined',luma:'undefined'});
  assert.equal(await fixtureFrame.evaluate(()=>{try{return Boolean(parent.luma);}catch{return false;}}),false,'Remote content must not access Luma APIs');
  await page.locator('#search').fill('Evening');assert.equal(await page.locator('#serviceFrame').count(),1);assert.equal(await fixtureFrame.evaluate(()=>document.querySelector('audio').paused),false,'Filtering links must preserve remote playback');
  await page.locator('#clearSearch').click();await page.locator('[data-online-rename]').click();await page.locator('#onlineRename').fill('<img src=x> Любимые');await page.locator('#onlineRenameForm button[type="submit"]').click();assert.equal(await page.locator('.online-card img').count(),0);assert.ok((await page.locator('.online-card-play>b').textContent()).includes('<img src=x>'));
  await page.evaluate(async()=>{await changePreference('language','ru','languageSelect');closeModal();});assert.equal(await page.locator('#onlineIntro h2').textContent(),'Из сервиса — в ваше пространство.');assert.equal(await fixtureFrame.evaluate(()=>document.querySelector('audio').paused),false,'Language changes must preserve remote playback');assert.equal(await page.locator('.service-player-heading h2').textContent(),'<img src=x> Любимые');
  await page.evaluate(async()=>{await changePreference('language','en','languageSelect');closeModal();});assert.equal(await page.locator('#onlineIntro h2').textContent(),'From your service to your space.');
  await page.locator('[data-action="online-stop"]').first().click();assert.equal(await page.locator('#serviceFrame').count(),0);assert.equal(await page.evaluate(()=>audio.paused),true);
  const duplicate = await page.evaluate(url=>api.importService(url+'?si=tracking'),spotify);assert.equal(duplicate.duplicate,true);assert.equal(duplicate.library.onlineSources.length,1);
  await add(cloud);assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,2);assert.equal(await page.locator('#serviceFrame').count(),1);
  await page.evaluate(async id=>{await playTrack(id,[id]);},trackId);assert.equal(await page.locator('#serviceFrame').count(),0);assert.equal(await page.evaluate(()=>audio.paused),false,'Local playback must unload online audio');
  await page.locator('[data-online-play]').first().click();await page.locator('[data-view="library"]').click();assert.equal(await page.locator('#serviceFrame').count(),0,'Leaving Services must unload online audio');assert.equal(await page.evaluate(()=>audio.paused),true);
  await page.evaluate(()=>navigate('services'));await app.evaluate(()=>{global.offlineMetadata=true;});
  await add('https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl','Offline saved link');assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,3);assert.ok((await page.locator('#toast').textContent()).includes('Link saved'));
  await page.locator('[data-action="online-stop"]').first().click();await page.locator('[data-online-remove]').first().click();await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,3);
  await choose(backups);const backup=await page.evaluate(()=>api.createBackup());await page.evaluate(async id=>updateLibrary(await api.removeService(id)),firstId);assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,2);
  await choose(backup.folder);await page.evaluate(async()=>{const result=await api.restoreBackup();applyRestoredLibrary(result.library);});assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,3);
  await page.evaluate(()=>navigate('services'));await page.locator('[data-online-remove]').first().click();await page.locator('#confirmOnlineRemove').click();assert.equal((await page.evaluate(()=>api.library())).onlineSources.length,2);
  await page.screenshot({path:path.join(screenshots,'Luma-services-en.png')});
  await page.evaluate(async()=>{await changePreference('language','ru','languageSelect');closeModal();navigate('home');navigate('services');});assert.equal(await page.locator('#breadcrumb').textContent(),'Сервисы');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.waitForTimeout(200);
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,settings:document.querySelector('#settingsButton').getBoundingClientRect().bottom,edge:document.querySelector('.sidebar').getBoundingClientRect().bottom}));assert.equal(layout.width,layout.viewport);assert.ok(layout.settings<=layout.edge);
  await page.screenshot({path:path.join(screenshots,'Luma-services-ru.png')});
  const requestsBeforeRestart=network.length;await app.close();await launch();assert.equal(network.length,requestsBeforeRestart,'Restart must not auto-load saved players');const restored=await page.evaluate(()=>api.library());assert.equal(restored.onlineSources.length,2);assert.equal(restored.tracks.length,1);assert.equal(restored.onlineSources.find(item=>item.id===firstId).title,'<img src=x> Любимые');assert.equal(await page.locator('#serviceFrame').count(),0);assert.equal(await page.evaluate(()=>audio.paused),true);
  assert.deepEqual(errors,[]);await app.close();console.log(JSON.stringify({passed:true,checks:['strict URL parsing and short-link redirect boundaries','bounded provider metadata, no HTML injection','no service requests on startup','real local and embedded audio handoff using offline provider fixtures','remote frame isolation','search without playback interruption','duplicate links, rename and removal','offline metadata fallback','full backup, restore and restart','English/Russian and minimum-height layout']},null,2));
})().catch(async error=>{console.error(error);if(app)await app.close().catch(()=>{});process.exitCode=1;});
