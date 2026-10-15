(function(root) {
  'use strict';
  const MAX_SOURCES = 500;
  function parse(input) {
    if (typeof input !== 'string' || input.length > 2048) return null;
    let text = input.trim();
    if (/^spotify:(track|album|playlist):[a-zA-Z0-9]{22}$/.test(text)) text = 'https://open.spotify.com/' + text.split(':').slice(1).join('/');
    let url; try { url = new URL(text); } catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname;
    if (['spotify.link','on.soundcloud.com'].includes(host) && /^\/[a-zA-Z0-9_-]{2,150}\/?$/.test(url.pathname)) return { provider:host === 'spotify.link' ? 'spotify' : 'soundcloud', short:true, url:url.origin + url.pathname };
    if (host === 'open.spotify.com') {
      const match = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist)\/([a-zA-Z0-9]{22})\/?$/);
      if (!match) return null;
      const [,kind,id] = match;
      return { provider:'spotify',kind,url:`https://open.spotify.com/${kind}/${id}`,embed:`https://open.spotify.com/embed/${kind}/${id}?theme=0`,fallback:`Spotify · ${kind} · ${id.slice(0,6)}` };
    }
    if (['soundcloud.com','www.soundcloud.com','m.soundcloud.com'].includes(host)) {
      const match = url.pathname.match(/^\/([a-zA-Z0-9_-]{1,100})\/(?:(sets)\/)?([a-zA-Z0-9_-]{1,200})\/?$/);
      if (!match || url.searchParams.has('secret_token') || ['discover','search','you','settings','terms','pages','charts','stations'].includes(match[1]) || (!match[2] && ['sets','tracks','albums','likes','reposts','popular-tracks'].includes(match[3]))) return null;
      const canonical = `https://soundcloud.com/${match[1]}/${match[2] ? 'sets/' : ''}${match[3]}`;
      return { provider:'soundcloud',kind:match[2] ? 'playlist' : 'track',url:canonical,embed:'https://w.soundcloud.com/player/?' + new URLSearchParams({url:canonical,auto_play:'false',visual:'true',show_user:'true',show_artwork:'true',color:'#b9a3ff'}),fallback:match[3].replace(/[-_]+/g,' ') };
    }
    return null;
  }
  function validateSources(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > MAX_SOURCES) throw new Error('Invalid online collection');
    const ids = new Set(), urls = new Set();
    return value.map(item => {
      const source = parse(item?.url);
      if (!source || source.short || !/^[a-f0-9-]{36}$/.test(item.id) || ids.has(item.id) || urls.has(source.url) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300) throw new Error('Invalid online source');
      ids.add(item.id); urls.add(source.url);
      return {id:item.id,url:source.url,provider:source.provider,kind:source.kind,title:item.title.trim(),addedAt:Number.isFinite(item.addedAt) ? item.addedAt : 0};
    });
  }
  const api = {parse,validateSources,MAX_SOURCES};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LumaServices = api;
})(typeof globalThis === 'object' ? globalThis : this);
