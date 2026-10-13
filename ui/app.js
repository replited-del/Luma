const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const api = window.luma;
function uiText(text) { return LumaI18n.translate(text, db.settings.language || 'ru'); }
function uiHTML(parts, ...values) { return parts.reduce((text, part, i) => text + uiText(part) + (i < values.length ? values[i] : ''), ''); }
function applyStaticLanguage() {
  document.documentElement.lang = db.settings.language || 'ru';
  document.title = `Luma — ${uiText('ваша музыка')}`;
  $$('[data-i18n]').forEach(el => el.textContent = uiText(el.dataset.i18n));
  for(const [key, attribute] of [['i18nAria','aria-label'], ['i18nTitle','title'], ['i18nPlaceholder','placeholder']]) {
    $$(`[data-${key.replace(/[A-Z]/g, letter => '-'+letter.toLowerCase())}]`).forEach(el => el.setAttribute(attribute, uiText(el.dataset[key])));
  }
  for(const [id, label] of Object.entries({shuffle:'Перемешать',previous:'Предыдущий трек',next:'Следующий трек',repeat:'Повтор',seek:'Позиция воспроизведения',eqButton:'Эквалайзер',queueButton:'Очередь',volume:'Громкость'})) {
    $('#'+id).setAttribute('aria-label', uiText(label));
    if (['shuffle','eqButton','queueButton'].includes(id)) $('#'+id).title = uiText(label);
  }
  updateWindowControls();
}
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  album: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  settings: '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>',
  next: '<path d="m5 5 11 7-11 7Z"/><path d="M19 5v14"/>',
  previous: '<path d="m19 5-11 7 11 7Z"/><path d="M5 5v14"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3M18 15l3 3-3 3M3 18h3c2 0 4-3 6-6s4-6 6-6h3M18 3l3 3-3 3"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3"/>',
  volume: '<path d="M11 4 6 8H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 4 6 8H3v8h3l5 4ZM16 9l5 6M21 9l-5 6"/>',
  sliders: '<path d="M5 3v7m0 4v7M12 3v12m0 4v2M19 3v3m0 4v11M2 10h6M9 15h6M16 6h6"/>',
  queue: '<path d="M3 5h18M3 10h18M3 15h10M3 20h10m4-5 5 3-5 3Z"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14Z"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M6 12a6 6 0 0 1 6-6m6 6a6 6 0 0 1-6 6"/>'
};
const icon = name => uiHTML`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.music}</svg>`;
const hydrateIcons = (root = document) => $$('[data-icon]', root).forEach(el => el.innerHTML = icon(el.dataset.icon));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const time = seconds => { if (!Number.isFinite(seconds)) return '0:00'; const s = Math.max(0, Math.floor(seconds)); return uiHTML`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const count = n => db.settings.language === 'en' ? `${n} ${n===1?'track':'tracks'}` : `${n} ${n%10===1 && n%100!==11 ? 'трек' : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 'трека' : 'треков'}`;
const totalTime = tracks => { const min = Math.round(tracks.reduce((sum,t) => sum+t.duration,0)/60); const en=db.settings.language==='en'; return min >= 60 ? `${Math.floor(min/60)} ${en?'h':'ч'} ${min%60} ${en?'min':'мин'}` : `${min} ${en?'min':'мин'}`; };
const tone = t => parseInt(t?.id?.slice(0,4) || '0',16)%6;
const art = (t, extra = '') => uiHTML`<div class="artwork tone-${tone(t)} ${extra}">${t?.cover ? uiHTML`<img src="${esc(t.cover)}" alt="" loading="lazy">` : uiHTML`<span class="art-lines"></span>${icon('music')}`}</div>`;
let db = { tracks: [], playlists: [], settings: {}, recent: [] }, view = 'home', viewId = '', search = '', sort = 'added', filter = 'all';
let currentId = null, queue = [], history = [], visibleTracks = [], lastVolume = .7, toastTimer, settingsTimer, context, source, filters = [], modalPreviousFocus;
let maximized = false;
const navigationHistory = [];
const artistLabel = track => track?.artist === 'Неизвестный исполнитель' ? uiText('Неизвестный исполнитель') : track?.artist || '';
const albumLabel = track => track?.album === 'Без альбома' ? uiText('Без альбома') : track?.album || '';
const audio = $('#audio');
const visualizer = new AudioVisualizer();
const trackById = id => db.tracks.find(t => t.id === id);
const current = () => trackById(currentId);
const readList = ids => ids.map(trackById).filter(Boolean);
function shuffled(ids, first) { const rest=ids.filter(id=>id!==first); for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}return first?[first,...rest]:rest; }
function toast(message, persistent = false) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; if (!persistent) toastTimer = setTimeout(() => $('#toast').hidden = true, 4200); }
function updateWindowControls() {
  const button = $('#windowsMaximize');
  button.innerHTML = maximized ? '<svg viewBox="0 0 16 16"><path d="M5.5 3.5h7v7M3.5 5.5h7v7h-7Z"/></svg>' : '<svg viewBox="0 0 16 16"><rect x="3.5" y="3.5" width="9" height="9"/></svg>';
  button.setAttribute('aria-label', uiText(maximized?'Восстановить окно':'Развернуть'));
  button.title = button.getAttribute('aria-label');
}
function applySettings() {
  document.body.classList.toggle('theme-windows', db.settings.interfaceStyle !== 'macos');
  applyStaticLanguage();
  visualizer.configure(db.settings.visualizerEnabled !== false, Boolean(db.settings.reducedMotion));
  document.body.classList.toggle('compact', Boolean(db.settings.compact)); document.body.classList.toggle('reduced-motion', Boolean(db.settings.reducedMotion)); audio.volume = db.settings.volume ?? .7; $('#volume').value = audio.volume; setFill($('#volume')); $('#shuffle').classList.toggle('active', Boolean(db.settings.shuffle)); $('#repeat').classList.toggle('active', db.settings.repeat !== 'off'); $('#repeat').title = ({ off:uiText('Повтор выключен'), all:uiText('Повтор очереди'), one:uiText('Повтор трека') })[db.settings.repeat]; $('#repeat').innerHTML = icon('repeat') + (db.settings.repeat==='one' ? '<sup style="font-size:8px;position:absolute;margin-left:22px">1</sup>' : ''); $('#mute').innerHTML = icon(audio.volume === 0 ? 'muted':'volume'); $('#mute').setAttribute('aria-label', uiText(audio.volume===0?'Включить звук':'Выключить звук')); $('#eqButton').classList.toggle('active', Boolean(db.settings.eqEnabled)); applyEq();
}
function saveSettings(change) { db.settings = { ...db.settings, ...change }; applySettings(); clearTimeout(settingsTimer); settingsTimer = setTimeout(() => api.settings(db.settings).catch(() => toast(uiText('Не удалось сохранить настройки'))), 180); }
function setFill(input) { const ratio = (Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min)); input.style.setProperty('--fill', uiHTML`${ratio*100}%`); }
// Library actions can finish before a debounced preference write reaches main.
function updateLibrary(data) { db = { ...data, settings: { ...data.settings, ...db.settings } }; queue = queue.filter(id => trackById(id)); if (currentId && !current()) { audio.pause(); audio.removeAttribute('src'); audio.load(); currentId = null; } renderNav(); render(); updatePlayer(); if (!$('#queuePanel').hidden) renderQueue(); }
function renderNav() {
  $('#trackCount').textContent = db.tracks.length;
  $('#playlistNav').innerHTML = db.playlists.length ? db.playlists.map(p => uiHTML`<button class="nav-item ${view==='playlist' && viewId===p.id?'active':''}" data-playlist="${p.id}">${icon('queue')}<span>${esc(p.name)}</span></button>`).join('') : uiText('<div class="playlist-placeholder">Соберите музыку<br>под своё настроение</div>');
  $$('#navigation .nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
}
function navigate(next, id = '') {
  if(next!==view || id!==viewId || search) navigationHistory.push({view,viewId,search,filter,sort,scroll:$('#content').scrollTop});
  view = next; viewId = id; search = ''; $('#search').value = ''; filter = 'all'; renderNav(); render(); $('#content').scrollTop = 0;
}
function goBack() {
  if(search) { search=''; $('#search').value=''; render(); return; }
  const previous=navigationHistory.pop(); if(!previous)return;
  ({view,viewId,search,filter,sort}=previous);$('#search').value=search;renderNav();render();$('#content').scrollTop=previous.scroll;
}
function quickActions() { return uiHTML`<div class="quick-actions"><button data-action="import-files">${icon('plus')}Добавить файлы</button><button data-action="import-folder">${icon('folder')}Добавить папку</button><button data-action="create-playlist">${icon('queue')}Создать плейлист</button><button data-view="favorites">${icon('heart')}Любимые</button></div>`; }
function cards(tracks, isAlbum = false) {
  return uiHTML`<div class="${isAlbum?'album-grid':'cards'}">${tracks.map(t => uiHTML`<button class="music-card" data-${isAlbum?'album':'play'}="${esc(isAlbum ? albumKey(t) : t.id)}">${art(t)}<span class="card-title">${esc(isAlbum?albumLabel(t):t.title)}</span><span class="card-subtitle">${esc(artistLabel(t))}</span></button>`).join('')}</div>`;
}
function trackRows(tracks) {
  visibleTracks = tracks;
  return uiHTML`<div class="track-table"><div class="track-head"><span>#</span><span>НАЗВАНИЕ</span><span>АЛЬБОМ</span><span style="text-align:right">ВРЕМЯ</span><span></span><span></span></div>${tracks.map((t,i) => uiHTML`<div class="track-row ${t.id===currentId?'current':''}" data-track="${t.id}" tabindex="0" role="button" aria-label="Воспроизвести ${esc(t.title)}"><div class="track-number"><span class="number-label">${t.id===currentId ? '<span class="equalizer-bars"><i></i><i></i><i></i></span>':i+1}</span><button class="row-play" data-play="${t.id}" aria-label="Воспроизвести">${icon('play')}</button></div><div class="track-cell">${art(t,'track-art')}<div class="track-meta"><span class="track-title">${esc(t.title)}</span><span class="track-artist">${esc(artistLabel(t))}</span></div></div><span class="track-album">${esc(albumLabel(t))}</span><span class="track-length">${time(t.duration)}</span><button class="icon-button heart-button ${t.favorite?'active':''}" data-favorite="${t.id}" aria-label="${t.favorite?uiText('Убрать из любимых'):uiText('В любимые')}">${icon('heart')}</button><button class="icon-button more-button" data-menu="${t.id}" aria-label="Действия с треком">${icon('more')}</button></div>`).join('')}</div>`;
}
function empty(title, text, glyph='music', action='import') { return uiHTML`<div class="empty-large">${icon(glyph)}<h2>${title}</h2><p>${text}</p>${action==='import'?uiHTML`<button class="primary-button" data-action="import">${icon('plus')}Добавить музыку</button>`:action==='library'?uiText('<button class="secondary-button" data-view="library">Открыть библиотеку</button>'):uiHTML`<button class="primary-button" data-action="playlist-add">${icon('plus')}Выбрать треки</button>`}</div>`; }
function home() {
  const loaded = db.tracks.length > 0, recent = readList(db.recent).slice(0,5), latest = [...db.tracks].sort((a,b)=>b.addedAt-a.addedAt).slice(0,6);
  const hour = new Date().getHours(), greeting = hour<6?uiText('Музыка этой ночи'):hour<12?uiText('Доброе утро'):hour<18?uiText('Хорошего дня'):uiText('Добрый вечер');
  return uiHTML`<div class="page-heading"><div><div class="eyebrow"><span class="status-dot"></span>МУЗЫКА РЯДОМ</div><h1>${greeting}<span style="color:var(--accent)">.</span></h1></div><span class="heading-note">Ваш маленький музыкальный мир</span></div>
  <section class="hero"><div class="hero-content"><div class="eyebrow">${loaded?uiText('ТОЛЬКО ВАША КОЛЛЕКЦИЯ'):uiText('НАЧНИТЕ С ЛЮБИМОГО')}</div><h2>${loaded?uiText('Всё, что звучит<br>как вы.'):uiText('Ваша музыка.<br>Без лишнего.')}</h2><p>${loaded?uiHTML`${count(db.tracks.length)} в одном месте. Нажмите play —<br>и пусть остальной мир подождёт.`:uiText('Перенесите сюда любимые треки.<br>Остальное мы уже настроили для вас.')}</p><div class="hero-actions"><button class="primary-button" data-action="${loaded?'play-all':'import'}">${icon(loaded?'play':'plus')}${loaded?uiText('Слушать музыку'):uiText('Добавить музыку')}</button><button class="secondary-button" data-action="${loaded?'shuffle-all':'import-folder'}">${loaded?uiText('Перемешать'):uiText('Выбрать папку')}</button></div></div><div class="hero-art"><div class="orbit"></div><div class="vinyl"><div class="vinyl-center"></div></div></div><span class="hero-stats">${loaded?uiHTML`${count(db.tracks.length).toUpperCase()} · ${totalTime(db.tracks).toUpperCase()}`:'OFFLINE. ALWAYS YOURS.'}</span></section>
  ${recent.length?uiHTML`<section><div class="section-heading"><h2>Недавно звучало</h2><button data-action="recent">Вся история ${icon('arrow')}</button></div>${cards(recent)}</section>`:''}
  ${loaded?uiHTML`<section><div class="section-heading"><h2>В вашей коллекции</h2><button data-view="library">Все треки ${icon('arrow')}</button></div>${trackRows(latest)}</section>`:uiHTML`<section><div class="section-heading"><h2>Под любой момент</h2><span class="heading-note">Создайте свой первый плейлист</span></div><div class="empty-cards">${[['moon',uiText('Тихий вечер'),uiText('Когда хочется замедлиться')],['heart',uiText('Самое любимое'),uiText('Треки, к которым возвращаетесь')],['disc',uiText('В своём ритме'),uiText('Для дел и хороших идей')],['music',uiText('В дороге'),uiText('Ваш личный саундтрек')]].map(([glyph,title,sub])=>uiHTML`<button class="starter-card" data-new-playlist="${title}">${icon(glyph)}<b>${title}</b><small>${sub}</small></button>`).join('')}</div><div class="section-heading mini-heading"><h2>Ваша коллекция</h2><span class="heading-note">Пока здесь тихо</span></div><div class="empty-table">Перетащите сюда музыку или <button data-action="import">выберите файлы</button>.<br><span style="font-size:10px;color:#606371">MP3, FLAC, WAV, M4A, AAC, OGG, OPUS, WEBM</span></div></section>`}`;
}
const albumKey = t => JSON.stringify([t.album,t.artist]);
function getVisibleTracks() {
  let tracks = search?[...db.tracks]:view==='favorites'?db.tracks.filter(t=>t.favorite):view==='playlist'?readList(db.playlists.find(p=>p.id===viewId)?.tracks || []):view==='album'?db.tracks.filter(t=>albumKey(t)===viewId):view==='recent'?readList(db.recent):[...db.tracks];
  if (search) { const term = search.toLocaleLowerCase(); tracks = tracks.filter(t=>uiHTML`${t.title} ${t.artist} ${t.album}`.toLocaleLowerCase().includes(term)); }
  if (filter==='favorites') tracks = tracks.filter(t=>t.favorite);
  if (filter==='lossless') tracks = tracks.filter(t=>['FLAC','WAV'].includes(t.format));
  if (view!=='playlist' && view!=='recent' && view!=='album') tracks.sort(sort==='title'?(a,b)=>a.title.localeCompare(b.title,db.settings.language || 'ru'):sort==='artist'?(a,b)=>a.artist.localeCompare(b.artist,db.settings.language || 'ru'):(a,b)=>b.addedAt-a.addedAt);
  if (view==='album') tracks.sort((a,b)=>a.trackNumber-b.trackNumber);
  return tracks;
}
function render() {
  $('#clearSearch').hidden = !search;
  $('#backButton').disabled = !search && !navigationHistory.length;
  let title = ({home:uiText('Главная'),library:uiText('Все треки'),albums:uiText('Альбомы'),favorites:uiText('Любимые'),playlist:db.playlists.find(p=>p.id===viewId)?.name || uiText('Плейлист'),album:uiText('Альбом'),recent:uiText('Недавно звучало')})[view];
  $('#breadcrumb').textContent = search?uiText('Поиск'):title;
  if (!search && view==='home') { $('#content').innerHTML = home(); $('.hero').insertAdjacentHTML('afterend',quickActions()); return; }
  let tracks = getVisibleTracks();
  if (search) { title = uiHTML`Результаты поиска`; }
  if (view==='albums' && !search) {
    const albums = [...new Map(db.tracks.map(t=>[albumKey(t),t])).values()];
    $('#content').innerHTML = uiHTML`<div class="page-heading"><div><div class="eyebrow">ВАША БИБЛИОТЕКА</div><h1>Альбомы</h1></div><span class="heading-note">${albums.length} в коллекции</span></div>${albums.length?cards(albums,true):empty(uiText('Каждый альбом — целая история'),uiText('Добавьте музыку, и альбомы появятся здесь автоматически.'),'album')}`;
    return;
  }
  let heading = uiHTML`<div class="page-heading"><div><div class="eyebrow">${search?uiText('НАЙДЁТСЯ ТОТ САМЫЙ ТРЕК'):uiText('ВАША БИБЛИОТЕКА')}</div><h1>${esc(title)}</h1></div><span class="heading-note">${count(tracks.length)} · ${totalTime(tracks)}</span></div>`;
  if ((view==='playlist'||view==='album') && !search) {
    const p = db.playlists.find(p=>p.id===viewId), first = tracks[0];
    heading = uiHTML`<div class="playlist-hero">${art(first,'playlist-cover')}<div><div class="eyebrow">${view==='album'?uiText('АЛЬБОМ'):uiText('ВАШ ПЛЕЙЛИСТ')}</div><h1>${esc(view==='album'?albumLabel(first) || uiText('Альбом'):p?.name || '')}</h1><p>${view==='album'?uiHTML`${esc(artistLabel(first))} · `:''}${count(tracks.length)} · ${totalTime(tracks)}</p><div class="playlist-actions"><button class="primary-button" data-action="play-view" ${!tracks.length?'disabled':''}>${icon('play')}Слушать</button>${view==='playlist'?uiHTML`<button class="secondary-button" data-action="playlist-add">Добавить треки</button><button class="icon-button" data-action="playlist-rename" aria-label="Переименовать">${icon('edit')}</button><button class="icon-button" data-action="playlist-delete" aria-label="Удалить плейлист">${icon('trash')}</button>`:''}</div></div></div>`;
  }
  const toolbar = (view==='library'||search)?uiHTML`<div class="library-toolbar"><button class="primary-button library-listen" data-action="play-view" ${tracks.length?'':'disabled'}>${icon('play')}Слушать</button><button class="icon-button" data-action="shuffle-view" title="Перемешать" aria-label="Перемешать" ${tracks.length?'':'disabled'}>${icon('shuffle')}</button><button class="filter-chip ${filter==='all'?'active':''}" data-filter="all">Все</button><button class="filter-chip ${filter==='favorites'?'active':''}" data-filter="favorites">Любимые</button><button class="filter-chip ${filter==='lossless'?'active':''}" data-filter="lossless">Lossless</button><select id="sort" class="sort-select" aria-label="Сортировка"><option value="added" ${sort==='added'?'selected':''}>Сначала новые</option><option value="title" ${sort==='title'?'selected':''}>По названию</option><option value="artist" ${sort==='artist'?'selected':''}>По исполнителю</option></select></div>`:'';
  $('#content').innerHTML = heading + toolbar + (tracks.length?trackRows(tracks):search?'<div class="empty-large">'+icon('search')+uiText('<h2>Пока ничего не нашлось</h2><p>Попробуйте другое название, исполнителя или альбом.</p></div>'):view==='favorites'?empty(uiText('Самое любимое — здесь'),uiText('Нажмите на сердечко рядом с треком, чтобы добавить его в любимые.'),'heart','library'):view==='playlist'?empty(uiText('У этого плейлиста всё впереди'),uiText('Выберите музыку из вашей библиотеки.'),'queue','playlist'):db.tracks.length?uiText('<div class="empty-large"><h2>Таких треков пока нет</h2><p>Попробуйте другой фильтр.</p></div>'):empty(uiText('Начнём вашу коллекцию'),uiText('Добавьте любимую музыку с компьютера. Мы прочитаем обложки и аккуратно разложим альбомы.')));
}
function createAudioGraph() {
  if (context) return;
  context = new AudioContext();
  source = context.createMediaElementSource(audio);
  const frequencies = [31,62,125,250,500,1000,2000,4000,8000,16000];
  filters = frequencies.map((frequency,i)=>{ const f = context.createBiquadFilter(); f.type = i===0?'lowshelf':i===9?'highshelf':'peaking'; f.frequency.value = frequency; f.Q.value = 1; return f; });
  let previous = source; filters.forEach(f=>{ previous.connect(f); previous=f; }); visualizer.attach(context, previous); applyEq();
}
function applyEq() { filters.forEach((f,i)=>f.gain.setTargetAtTime(db.settings.eqEnabled?(db.settings.eq?.[i] || 0):0,context.currentTime,.03)); }
async function playTrack(id, ids, record = true) {
  const t = trackById(id); if (!t) return;
  if (ids?.length) { queue = ids.filter(id=>trackById(id)); if(db.settings.shuffle)queue=shuffled(queue,id); }
  if (!queue.includes(id)) queue.push(id);
  if (currentId && record && currentId!==id) history.push(currentId);
  currentId = id;
  audio.src = t.src;
  $('#elapsed').textContent = '0:00'; $('#seek').value = 0; setFill($('#seek'));
  updatePlayer();
  try { createAudioGraph(); await context.resume(); await audio.play(); await api.played(id); db.recent = [id,...db.recent.filter(i=>i!==id)]; db.lastTrack = id; }
  catch { toast(uiText('Не удалось воспроизвести этот файл. Проверьте формат и добавьте его заново.')); }
  render(); if (!$('#queuePanel').hidden) renderQueue();
}
async function togglePlay() {
  if (!current()) { if (db.tracks.length) playTrack(db.tracks[0].id,db.tracks.map(t=>t.id)); else showImport(); return; }
  try { if (audio.paused) { createAudioGraph(); await context.resume(); await audio.play(); } else audio.pause(); } catch { toast(uiText('Не удалось начать воспроизведение')); }
}
function nextTrack(automatic = false) {
  if (!queue.length) return;
  if (automatic && db.settings.repeat==='one') { audio.currentTime=0; audio.play().catch(()=>{}); return; }
  const index = queue.indexOf(currentId);
  let next;
  if (index+1<queue.length) next=queue[index+1];
  else if (!automatic || db.settings.repeat==='all') next=queue[0];
  if (next) playTrack(next); else updatePlayer();
}
function previousTrack() { if (audio.currentTime>3) { audio.currentTime=0; return; } const previous=history.pop(); if(previous) playTrack(previous,null,false); else { const i=queue.indexOf(currentId); if(queue.length) playTrack(queue[Math.max(0,i-1)],null,false); } }
function updatePlayer() {
  const t = current(), playing = Boolean(t && !audio.paused && !audio.ended);
  $('#nowTitle').textContent = t?.title || uiText('Выберите свой первый трек'); $('#nowArtist').textContent = artistLabel(t) || uiText('Музыка начинается с вас');
  $('#nowCover').className = uiHTML`player-art artwork tone-${tone(t)}`; $('#nowCover').innerHTML = t?.cover?uiHTML`<img src="${esc(t.cover)}" alt="">`:icon('music');
  $('#playerFavorite').classList.toggle('active', Boolean(t?.favorite)); $('#playerFavorite').disabled = !t;
  $('#play').innerHTML = icon(playing?'pause':'play'); $('#play').setAttribute('aria-label',playing?uiText('Пауза'):uiText('Воспроизвести'));
  $('#duration').textContent = time(t?.duration || audio.duration || 0); $('#quality').textContent = t?.format || 'LOCAL';
  document.body.classList.toggle('playing',playing); document.body.classList.toggle('paused',!playing);
  visualizer.setPlaying(playing);
  if (t && 'mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title:t.title, artist:t.artist, album:t.album });
  $$('.track-row').forEach(row=>row.classList.toggle('current',row.dataset.track===currentId));
  const expandedPlayer = $('.now-playing');
  if (expandedPlayer && !t) closeModal();
  else if (expandedPlayer && expandedPlayer.dataset.currentTrack !== t.id) {
    expandedPlayer.outerHTML = nowPlayingContent(t);
    visualizer.refreshTargets();
  } else expandedPlayer?.classList.toggle('paused',!playing);
}
function renderQueue() {
  $('#queuePanel').innerHTML = uiHTML`<div class="modal-header"><h2>Очередь</h2><button class="icon-button" data-action="queue-close" aria-label="Закрыть очередь">${icon('close')}</button></div><p style="font-size:10px">${count(queue.length)}${db.settings.shuffle?uiText(' · В случайном порядке'):''}</p>${queue.length?readList(queue).map(t=>uiHTML`<button class="queue-item ${t.id===currentId?'current':''}" data-queue-play="${t.id}">${art(t,'track-art')}<span class="track-meta"><span class="track-title">${esc(t.title)}</span><span class="track-artist">${esc(artistLabel(t))}</span></span><span class="track-length">${time(t.duration)}</span></button>`).join(''):uiText('<p style="font-size:12px">Включите трек — и очередь появится здесь.</p>')}`;
}
function closeModal() { $('#modalRoot').innerHTML = ''; visualizer.refreshTargets(); modalPreviousFocus?.focus(); }
function modal(title, body, wide = false) {
  closeMenu(); modalPreviousFocus = document.activeElement;
  $('#modalRoot').innerHTML = uiHTML`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${title}</h2><button class="icon-button" data-action="modal-close" aria-label="Закрыть">${icon('close')}</button></div>${body}</section></div>`;
  visualizer.refreshTargets();
  setTimeout(()=>($('.modal input[type=text]')||$('.modal button'))?.focus(),0);
}
function showImport() { modal(uiText('Новая музыка — новый момент'),uiHTML`<p>Добавьте файлы или целую папку.<br>Оригиналы останутся на своих местах.</p><div class="import-options"><button class="import-option" data-action="import-files">${icon('music')}<b>Выбрать файлы</b><small>Один трек или сразу несколько</small></button><button class="import-option" data-action="import-folder">${icon('folder')}<b>Добавить папку</b><small>Включая все вложенные папки</small></button></div><p class="import-foot">MP3 · FLAC · WAV · M4A · AAC · OGG · OPUS · WEBM<br>Без загрузки в облако. Без подписки. Без рекламы.</p>`); }
async function doImport(folder, files) {
  closeModal();
  try { const result = files?await api.importDrop(Array.from(files)):await api.importDialog(folder); if(!result) return; updateLibrary(result.library); toast(result.total===0?uiText('В папке не найдено поддерживаемой музыки'):uiHTML`Добавлено: ${result.added}${result.duplicate?uiHTML` · Уже в библиотеке: ${result.duplicate}`:''}${result.failed?uiHTML` · Не прочитано: ${result.failed}`:''}`); }
  catch(e) { toast(uiText(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''))); }
}
function playlistModal(name = '', rename = false) { modal(rename?uiText('Переименовать плейлист'):uiText('Создать плейлист'),uiHTML`<p>Дайте название своему настроению.</p><form id="playlistForm"><input type="text" id="playlistName" maxlength="100" placeholder="Например, Ночные прогулки" value="${esc(name)}" required><div class="modal-actions"><button type="button" class="secondary-button" data-action="modal-close">Отмена</button><button type="submit" class="primary-button">${rename?uiText('Сохранить'):uiText('Создать плейлист')}</button></div></form>`); $('#playlistForm').onsubmit = async e=>{ e.preventDefault(); const name=$('#playlistName').value.trim(); if(!name)return; const data=rename?await api.updatePlaylist(viewId,{name}):await api.createPlaylist(name); closeModal(); updateLibrary(data); if(!rename) navigate('playlist',data.playlists.at(-1).id); }; }
function addToPlaylist() {
  const p = db.playlists.find(p=>p.id===viewId); if(!p)return;
  if(!db.tracks.length) { showImport(); return; }
  modal(uiText('Добавить в плейлист'),uiHTML`<p>${esc(p.name)} · выберите треки</p><div class="modal-track-list">${db.tracks.map(t=>uiHTML`<label class="add-track-option"><input type="checkbox" value="${t.id}" ${p.tracks.includes(t.id)?'checked':''}>${art(t,'track-art')}<span class="track-meta"><span class="track-title">${esc(t.title)}</span><span class="track-artist">${esc(artistLabel(t))}</span></span></label>`).join('')}</div><div class="modal-actions"><button class="secondary-button" data-action="modal-close">Отмена</button><button class="primary-button" id="savePlaylistTracks">Сохранить выбор</button></div>`);
  $('#savePlaylistTracks').onclick = async()=>{ const ids=$$('.modal-track-list input:checked').map(i=>i.value); const data=await api.updatePlaylist(p.id,{tracks:ids}); closeModal(); updateLibrary(data); toast(uiText('Плейлист обновлён')); };
}
function showEq() {
  const labels=['31','62','125','250','500','1k','2k','4k','8k','16k'];
  modal(uiText('Звук под вас'),uiHTML`<div class="eq-controls"><span class="small-label">10-полосный эквалайзер</span><button id="eqToggle" class="switch ${db.settings.eqEnabled?'on':''}" role="switch" aria-checked="${Boolean(db.settings.eqEnabled)}" aria-label="Включить эквалайзер"></button><select id="eqPreset" class="preset-select" aria-label="Пресет"><option value="custom">Свой звук</option><option value="flat">Ровный</option><option value="bass">Больше баса</option><option value="vocal">Вокал</option><option value="rock">Рок</option><option value="soft">Мягкий</option></select></div><div class="eq-bands">${labels.map((l,i)=>uiHTML`<label class="eq-band"><output>${db.settings.eq?.[i] || 0} dB</output><input type="range" min="-12" max="12" step="1" value="${db.settings.eq?.[i] || 0}" data-band="${i}" aria-label="${l} Гц"><span>${l} Hz</span></label>`).join('')}</div><p class="eq-note">Изменения слышны сразу и сохраняются автоматически.</p>`,true);
  $('#eqToggle').onclick=()=>{ saveSettings({eqEnabled:!db.settings.eqEnabled}); $('#eqToggle').classList.toggle('on',db.settings.eqEnabled); $('#eqToggle').setAttribute('aria-checked',db.settings.eqEnabled); };
  $$('.eq-band input').forEach(input=>input.oninput=()=>{const eq=[...(db.settings.eq || Array(10).fill(0))];eq[Number(input.dataset.band)]=Number(input.value);input.previousElementSibling.textContent=input.value+' dB';saveSettings({eq,eqEnabled:true});$('#eqToggle').classList.add('on');$('#eqToggle').setAttribute('aria-checked','true');$('#eqPreset').value='custom';});
  $('#eqPreset').onchange=e=>{ const presets={flat:[0,0,0,0,0,0,0,0,0,0],bass:[6,5,4,2,0,0,0,1,1,0],vocal:[-2,-1,0,1,3,4,3,1,0,-1],rock:[4,3,1,-1,-2,1,3,4,4,3],soft:[2,2,1,0,0,-1,-2,-3,-4,-4]}; const eq=presets[e.target.value]; if(!eq)return;saveSettings({eq,eqEnabled:true});$$('.eq-band input').forEach((input,i)=>{input.value=eq[i];input.previousElementSibling.textContent=eq[i]+' dB';});$('#eqToggle').classList.add('on');$('#eqToggle').setAttribute('aria-checked','true'); };
}
function showSettings() {
  modal(uiText('Настройки'),uiHTML`<p>Немного деталей, чтобы Luma ощущалась вашей.</p>
  <div class="settings-section-title">Интерфейс</div>
  <div class="settings-row"><label for="interfaceStyle"><b>Оформление окна</b><small>Обычные кнопки Windows или цветные кнопки macOS</small></label><select id="interfaceStyle" class="settings-select" data-preference="interfaceStyle"><option value="windows" ${db.settings.interfaceStyle!=='macos'?'selected':''}>Windows</option><option value="macos" ${db.settings.interfaceStyle==='macos'?'selected':''}>macOS</option></select></div>
  <div class="settings-row"><label for="languageSelect"><b>Язык интерфейса</b><small>Меняется сразу, без перезапуска</small></label><select id="languageSelect" class="settings-select" data-preference="language"><option value="ru" ${db.settings.language!=='en'?'selected':''}>${'Русский'}</option><option value="en" ${db.settings.language==='en'?'selected':''}>English</option></select></div>
  <div class="settings-hint">${icon('check')}Стиль и язык сохраняются автоматически</div>
  <div class="settings-section-title">Звук и удобство</div>
  <div class="settings-row"><div><b>Визуализация музыки</b><small>Спектр, громкость и бас во время воспроизведения</small></div><button class="switch ${db.settings.visualizerEnabled!==false?'on':''}" data-setting="visualizerEnabled" role="switch" aria-checked="${db.settings.visualizerEnabled!==false}" aria-label="Визуализация музыки"></button></div>
  <div class="settings-row"><div><b>Компактная библиотека</b><small>Больше треков помещается на экране</small></div><button class="switch ${db.settings.compact?'on':''}" data-setting="compact" role="switch" aria-checked="${Boolean(db.settings.compact)}" aria-label="Компактная библиотека"></button></div>
  <div class="settings-row"><div><b>Меньше анимаций</b><small>Спокойный интерфейс без движения</small></div><button class="switch ${db.settings.reducedMotion?'on':''}" data-setting="reducedMotion" role="switch" aria-checked="${Boolean(db.settings.reducedMotion)}" aria-label="Меньше анимаций"></button></div>
  <div class="settings-row"><div><b>Всё хранится на вашем ПК</b><small>Музыка копируется в библиотеку приложения.<br>Аккаунт и интернет для прослушивания не нужны.</small></div>${icon('folder')}</div>
  <p class="settings-version">Luma 1.2.1 · Сделано для вашей музыки<br>Пробел — play / pause · Ctrl K — поиск · Ctrl O — импорт<br>Ctrl → / ← — следующий / предыдущий трек</p><div class="modal-actions sticky"><button class="primary-button" data-action="modal-close">Назад к музыке</button></div>`);
}
async function changePreference(name, value, focusId) {
  clearTimeout(settingsTimer);
  if(name==='language') { clearTimeout(toastTimer); $('#toast').hidden=true; $('#toast').textContent=''; }
  db.settings = {...db.settings,[name]:value};
  applySettings(); renderNav(); render(); updatePlayer();
  renderQueue();
  showSettings();setTimeout(()=>$('#'+focusId)?.focus(),0);
  try { await api.settings(db.settings); } catch { toast(uiText('Не удалось сохранить настройки')); }
}
function nowPlayingContent(t) { return uiHTML`<div class="now-playing ${audio.paused?'paused':''}" data-current-track="${esc(t.id)}">${art(t)}<h2>${esc(t.title)}</h2><p>${esc(artistLabel(t))} · ${esc(albumLabel(t))}</p><span class="quality-badge">${t.format}${t.bitrate?uiHTML` · ${t.bitrate} kbps`:''}</span><div class="audio-visualizer large-visualizer" data-visualizer><canvas aria-label="Спектр музыки" role="img"></canvas><div class="visualizer-meters"><label>Громкость<span class="signal-meter" data-meter="level" role="meter" aria-label="Громкость музыки" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></span></label><label>Бас<span class="signal-meter bass-meter" data-meter="bass" role="meter" aria-label="Уровень баса" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></span></label></div></div></div>`; }
function showNowPlaying() { const t=current();if(!t){showImport();return;}modal(uiText('Сейчас звучит'),nowPlayingContent(t)); }
function closeMenu() { $('.context-menu')?.remove(); }
function menuFor(id, anchor) {
  closeMenu();const t=trackById(id);if(!t)return;
  const el=document.createElement('div');el.className='context-menu';
  el.innerHTML=uiHTML`<button data-play="${id}">${icon('play')}Воспроизвести</button><button data-favorite="${id}">${icon('heart')}${t.favorite?uiText('Убрать из любимых'):uiText('В любимые')}</button><button data-queue-add="${id}">${icon('queue')}Добавить в очередь</button><div class="context-label">ДОБАВИТЬ В ПЛЕЙЛИСТ</div>${db.playlists.map(p=>uiHTML`<button data-playlist-target="${p.id}" data-track-target="${id}">${icon(p.tracks.includes(id)?'check':'plus')}${esc(p.name)}</button>`).join('')}<button data-create-with="${id}">${icon('plus')}Новый плейлист</button>${view==='playlist'?uiHTML`<button data-playlist-remove-track="${id}">${icon('close')}Убрать из плейлиста</button>`:''}<button class="danger" data-remove="${id}">${icon('trash')}Убрать из библиотеки</button>`;
  document.body.append(el);const rect=anchor.getBoundingClientRect();el.style.left=Math.max(10,Math.min(rect.left,innerWidth-el.offsetWidth-15))+'px';el.style.top=Math.max(10,Math.min(rect.bottom,innerHeight-el.offsetHeight-115))+'px';
}
async function favorite(id) { const data=await api.favorite(id); updateLibrary(data); }
const actions = {
  'create-playlist':()=>playlistModal(),
  'import':showImport, 'import-files':()=>doImport(false), 'import-folder':()=>doImport(true), 'modal-close':closeModal,
  'play-all':()=>{if(db.tracks.length)playTrack(db.tracks[0].id,db.tracks.map(t=>t.id));},
  'shuffle-all':()=>{saveSettings({shuffle:true});if(db.tracks.length)playTrack(db.tracks[Math.floor(Math.random()*db.tracks.length)].id,db.tracks.map(t=>t.id));},
  'play-view':()=>{const tracks=getVisibleTracks();if(tracks.length)playTrack(tracks[0].id,tracks.map(t=>t.id));},
  'shuffle-view':()=>{const tracks=getVisibleTracks();saveSettings({shuffle:true});if(tracks.length)playTrack(tracks[Math.floor(Math.random()*tracks.length)].id,tracks.map(t=>t.id));},
  'playlist-add':addToPlaylist, 'playlist-rename':()=>playlistModal(db.playlists.find(p=>p.id===viewId)?.name,true),
  'playlist-delete':()=>{const p=db.playlists.find(p=>p.id===viewId);modal(uiText('Удалить плейлист?'),uiHTML`<p>«${esc(p?.name)}» будет удалён. Музыка останется в библиотеке.</p><div class="modal-actions"><button class="secondary-button" data-action="modal-close">Отмена</button><button class="primary-button" id="confirmDelete">Удалить</button></div>`);$('#confirmDelete').onclick=async()=>{const data=await api.deletePlaylist(viewId);closeModal();view='home';updateLibrary(data);};},
  'queue-close':()=>$('#queuePanel').hidden=true, 'recent':()=>navigate('recent')
};
document.addEventListener('click',async e=>{
  const button=e.target.closest('button');
  if(e.target.classList.contains('modal-backdrop')){closeModal();return;}
  if(!e.target.closest('.context-menu') && !e.target.closest('[data-menu]'))closeMenu();
  if(!button){const row=e.target.closest('[data-track]');if(row&&e.detail===1){if(row.dataset.track===currentId)togglePlay();else playTrack(row.dataset.track,visibleTracks.map(t=>t.id));}return;}
  try {
    const d=button.dataset;
    if(d.window)api.window(d.window);
    else if(d.view)navigate(d.view);
    else if(d.playlist)navigate('playlist',d.playlist);
    else if(d.album)navigate('album',d.album);
    else if(d.action)actions[d.action]?.();
    else if(d.play)playTrack(d.play,visibleTracks.length?visibleTracks.map(t=>t.id):db.tracks.map(t=>t.id));
    else if(d.favorite)await favorite(d.favorite);
    else if(d.menu)menuFor(d.menu,button);
    else if(d.newPlaylist)playlistModal(d.newPlaylist);
    else if(d.filter){filter=d.filter;render();}
    else if(d.queuePlay)playTrack(d.queuePlay);
    else if(d.queueAdd){queue.push(d.queueAdd);toast(uiText('Трек добавлен в очередь'));closeMenu();renderQueue();}
    else if(d.playlistTarget){const p=db.playlists.find(p=>p.id===d.playlistTarget);updateLibrary(await api.updatePlaylist(p.id,{tracks:[...p.tracks,d.trackTarget]}));closeMenu();toast(uiText('Добавлено в плейлист'));}
    else if(d.playlistRemoveTrack){const p=db.playlists.find(p=>p.id===viewId);updateLibrary(await api.updatePlaylist(p.id,{tracks:p.tracks.filter(id=>id!==d.playlistRemoveTrack)}));closeMenu();}
    else if(d.createWith){const id=d.createWith;playlistModal();const form=$('#playlistForm');form.onsubmit=async e=>{e.preventDefault();const data=await api.createPlaylist($('#playlistName').value.trim());const p=data.playlists.at(-1);updateLibrary(await api.updatePlaylist(p.id,{tracks:[id]}));closeModal();navigate('playlist',p.id);};}
    else if(d.remove){const id=d.remove;modal(uiText('Убрать трек из библиотеки?'),uiHTML`<p>«${esc(trackById(id)?.title)}» исчезнет из библиотеки и плейлистов. Исходный файл останется на месте.</p><div class="modal-actions"><button class="secondary-button" data-action="modal-close">Отмена</button><button class="primary-button" id="confirmRemove">Убрать</button></div>`);$('#confirmRemove').onclick=async()=>{updateLibrary(await api.removeTrack(id));closeModal();};}
    else if(d.setting){saveSettings({[d.setting]:!db.settings[d.setting]});button.classList.toggle('on',db.settings[d.setting]);button.setAttribute('aria-checked',db.settings[d.setting]);render();}
  }catch{toast(uiText('Не удалось сохранить изменение. Попробуйте ещё раз.'));}
});
$('#content').addEventListener('contextmenu',e=>{const row=e.target.closest('[data-track]');if(row){e.preventDefault();menuFor(row.dataset.track,e.target);}});
$('#content').addEventListener('keydown',e=>{const row=e.target.closest('[data-track]');if(row&&e.key==='Enter'&&!e.target.closest('button'))playTrack(row.dataset.track,visibleTracks.map(t=>t.id));});
$('#content').addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;render();}});
$('#search').oninput=e=>{search=e.target.value.trim();render();};
$('#clearSearch').onclick=()=>{search='';$('#search').value='';render();$('#search').focus();};
$('#backButton').onclick=goBack;
$('#quickSettings').onclick=showSettings;
document.addEventListener('change',e=>{if(e.target.dataset.preference)changePreference(e.target.dataset.preference,e.target.value,e.target.id);});
$('#importButton').onclick=showImport;$('#newPlaylist').onclick=()=>playlistModal();$('#settingsButton').onclick=showSettings;
$('#play').onclick=togglePlay;$('#next').onclick=()=>nextTrack();$('#previous').onclick=previousTrack;
$('#shuffle').onclick=()=>{saveSettings({shuffle:!db.settings.shuffle});if(db.settings.shuffle)queue=shuffled(queue,currentId);if(!$('#queuePanel').hidden)renderQueue();};$('#repeat').onclick=()=>saveSettings({repeat:({off:'all',all:'one',one:'off'})[db.settings.repeat]});
$('#playerFavorite').onclick=()=>currentId&&favorite(currentId);$('#nowCover').onclick=showNowPlaying;$('#nowTitle').onclick=showNowPlaying;
$('#eqButton').onclick=showEq;$('#queueButton').onclick=()=>{const p=$('#queuePanel');p.hidden=!p.hidden;if(!p.hidden)renderQueue();};
$('#volume').oninput=e=>saveSettings({volume:Number(e.target.value)});
$('#mute').onclick=()=>{if(audio.volume>0){lastVolume=audio.volume;saveSettings({volume:0});}else saveSettings({volume:lastVolume||.7});};
$('#seek').oninput=e=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Number(e.target.value)/100*audio.duration;setFill(e.target);}};
audio.addEventListener('timeupdate',()=>{const duration=audio.duration;if(Number.isFinite(duration)&&duration>0){$('#seek').value=audio.currentTime/duration*100;setFill($('#seek'));$('#elapsed').textContent=time(audio.currentTime);$('#duration').textContent=time(duration);}});
audio.addEventListener('play',updatePlayer);audio.addEventListener('pause',updatePlayer);audio.addEventListener('ended',()=>nextTrack(true));audio.addEventListener('loadedmetadata',updatePlayer);
audio.addEventListener('error',()=>{if(currentId)toast(uiText('Этот файл не воспроизводится. Возможно, кодек не поддерживается.'));updatePlayer();});
document.addEventListener('keydown',e=>{
  const typing=e.target.matches('input,textarea,select');
  if(e.key==='Escape'){closeModal();closeMenu();$('#queuePanel').hidden=true;}
  if(e.ctrlKey&&e.key.toLowerCase()==='k'){e.preventDefault();$('#search').focus();}
  if(e.ctrlKey&&e.key.toLowerCase()==='o'){e.preventDefault();showImport();}
  if(e.code==='Space'&&!typing&&!$('.modal')){e.preventDefault();togglePlay();}
  if(e.ctrlKey&&e.key==='ArrowRight'){e.preventDefault();nextTrack();}if(e.ctrlKey&&e.key==='ArrowLeft'){e.preventDefault();previousTrack();}
  if(e.key==='Tab'&&$('.modal')){const focusable=$$('button,input,select,[tabindex]', $('.modal')).filter(el=>!el.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
let dragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('#dropOverlay').hidden=false;}});
document.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
document.addEventListener('dragleave',()=>{dragDepth--;if(dragDepth<=0){dragDepth=0;$('#dropOverlay').hidden=true;}});
document.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('#dropOverlay').hidden=true;if(e.dataTransfer.files.length)doImport(false,e.dataTransfer.files);});
api.onProgress(p=>{let bar=$('.import-progress');if(!p){bar?.remove();return;}if(!bar){bar=document.createElement('div');bar.className='import-progress';bar.innerHTML='<i></i>';document.body.append(bar);}bar.firstChild.style.width=uiHTML`${p.current/p.total*100}%`;toast(uiHTML`Добавляем ${p.current} из ${p.total}: ${p.name}`,true);});
api.onLibrary(updateLibrary);
if('mediaSession' in navigator){navigator.mediaSession.setActionHandler('play',()=>{if(audio.paused)togglePlay();});navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('nexttrack',()=>nextTrack());navigator.mediaSession.setActionHandler('previoustrack',previousTrack);}
hydrateIcons();
api.onWindowState(value=>{maximized=value.maximized;updateWindowControls();});
api.windowState().then(value=>{maximized=value.maximized;updateWindowControls();});
api.library().then(data=>{db=data;currentId=data.lastTrack&&trackById(data.lastTrack)?data.lastTrack:null;if(current()){audio.src=current().src;queue=db.tracks.map(t=>t.id);}applySettings();renderNav();render();updatePlayer();}).catch(()=>toast(uiText('Не удалось прочитать библиотеку')));
