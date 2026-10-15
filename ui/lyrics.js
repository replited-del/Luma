(function(root) {
  'use strict';
  const MAX_LENGTH = 256 * 1024;
  const stamp = '(\\d{1,4}):([0-5]\\d)(?:[.:](\\d{1,3}))?';
  const seconds = match => Number(match[1]) * 60 + Number(match[2]) + Number('0.' + (match[3] || '0'));
  function parse(text) {
    if (typeof text !== 'string' || text.length > MAX_LENGTH) return { lines:[], synced:false };
    const source = text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').slice(0,4000);
    const offsetTag = /^\[offset:([+-]?\d+)\]\s*$/im.exec(text);
    const offset = offsetTag ? Math.max(-3600,Math.min(3600,Number(offsetTag[1]) / 1000)) : 0;
    const lines = [];
    for (const raw of source) {
      const tags = [...raw.matchAll(new RegExp('\\[' + stamp + '\\]','g'))];
      if (!tags.length) {
        if (raw.trim() && !/^\s*\[[a-z]+:.*\]\s*$/i.test(raw)) lines.push({time:null,text:raw,words:[]});
        continue;
      }
      const body = raw.replace(new RegExp('\\[' + stamp + '\\]','g'),'').trim();
      const marks = [...body.matchAll(new RegExp('<' + stamp + '>','g'))];
      const base = tags[0];
      for (const tag of tags) {
        const shift = seconds(tag) - seconds(base) - offset;
        const words = [];
        const prefix = marks.length ? body.slice(0,marks[0].index) : '';
        if (prefix) words.push({time:seconds(tag)-offset,text:prefix});
        marks.forEach((mark,i) => {
          const content = body.slice(mark.index + mark[0].length,marks[i+1]?.index ?? body.length);
          // An empty final marker still defines the end of the previous word.
          words.push({time:seconds(mark)+shift,text:content});
        });
        const validWords = words.every((word,i) => !i || word.time >= words[i-1].time) ? words : [];
        lines.push({time:seconds(tag)-offset,text:body.replace(new RegExp('<' + stamp + '>','g'),''),words:validWords});
        if (lines.length >= 4000) break;
      }
      if (lines.length >= 4000) break;
    }
    const synced = lines.some(line => line.time !== null);
    return { synced, lines:synced ? lines.filter(line => line.time !== null).sort((a,b)=>a.time-b.time) : lines };
  }
  function activeIndex(lines, time) {
    let low = 0, high = lines.length - 1, result = -1;
    while (low <= high) { const mid = (low+high) >>> 1; if (lines[mid].time <= time) { result=mid;low=mid+1; } else high=mid-1; }
    return result;
  }
  const api = { parse, activeIndex, MAX_LENGTH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LumaLyrics = api;
})(typeof window !== 'undefined' ? window : globalThis);
