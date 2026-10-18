const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const mix = (a, b, t) => a + (b - a) * t;

export function createRenderer(canvas) {
  const c = canvas.getContext('2d', {alpha: false}), art = new Image(); art.src = './assets/wetland.png';
  let w = innerWidth, h = innerHeight, dpr = 1, first = true;
  let camera = {x: 450, y: 650, zoom: 2.5}, oldStage = 0, transition = 0;
  let hover = null;
  const palettes = {light: '#a7efe5', green: '#afe5a4', amber: '#efce8c', bird: '#f2e7c4'};
  const particles = Array.from({length: 140}, (_, i) => ({x: noise(i) * 1700, y: noise(i + 50) * 1120,
    z: .1 + noise(i + 90) * .9, phase: noise(i + 800) * TAU}));
  function resize() { w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  resize(); addEventListener('resize', resize);
  function fromScreen(x, y) { return {x: (x - w / 2) / camera.zoom + camera.x, y: (y - h / 2) / camera.zoom + camera.y}; }
  function toScreen(x, y) { return {x: (x - camera.x) * camera.zoom + w / 2, y: (y - camera.y) * camera.zoom + h / 2}; }
  function ellipse(x, y, rx, ry, color, angle = 0) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), angle, 0, TAU); c.fill();
  }
  function glow(x, y, r, color, opacity = 1) {
    if (r < .1 || opacity < .001) return;
    c.save(); c.globalAlpha *= opacity;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, color + '00');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }
  function stroke(x1, y1, x2, y2, color, width = 1) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function terrain(s) {
    const water = c.createLinearGradient(200, 200, 1250, 1050);
    water.addColorStop(0, '#0c2532'); water.addColorStop(.5, '#102e33'); water.addColorStop(1, '#182d2a');
    c.fillStyle = water; c.fillRect(-200, -200, 2100, 1520);
    if (art.complete && art.naturalWidth) { c.save(); c.globalAlpha = .2; c.drawImage(art, 0, 0, 1700, 1120); c.restore(); }
    for (const g of s.gardens) {
      const cx = g.x + (g.cols - 1) * g.cell / 2, cy = g.y + (g.rows - 1) * g.cell / 2;
      ellipse(cx, cy, g.cols * g.cell * .7, g.rows * g.cell * .75, g.water < .3 ? '#8b755c45' : '#42654b40');
      glow(cx, cy, g.cols * g.cell * .8, g.health ? '#94bd77' : '#658b85', .12);
      c.strokeStyle = g.id === s.selectedGarden ? '#e1d1a17c' : '#90bdaa39';
      c.lineWidth = 1; c.setLineDash([4, 7]); c.strokeRect(g.x - 6, g.y - 6, g.cols * g.cell, g.rows * g.cell); c.setLineDash([]);
      if (g.light > 1) glow(cx, cy, 140, '#8dded0', Math.min(.2, g.light * .012));
    }
    for (const r of s.rocks) { ellipse(r.x + 4, r.y + 5, r.r + 2, r.r * .8, '#071b2266'); ellipse(r.x, r.y, r.r, r.r * .9, '#63726b'); ellipse(r.x - 6, r.y - 7, r.r * .65, r.r * .55, '#88908644'); }
    // Continuous terrain lets a microscope-sized neighbourhood remain a place in the aerial view.
    for (let i = 0; i < 12; i++) {
      const spread = i * 4;
      ellipse(990, 739, 365 + spread, 144 + spread, i % 2 ? '#31413b13' : '#68715a0b', -.12);
    }
    ellipse(1060, 740, 265, 130, '#3b4433aa', -.13);
    ellipse(1155, 744, 170, 105, '#48503a77', -.17);
    ellipse(816, 730, 209, 139, '#2e564233', -.06);
    glow(812, 725, 280, '#568569', .1 + Math.min(.18, s.biomass * .001));
    glow(455, 650, 195, '#2a9f9f', .09 + s.fertility * .12);
    glow(s.returnSite.x, s.returnSite.y, 130, '#618b68', .12);
    for (let i = 0; i < 280; i++) {
      const x = 650 + noise(i + 24) * 630, y = 565 + noise(i + 812) * 340;
      const shore = ((x - 1020) / 340) ** 2 + ((y - 745) / 155) ** 2;
      if (shore > 1) continue;
      ellipse(x, y, .5 + noise(i + 2) * 2.4, .5 + noise(i + 3) * 1.3, i % 3 ? '#bab99819' : '#0b201c44');
    }
    for (let i = 0; i < 100; i++) {
      const x = noise(i + 300) * 1700, y = noise(i + 600) * 1120, len = 8 + noise(i + 800) * 20;
      c.strokeStyle = '#a7d9cf0d'; c.lineWidth = .55; c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + len / 2, y + Math.sin(s.time * .4 + i) * 3, x + len, y); c.stroke();
    }
    // Root filaments are structural scenery; active cell connections are drawn separately.
    for (let i = 0; i < 48; i++) {
      const x = 640 + noise(i + 810) * 380, y = 600 + noise(i + 12) * 240;
      c.strokeStyle = '#c5ce9f0b'; c.lineWidth = .65; c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + 17, y - 13, x + 23, y + 15, x + 48, y - 6); c.stroke();
    }
  }
  function microbes(s) {
    for (const n of s.nodes) {
      const g = n.glow, r = n.size * (1 + g * .15), scale = 1 + Math.sin(s.time + n.drift) * .045;
      glow(n.x, n.y, 19 + g * 16, '#9be8d6', .035 + g * .23);
      c.save(); c.translate(n.x, n.y); c.rotate(n.drift + Math.sin(s.time * .2) * .3); c.scale(scale, 1 / scale);
      c.fillStyle = n.touched ? '#265c58' : '#244a4d'; c.strokeStyle = n.touched ? '#b0ebcfa0' : '#79a8a878'; c.lineWidth = .65;
      c.beginPath(); c.ellipse(0, 0, r, r * .73, .2, 0, TAU); c.fill(); c.stroke();
      ellipse(-r * .13, .3, r * .42, r * .37, n.touched ? '#bde8bd55' : '#b5cfab2b');
      ellipse(r * .2, -r * .15, 1.1 + g * 1.2, 1.1 + g * 1.2, g > .3 ? '#e3fff0' : '#a1c2ac');
      for (let j = 0; j < 3; j++) {
        c.strokeStyle = '#91ccc345'; c.lineWidth = .4; c.beginPath(); c.moveTo(-r * .7, (j - 1) * 2);
        c.quadraticCurveTo(-r - 3, (j - 1) * 3 + Math.sin(s.time * 2 + j) * 2, -r - 7, (j - 1) * 4); c.stroke();
      }
      c.restore();
    }
  }
  function garden(l, t) {
    for (let y = 0; y < l.rows; y++) for (let x = 0; x < l.cols; x++) {
      const i = y * l.cols + x, age = l.age[i], memory = l.memory[i];
      if (memory < .015) continue;
      const px = l.x + x * l.cell, py = l.y + y * l.cell, size = l.cell * (.14 + age * .24);
      glow(px, py, 12 + l.bloom[i] * 10, '#addc88', age * .12 + l.bloom[i] * .12);
      if (x < l.cols - 1 && l.age[i + 1] > .15) stroke(px, py, px + l.cell, py, '#9cca7c55', .65);
      if (y < l.rows - 1 && l.age[i + l.cols] > .15) stroke(px, py, px, py + l.cell, '#9cca7c55', .65);
      c.save(); c.translate(px, py); c.rotate(Math.sin(x * 3 + y) * .8 + t * .025);
      c.globalAlpha = .1 + memory * .9;
      for (let petal = 0; petal < 4; petal++) {
        c.rotate(TAU / 4); ellipse(size * .55, 0, size, size * .5, age > .5 ? (l.soil < .14 ? '#a49770' : '#a3c991') : '#56735b');
        stroke(0, 0, size * 1.2, 0, '#e6ecc050', .4);
      }
      ellipse(0, 0, 1 + l.bloom[i] * 1.6, 1 + l.bloom[i] * 1.6, '#f0efc8'); c.restore();
    }
  }
  function drawAnt(a, t, player = false) {
    const size = player ? 1.3 : 1, walking = player ? a.speed > 2 : true;
    c.save(); c.translate(a.x, a.y); c.rotate(a.angle); c.scale(size, size);
    const color = player ? '#f4d99b' : a.carrying ? '#c7a875' : '#82968a';
    ellipse(-3, 2.5, 7, 3.5, '#04171355');
    c.strokeStyle = color; c.lineWidth = .8;
    for (let j = 0; j < 3; j++) for (const side of [-1, 1]) {
      const step = walking ? Math.sin(t * 15 + j * 2 + side) * 1.7 : 0;
      c.beginPath(); c.moveTo(1 - j * 2, 0); c.lineTo(3 - j * 3 + step, side * 4);
      c.lineTo(1 - j * 4 + step, side * 6.5); c.stroke();
    }
    ellipse(-4.5, 0, 4, 2.6, color); ellipse(.5, 0, 2.6, 1.7, color); ellipse(4.2, 0, 2.4, 2, color);
    stroke(5, -1, 8, -4, color, .6); stroke(5, 1, 8, 4, color, .6);
    if (a.compost) { glow(9, 0, 11, '#b6e49b', .2); ellipse(8.5, 0, 4, 3, '#b6e49b'); }
    if (a.carrying || a.cargo) {
      glow(9, 0, 9, '#eecb82', .14); ellipse(8.5, 0, 4, 2.6, '#f6d79b', -.4);
      stroke(6, 1, 11, -1, '#a68a53', .7);
    }
    c.restore();
    if (a.response > .25) { c.strokeStyle = '#dbc48d60'; c.lineWidth = .5; c.beginPath(); c.arc(a.x, a.y, 11, -1, 1); c.stroke(); }
  }
  function pathsAndFood(s) {
    for (let i = 0; i < s.foodField.length; i++) {
      const strength = s.foodField[i]; if (strength < .18) continue;
      const x = i % s.fieldCols * 20 + 10, y = Math.floor(i / s.fieldCols) * 20 + 10;
      c.save(); c.globalAlpha = Math.min(.48, strength * .055);
      ellipse(x, y, 12, 10, '#c5ae68'); c.restore();
      if (strength > .8) {
        stroke(x - 4, y, x + 4, y + 1, '#f6d28c55', .7);
        ellipse(x + Math.sin(i) * 5, y + Math.cos(i) * 5, .8, .8, '#e6c98a99');
      }
    }
    const n = s.nest;
    ellipse(n.x + 4, n.y + 5, 24, 17, '#071d1c55'); ellipse(n.x, n.y, 23, 16, '#62705a');
    ellipse(n.x, n.y - 1, 15, 10, '#243d32'); ellipse(n.x, n.y - 3, 8, 6, '#0a2424');
    for (let i = 0; i < Math.min(20, s.compost); i++) {
      const a = i * 2.4, r = 28 + noise(i + 40) * 20;
      ellipse(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r * .6, 2.7, 1.6, '#b0c18c', a);
    }
    for (const f of s.food) {
      if (f.amount <= 0 && f.seeds <= 0) continue;
      const travel = Math.min(1, f.age / 1.2), x = mix(f.from.x, f.x, travel), y = mix(f.from.y, f.y, travel) - Math.sin(travel * Math.PI) * 20;
      glow(x, y, 18, '#dcd58b', .25);
      if (f.seeds > 0) { c.strokeStyle = '#e0c175'; c.lineWidth = .8; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 10); c.stroke(); ellipse(x, y - 11, 2.4, 4, '#f5d98a'); }
      for (let j = 0; j < Math.min(7, f.amount); j++) {
        const a = j * 2.4, r = Math.sqrt(j) * 3;
        ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, 3.2, 2, '#f3dca4', a);
      }
    }
    for (const a of s.ants) drawAnt(a, s.time);
    if (s.stage !== 2) drawAnt(s.bodies[2], s.time);
  }
  function reeds(s) {
    const count = 20 + Math.min(70, s.harvested * 4);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399, r = 30 + noise(i + 20) * 90;
      const x = s.nest.x + Math.cos(a) * r, y = s.nest.y + Math.sin(a) * r * .65;
      const growth = i < 20 ? .4 : Math.min(1, s.harvested / 8), len = (10 + noise(i + 50) * 22) * growth;
      const sway = Math.sin(s.time + i) * 3;
      c.strokeStyle = '#a7b57c88'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x - 2, y - len * .6, x + sway, y - len); c.stroke();
      // Decorative reeds are not seed resources; actual seeds are drawn at their source plants.
    }
  }
  function bird(b, t, player = false, shadow = false) {
    const near = .7 + b.altitude * .7, size = (player ? 15 : 9.5) * near;
    const wing = .65 + Math.sin(b.wing) * .29, bank = clamp(b.bank, -.8, .8);
    c.save(); c.translate(b.x + (shadow ? 10 + b.altitude * 10 : 0), b.y + (shadow ? 13 + b.altitude * 20 : 0));
    c.rotate(b.angle); c.scale(1, 1 - Math.abs(bank) * .56);
    c.fillStyle = shadow ? '#03151c2b' : player ? '#f8e8b8' : b.influence > .2 ? '#f2e8bb' : '#c4d2cf';
    c.beginPath(); c.moveTo(size * .7, 0);
    c.quadraticCurveTo(size * .08, -size * .2, -size * .5, -size * wing);
    c.lineTo(-size * .84, -size * wing * .9); c.quadraticCurveTo(-size * .5, -size * .2, -size * .4, -size * .1);
    c.lineTo(-size * .9, -size * .14); c.lineTo(-size * .67, 0); c.lineTo(-size * .9, size * .14);
    c.lineTo(-size * .4, size * .1); c.quadraticCurveTo(-size * .5, size * .2, -size * .84, size * wing * .9);
    c.lineTo(-size * .5, size * wing); c.quadraticCurveTo(size * .08, size * .2, size * .7, 0); c.fill();
    if (!shadow) {
      stroke(size * .45, 0, -size * .45, 0, '#fcf6da77', .65);
      ellipse(size * .35, 0, size * .12, size * .12, '#fff4d6');
      if (b.seed) { ellipse(-size * .25, 0, 3.4, 2, '#ffc674'); }
    }
    c.restore();
  }
  function players(s, aerial = false) {
    const p = s.player, t = s.time;
    // Distant birds exist above the macro view but cannot obscure its interaction.
    if (s.stage >= 3 || aerial) {
      if (s.stage !== 3) bird(s.bodies[3], t);
      for (const b of s.birds) bird(b, t, false, true);
      if (s.stage === 3) bird(p, t, true, true);
      for (const b of [...s.birds].sort((a, b) => a.altitude - b.altitude)) bird(b, t);
    }
    if (s.stage === 4) return;
    if (p.trail.length > 1) {
      c.strokeStyle = s.stage === 2 ? '#e7bd7955' : '#bfebce38'; c.lineWidth = s.stage === 2 ? 2 : .7;
      c.beginPath(); p.trail.forEach((a, i) => i ? c.lineTo(a.x, a.y) : c.moveTo(a.x, a.y)); c.stroke();
    }
    if (s.stage === 0) {
      glow(p.x, p.y, 32 + p.glow * 20, '#ffe7ac', .12 + p.glow * .3);
      c.save(); c.translate(p.x, p.y); c.rotate(p.angle);
      ellipse(0, 0, 8.5, 6.2, '#6b8772'); c.strokeStyle = '#fff1bd'; c.lineWidth = 1.1;
      c.beginPath(); c.ellipse(0, 0, 8.5, 6.2, 0, 0, TAU); c.stroke();
      ellipse(1, 0, 3 + p.glow * 1.3, 3 + p.glow * 1.3, '#fff3ce');
      c.strokeStyle = '#efdda999'; c.lineWidth = .6; c.beginPath(); c.moveTo(-8, 0);
      c.bezierCurveTo(-14, -3, -15, Math.sin(t * 6) * 4, -22, Math.sin(t * 6 + 1) * 3); c.stroke(); c.restore();
    } else if (s.stage === 1) {
      glow(p.x, p.y, 22, '#e7ebb2', .22); ellipse(p.x, p.y, 4.3, 3, '#f2e7ba', t * .4);
      const offsets = s.pattern === 0 ? [[0,-1],[1,0],[-1,1],[0,1],[1,1]] : s.pattern === 1 ? [[-2,0],[-1,0],[0,0],[1,0],[2,0],[0,-1],[0,1]] : [[-1,-1],[0,-1],[-1,0],[0,0],[2,1],[3,1],[2,2],[3,2]];
      const l = s.gardenAt(p.x, p.y);
      if (l) { const x = l.x + clamp(Math.round((p.x - l.x) / l.cell), 3, l.cols - 5) * l.cell,
        y = l.y + clamp(Math.round((p.y - l.y) / l.cell), 3, l.rows - 5) * l.cell;
      for (const [dx, dy] of offsets) { c.strokeStyle = '#e6eab763'; c.lineWidth = .65; c.beginPath(); c.arc(x + dx * l.cell, y + dy * l.cell, 4.5, 0, TAU); c.stroke(); } }
    } else if (s.stage === 2) drawAnt(p, t, true);
    else bird(p, t, true);
    const r = s.stage === 3 ? 26 : s.stage === 2 ? 16 : 14;
    c.strokeStyle = '#fff1c077'; c.lineWidth = .7 / Math.max(.8, camera.zoom); c.setLineDash([3, 4]);
    c.beginPath(); c.arc(p.x, p.y, r, -.8 + t * .18, 3.8 + t * .18); c.stroke(); c.setLineDash([]);
  }
  function feedback(s) {
    for (const link of s.links) {
      const food = link.kind === 'food', duration = food ? 3 : 1.4;
      const alpha = Math.max(0, 1 - link.age / duration), color = palettes[link.kind] || palettes.amber;
      c.save(); c.globalAlpha = alpha * .7; c.strokeStyle = color; c.lineWidth = .7;
      c.beginPath(); c.moveTo(link.a.x, link.a.y); c.lineTo(link.b.x, link.b.y); c.stroke();
      const t = clamp(link.age / (food ? 1.2 : .4), 0, 1);
      ellipse(mix(link.a.x, link.b.x, t), mix(link.a.y, link.b.y, t), food ? 2.8 : 1.7, food ? 2.8 : 1.7, color); c.restore();
    }
    for (const wave of s.waves) {
      c.save(); c.globalAlpha = Math.max(0, 1 - wave.age / 1.8) * .55;
      c.strokeStyle = palettes[wave.kind] || palettes.amber; c.lineWidth = .8;
      c.beginPath(); c.arc(wave.x, wave.y, wave.max * (1 - Math.exp(-wave.age * 2.2)), 0, TAU); c.stroke(); c.restore();
    }
    for (const p of s.sparks) {
      c.save(); c.globalAlpha = Math.max(0, 1 - p.age / p.life); ellipse(p.x, p.y, p.size, p.size, palettes[p.kind] || palettes.amber); c.restore();
    }
    for (const f of s.falling) { const progress = f.age / f.life; ellipse(f.x, f.y - (1 - progress) * 44, 3.5, 1.9, '#f4d38e', progress * TAU); }
    for (const seed of s.seedlings) {
      const progress = Math.min(1, seed.age / 7);
      glow(seed.x, seed.y, 16, '#bad98b', .22);
      stroke(seed.x, seed.y, seed.x + 2, seed.y - 5 - progress * 10, '#d7e6a0', 1);
      c.strokeStyle = '#e5e3a477'; c.lineWidth = 1; c.beginPath(); c.arc(seed.x, seed.y, 11, -Math.PI / 2, -Math.PI / 2 + progress * TAU); c.stroke();
    }
  }
  function label(x, y, text, color = '#d6e6cd', sub = '') {
    const p = toScreen(x, y); if (p.x < -100 || p.x > w + 100 || p.y < -40 || p.y > h + 50) return;
    c.save(); c.textAlign = 'center'; c.font = '12px "PingFang SC", sans-serif';
    c.shadowColor = '#041419'; c.shadowBlur = 8; c.fillStyle = color; c.fillText(text, p.x, p.y);
    if (sub) { c.font = '10px "PingFang SC", sans-serif'; c.fillStyle = '#abc5ba'; c.fillText(sub, p.x, p.y + 18); } c.restore();
  }
  function guidance(s, wide) {
    // A persistent numbered place marker survives transient story / call messages.
    const tracked = s.contribution().filter(r => r.kind === '播种' || r.kind === '携种');
    for (const r of tracked) label(r.x, r.y - 18, `${r.kind} #${r.id}`, '#a7efe5');
    if (!wide && s.stage === 3 && s.player.seed) label(s.player.x + s.wind.x * .49, s.player.y + s.wind.y * .49 + 25, '当前落种点 · 随风漂移', '#a7efe5');

    if (wide || s.stage === 4) {
      for (const g of s.gardens) label(g.x + g.cols * g.cell / 2, g.y - 27, g.name + (g.health ? ' · 生机延续' : ''), '#e5e9cb', `湿${Math.round(g.water * 100)}% · 肥${Math.round(g.soil * 100)}% · ${g.mature}株成熟`);
      label(s.origin.x, s.origin.y + 70, '微光', '#c1ebe1', s.memory[0]);
      label(s.nest.x, s.nest.y + 67, '巢穴', '#e3d5a1', `累计食物 ${s.harvested} · 待搬养分 ${s.compost}`);
      return;
    }
    const goal = s.goal().target, q = toScreen(goal.x, goal.y), p = toScreen(s.player.x, s.player.y);
    const inside = q.x > 90 && q.x < w - 90 && q.y > 220 && q.y < h - 190;
    if (inside) {
      if (Math.hypot(q.x - p.x, q.y - p.y) > 45) {
        c.strokeStyle = '#dddcad88'; c.lineWidth = 1; c.beginPath(); c.arc(q.x, q.y, 18 + Math.sin(s.time * 2) * 2, -.5, 4.6); c.stroke();
      }
      label(goal.x, goal.y - 25 / camera.zoom, goal.label, '#eee4ba');
    } else {
      const a = Math.atan2(q.y - h / 2, q.x - w / 2), rx = Math.max(50, w / 2 - 65), ry = Math.max(45, h / 2 - 175);
      const r = 1 / Math.max(Math.abs(Math.cos(a)) / rx, Math.abs(Math.sin(a)) / ry);
      const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#e6d5a5'; c.beginPath(); c.moveTo(6, 0); c.lineTo(-5, -4); c.lineTo(-3, 0); c.lineTo(-5, 4); c.fill(); c.restore();
      c.font = '11px "PingFang SC",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#e0d2ae'; c.fillText(goal.label, clamp(x, 95, w - 95), y + 21);
    }
    if (s.stageAge < 8) {
      c.font = '11px "PingFang SC",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff0c6'; c.fillText('你在这里', p.x, p.y + 36);
      stroke(p.x, p.y + 18, p.x, p.y + 25, '#fff0c688', 1);
    }
    if (s.stage === 2) label(s.nest.x, s.nest.y - 32, '巢穴', '#e7d6ab');
  }
  function depth(s, menu) {
    // Foreground motes have their own parallax; they do not convey gameplay state.
    for (const p of particles) {
      const factor = 1 + p.z * .14;
      const x = (p.x - camera.x) * camera.zoom * factor + w / 2 + Math.sin(s.time * .2 + p.phase) * 12;
      const y = (p.y - camera.y) * camera.zoom * factor + h / 2 + Math.cos(s.time * .15 + p.phase) * 8;
      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) continue;
      const size = (.7 + p.z * 2) * (s.stage < 2 ? 1.5 : 1);
      glow(x, y, size * 4, '#a5cab8', p.z > .6 ? .045 : .025);
      ellipse(x, y, size * .3, size * .3, '#c6ddbe28');
    }
    const v = c.createRadialGradient(w * .52, h * .52, Math.min(w, h) * .15, w / 2, h / 2, Math.max(w, h) * .75);
    v.addColorStop(0, '#03141a00'); v.addColorStop(1, menu ? '#03141ab8' : '#03141a86');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
  return {resize, fromScreen, setHover(p) { hover = p; }, reset() { first = true; oldStage = 0; transition = 0; },
    draw(s, dt, {menu = false, wide = false, reduced = false} = {}) {
      if (oldStage !== s.stage) { transition = 1; oldStage = s.stage; }
      transition = Math.max(0, transition - dt * .35);
      const overview = wide || s.stage === 4, fit = Math.min(w / s.width, Math.max(180, h - 190) / s.height) * .9;
      const base = [2.8, 2.15, 2.05, .85, fit][s.stage];
      const responsive = w < 700 ? Math.max(.56, w / 700) : Math.min(1.25, w / 1250);
      let zoom = overview ? fit : base * responsive;
      let targetX = s.player.x, targetY = s.player.y;


      if (s.stage === 2) { const goal = s.goal().target; targetX = mix(s.player.x, goal.x, .18); targetY = mix(s.player.y, goal.y, .18); }
      if (s.stage === 3) { targetX += Math.cos(s.player.angle) * 80; targetY += Math.sin(s.player.angle) * 55; zoom *= 1.09 - s.player.altitude * .15; }
      if (s.focus && s.focus.until > s.time && !overview && s.stage !== 3) {
        const weight = .18 * Math.min(1, s.focus.until - s.time); targetX = mix(targetX, s.focus.x, weight); targetY = mix(targetY, s.focus.y, weight);
      }
      if (menu) { targetX = 435; targetY = 650; zoom = Math.max(1.25, w / 620); }
      if (overview) { targetX = 835; targetY = 572; }
      targetY -= (w > 700 ? 22 : 30) / zoom;
      const speed = reduced ? 8 : transition > 0 ? .95 : 3;
      const smooth = 1 - Math.exp(-dt * speed);
      if (first) { camera = {x: targetX, y: targetY, zoom}; first = false; }
      else { camera.x += (targetX - camera.x) * smooth; camera.y += (targetY - camera.y) * smooth; camera.zoom += (zoom - camera.zoom) * (1 - Math.exp(-dt * (reduced ? 8 : 1.25))); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#081f29'; c.fillRect(0, 0, w, h);
      c.save(); c.translate(w / 2 - camera.x * camera.zoom, h / 2 - camera.y * camera.zoom); c.scale(camera.zoom, camera.zoom);
      terrain(s); microbes(s); for (const g of s.gardens) garden(g, s.time); pathsAndFood(s); reeds(s); feedback(s); players(s, overview); c.restore();
      depth(s, menu); if (!menu) guidance(s, overview);
      if (!menu && hover && s.stage < 3) { const q = toScreen(hover.x, hover.y); c.strokeStyle = '#d4e2c955'; c.lineWidth = 1; c.beginPath(); c.arc(q.x, q.y, 6, 0, TAU); c.stroke(); }
    }
  };
}
