const {parse} = require('./ui/services.js');

async function resolveSource(input, request = fetch) {
  let source = parse(input);
  if (!source) throw new Error('Вставьте публичную ссылку на трек, альбом или плейлист Spotify / SoundCloud.');
  const provider = source.provider;
  for (let i = 0; source.short && i < 5; i++) {
    let response;
    try { response = await request(source.url, {redirect:'manual',signal:AbortSignal.timeout(7000)}); }
    catch { throw new Error('Не удалось раскрыть короткую ссылку. Скопируйте полную ссылку из браузера.'); }
    await response.body?.cancel();
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) throw new Error('Не удалось раскрыть короткую ссылку. Скопируйте полную ссылку из браузера.');
    source = parse(new URL(location,source.url).href);
    if (!source || source.provider !== provider) throw new Error('Не удалось раскрыть короткую ссылку. Скопируйте полную ссылку из браузера.');
  }
  if (source.short) throw new Error('Не удалось раскрыть короткую ссылку. Скопируйте полную ссылку из браузера.');
  return source;
}
async function metadata(source, request = fetch) {
  const endpoint = source.provider === 'spotify' ? 'https://open.spotify.com/oembed' : 'https://soundcloud.com/oembed';
  const response = await request(endpoint + '?' + new URLSearchParams({url:source.url,format:'json'}), {redirect:'error',signal:AbortSignal.timeout(7000)});
  if (!response.ok) { await response.body?.cancel(); throw new Error('Metadata unavailable'); }
  // Never inject provider HTML. A bounded JSON response supplies only the title.
  const reader = response.body.getReader(); let size = 0; const parts = [];
  try {
    while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 65536) throw new Error('Metadata too large'); parts.push(Buffer.from(value)); }
  } finally { await reader.cancel().catch(() => {}); }
  const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
  if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('Missing title');
  return value.title.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,300);
}
module.exports = {resolveSource,metadata};
