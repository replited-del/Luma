let activeOnlineId = null, onlineLoadTimer;
const onlineById = id => (db.onlineSources || []).find(item => item.id === id);
const providerName = source => source.provider === 'spotify' ? 'Spotify' : 'SoundCloud';
function stopOnline() {
  clearTimeout(onlineLoadTimer);
  $('#serviceFrame')?.remove();
  activeOnlineId = null;
  document.body.classList.remove('online-active');
  $('#onlineTransport').hidden = true;
  if ($('#servicePlayer')) $('#servicePlayer').hidden = true;
}
function onlineTransport() {
  const item = onlineById(activeOnlineId);
  if (!item) return;
  $('#onlineTransport').hidden = false;
  $('#onlineTransport').innerHTML = uiHTML`<span class="online-signal">${icon('globe')}</span><div><b>${esc(item.title)}</b><small>${providerName(item)} · Управление в плеере сервиса</small></div><button class="secondary-button" data-action="online-stop">${icon('close')}Остановить</button>`;
}
function renderOnline() {
  visibleTracks = [];
  if (!$('#onlinePage')) $('#content').innerHTML = '<div id="onlinePage"><div id="onlineHeading" class="page-heading"></div><div id="onlineIntro" class="online-intro"></div><section id="servicePlayer" class="service-player" hidden></section><div id="onlineCards"></div><p id="onlineNote" class="online-note"></p></div>';
  // Refresh local copy independently from the frame so language changes keep audio alive.
  $('#onlineHeading').innerHTML = uiHTML`<div><div class="eyebrow">SPOTIFY / SOUNDCLOUD</div><h1>Музыка по ссылке<span style="color:var(--accent)">.</span></h1></div>`;
  $('#onlineIntro').innerHTML = uiHTML`<div><h2>Из сервиса — в ваше пространство.</h2><p>Сохраните трек, альбом или плейлист и слушайте через официальный плеер.</p></div><button class="primary-button" data-action="online-import">${icon('plus')}Добавить ссылку</button>`;
  $('#onlineNote').textContent = uiText('Нужен интернет. Spotify в Luma может играть только превью; полные треки доступны в приложении или браузере сервиса. У SoundCloud доступ зависит от автора и региона. Аудиофайлы не скачиваются.');
  if (activeOnlineId && onlineById(activeOnlineId)) $('.service-player-heading h2').textContent = onlineById(activeOnlineId).title;
  $$('#servicePlayer [data-i18n]').forEach(el => el.textContent = uiText(el.dataset.i18n));
  $$('#servicePlayer [data-i18n-aria]').forEach(el => el.setAttribute('aria-label',uiText(el.dataset.i18nAria)));
  const sources = (db.onlineSources || []).filter(item => !search || `${item.title} ${providerName(item)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  $('#onlineCards').innerHTML = sources.length ? `<div class="online-grid">${sources.map(item => uiHTML`<article class="online-card ${item.provider} ${activeOnlineId===item.id?'selected':''}"><button class="online-card-play" data-online-play="${item.id}"><span class="online-art">${icon(item.provider==='spotify'?'disc':'music')}<span>${icon('play')}</span></span><span class="online-provider">${providerName(item)} · ${uiText(item.kind==='playlist'?'Плейлист':item.kind==='album'?'Альбом':'Трек')}</span><b>${esc(item.title)}</b></button><div class="online-card-tools"><button class="plain-button" data-online-external="${item.id}">Открыть в сервисе ${icon('arrow')}</button><button class="icon-button" data-online-rename="${item.id}" aria-label="Переименовать">${icon('edit')}</button><button class="icon-button" data-online-remove="${item.id}" aria-label="Удалить ссылку">${icon('trash')}</button></div></article>`).join('')}</div>` : uiHTML`<div class="online-empty">${icon('globe')}<h2>${search?uiText('Пока ничего не нашлось'):uiText('Любимая музыка начинается со ссылки')}</h2><p>${search?uiText('Попробуйте другое название.'):uiText('В Spotify или SoundCloud нажмите «Поделиться», скопируйте ссылку и добавьте её сюда.')}</p></div>`;
  if (activeOnlineId && !onlineById(activeOnlineId)) stopOnline();
  onlineTransport();
}
function openOnline(id) {
  const item = onlineById(id), source = LumaServices.parse(item?.url);
  if (!source || source.short || restoringUI) return;
  closeModal();
  playRequest++; playback.pause();
  stopOnline();
  if (view !== 'services') navigate('services');
  activeOnlineId = id;
  updatePlayer();
  document.body.classList.add('online-active');
  $('#queuePanel').hidden = true;
  const player = $('#servicePlayer'); player.hidden = false;
  player.innerHTML = `<div class="service-player-heading"><div><span>${providerName(item)}</span><h2>${esc(item.title)}</h2></div><div><button class="icon-button" data-action="online-retry" data-i18n-aria="Перезагрузить плеер">${icon('repeat')}</button><button class="icon-button" data-action="online-stop" data-i18n-aria="Остановить">${icon('close')}</button></div></div><div id="serviceFrameSlot"></div><p id="serviceLoadStatus" role="status" data-i18n="Загружаем плеер сервиса…"></p><p class="service-player-hint" data-i18n="Нажмите Play в плеере сервиса. Если запись недоступна, откройте её в сервисе."></p><button class="plain-button" data-online-external="${item.id}"><span data-i18n="Открыть в сервисе"></span>${icon('arrow')}</button>`;
  const frame = document.createElement('iframe');
  frame.id = 'serviceFrame'; frame.title = `${providerName(item)}: ${item.title}`;
  frame.dataset.provider = source.provider;
  frame.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture');
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  // Only provider-generated URLs from the shared parser can reach this frame.
  frame.src = source.embed;
  frame.onload = () => { if (activeOnlineId !== id) return; clearTimeout(onlineLoadTimer); const status = $('#serviceLoadStatus'); if (status) { status.dataset.i18n = 'Управление воспроизведением находится внутри плеера сервиса.'; status.textContent = uiText(status.dataset.i18n); } };
  onlineLoadTimer = setTimeout(() => { const status = $('#serviceLoadStatus'); if (status && activeOnlineId === id) { status.dataset.i18n = 'Плеер загружается дольше обычного. Проверьте интернет или откройте запись в сервисе.'; status.textContent = uiText(status.dataset.i18n); } },15000);
  $('#serviceFrameSlot').append(frame);
  renderOnline(); player.scrollIntoView({block:'nearest',behavior:db.settings.reducedMotion?'instant':'smooth'});
}
function showOnlineImport() {
  modal(uiText('Добавить из сервиса'),uiHTML`<p>Вставьте ссылку из Spotify или SoundCloud. Можно добавить отдельный трек, альбом Spotify или плейлист.</p><form id="onlineImportForm"><label class="online-label" for="onlineURL">Ссылка на музыку</label><input id="onlineURL" type="text" inputmode="url" autocomplete="off" spellcheck="false" maxlength="2048" placeholder="https://open.spotify.com/playlist/…" required><label class="online-label" for="onlineName">Своё название (необязательно)</label><input id="onlineName" type="text" maxlength="300" autocomplete="off"><p class="online-import-note">Ссылка и название останутся в Luma. Сервис получит запрос при добавлении и открытии плеера. Spotify может воспроизводить только превью. Музыка не скачивается.</p><p id="onlineImportError" class="form-error" role="status"></p><div class="modal-actions"><button type="button" class="secondary-button" data-action="modal-close">Отмена</button><button id="onlineImportSubmit" type="submit" class="primary-button">Добавить и открыть</button></div></form>`);
  const form = $('#onlineImportForm');
  form.onsubmit = async event => {
    event.preventDefault();
    const input = $('#onlineURL',form).value, name = $('#onlineName',form).value.trim();
    const button = $('#onlineImportSubmit',form), error = $('#onlineImportError',form);
    if (!LumaServices.parse(input)) { error.textContent = uiText('Вставьте публичную ссылку на трек, альбом или плейлист Spotify / SoundCloud.'); return; }
    button.disabled = true; button.textContent = uiText('Добавляем ссылку…'); error.textContent = '';
    try {
      const result = await api.importService(input);
      if (name) result.library = await api.renameService(result.id,name);
      updateLibrary(result.library);
      // A closed import dialog may finish saving, but must not start a player.
      if (!form.isConnected) return;
      closeModal(); navigate('services'); openOnline(result.id);
      toast(uiText(result.duplicate?'Эта ссылка уже в коллекции':result.metadataLoaded?'Ссылка добавлена':'Ссылка сохранена. Название не удалось загрузить — его можно изменить.'));
    } catch (cause) { if (form.isConnected) error.textContent = uiText(cause.message.replace(/^Error invoking remote method '[^']+': Error: /,'')); }
    finally { button.disabled = false; button.textContent = uiText('Добавить и открыть'); }
  };
}
async function removeOnline(id) {
  const item = onlineById(id); if (!item) return;
  modal(uiText('Удалить ссылку?'),uiHTML`<p>${esc(item.title)}</p><p>Музыка и плейлист в сервисе останутся на месте.</p><div class="modal-actions"><button class="secondary-button" data-action="modal-close">Отмена</button><button id="confirmOnlineRemove" class="danger-button">Удалить ссылку</button></div>`);
  $('#confirmOnlineRemove').onclick = async () => { try { const data = await api.removeService(id); if (activeOnlineId === id) stopOnline(); closeModal(); updateLibrary(data); } catch { toast(uiText('Не удалось сохранить изменения')); } };
}
function renameOnline(id) {
  const item = onlineById(id); if (!item) return;
  modal(uiText('Переименовать'),uiHTML`<form id="onlineRenameForm"><input id="onlineRename" type="text" value="${esc(item.title)}" maxlength="300" required><div class="modal-actions"><button type="button" class="secondary-button" data-action="modal-close">Отмена</button><button type="submit" class="primary-button">Сохранить</button></div></form>`);
  $('#onlineRenameForm').onsubmit = async event => { event.preventDefault(); const name = $('#onlineRename').value.trim(); if (!name) return; try { const data = await api.renameService(id,name); closeModal(); updateLibrary(data); } catch { toast(uiText('Не удалось сохранить изменения')); } };
}
document.addEventListener('click',async event => {
  const target = event.target.closest('[data-online-play],[data-online-external],[data-online-remove],[data-online-rename]'); if (!target) return;
  if (target.dataset.onlinePlay) openOnline(target.dataset.onlinePlay);
  else if (target.dataset.onlineRemove) removeOnline(target.dataset.onlineRemove);
  else if (target.dataset.onlineRename) renameOnline(target.dataset.onlineRename);
  else try { await api.openService(target.dataset.onlineExternal); } catch { toast(uiText('Не удалось открыть сервис')); }
});
