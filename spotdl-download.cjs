const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {pipeline} = require('node:stream/promises');
const {Readable} = require('node:stream');
const {createGunzip} = require('node:zlib');
const {parse} = require('./ui/services.js');
const {resolveSource} = require('./service-import.cjs');

// Fixed upstream releases. Executables are never accepted from renderer input.
const ASSETS = [
  {name:'spotdl.exe', label:'spotDL 4.5.2', url:'https://github.com/spotDL/spotify-downloader/releases/download/v4.5.2/spotdl-4.5.2-win32.exe', size:45970977, sha256:'4490ae3b38c4321173e17975a9990a130cf9a9aea8132ee2978afecefbeeb477'},
  {name:'ffmpeg.exe', label:'FFmpeg 6.1.1', url:'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz', size:29581307, sha256:'8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77', compression:'gzip', binaryHash:'04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00'},
  {name:'deno.exe', label:'Deno 2.9.7', url:'https://github.com/denoland/deno/releases/download/v2.9.7/deno-x86_64-pc-windows-msvc.zip', size:42630221, sha256:'a0c3101b4158d1dfb7d6a78a7bf0f3de80c96bb423c152beec8beb22786f2238', compression:'zip'}
];
const TERMINAL = new Set(['done','partial','error','cancelled']);
const inside = (root,file) => {const relative=path.relative(root,file);return relative && relative!=='..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative);};
async function hash(file) {const result=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))result.update(chunk);return result.digest('hex');}

async function downloadAsset(asset,file,signal,progress,request=fetch) {
  const response=await request(asset.url,{signal:AbortSignal.any([signal,AbortSignal.timeout(300000)])});
  if(!response.ok || !response.body) throw new Error(`Tool download failed: HTTP ${response.status}`);
  const digest=crypto.createHash('sha256');let received=0;
  try {
    await pipeline(Readable.from((async function*(){
      for await(const chunk of response.body){received+=chunk.length;if(received>asset.size)throw new Error('Tool download size mismatch');digest.update(chunk);progress(received,asset.size);yield chunk;}
    })()),fs.createWriteStream(file,{flags:'wx'}),{signal});
    if(received!==asset.size || digest.digest('hex')!==asset.sha256)throw new Error('Tool download checksum mismatch');
  } catch(error){await fsp.unlink(file).catch(()=>{});throw error;}
}

// Extract one bounded regular file to a fixed destination, never archive paths.
async function extractDeno(archive,destination) {
  const yauzl=require('yauzl');
  const zip=await new Promise((resolve,reject)=>yauzl.open(archive,{lazyEntries:true},(error,value)=>error?reject(error):resolve(value)));
  await new Promise((resolve,reject)=>{
    let found=false;
    const fail=error=>{zip.close();reject(error);};zip.on('error',fail);
    zip.on('entry',entry=>{
      if(entry.fileName!=='deno.exe' || found || entry.uncompressedSize>200*1024*1024 || ((entry.externalFileAttributes>>>16)&0xf000)===0xa000)return fail(new Error('Unexpected Deno archive entry'));
      found=true;
      zip.openReadStream(entry,async(error,stream)=>{
        if(error)return fail(error);
        try{await pipeline(stream,fs.createWriteStream(destination,{flags:'wx'}));zip.readEntry();}catch(cause){fail(cause);}
      });
    });
    zip.on('end',()=>found?resolve():reject(new Error('Deno executable missing')));zip.readEntry();
  });
}

class SpotDL {
  constructor({dataDir,notify,importFiles,request=fetch}) {
    this.root=path.resolve(dataDir);this.notify=notify;this.importFiles=importFiles;this.request=request;this.job=null;this.controller=null;this.child=null;this.pending=null;
  }
  get busy(){return Boolean(this.job && !TERMINAL.has(this.job.phase));}
  snapshot(){return this.job?structuredClone(this.job):null;}
  publish(patch={}){Object.assign(this.job,patch);this.notify(this.snapshot());}
  start(input,name=''){
    if(this.busy)throw new Error('Загрузка уже идёт. Дождитесь завершения.');
    const source=parse(input);
    if(!source || source.provider!=='spotify')throw new Error('Вставьте ссылку на трек, альбом или плейлист Spotify.');
    if(typeof name!=='string' || name.length>100)throw new Error('Введите название');
    this.controller=new AbortController();this.job={id:crypto.randomUUID(),url:source.url,name:name.trim(),phase:'preparing',completed:0,total:0,added:0,duplicate:0,logs:[],message:'',playlistId:null};
    this.publish();
    this.pending=this.execute(source).catch(error=>this.publish({phase:this.controller.signal.aborted?'cancelled':'error',message:error.message}));
    return this.snapshot();
  }
  cancel(){if(this.busy && this.job.phase!=='importing'){this.publish({phase:'cancelling'});this.controller.abort();this.stopChild();}return this.snapshot();}
  stopChild(){
    const child=this.child;if(!child?.pid || child.exitCode!==null)return;
    // Only this job's process tree is stopped, including its own converters.
    if(process.platform==='win32')spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('error',()=>child.kill());
    else child.kill('SIGTERM');
  }
  async prepare(signal){
    if(process.platform!=='win32' || process.arch!=='x64')throw new Error('Загрузка Spotify поддерживается в Windows x64.');
    const directory=path.join(this.root,'tools','spotdl-4.5.2');await fsp.mkdir(directory,{recursive:true});
    for(const asset of ASSETS){
      signal.throwIfAborted();const target=path.join(directory,asset.name),receipt=target+'.sha256';
      try{const expected=asset.binaryHash||(!asset.compression?asset.sha256:await fsp.readFile(receipt,'utf8'));const stat=await fsp.lstat(target);if(stat.isFile()&&!stat.isSymbolicLink()&&expected===await hash(target))continue;}catch{/* Install or repair the pinned tool. */}
      this.publish({phase:'preparing',tool:asset.label,received:0,bytes:asset.size});
      const temporary=await fsp.mkdtemp(path.join(directory,'.setup-'));
      try{
        const archive=path.join(temporary,'download');let last=0;
        await downloadAsset(asset,archive,signal,(received,bytes)=>{if(Date.now()-last>150||received===bytes){last=Date.now();this.publish({received,bytes});}},this.request);
        signal.throwIfAborted();const executable=path.join(temporary,asset.name);
        if(asset.compression==='gzip')await pipeline(fs.createReadStream(archive),createGunzip(),fs.createWriteStream(executable),{signal});
        else if(asset.compression==='zip')await extractDeno(archive,executable);
        else await fsp.rename(archive,executable);
        signal.throwIfAborted();const sum=await hash(executable);if(asset.binaryHash && sum!==asset.binaryHash)throw new Error('Tool executable checksum mismatch');
        await fsp.rename(executable,target);await fsp.writeFile(receipt,sum);
      }finally{if(!inside(directory,temporary))throw new Error('Invalid tool staging directory');await fsp.rm(temporary,{recursive:true,force:true}).catch(()=>{});}
    }
    return {spotdl:path.join(directory,'spotdl.exe'),ffmpeg:path.join(directory,'ffmpeg.exe'),directory};
  }
  launch(executable,args,options){return spawn(executable,args,options);}
  async run(runtime,args,folder,signal){
    signal.throwIfAborted();
    const home=path.join(this.root,'spotify-home');await fsp.mkdir(path.join(home,'.spotdl'),{recursive:true});
    await fsp.writeFile(path.join(home,'.spotdl','config.json'),JSON.stringify({load_config:false}));
    const env={...process.env,USERPROFILE:home,PYTHONIOENCODING:'utf-8',PYTHONUNBUFFERED:'1',NO_COLOR:'1'};
    for(const key of Object.keys(env))if(key.toUpperCase()==='PATH')delete env[key];env.PATH=runtime.directory+path.delimiter+(process.env.PATH||process.env.Path||'');
    signal.throwIfAborted();
    const child=this.launch(runtime.spotdl,args,{cwd:folder,env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});this.child=child;
    const abort=()=>this.stopChild();signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();
    const log=fs.createWriteStream(path.join(folder,'download.log'),{flags:'a'});log.on('error',()=>{});
    let pending='',lastPublish=0,timedOut=false,logBytes=0;
    const timeout=setTimeout(()=>{timedOut=true;this.stopChild();},args[0]==='save'?180000:3600000);timeout.unref();
    const line=value=>{
      value=value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g,'').replace(/[\u0000-\u0008\u000b-\u001f]/g,'').trim().slice(0,1000);if(!value)return;
      this.job.logs.push(value);this.job.logs=this.job.logs.slice(-35);
      const progress=value.match(/(\d+)\/(\d+) complete/);if(progress){this.job.completed=Number(progress[1]);this.job.total=Number(progress[2]);}
      if(Date.now()-lastPublish>150){lastPublish=Date.now();this.publish();}
    };
    const onData=data=>{if(logBytes<16*1024*1024){log.write(data);logBytes+=data.length;}pending+=data.toString('utf8');const lines=pending.split(/[\r\n]+/);pending=lines.pop().slice(-4000);for(const value of lines)line(value);};
    child.stdout.on('data',onData);child.stderr.on('data',onData);
    try{return await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{line(pending);timedOut?reject(new Error('Сервис не ответил вовремя. Попробуйте ещё раз.')):resolve(code);});});}
    finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);log.end();this.child=null;}
  }
  async execute(source){
    const signal=this.controller.signal;
    source=await resolveSource(source.url,this.request);signal.throwIfAborted();this.job.url=source.url;
    const runtime=await this.prepare(signal);signal.throwIfAborted();
    const folder=path.join(this.root,'downloads',this.job.id);await fsp.mkdir(folder,{recursive:true});this.job.folder=folder;
    const manifest=path.join(folder,'tracks.spotdl'),m3u=path.join(folder,'complete.m3u8');
    this.publish({phase:'metadata',tool:null,received:0,bytes:0});
    const common=['--ffmpeg',runtime.ffmpeg,'--headless','--max-retries','2','--simple-tui','--log-format','%(message)s'];
    const metadataCode=await this.run(runtime,['save',source.url,'--save-file',manifest,...common],folder,signal);
    signal.throwIfAborted();if(metadataCode!==0)throw new Error('Не удалось получить список Spotify. Подробности ниже.');
    const stat=await fsp.stat(manifest);if(stat.size>32*1024*1024)throw new Error('Слишком большой список треков.');
    const songs=JSON.parse(await fsp.readFile(manifest,'utf8'));
    if(!Array.isArray(songs)||!songs.length||songs.length>10000||songs.some(song=>!song||!/^[A-Za-z0-9]{22}$/.test(song.song_id)))throw new Error('Spotify не вернул доступных треков.');
    this.publish({phase:'downloading',total:songs.length,name:this.job.name||String(songs[0].list_name||songs[0].album_name||songs[0].name||'Spotify').slice(0,100)});
    let code;
    try{code=await this.run(runtime,['download',manifest,...common,'--output',path.join(folder,'{track-id}.{output-ext}'),'--format','mp3','--bitrate','auto','--threads','2','--audio','youtube-music','youtube','--lyrics','--overwrite','skip','--restrict','ascii','--m3u',m3u,'--create-skip-file','--save-errors',path.join(folder,'errors.txt'),'--print-errors','--yt-dlp-args','--socket-timeout 30 --retries 2 --fragment-retries 2'],folder,signal);}
    catch(error){code=-1;if(!signal.aborted)this.job.message=error.message;}
    let completed;
    try{const stat=await fsp.stat(m3u);if(stat.size>4*1024*1024)throw new Error('Playlist output too large');completed=new Set((await fsp.readFile(m3u,'utf8')).split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(file=>path.basename(file.trim())));}catch{completed=null;}
    const files=[];
    for(const song of songs){
      const name=song.song_id+'.mp3',file=path.join(folder,name);
      try{const stat=await fsp.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||!stat.size)continue;
        if(completed ? !completed.has(name) : !fs.existsSync(file+'.skip'))continue;files.push(file);
      }catch{/* An unmatched or unfinished song is not imported. */}
    }
    if(files.length){
      this.publish({phase:'importing',completed:files.length});
      const result=await this.importFiles([...new Set(files)],this.snapshot());
      this.publish({added:result.added,duplicate:result.duplicate,playlistId:result.playlistId||null});
      if(result.failed)this.job.importFailed=result.failed;
    }
    const failed=Math.max(0,songs.length-files.length)+(this.job.importFailed||0);
    this.publish({phase:signal.aborted?'cancelled':failed||code!==0?(files.length?'partial':'error'):'done',completed:files.length,failed,message:this.job.message||(!files.length&&!signal.aborted?'Не удалось скачать треки. Подробности ниже.':'')});
  }
}
module.exports={SpotDL,ASSETS,downloadAsset,extractDeno};
