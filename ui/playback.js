// Two media decks feed the same equalizer and analyser. The unused deck preloads.
class CrossfadePlayback {
  constructor(decks) { this.decks = decks; this.active = decks[0]; this.serial = 0; this.nodes = new Map(); }
  attach(context, input) {
    this.context = context;
    for (const deck of this.decks) {
      const gain = context.createGain(); gain.gain.value = deck === this.active ? 1 : 0;
      context.createMediaElementSource(deck).connect(gain); gain.connect(input); this.nodes.set(deck,gain);
    }
  }
  other() { return this.decks.find(deck => deck !== this.active); }
  setVolume(value) { this.decks.forEach(deck => deck.volume = value); }
  gain(deck,value) { const parameter = this.nodes.get(deck)?.gain; if (parameter) { parameter.cancelScheduledValues(this.context.currentTime); parameter.setValueAtTime(value,this.context.currentTime); } }
  stopFade() {
    clearTimeout(this.timer); this.timer = null; this.fading = false;
    const spare = this.other(); spare.pause(); this.gain(spare,0); this.gain(this.active,1);
  }
  cancel() { this.serial++; this.pending = false; this.stopFade(); }
  pause() { this.cancel(); this.active.pause(); }
  reset() { this.cancel(); for (const deck of this.decks) { deck.pause(); deck.removeAttribute('src'); deck.load(); } }
  prepare(src) {
    if (this.fading || this.pending) return;
    const spare = this.other();
    if (src && spare.getAttribute('src') !== src) { spare.src = src; spare.load(); }
  }
  async play(src, seconds = 0) {
    const serial = ++this.serial; this.stopFade();
    const outgoing = this.active, incoming = seconds > 0 ? this.other() : this.active;
    this.pending = seconds > 0;
    if (incoming.getAttribute('src') !== src) incoming.src = src;
    incoming.currentTime = 0;
    this.gain(incoming,seconds > 0 ? 0 : 1);
    try { await incoming.play(); }
    catch (error) { if (serial === this.serial) { this.pending = false; this.stopFade(); } throw error; }
    if (serial !== this.serial) return null;
    this.pending = false;
    const duration = Math.min(seconds,Math.max(0,outgoing.duration - outgoing.currentTime),Number.isFinite(incoming.duration) ? incoming.duration / 2 : seconds);
    this.active = incoming;
    outgoing.id = incoming === outgoing ? 'audio' : 'audioNext'; incoming.id = 'audio';
    if (incoming !== outgoing && duration > .05 && !outgoing.paused) {
      this.fading = true;
      const now = this.context.currentTime;
      this.gain(outgoing,1); this.gain(incoming,0);
      this.nodes.get(outgoing).gain.linearRampToValueAtTime(0,now + duration);
      this.nodes.get(incoming).gain.linearRampToValueAtTime(1,now + duration);
      this.timer = setTimeout(() => this.stopFade(),duration * 1000 + 30);
    } else { this.stopFade(); }
    return incoming;
  }
}
