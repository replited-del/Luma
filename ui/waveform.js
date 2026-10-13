// Decode only the selected track, serialize work, and retain compact peaks on disk.
class TrackWaveform {
  constructor(api, text) {
    this.api = api; this.text = text; this.enabled = true; this.progress = 0;
    this.canvas = document.querySelector('#trackWaveform');
    this.container = document.querySelector('#waveformSeek');
    window.addEventListener('resize',() => this.draw());
  }
  configure(enabled) {
    const changed = this.enabled !== enabled; this.enabled = enabled;
    this.status(this.canvas.dataset.status || 'Волна трека');
    this.container.classList.toggle('waveform-enabled',enabled);
    if (!enabled) this.abort?.abort();
    if (changed && enabled) { this.loadedId = null; this.load(); }
    this.draw();
  }
  select(track) {
    if (this.track?.id === track?.id) return;
    this.track = track; this.loadedId = null; this.peaks = null; this.progress = 0; this.abort?.abort();
    this.draw(); this.load();
  }
  async load() {
    if (this.busy || !this.enabled || !this.track || this.loadedId === this.track.id) return;
    this.busy = true;
    try {
      while (this.enabled && this.track && this.loadedId !== this.track.id) {
        const track = this.track; this.status('Строим волну трека…');
        try {
          let peaks = await this.api.waveform(track.id);
          if (!peaks) {
            // Long recordings stay playable without an unbounded PCM allocation.
            if (track.duration > 1800) throw new Error('Track too long for waveform decoding');
            this.abort = new AbortController();
            const response = await fetch(track.src,{signal:this.abort.signal});
            const bytes = Number(response.headers.get('content-length'));
            if (!response.ok || !bytes || bytes > 96 * 1024 * 1024) { await response.body?.cancel(); throw new Error('Waveform input unavailable'); }
            const encoded = await response.arrayBuffer();
            if (!this.enabled || track.id !== this.track?.id) continue;
            const decoded = await new OfflineAudioContext(1,1,8000).decodeAudioData(encoded);
            peaks = Array(512).fill(0);
            for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
              const samples = decoded.getChannelData(channel);
              for (let bin = 0; bin < peaks.length; bin++) {
                const start = Math.floor(bin * samples.length / peaks.length), end = Math.floor((bin + 1) * samples.length / peaks.length);
                let peak = peaks[bin];
                for (let index = start; index < end; index++) peak = Math.max(peak,Math.abs(samples[index]));
                peaks[bin] = Math.min(1,peak);
              }
            }
            await this.api.saveWaveform(track.id,peaks).catch(() => {});
          }
          if (this.enabled && this.track?.id === track.id) { this.peaks = peaks; this.loadedId = track.id; this.status('Волна трека'); this.draw(); }
        } catch {
          if (this.enabled && this.track?.id === track.id) { this.loadedId = track.id; this.peaks = null; this.status('Волна недоступна — перемотка работает'); this.draw(); }
        }
      }
    } finally { this.busy = false; }
  }
  status(message) { this.container.title = this.text(message); this.canvas.dataset.status = message; }
  draw(progress = this.progress) {
    this.container.classList.toggle('waveform-ready',this.enabled && Boolean(this.peaks));
    this.progress = Math.min(1,Math.max(0,progress || 0));
    const canvas = this.canvas, width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1,2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d'); ctx.scale(ratio,ratio);
    if (!this.enabled || !this.peaks) return;
    const maximum = Math.max(...this.peaks,.00001), count = Math.min(512,Math.max(1,Math.floor(width / 3)));
    for (let index = 0; index < count; index++) {
      const begin = Math.floor(index * 512 / count), end = Math.max(begin + 1,Math.floor((index + 1) * 512 / count));
      const peak = Math.max(...this.peaks.slice(begin,end)), barHeight = Math.max(1,peak / maximum * (height - 4));
      ctx.fillStyle = index / count < this.progress ? '#c9b6ff' : '#686176';
      ctx.fillRect(index * width / count,(height - barHeight) / 2,Math.max(1,width / count - 1),barHeight);
    }
    ctx.fillStyle = '#eee5ff'; ctx.fillRect(this.progress * (width - 1),0,1,height);
  }
}
