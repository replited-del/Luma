let spotifyJob = null;
const spotifyBusy = () => spotifyJob && !['done','partial','cancelled','error'].includes(spotifyJob.phase);
const spotifyLabels = {
  preparing:'Готовим загрузку…',metadata:'Получаем список треков…',downloading:'Скачиваем музыку…',
  importing:'Добавляем в библиотеку…',cancelling:'Отменяем загрузку…',done:'Музыка добавлена',partial:'Скачана часть треков',cancelled:'Загрузка отменена',error:'Не удалось скачать музыку'
};
function spotifyStatusHTML() {
  const job=spotifyJob;if(!job)return '';
  const setup=job.phase==='preparing' && job.bytes,determinate=setup || (job.phase==='downloading' && job.total);
  const fraction=setup?job.received/job.bytes:job.total?job.completed/job.total:0;
  return uiHTML`<section class="spotify-status" role="status"><div class="spotify-status-heading"><span class="spotify-mark">${icon('download')}</span><div><small>SPOTIFY</small><h3>${uiText(spotifyLabels[job.phase]||'Готовим загрузку…')}</h3><p>${esc(job.name || job.url)}</p></div></div>${spotifyBusy()?`<progress aria-label="${esc(uiText('Загрузка музыки'))}" max="100" ${determinate?`value="${Math.min(100,Math.round(fraction*100))}"`:''}></progress>`:''}<p>${setup?`${esc(job.tool)} · ${(job.received/1048576).toFixed(1)} / ${(job.bytes/1048576).toFixed(1)} MB`:job.total?`${uiText('Готово треков:')} ${job.completed} / ${job.total}`:''}</p>${!spotifyBusy()?uiHTML`<p>Добавлено: ${job.added}${job.duplicate?uiHTML` · Уже в библиотеке: ${job.duplicate}`:''}${job.failed?uiHTML` · Не скачано: ${job.failed}`:''}</p>`:''}${job.message?`<p class="form-error">${esc(uiText(job.message))}</p>`:''}<div class="spotify-status-actions">${spotifyBusy()?uiHTML`<button class="secondary-button" data-action="spotify-cancel" ${['importing','cancelling'].includes(job.phase)?'disabled':''}>Отменить загрузку</button>`:`<button class="primary-button" data-action="spotify-library">${uiText('Открыть библиотеку')}</button><button class="secondary-button" data-action="spotify-import">${uiText('Новая загрузка')}</button>`}${job.folder?uiHTML`<button class="plain-button" data-action="spotify-folder">Открыть папку</button>`:''}</div>${job.logs?.length?`<details class="spotify-details"><summary>${uiText('Подробности загрузки')}</summary><pre>${esc(job.logs.join('\n'))}</pre></details>`:''}</section>`;
}
function renderSpotifyStatus() {
  for(const node of $$('.spotify-job-slot')) {
    // Keep expanded diagnostics and scroll while progress updates arrive.
    const expanded=Boolean($('details',node)?.open),top=$('pre',node)?.scrollTop||0;
    node.innerHTML=spotifyStatusHTML();if($('details',node))$('details',node).open=expanded;if($('pre',node))$('pre',node).scrollTop=top;
  }
}
function showSpotifyImport(url='',name='') {
  if(spotifyBusy()){modal('Spotify','<div class="spotify-job-slot"></div>');renderSpotifyStatus();return;}
  modal('Spotify',uiHTML`<p>Вставьте ссылку на трек, альбом или плейлист. Готовая музыка появится в вашей библиотеке и будет играть без интернета.</p><form id="spotifyImportForm"><label class="online-label" for="spotifyURL">Ссылка Spotify</label><input id="spotifyURL" type="text" inputmode="url" autocomplete="off" spellcheck="false" maxlength="2048" placeholder="https://open.spotify.com/playlist/…" value="${esc(url)}" required><label class="online-label" for="spotifyName">Название плейлиста (необязательно)</label><input id="spotifyName" type="text" maxlength="100" value="${esc(name.slice(0,100))}"><p class="online-import-note">Список песен берём из Spotify, аудио — из найденных записей YouTube. Совпадения и доступность зависят от источников. При первой загрузке автоматически подготовятся необходимые компоненты — около 113 МБ.</p><p id="spotifyImportError" class="form-error" role="status"></p><div class="modal-actions"><button type="button" class="secondary-button" data-action="modal-close">Отмена</button><button id="spotifyImportSubmit" type="submit" class="primary-button">Добавить в библиотеку</button></div></form>`);
  const form=$('#spotifyImportForm');
  form.onsubmit=async event=>{
    event.preventDefault();const input=$('#spotifyURL',form).value,name=$('#spotifyName',form).value.trim(),error=$('#spotifyImportError',form),button=$('#spotifyImportSubmit',form),source=LumaServices.parse(input);
    if(!source || source.provider!=='spotify'){error.textContent=uiText('Вставьте ссылку на трек, альбом или плейлист Spotify.');return;}
    button.disabled=true;error.textContent='';
    try{spotifyJob=await api.startSpotify(source.url,name);if(form.isConnected){closeModal();navigate('services');}renderSpotifyStatus();$('.spotify-status')?.scrollIntoView({block:'nearest',behavior:db.settings.reducedMotion?'instant':'smooth'});}
    catch(cause){if(form.isConnected)error.textContent=uiText(cause.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}
    finally{button.disabled=false;}
  };
}
async function cancelSpotify(){try{spotifyJob=await api.cancelSpotify();renderSpotifyStatus();}catch{toast(uiText('Не удалось отменить загрузку'));}}
function openSpotifyLibrary(){closeModal();navigate(spotifyJob?.playlistId?'playlist':'library',spotifyJob?.playlistId||'');}
function spotifyProgress(job){const previous=spotifyJob;spotifyJob=job;renderSpotifyStatus();if(previous && !['done','partial','cancelled','error'].includes(previous.phase) && !spotifyBusy())toast(uiText(spotifyLabels[job.phase]));}
