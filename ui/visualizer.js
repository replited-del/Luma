// One analyser feeds both views. Drawing stops when hidden, disabled or paused.
class AudioVisualizer {
  constructor() {
    this.enabled = true; this.playing = false; this.frame = 0; this.lastDraw = 0;
    this.targets = []; this.metrics = { rms: 0, bassRms: 0, level: 0, bass: 0, bands: Array(32).fill(0) };
    document.addEventListener('visibilitychange', () => this.sync());
    window.addEventListener('resize', () => this.draw());
  }
  attach(context, input) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 4096; this.analyser.smoothingTimeConstant = .65;
    this.frequency = new Float32Array(this.analyser.frequencyBinCount);
    this.wave = new Float32Array(this.analyser.fftSize);
    this.binHz = context.sampleRate / this.analyser.fftSize;
    input.connect(this.analyser); this.analyser.connect(context.destination);
    this.sync();
  }
  configure(enabled, reducedMotion) {
    this.enabled = enabled; this.reducedMotion = reducedMotion;
    document.body.classList.toggle('visualizer-on', enabled);
    this.refreshTargets(); this.sync();
  }
  refreshTargets() {
    this.targets = [...document.querySelectorAll('[data-visualizer]')];
    this.targets.forEach(target => target.hidden = !this.enabled);
    this.draw();
  }
  setPlaying(playing) { this.playing = playing; this.sync(); }
  sync() {
    const active = this.enabled && this.playing && this.analyser && !document.hidden;
    if (active && !this.frame) this.frame = requestAnimationFrame(time => this.tick(time));
    if (!active) {
      cancelAnimationFrame(this.frame); this.frame = 0; this.lastDraw = 0;
      this.metrics = { rms: 0, bassRms: 0, level: 0, bass: 0, bands: Array(32).fill(0) };
      this.draw();
    }
  }
  normalized(amplitude) { return amplitude > .00001 ? Math.max(0, Math.min(1, (20 * Math.log10(amplitude) + 72) / 72)) : 0; }
  tick(time) {
    this.frame = requestAnimationFrame(next => this.tick(next));
    if (time - this.lastDraw < (this.reducedMotion ? 125 : 33)) return;
    this.lastDraw = time;
    this.analyser.getFloatTimeDomainData(this.wave);
    this.analyser.getFloatFrequencyData(this.frequency);
    const rms = Math.sqrt(this.wave.reduce((sum, sample) => sum + sample * sample, 0) / this.wave.length);
    let bassEnergy = 0;
    for (let i = Math.ceil(30 / this.binHz); i <= Math.floor(250 / this.binHz); i++) bassEnergy += Math.pow(10, this.frequency[i] / 10);
    // Gate FFT smoothing after mute/silence so bars cannot linger without sound.
    const silent = rms < .00001;
    const bassRms = silent ? 0 : Math.sqrt(bassEnergy);
    const bands = Array.from({ length: 32 }, (_, index) => {
      const low = 30 * Math.pow(16000 / 30, index / 32), high = 30 * Math.pow(16000 / 30, (index + 1) / 32);
      let peak = -Infinity;
      for (let bin = Math.max(1, Math.floor(low / this.binHz)); bin <= Math.min(this.frequency.length - 1, Math.ceil(high / this.binHz)); bin++) peak = Math.max(peak, this.frequency[bin]);
      return silent ? 0 : this.normalized(Math.pow(10, peak / 20));
    });
    this.metrics = { rms, bassRms, level: this.normalized(rms), bass: this.normalized(bassRms), bands };
    this.draw();
  }
  draw() {
    for (const target of this.targets) {
      if (target.hidden || !target.isConnected) continue;
      const canvas = target.querySelector('canvas'), width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) continue;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, height, 0, 0); gradient.addColorStop(0, '#8873cd'); gradient.addColorStop(1, '#d6c7ff'); ctx.fillStyle = gradient;
      const gap = 3, barWidth = Math.max(1, width / 32 - gap);
      this.metrics.bands.forEach((level, index) => { const barHeight = Math.max(2, level * height); ctx.beginPath(); ctx.roundRect(index * width / 32, height - barHeight, barWidth, barHeight, 2); ctx.fill(); });
      for (const name of ['level', 'bass']) {
        const meter = target.querySelector(`[data-meter="${name}"]`), value = Math.round(this.metrics[name] * 100);
        meter.style.setProperty('--meter', value + '%'); meter.setAttribute('aria-valuenow', value);
      }
    }
  }
}
