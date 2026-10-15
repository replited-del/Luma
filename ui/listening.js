class ListeningLyrics {
  constructor(text) { this.text=text;this.node=null;this.source=null;this.offset=0;this.active=-1;this.scrolled=-1;this.manualUntil=0; }
  select(track, node) {
    if (!node) { this.node=null;return; }
    const changed = this.node !== node || this.source !== track.lyrics;
    this.offset = track.lyricsOffset || 0;
    if (!changed) return;
    this.node=node;this.source=track.lyrics;this.active=-1;this.scrolled=-1;this.manualUntil=0;
    this.parsed=LumaLyrics.parse(track.lyrics || '');
    node.replaceChildren();
    if (!this.parsed.lines.length) {
      const empty=document.createElement('div');empty.className='lyrics-empty';
      const title=document.createElement('h3');title.textContent=this.text('Поймайте каждое слово');
      const note=document.createElement('p');note.textContent=this.text('Загрузите LRC для синхронизации или TXT для обычного текста. Всё останется на вашем ПК.');
      const button=document.createElement('button');button.className='secondary-button';button.dataset.action='lyrics-import';button.textContent=this.text('Загрузить текст');
      empty.append(title,note,button);node.append(empty);
    } else {
      const fragment=document.createDocumentFragment();
      for (const [i,line] of this.parsed.lines.entries()) {
        const row=document.createElement(this.parsed.synced?'button':'p');row.className='lyric-line';
        if (this.parsed.synced) { row.type='button';row.dataset.lyricIndex=i;row.title=this.text('Нажмите на строку, чтобы перемотать'); }
        if (line.words.length) for (const word of line.words) { const span=document.createElement('span');span.className='lyric-word';span.textContent=word.text;row.append(span); }
        else row.textContent=line.text || '· · ·';
        fragment.append(row);
      }
      node.append(fragment);
    }
    node.classList.toggle('lyrics-unsynced',!this.parsed.synced);
    node.onwheel=()=>{this.manualUntil=Date.now()+6000;};
    node.onpointerdown=()=>{this.manualUntil=Date.now()+6000;};
  }
  update(position, duration, reducedMotion) {
    if (!this.node?.isConnected || !this.parsed.synced) return;
    const time=position-this.offset;
    const index=LumaLyrics.activeIndex(this.parsed.lines,time);
    if (index !== this.active) {
      const previous=this.node.children[this.active];
      if (previous) { previous.classList.remove('active');previous.removeAttribute('aria-current');previous.querySelectorAll('.lyric-word').forEach(span=>span.style.removeProperty('--word-fill')); }
      this.active=index;
      const current=this.node.children[index];
      if (current) { current.classList.add('active');current.setAttribute('aria-current','true'); }
    }
    const row=this.node.children[index], line=this.parsed.lines[index];
    if (row && line) {
      const spans=row.querySelectorAll('.lyric-word');
      for (const [i,word] of line.words.entries()) {
        const end=line.words[i+1]?.time ?? this.parsed.lines[index+1]?.time ?? duration-this.offset;
        const fill=end > word.time ? Math.max(0,Math.min(1,(time-word.time)/(end-word.time))) : Number(time>=word.time);
        spans[i].style.setProperty('--word-fill',`${fill*100}%`);
      }
      if (this.scrolled !== index && Date.now() >= this.manualUntil) {
        this.scrolled=index;
        this.node.scrollTo({top:row.offsetTop-(this.node.clientHeight-row.offsetHeight)/2,behavior:reducedMotion?'instant':'smooth'});
      }
    }
  }
  follow() { this.manualUntil=0;this.scrolled=-1; }
}
