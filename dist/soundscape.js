export function createSoundscape() {
  let ctx, master, wind, filter, enabled = true, paused = false, nextChord = 0, lastFood = 0, lastReturn = 0;
  const notes = [146.83, 196, 220, 293.66, 329.63, 392, 440, 587.33, 659.25];
  function setup() {
    if (ctx) { ctx.resume().catch(() => {}); return; }
    const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
    ctx = new Audio(); master = ctx.createGain(); master.gain.value = enabled && !paused ? .24 : 0; master.connect(ctx.destination);
    const data = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); let v = 0;
    for (let i = 0; i < data.length; i++) { v = (v + (Math.random() * 2 - 1) * .04) / 1.025; data.getChannelData(0)[i] = v * 3; }
    const source = ctx.createBufferSource(); source.buffer = data; source.loop = true;
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320;
    wind = ctx.createGain(); wind.gain.value = .06; source.connect(filter); filter.connect(wind); wind.connect(master); source.start();
  }
  function tone(freq, duration = 1.5, volume = .12, delay = 0, pan = 0, kind = 'sine') {
    if (!ctx || !enabled || paused) return;
    const now = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = kind; o.frequency.setValueAtTime(freq, now); g.gain.setValueAtTime(.0001, now);
    g.gain.exponentialRampToValueAtTime(volume, now + .025); g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    p.pan.value = Math.max(-.85, Math.min(.85, pan)); o.connect(g); g.connect(p); p.connect(master);
    o.start(now); o.stop(now + duration + .05); o.onended = () => { o.disconnect(); g.disconnect(); p.disconnect(); };
  }
  function chirp(delay = 0, pan = 0, pitch = 1) {
    if (!ctx || !enabled || paused) return;
    const now = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.frequency.setValueAtTime(1000 * pitch, now); o.frequency.exponentialRampToValueAtTime(1900 * pitch, now + .12); o.frequency.exponentialRampToValueAtTime(1200 * pitch, now + .3);
    g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.11, now + .03); g.gain.exponentialRampToValueAtTime(.0001, now + .34);
    p.pan.value = pan; o.connect(g); g.connect(p); p.connect(master); o.start(now); o.stop(now + .4);
    o.onended = () => { o.disconnect(); g.disconnect(); p.disconnect(); };
  }
  return {
    start() { try { setup(); } catch {} },
    setEnabled(value) { enabled = value; if (enabled) try { setup(); } catch {} if (ctx) master.gain.setTargetAtTime(enabled && !paused ? .24 : 0, ctx.currentTime, .25); },
    pause(value) { paused = value; if (ctx) master.gain.setTargetAtTime(enabled && !paused ? .24 : 0, ctx.currentTime, .2); },
    event(e, s) {
      if (!ctx) return;
      const pan = Math.max(-.8, Math.min(.8, ((e.x || s.player.x) - s.player.x) / 260));
      if (e.type === 'pulse') {
        tone(587.33, 1.4, .18); if (e.reached) { tone(659.25, 1.8, .1, .3, -.45); tone(880, 2.2, .075, .65, .5); }
      }
      if (e.type === 'chorus' && s.stage === 0) { tone(293.66, 3, .07, 0, -.45); tone(440, 3, .06, .1, .45); }
      if (e.type === 'plant') { tone(392, 1.3, .12, 0, pan); tone(587.33, 1.8, .07, .18, -pan); }
      if (e.type === 'food' && ctx.currentTime - lastFood > 2 && s.stage < 3) { lastFood = ctx.currentTime; tone(659.25, 1.4, .055, 0, pan); }
      if (e.type === 'pickup') { tone(440, .55, .12); tone(659.25, .8, .08, .12); }
      if (e.type === 'scent') { tone(196, .2, .12, 0, 0, 'triangle'); tone(293.66, .5, .06, .08); }
      if (e.type === 'return' && ctx.currentTime - lastReturn > .7 && s.stage === 2) { lastReturn = ctx.currentTime; tone(329.63, .6, .08, 0, pan); tone(440, 1.1, .07, .13, pan); }
      if (e.type === 'call') { chirp(); if (e.heard) { chirp(.35, -.55, .8); chirp(.72, .55, .9); } }
      if (e.type === 'seed') { tone(587.33, 2.5, .1); tone(880, 3.5, .07, .3, -.3); }
      if (e.type === 'milestone' || e.type === 'perspective') for (let i = 0; i < 4; i++) tone(notes[i + 2], 3, .08, i * .24, (i - 1.5) * .3);
      if (e.type === 'ending') for (let i = 0; i < 8; i++) tone(notes[i], 6, .08, i * .5, (i - 3.5) * .2);
    },
    tick(s) {
      if (!ctx || paused || !enabled) return;
      const now = ctx.currentTime, air = s.stage === 3 || s.stage === 4;
      wind.gain.setTargetAtTime(air ? .1 + s.player.speed / 1500 : .035 + s.player.speed / 1800, now, .6);
      filter.frequency.setTargetAtTime(air ? 800 + s.player.altitude * 400 : s.stage === 2 ? 700 : 260, now, .8);
      if (now > nextChord) {
        nextChord = now + 5.8; const base = [146.83, 196, 164.81, 220, 146.83][s.stage];
        tone(base, 8, .055, 0, -.2); if (s.touched > 10) tone(base * 1.5, 7, .045, .6, .35);
        if (s.life.population > 0) tone(base * 2, 5, .025, 1.1, -.5);
        if (s.harvested > 0) tone(base * 2.5, 5, .022, 1.7, .6);
      }
    }
  };
}
