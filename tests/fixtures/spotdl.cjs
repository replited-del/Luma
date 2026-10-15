// Offline child-process fixture. It generates test tones, never service audio.
const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1];
const mode=process.env.LUMA_FIXTURE_MODE||'success';
const ids=['0000000000000000000001','0000000000000000000002'];
const songs=ids.map((song_id,index)=>({song_id,name:'Test tone '+(index+1),artist:'Luma tests',artists:['Luma tests'],album_name:'Test album',list_name:'Test playlist',url:'https://open.spotify.com/track/'+song_id}));
const tones=require('./tones.cjs').map(base64=>Buffer.from(base64,'base64'));
if(args[0]==='save'){
  if(mode==='metadata-error'){console.error('Spotify metadata unavailable (fixture)');process.exitCode=1;}
  else{fs.writeFileSync(option('--save-file'),JSON.stringify(songs));console.log('Saved 2 songs');}
}else if(mode==='empty'){
  fs.writeFileSync(option('--m3u'),'#EXTM3U\n');console.log('2/2 complete');console.error('AudioProviderError: Source rejected both recordings (fixture)');
}else{
  const folder=process.cwd(),m3u=option('--m3u');
  const first=path.join(folder,ids[0]+'.mp3');fs.writeFileSync(first,tones[0]);fs.writeFileSync(first+'.skip','');console.log('Downloaded "Luma tests - Test tone 1": https://www.youtube.com/watch?v=test');console.log('1/2 complete');
  if(mode==='cancel'){
    fs.writeFileSync(path.join(folder,ids[1]+'.mp3'),Buffer.from('unfinished'));
    setInterval(()=>console.log('Still downloading (fixture)'),100);
  }else setTimeout(()=>{
    const second=path.join(folder,ids[1]+'.mp3');
    if(mode==='partial'){fs.writeFileSync(second,Buffer.from('unfinished'));console.error('AudioProviderError: No matching recording (fixture)');fs.writeFileSync(m3u,'#EXTM3U\n'+first+'\n');}
    else{fs.writeFileSync(second,tones[1]);fs.writeFileSync(second+'.skip','');fs.writeFileSync(m3u,'#EXTM3U\n'+first+'\n'+second+'\n');console.log('2/2 complete');}
  },200);
}
