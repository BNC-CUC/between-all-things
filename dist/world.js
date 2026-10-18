const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Every view reads and changes this one world. Camera changes never mint or discard cargo.
export function createWorld(seed = 1771) {
  let rng = seed >>> 0;
  const random = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  function garden(id, name, x, y, cols, rows, cell, water, soil) {
    const size = cols * rows;
    return {id, name, x, y, cols, rows, cell, baseWater: water, water, soil,
      values: new Uint8Array(size), age: new Float32Array(size), memory: new Float32Array(size),
      depth: new Uint8Array(size), fruited: new Uint8Array(size), ancestry: Array.from({length: size}, () => []),
      bloom: new Float32Array(size), maturity: new Float32Array(size), yieldClock: new Float32Array(size),
      clock: 0, generation: 0, population: 0, mature: 0, births: 0, light: 0,
      nourished: 0, immigrant: 0, stable: 0, health: false, reproductive: 0, lastBirth: -1000};
  }
  const life = garden(0, '近岸', 700, 638, 22, 16, 12, .56, .73);
  const newborn = garden(1, '微光湾', 420, 397, 18, 14, 12, .77, .32);
  const far = garden(2, '风中洲', 1190, 353, 19, 15, 12, .34, .08);
  const gardens = [life, newborn, far];
  const center = g => ({x: g.x + (g.cols - 1) * g.cell / 2, y: g.y + (g.rows - 1) * g.cell / 2});
  const nest = {x: 1090, y: 760}, origin = {x: 459, y: 634}, returnSite = center(newborn);
  const body = (x, y, angle = 0) => ({x, y, angle, vx: 0, vy: 0, speed: 0, bank: 0,
    wing: 0, phase: .5, glow: 1, cargo: false, seed: null, altitude: .6, trail: [],
    compost: false, carrying: false, response: 0, task: 'food', target: 0, guided: false});
  const bodies = [body(467, 629), body(826, 731), body(nest.x, nest.y, Math.PI), body(920, 700, -2.4)];
  Object.assign(bodies[2], {id: 32, worker: false, speed: 43});
  bodies[3].speed = 96;
  const s = {version: 401, seed, width: 1700, height: 1120, time: 0, stage: 0, maxStage: 3, stageAge: 0,
    life, newborn, gardens, nest, origin, returnSite, bodies, player: bodies[0],
    nodes: [], ants: [], birds: [], food: [], waves: [], links: [], sparks: [], falling: [], seedlings: [], events: [],
    rocks: [{x: 1000, y: 680, r: 29}, {x: 1040, y: 520, r: 37}],
    fieldCols: 85, fieldRows: 56, foodField: new Float32Array(85 * 56),
    homeField: new Float32Array(85 * 56), playerField: new Float32Array(85 * 56),
    ready: [false, false, false, false], cooldown: 0, secondaryCooldown: 0,
    touched: 0, order: 0, fertility: .3, biomass: 0, plantBudget: 5, pattern: 0,
    blooms: 0, harvested: 0, playerReturns: 0, antReturns: 0, guidedReturns: 0, compost: 2,
    returnedSeeds: 0, crossSeeds: 0, flockReached: new Set(), pulseCount: 0, planted: 0,
    plantedSites: new Set(), started: false, completed: false, endingSeen: false, goalHold: 0,
    endTime: 0, completionProof: null, focus: null, selectedGarden: 2, weather: '暖雨', wind: {x: 5, y: -2},
    stats: {signals: 0, plants: 0, seeds: 0, nourished: 0, failedSeeds: 0, playerActions: 0, playerNourished: 0, playerSeedGrown: 0},
    traces: [], traceSerial: 0, scentTurns: 0, callTurns: 0, journal: [], timeline: [], memory: ['随时进入', '随时进入', '随时进入', '随时进入']};
  const patterns = [
    [[0,-1],[1,0],[-1,1],[0,1],[1,1]],
    [[-2,0],[-1,0],[0,0],[1,0],[2,0],[0,-1],[0,1]],
    [[-1,-1],[0,-1],[-1,0],[0,0],[2,1],[3,1],[2,2],[3,2]]
  ];
  const patternNames = ['游走 · 向外拓展', '舒展 · 快速结实', '栖息 · 稳定留存'];
  let serial = 0, antClock = 0, trailClock = 0, logClock = 0, season = -1;
  const queue = [], once = new Set();
  const fieldIndex = (x, y) => clamp(Math.floor(y / 20), 0, 55) * 85 + clamp(Math.floor(x / 20), 0, 84);
  const readField = (f, x, y) => f[fieldIndex(x, y)];
  const deposit = (f, x, y, v) => { const i = fieldIndex(x, y); f[i] = Math.min(20, f[i] + v); };
  function event(type, x, y, extra = {}) { s.events.push({type, x, y, ...extra}); }
  function message(key, title, text, at = null) {
    if (key && once.has(key)) return;
    if (key) once.add(key);
    s.events.push({type: 'story', title, text});
    s.journal.push({time: Math.round(s.time), title, text});
    if (s.journal.length > 60) s.journal.shift();
    if (at) s.focus = {...at, until: s.time + 2};
  }
  function trace(kind, x, y, text) {
    const r = {id: ++s.traceSerial, kind, x, y, originX: x, originY: y, time: s.time, status: text, history: [{time: Math.round(s.time), text}], births: 0, fruits: 0};
    s.traces.push(r); return r;
  }
  function traceUpdate(id, text, at = null) {
    const r = s.traces.find(r => r.id === id); if (!r) return;
    r.status = text; if (at) { r.x = at.x; r.y = at.y; }
    r.history.push({time: Math.round(s.time), text});
    if (r.history.length > 12) r.history.shift();
  }
  const mergeTags = lists => [...new Set(lists.flat())];
  function noteLineage(tags, kind, at) {
    for (const id of tags) {
      const r = s.traces.find(r => r.id === id); if (!r) continue;
      r[kind]++;
      r.status = `参与谱系：${r.births}次后代新生 · ${r.fruits}次结实（共享环境与其他亲本）`;
      if (r[kind] === 1) r.history.push({time: Math.round(s.time), text: kind === 'births' ? '首次观察到同谱系后代' : '首次观察到同谱系结实'});
    }
  }
  function wave(x, y, max = 70, kind = 'light') { s.waves.push({x, y, age: 0, max, kind}); }
  function particle(x, y, count, kind = 'light') {
    for (let i = 0; i < count; i++) {
      const a = random() * TAU, v = 8 + random() * 25;
      s.sparks.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0,
        life: 1 + random(), size: 1 + random() * 2, kind});
    }
  }
  const containing = (x, y, margin = 0) => gardens.find(g => x >= g.x - margin && y >= g.y - margin && x <= g.x + (g.cols - 1) * g.cell + margin && y <= g.y + (g.rows - 1) * g.cell + margin);
  const nearestGarden = p => gardens.reduce((best, g) => distance(p, center(g)) < distance(p, center(best)) ? g : best);
  const nearestFood = (p, radius = Infinity, seeds = false) => {
    let best = null, d = radius;
    for (const f of s.food) if ((seeds ? f.seeds : f.amount) > 0) {
      const n = distance(p, f); if (n < d) { d = n; best = f; }
    }
    return best;
  };
  function mark(stage, title, text) {
    if (s.ready[stage]) return;
    s.ready[stage] = true; event('milestone', s.player.x, s.player.y, {stage});
    message('mark-' + stage, title, text);
  }
  function sow(g, x, y, motif, count = false, tags = []) {
    const cx = clamp(Math.round((x - g.x) / g.cell), count ? 3 : 0, count ? g.cols - 5 : g.cols - 1);
    const cy = clamp(Math.round((y - g.y) / g.cell), count ? 3 : 0, count ? g.rows - 5 : g.rows - 1);
    const plantedAt = {x: g.x + cx * g.cell, y: g.y + cy * g.cell};
    const record = count ? trace('播种', plantedAt.x, plantedAt.y, g.name + ' · 等待萌发') : null;
    if (record) tags = mergeTags([tags, [record.id]]);
    let added = 0;
    for (const [dx, dy] of patterns[motif]) {
      if (cx + dx < 0 || cx + dx >= g.cols || cy + dy < 0 || cy + dy >= g.rows) continue;
      const i = (cy + dy) * g.cols + cx + dx;
      // Occupied cells keep their existing ancestry and age: overlapping sowing cannot claim them.
      if (g.values[i]) continue;
      g.values[i] = 1; g.maturity[i] = .1; g.depth[i] = 0; g.fruited[i] = 0;
      g.ancestry[i] = [...tags]; g.births++; added++;
      g.age[i] = .4; g.memory[i] = 1; g.bloom[i] = 1;
    }
    if (record) record.established = added > 0;
    if (record) traceUpdate(record.id, added ? `${g.name} · ${added}处萌发，等待成熟结实` : '落点已被占据，没有新增植株');
    if (count) { s.stats.plants++; s.planted++; s.plantedSites.add(`${g.id}:${cx},${cy}`); }
    const p = {x: g.x + cx * g.cell, y: g.y + cy * g.cell};
    wave(p.x, p.y, 45, 'green'); particle(p.x, p.y, 8, 'green'); event('plant', p.x, p.y);
    return added;
  }
  for (let group = 0; group < 3; group++) {
    const g = gardens[group], p = {x: center(g).x, y: g.y + g.rows * g.cell + 30};
    for (let i = 0; i < 28; i++) {
      const a = random() * TAU, r = Math.sqrt(random()) * 70;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * .65;
      s.nodes.push({id: s.nodes.length, group, x, y, homeX: x, homeY: y, phase: random() * TAU,
        omega: .88 + random() * .1, glow: 0, touched: false, echo: -1, respond: 0,
        size: 3.8 + random() * 3.4, drift: random() * TAU});
    }
  }
  // Near-shore spores also have light neighbours: local rules, no remote global unlock.
  for (let i = 0; i < 14; i++) {
    const p = center(life), x = p.x + (random() - .5) * 170, y = life.y + life.rows * life.cell + random() * 35;
    s.nodes.push({id: s.nodes.length, group: 0, x, y, homeX: x, homeY: y, phase: random() * TAU,
      omega: .9, glow: 0, touched: false, echo: -1, respond: 0, size: 4 + random() * 2, drift: random() * TAU});
  }
  function emit(n, phase, id, from) {
    if (n.echo >= id) return;
    n.echo = id; n.phase = phase; n.respond = 1; n.glow = 1;
    if (!n.touched) { n.touched = true; s.touched++; }
    if (from) s.links.push({a: {...from}, b: {x: n.x, y: n.y}, age: 0, kind: 'light'});
    for (const g of gardens) if (distance(n, center(g)) < 200) g.light = Math.min(20, g.light + .35);
    for (const other of s.nodes) if (other.id !== n.id && other.echo < id && distance(n, other) < 52) {
      // Only one pending visit per node per pulse keeps the queue bounded.
      if (!queue.some(q => q.id === other.id && q.serial === id)) queue.push({at: s.time + .22, id: other.id, serial: id, phase, from: {x: n.x, y: n.y}});
    }
  }
  function addAnt(i) {
    const a = random() * TAU, b = body(nest.x + Math.cos(a) * 18, nest.y + Math.sin(a) * 15, Math.PI + (random() - .5) * 2);
    Object.assign(b, {id: i, speed: 32 + random() * 11, phase: random() * TAU, worker: i % 4 === 0}); s.ants.push(b);
  }
  function addBird(i) {
    const a = random() * TAU, b = body(880 + Math.cos(a) * 160, 680 + Math.sin(a) * 110, a);
    Object.assign(b, {id: i, speed: 70 + random() * 20, influence: 0, heard: 0, wing: random() * TAU, seedAge: 0}); s.birds.push(b);
  }
  for (let i = 0; i < 32; i++) addAnt(i);
  for (let i = 0; i < 26; i++) addBird(i);
  sow(life, 796, 710, 2); sow(life, 868, 770, 1);
  sow(newborn, 516, 469, 2); // Far shore starts bare: no local seed bank, and mineral recovery alone cannot restore fertility.
  s.events.length = 0;

  function receiveFood(a, byPlayer) {
    a.cargo = a.carrying = false; s.harvested++; s.compost++;
    if (byPlayer) { s.playerReturns++; trace('搬食', nest.x, nest.y, '亲手运回1份食物，转成巢穴待搬养分'); } else { s.antReturns++; if (a.guided) { s.guidedReturns++; if (a.scentTrace) traceUpdate(a.scentTrace, '同伴曾按气味转向，随后带回食物；沿途还有其他线索'); } }
    a.guided = false; wave(nest.x, nest.y, 42, 'amber'); event('return', nest.x, nest.y, {player: byPlayer});
    message('food-home', '食物到了家，养分还可以回到岸边', '巢穴把一份食物转为一份腐殖养分。工蚁会送往贫瘠岸地；你也可以在蚂蚁视角按 E 改为搬养分。', nest);
    mark(2, '食物已回巢，养分有了来源', '路线会随资源分布改变。气味是否被同伴采用，还要看它们实际怎样走。');
  }
  function nourish(a, g, byPlayer) {
    a.compost = false; g.soil = Math.min(1, g.soil + .24); g.nourished++; s.stats.nourished++;
    particle(a.x, a.y, 10, 'green'); wave(a.x, a.y, 70, 'green'); event('plant', a.x, a.y);
    message('nourish-' + g.id, g.name + '收到了搬来的养分', '土壤更肥沃了，成熟植物可以继续结实。把食物一直搬走而不补回养分，岸地会逐渐衰退。', center(g));
    if (byPlayer) {
      s.stats.playerActions++; s.stats.playerNourished++;
      trace('补给', a.x, a.y, `${g.name} · 亲送养分，土壤升至${Math.round(g.soil * 100)}%；后续由共同环境决定`);
    }
  }
  function takeSeed(b) {
    const f = nearestFood(b, 30, true); if (!f) return;
    f.seeds--; b.seed = {source: f.garden, born: s.time, tags: f.seedTags.shift() || []}; b.seedAge = 0;
    if (b === bodies[3] && s.stage === 3) {
      const r = trace('携种', b.x, b.y, '从' + gardens[f.garden].name + '携种，尚未落下');
      b.seed.trace = r.id; b.seed.tags = mergeTags([b.seed.tags, [r.id]]);
    }
    if (b === s.player) { event('pickup', b.x, b.y); message('seed-pickup', '这一粒种子，有自己的来处', '落种不限制在指定圆环。湿度、养分与落点共同决定能否萌发；风会带来少许漂移。'); }
  }
  function dropSeed(b, byPlayer) {
    if (!b.seed) return false;
    s.falling.push({x: b.x, y: b.y, age: 0, life: 1.4, source: b.seed.source, byPlayer, tags: b.seed.tags || [], trace: b.seed.trace || null});
    if (b.seed.trace) traceUpdate(b.seed.trace, '已落种 · 随风下落', b);
    if (!byPlayer && b.callTrace && b.heard > 0) traceUpdate(b.callTrace, '受鸣叫影响的同伴随后落种；萌发还取决于环境', b);
    b.seed = null; event('drop', b.x, b.y); return true;
  }
  function landSeed(f) {
    const g = containing(f.x, f.y);
    if (!g) { if (f.trace) traceUpdate(f.trace, '落入深水，未能萌发', f); s.stats.failedSeeds++; message('seed-water', '种子落进深水，没能扎根', '下一次可以在岸地内侧落种，给风留一点余地。种子不会被传送到安全点。'); return; }
    s.seedlings.push({x: f.x, y: f.y, garden: g.id, source: f.source, age: 0, dry: 0, byPlayer: f.byPlayer, tags: f.tags || [], trace: f.trace || null});
    if (f.trace) traceUpdate(f.trace, g.name + ' · 已着地，等待湿润和养分', f);
    wave(f.x, f.y, 25, 'green'); event('seed', f.x, f.y);
    message('seed-land', '种子到了地面，故事还没结束', '它需要积累湿润与肥沃的时间。你可以去照看别处，再回来看看。');
  }
  s.start = () => {
    s.started = true;
    message('start', '风中洲还是一片空岸', '这里没有植被、养分贫乏。野鸟通常在已有植被的岸地落种，工蚁优先照看已有植物。你可以播种建立落脚处，或携种、引鸟来开拓，再设法补给。目标只看生态是否延续，不规定操作顺序。', center(far));
  };
  s.visit = stage => {
    if (!Number.isInteger(stage) || stage < 0 || stage > 3 || stage === s.stage) return;
    s.stage = stage; s.player = bodies[stage]; s.stageAge = 0; s.cooldown = .3; s.secondaryCooldown = 0;
    event('perspective', s.player.x, s.player.y, {stage});
  };
  s.gardenAt = (x, y) => containing(x, y);
  s.selectGarden = id => {
    if (!gardens[id]) return;
    s.selectedGarden = id; bodies[2].target = id;
    message(null, '留意' + gardens[id].name, '标记只改变方向提示和你携带养分时的目的地，不会移动生命或资源。');
  };
  s.action = () => {
    if (!s.started || s.cooldown > 0) return false;
    const p = s.player; s.stats.playerActions++;
    if (s.stage === 0) {
      s.cooldown = 1.7; s.pulseCount++; s.stats.signals++; p.glow = 1; wave(p.x, p.y, 70);
      let reached = 0; const pulseSerial = ++serial;
      for (const n of s.nodes) if (distance(n, p) < 66) { emit(n, p.phase, pulseSerial, p); reached++; }
      const g = nearestGarden(p);
      if (distance(p, center(g)) < 210) g.light = Math.min(20, g.light + 3);
      trace('微光', p.x, p.y, `${reached}个近邻收到闪光${distance(p, center(g)) < 210 ? ' · ' + g.name + '获得暂时保湿' : ' · 当前不在岸地保湿范围'}`);
      event('pulse', p.x, p.y, {reached});
      message('pulse', '光会传下去，湿润会留一会儿', '回应沿邻居传播，只帮助附近岸地保湿；它不能制造养分或搬运种子。');
      if (!reached) message(null, '身边暂时没有回应', '靠近水边的微光群，再闪一次。');
      if (reached) mark(0, '身边的回应，开始传开', '去另一片岸地时，先前的光仍在自行合拍。');
    } else if (s.stage === 1) {
      const g = containing(p.x, p.y);
      if (!g) { message(null, '这里还没有可以扎根的浅岸', '移向任意一片有名字的岸地。按 V 可以查看它们的位置与环境。'); return false; }
      if (s.plantBudget < 1) { message(null, '让孢子稍稍积蓄', '孢子会缓慢恢复。先照看水分、养分或运输，让已有植物继续生长。'); return false; }
      s.cooldown = 1.2; s.plantBudget--; sow(g, p.x, p.y, s.pattern, true);
      message('sow', '同一片土地，形状也会改变结果', '游走向外拓展，舒展容易聚成密簇，栖息更稳定。拥挤会消退，生长会消耗当地养分。');
    } else if (s.stage === 2) {
      s.cooldown = .75; wave(p.x, p.y, 45, 'amber');
      // Scent is information, never a resource source. An empty route can mislead.
      deposit(s.playerField, p.x, p.y, 5);
      const r = trace('气味', p.x, p.y, '尚未观察到同伴因这段气味改变方向');
      event('scent', p.x, p.y);
      message('scent', '把一条可能的路，留给同伴', '食物仍要真实存在。空路上的浓气味会让同伴白走；持续运输才会维持有用的道路。');
    } else {
      s.cooldown = 1.8; wave(p.x, p.y, 160, 'bird'); let heard = 0;
      for (const b of s.birds) if (distance(b, p) < 160) {
        b.heard = 6; b.influence = 1; s.flockReached.add(b.id); heard++;
        s.links.push({a: {x: p.x, y: p.y}, b: {x: b.x, y: b.y}, age: 0, kind: 'bird'});
      }
      const r = trace('鸣叫', p.x, p.y, `${heard}只听见 · 尚无实际转向记录`);
      for (const b of s.birds) if (distance(b, p) < 160) b.callTrace = r.id;
      event('call', p.x, p.y, {heard});
      message('call', '它们接住的，是你身边的转向', '飞近植物结出的金色种子便能携带；E 落种。鸟不能补回土壤养分，远处的新生仍需要地面上的照顾。');
    }
    return true;
  };
  s.secondary = () => {
    if (!s.started || s.secondaryCooldown > 0) return;
    s.secondaryCooldown = .3;
    if (s.stage === 0) {
      const p = bodies[0], target = s.nodes.filter(n => n.group === s.selectedGarden).reduce((a, b) => distance(p, a) < distance(p, b) ? a : b);
      s.focus = {...target, until: s.time + 3};
      message(null, '光的作用在附近', '按岸地名称选择方向，游向那里的微光群。保湿会慢慢消退，不需要不停闪光。');
    } else if (s.stage === 1) s.pattern = (s.pattern + 1) % 3;
    else if (s.stage === 2) {
      const a = bodies[2];
      if (a.cargo || a.compost) { message(null, '先把身上这一份送到', a.compost ? '进入任意岸地便会把养分还给土壤。标记岸地可以改变方向提示。' : '回巢自动卸下食物；随后可以切换任务。'); return; }
      a.task = a.task === 'food' ? 'compost' : 'food'; a.target = s.selectedGarden;
      message(null, a.task === 'compost' ? '这一趟，把养分送出去' : '这一趟，寻找食物', a.task === 'compost' ? '先在巢穴取养分，再走到你选择的岸地。身上一次只能带一份。' : '靠近植物结出的金色果实拾取，回巢自动放下。');
    } else if (!dropSeed(bodies[3], true)) message(null, '先带上一粒真实的种子', '飞近任意岸地上结出的金色果实。它们的种子与食物是分开的存量。');
  };
  function updateNodes(dt) {
    const old = s.nodes.map(n => n.phase);
    for (let i = 0; i < s.nodes.length; i++) {
      const n = s.nodes[i]; let coupling = 0, count = 0;
      for (let j = 0; j < s.nodes.length; j++) if (i !== j && distance(n, s.nodes[j]) < 55) { coupling += Math.sin(old[j] - old[i]); count++; }
      n.phase = (n.phase + dt * (n.omega + (count ? coupling / count * 1.5 : 0))) % TAU;
      n.respond = Math.max(0, n.respond - dt); n.glow = Math.max(n.respond, Math.pow(Math.max(0, Math.cos(n.phase)), 10));
      n.x = n.homeX + Math.sin(s.time * .27 + n.drift) * 3; n.y = n.homeY + Math.cos(s.time * .32 + n.drift) * 2;
    }
    for (let i = queue.length - 1, n = 0; i >= 0 && n < 180; i--) if (queue[i].at <= s.time) {
      const q = queue.splice(i, 1)[0]; n++; emit(s.nodes[q.id], q.phase + .15, q.serial, q.from);
    }
    const x = s.nodes.reduce((a, n) => a + Math.cos(n.phase), 0), y = s.nodes.reduce((a, n) => a + Math.sin(n.phase), 0);
    s.order = Math.hypot(x, y) / s.nodes.length; s.fertility = s.order;
    bodies[0].phase = (bodies[0].phase + dt * .94) % TAU; bodies[0].glow = Math.max(0, bodies[0].glow - dt);
    s.memory[0] = `${s.touched} 个回应`;
  }
  function evolve(g, dt) {
    g.light = Math.max(0, g.light - dt * .45);
    const rain = s.weather === '暖雨' ? .15 : s.weather === '长风' ? -.19 : -.04;
    const targetWater = clamp(g.baseWater + rain + Math.min(.3, g.light * .025) + Math.min(.08, g.population * .001), .1, 1);
    g.water += (targetWater - g.water) * dt * .12;
    // Passive mineral recovery is deliberately slow and shared by every garden.
    g.soil = clamp(g.soil + (g.soil < .1 ? Math.min(dt * .0008, .1 - g.soil) : 0) - g.population * dt * .000035, 0, 1);
    g.clock += dt;
    for (let i = 0; i < g.values.length; i++) {
      g.age[i] = g.values[i] ? Math.min(1, g.age[i] + dt * .7) : Math.max(0, g.age[i] - dt * .8);
      g.memory[i] = Math.max(g.age[i], g.memory[i] - dt * .04); g.bloom[i] = Math.max(0, g.bloom[i] - dt * .8);
      if (g.values[i]) {
        g.maturity[i] = Math.min(1, g.maturity[i] + dt * g.water * (.25 + g.soil) / 9);
        if (g.maturity[i] > .72 && g.soil > .08 && g.water > .22) {
          g.yieldClock[i] += dt;
          if (g.yieldClock[i] > 10) {
            g.yieldClock[i] = 0;
            const x = g.x + i % g.cols * g.cell, y = g.y + Math.floor(i / g.cols) * g.cell;
            let f = s.food.find(f => f.garden === g.id && f.cell === i);
            if (!f && s.food.filter(f => f.garden === g.id).length < 40) { f = {x, y, from: {x, y}, garden: g.id, cell: i, amount: 0, seeds: 0, seedTags: [], age: 0}; s.food.push(f); }
            if (f && (f.amount < 3 || f.seeds < 3)) {
              f.amount = Math.min(3, f.amount + 1);
              if (f.seeds < 3) { f.seedTags.push([...g.ancestry[i]]); f.seeds++; }
              f.age = 0;
              g.soil = Math.max(0, g.soil - .006); g.fruited[i] = 1; noteLineage(g.ancestry[i], 'fruits', {x, y}); s.blooms++; event('food', x, y); wave(x, y, 22, 'amber');
              message('fruit', '果实就结在生长发生的地方', '蚂蚁搬食物，鸟带种子。改变播种位置，会改变它们寻找与往返的位置。');
              mark(1, '植物结实了，别的生命开始有了去处', '食物和种子都有实际位置与有限存量。');
            }
          }
        }
      } else { g.maturity[i] = 0; g.yieldClock[i] = 0; g.depth[i] = 0; g.fruited[i] = 0; g.ancestry[i] = []; }
    }
    if (g.clock >= 1.4) {
      g.clock -= 1.4; g.generation++;
      const next = new Uint8Array(g.values), nextDepth = new Uint8Array(g.depth), nextTags = g.ancestry.map(a => [...a]), suitable = g.water > .28 && g.soil > .055;
      for (let y = 1; y < g.rows - 1; y++) for (let x = 1; x < g.cols - 1; x++) {
        const i = y * g.cols + x; let neighbours = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) neighbours += g.values[(y + dy) * g.cols + x + dx];
        if (g.values[i]) {
          if (neighbours > 5 || (!suitable && random() < .08) || (neighbours === 0 && random() < .08)) {
            next[i] = 0; g.soil = Math.min(1, g.soil + .001); // Decay returns a little matter in place.
          }
        } else if (suitable && neighbours === 3 && g.soil > .1 && random() < .22) {
          const parents = [];
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const j = (y + dy) * g.cols + x + dx;
            if (g.values[j] && g.maturity[j] > .72 && g.fruited[j]) parents.push(j);
          }
          // A generation is an actual offspring of a mature, fruiting local parent, never a simulation tick.
          if (!parents.length) continue;
          next[i] = 1; nextDepth[i] = Math.min(255, 1 + Math.max(...parents.map(j => g.depth[j])));
          nextTags[i] = mergeTags(parents.map(j => g.ancestry[j]));
          g.maturity[i] = 0; g.fruited[i] = 0; g.births++; g.lastBirth = s.time; g.bloom[i] = 1;
          g.soil = Math.max(0, g.soil - .002);
          noteLineage(nextTags[i], 'births', {x: g.x + x * g.cell, y: g.y + y * g.cell});
        }
      }
      g.values = next; g.depth = nextDepth; g.ancestry = nextTags;
    }
    g.population = g.values.reduce((a, v) => a + v, 0);
    g.mature = g.values.reduce((a, v, i) => a + (v && g.maturity[i] > .72 ? 1 : 0), 0);
    g.reproductive = g.values.reduce((n, v, i) => n + (v && g.depth[i] >= 2 && g.maturity[i] > .72 && g.fruited[i] ? 1 : 0), 0);
    g.health = g.mature >= 4 && g.soil >= .14 && g.water >= .3;
    g.stable = g.health ? g.stable + dt : Math.max(0, g.stable - dt * 2);
    if (g.soil < .14 && g.population) message('poor-' + g.id, g.name + '开始缺养分', '把食物带回巢，再把养分搬到这里。继续密集播种会加快消耗。');
  }
  function updateLife(dt) {
    for (const g of gardens) evolve(g, dt);
    s.plantBudget = Math.min(5, s.plantBudget + dt / 11);
    s.biomass = gardens.reduce((a, g) => a + g.population, 0);
    for (const f of s.food) {
      f.age += dt;
      if (f.age > 55) { const g = gardens[f.garden]; g.soil = Math.min(1, g.soil + f.amount * .004); f.amount = 0; f.seeds = 0; f.seedTags = []; }
    }
    s.food = s.food.filter(f => f.amount > 0 || f.seeds > 0 || f.age < 3);
    for (const seedling of s.seedlings) {
      const g = gardens[seedling.garden];
      if (g.water > .3 && g.soil > .1) seedling.age += dt * (.55 + g.water); else seedling.dry += dt;
      if (seedling.age >= 7) {
        const added = sow(g, seedling.x, seedling.y, 2, false, seedling.tags || []);
        if (seedling.trace) { const r = s.traces.find(r => r.id === seedling.trace); if (r) r.established = added > 0; }
        if (seedling.trace) traceUpdate(seedling.trace, added ? `${g.name} · 已萌发${added}株，等待成熟与后代` : `${g.name} · 落点已占据，未新增植株`, seedling);
        if (!added) { seedling.age = 7; continue; }
        s.returnedSeeds++; s.stats.seeds++;
        if (seedling.source !== g.id) { g.immigrant++; s.crossSeeds++; if (seedling.byPlayer) s.stats.playerSeedGrown++; }
        for (const n of s.nodes) if (distance(n, seedling) < 210) n.respond = Math.max(n.respond, .7);
        wave(seedling.x, seedling.y, 75, 'light');
        event('seed', seedling.x, seedling.y);
        message('germination-' + g.id, g.name + '出现了一片新生', '这次生长来自' + gardens[seedling.source].name + '的种子。新植物也会结出食物与种子，循环已经回到地面。', seedling);
        mark(3, '天空带来的种子，已经扎根', '你可以留下继续参与，也可以随时回望世界的变化。');
      } else if (seedling.dry > 28) { if (seedling.trace) traceUpdate(seedling.trace, g.name + ' · 水分或养分长期不足，萌发失败', seedling); s.stats.failedSeeds++; message('dry-seed', '有一粒种子没能等到合适的土壤', '更湿的落点、微光保湿或蚂蚁补充养分，都可能改变下一次结果。'); }
    }
    s.seedlings = s.seedlings.filter(f => f.age < 7 && f.dry <= 28);
    for (const r of s.traces) if (r.established) {
      const living = gardens.reduce((n, g) => n + g.ancestry.reduce((m, tags, i) => m + (g.values[i] && tags.includes(r.id) ? 1 : 0), 0), 0);
      if (living && !r.fruits) {
        const mature = gardens.reduce((n, g) => n + g.ancestry.reduce((m, tags, i) => m + (g.values[i] && g.maturity[i] > .72 && tags.includes(r.id) ? 1 : 0), 0), 0);
        if (mature) r.status = `${mature}株同谱系植物已成熟，等待结实和后代`;
      }
      if (!living) r.status = '地面暂未发现同谱系活株；仍可能有种子在途，不能认定已延续';
    }
    s.memory[1] = `${s.biomass} 株 · ${s.blooms} 次结实`;
  }
  function moveGround(a, dt) {
    let x = clamp(a.x + Math.cos(a.angle) * a.speed * dt, 300, 1500);
    let y = clamp(a.y + Math.sin(a.angle) * a.speed * dt, 300, 920);
    for (const rock of s.rocks) {
      const d = Math.hypot(x - rock.x, y - rock.y), r = rock.r + 7;
      if (d < r) { const angle = Math.atan2(y - rock.y, x - rock.x); x = rock.x + Math.cos(angle) * r; y = rock.y + Math.sin(angle) * r; a.angle += dt * 3; }
    }
    a.x = x; a.y = y;
  }
  function antContact(a, controlled) {
    if (a.cargo) { if (distance(a, nest) < 24) receiveFood(a, controlled); }
    else if (a.compost) { const g = containing(a.x, a.y); if (g && (controlled || g.id === a.target)) nourish(a, g, controlled); }
    else if (a.task === 'compost') {
      if (distance(a, nest) < 25 && s.compost > 0) { s.compost--; a.compost = true; particle(a.x, a.y, 4, 'green'); }
    } else {
      const f = nearestFood(a, 15);
      if (f) { f.amount--; a.cargo = a.carrying = true; particle(a.x, a.y, 4, 'amber'); if (controlled) event('pickup', a.x, a.y); }
    }
  }
  function updateAnt(a, dt, controlled = false) {
    if (!controlled) {
      if (a === bodies[2]) a.speed = 43;
      let scentCandidate = null, scentBaseline = null;
      let desired = a.angle + Math.sin(s.time * 1.2 + a.phase) * .5;
      if (a.cargo || (a.task === 'compost' && !a.compost)) desired = Math.atan2(nest.y - a.y, nest.x - a.x);
      else if (a.compost) {
        const p = center(gardens[a.target]); desired = Math.atan2(p.y - a.y, p.x - a.x);
      } else {
        const f = nearestFood(a, 125);
        if (f) desired = Math.atan2(f.y - a.y, f.x - a.x);
        else {
          const probes = [-.75, 0, .75].map(offset => {
            const x = a.x + Math.cos(a.angle + offset) * 29, y = a.y + Math.sin(a.angle + offset) * 29;
            const player = readField(s.playerField, x, y), natural = readField(s.foodField, x, y);
            return {offset, player, natural, v: natural + player};
          });
          const best = [...probes].sort((a, b) => b.v - a.v)[0];
          const baseline = [...probes].sort((a, b) => b.natural - a.natural)[0];
          const patrol = () => {
            const p = center(gardens[Math.floor((s.time + a.phase * 16) / 35 + a.id) % 3]);
            return desired + turn(desired, Math.atan2(p.y - a.y, p.x - a.x)) * .38;
          };
          const naturalHeading = baseline.natural > .05 ? desired + baseline.offset : patrol();
          if (best.v > .05) {
            desired += best.offset; a.response = 1;
            if (best.player > .15 && Math.abs(turn(naturalHeading, desired)) > .08) {
              scentBaseline = naturalHeading;
              scentCandidate = [...s.traces].reverse().find(r => r.kind === '气味' && distance(r, a) < 90 && s.time - r.time < 65) || {id: 0};
            }
          } else desired = naturalHeading;
        }
      }
      for (const r of s.rocks) if (distance(a, r) < r.r + 40) {
        const toward = Math.atan2(r.y - a.y, r.x - a.x);
        if (Math.abs(turn(a.angle, toward)) < 1.1) { desired = toward + (turn(toward, a.angle) < 0 ? -1.5 : 1.5); scentCandidate = null; }
      }
      const actualTurn = clamp(turn(a.angle, desired), -dt * 3, dt * 3);
      if (scentCandidate && Math.abs(actualTurn - clamp(turn(a.angle, scentBaseline), -dt * 3, dt * 3)) > .01) {
        a.guided = true;
        if (a.lastScent !== scentCandidate.id) {
          a.lastScent = a.scentTrace = scentCandidate.id; s.scentTurns++;
          if (scentCandidate.id) {
            scentCandidate.responders ||= [];
            if (!scentCandidate.responders.includes(a.id)) scentCandidate.responders.push(a.id);
            traceUpdate(scentCandidate.id, `${scentCandidate.responders.length}只同伴的实际转向受玩家气味场影响；重叠痕迹可能共同作用`);
          }
        }
      }
      a.angle += actualTurn; moveGround(a, dt);
      if (a.worker && !a.cargo && !a.compost && distance(a, nest) < 30 && s.compost > 0) {
        const target = gardens.filter(g => g.population > 0).sort((g, h) => (g.soil + Math.min(2, g.nourished) * .15) - (h.soil + Math.min(2, h.nourished) * .15))[0];
        if (target) { a.task = 'compost'; a.target = target.id; }
      }
    }
    a.response = Math.max(0, a.response - dt);
    if (a.cargo) deposit(controlled ? s.playerField : s.foodField, a.x, a.y, dt * 4);
    else deposit(s.homeField, a.x, a.y, dt * .5);
    const hadCompost = a.compost; antContact(a, controlled);
    if (!controlled && hadCompost && !a.compost) a.task = 'food';
  }
  function updateAnts(dt) {
    for (let i = 0; i < s.foodField.length; i++) { s.foodField[i] *= Math.exp(-dt * .07); s.homeField[i] *= Math.exp(-dt * .04); s.playerField[i] *= Math.exp(-dt * .06); }
    for (const f of s.food) if (f.amount > 0) deposit(s.foodField, f.x, f.y, dt * 2);
    for (const a of s.ants) updateAnt(a, dt);
    if (s.stage !== 2) updateAnt(bodies[2], dt);
    s.memory[2] = `${s.harvested} 食物 · ${s.stats.nourished} 养分`;
  }
  function edgeHeading(b, heading) {
    let dx = Math.cos(heading), dy = Math.sin(heading); const margin = 110;
    if (b.x < margin) dx += 3; if (b.x > s.width - margin) dx -= 3;
    if (b.y < margin) dy += 3; if (b.y > s.height - margin) dy -= 3;
    return Math.atan2(dy, dx);
  }
  function moveBird(b, dt, wanted) {
    const delta = clamp(turn(b.angle, edgeHeading(b, wanted)), -dt * 2, dt * 2);
    b.angle += delta; b.bank += (delta / Math.max(dt, .001) * .28 - b.bank) * dt * 4;
    b.x = clamp(b.x + (Math.cos(b.angle) * b.speed + s.wind.x) * dt, 15, s.width - 15);
    b.y = clamp(b.y + (Math.sin(b.angle) * b.speed + s.wind.y) * dt, 15, s.height - 15); b.wing += dt * 5;
  }
  function updateBirds(dt) {
    const old = s.birds.map(b => ({x: b.x, y: b.y, angle: b.angle, influence: b.influence}));
    for (let i = 0; i < s.birds.length; i++) {
      const b = s.birds[i]; let dx = Math.cos(b.angle), dy = Math.sin(b.angle), influence = 0;
      const neighbours = old.filter((n, j) => i !== j && distance(b, n) < 145).sort((a, c) => distance(b, a) - distance(b, c)).slice(0, 7);
      for (const n of neighbours) {
        dx += Math.cos(n.angle) * .2 + (n.x - b.x) * .001; dy += Math.sin(n.angle) * .2 + (n.y - b.y) * .001;
        if (distance(b, n) < 24) { dx += (b.x - n.x) * .04; dy += (b.y - n.y) * .04; }
        influence = Math.max(influence, n.influence * .9);
      }
      b.heard = Math.max(0, b.heard - dt); b.influence = Math.max(influence, b.influence - dt * .07);
      if (b.influence > .2) s.flockReached.add(b.id);
      let target;
      if (b.seed) {
        const possible = gardens.filter(g => g.id !== b.seed.source && g.population >= 4);
        target = center(possible[b.id % possible.length] || gardens[b.seed.source]);
      } else target = nearestFood(b, Infinity, true) || center(gardens[b.id % 3]);
      const naturalDx = dx + (target.x - b.x) * .018, naturalDy = dy + (target.y - b.y) * .018;
      if (s.stage === 3 && distance(b, bodies[3]) < 165 && b.heard > 0) {
        const p = bodies[3]; dx += Math.cos(p.angle) * 3 + (p.x - b.x) * .01; dy += Math.sin(p.angle) * 3 + (p.y - b.y) * .01;
        const actual = clamp(turn(b.angle, edgeHeading(b, Math.atan2(dy, dx))), -dt * 2, dt * 2);
        const baseline = clamp(turn(b.angle, edgeHeading(b, Math.atan2(naturalDy, naturalDx))), -dt * 2, dt * 2);
        if (Math.abs(actual - baseline) > .01 && b.callTrace && b.turnedCall !== b.callTrace) {
          b.turnedCall = b.callTrace; s.callTurns++;
          const r = s.traces.find(r => r.id === b.callTrace);
          if (r) { r.turned = (r.turned || 0) + 1; traceUpdate(r.id, `${r.turned}只的实际转向受鸣叫影响；尚未等同萌发成功`); }
        }
      } else { dx = naturalDx; dy = naturalDy; }
      moveBird(b, dt, Math.atan2(dy, dx)); takeSeed(b);
      if (b.seed) {
        b.seedAge += dt; const g = containing(b.x, b.y, -18);
        if (g && g.id !== b.seed.source && (g.population >= 4 || b.heard > 0) && b.seedAge > 3) dropSeed(b, false);
      }
    }
    if (s.stage !== 3) {
      const b = bodies[3]; moveBird(b, dt, b.angle); // Its cargo stays with this individual until you return.
    }
    s.memory[3] = `${s.returnedSeeds} 萌发 · ${s.crossSeeds} 异地`;
  }
  function updatePlayer(dt, input) {
    const p = s.player; let dx = input.dx || 0, dy = input.dy || 0;
    if (!dx && !dy && input.active) { dx = input.x - p.x; dy = input.y - p.y; }
    const magnitude = Math.hypot(dx, dy), steering = !!input.dx || !!input.dy || magnitude > 5;
    if (s.stage === 3) {
      p.speed = input.low ? 68 : 96; p.altitude += ((input.low ? .2 : .7) - p.altitude) * dt * 2;
      moveBird(p, dt, steering ? Math.atan2(dy, dx) : p.angle); takeSeed(p); return;
    }
    const speed = s.stage === 2 ? 81 : s.stage === 1 ? 108 : 103;
    const tx = steering ? dx / (magnitude || 1) * speed : 0, ty = steering ? dy / (magnitude || 1) * speed : 0;
    p.vx += (tx - p.vx) * Math.min(1, dt * 10); p.vy += (ty - p.vy) * Math.min(1, dt * 10);
    p.speed = Math.hypot(p.vx, p.vy); if (p.speed > 1) p.angle += turn(p.angle, Math.atan2(p.vy, p.vx)) * Math.min(1, dt * 9);
    if (s.stage === 2) { moveGround(p, dt); updateAnt(p, dt, true); }
    else { p.x = clamp(p.x + p.vx * dt, 300, 1500); p.y = clamp(p.y + p.vy * dt, 300, 920); }
  }
  function updateGoal(dt) {
    const healthy = gardens.filter(g => g.health).length;
    const farReady = far.health && far.reproductive >= 2 && s.time - far.lastBirth < 45;
    const conditions = farReady && gardens.slice(0, 2).some(g => g.health);
    s.goalHold = conditions ? Math.min(15, s.goalHold + dt) : 0;
    if (!s.completed && s.goalHold >= 15) {
      s.completed = true; s.endTime = s.time;
      s.completionProof = {time: s.time, reproductive: far.reproductive, lastBirth: far.lastBirth, soil: far.soil, water: far.water, mature: far.mature};
      message('complete', '空岸接起了自己的下一次', '风中洲已有两株本地第二代及以后后代成熟结实，近期仍有新生，并与另一岸共同保持生机。结果来自多个生命和环境的共同作用。');
      event('ending', 850, 560);
    }
    logClock += dt;
    if (logClock >= 5) {
      logClock = 0; s.timeline.push({time: Math.round(s.time), plants: s.biomass, food: s.harvested, seeds: s.crossSeeds, healthy});
      if (s.timeline.length > 360) s.timeline.shift();
    }
  }
  s.summary = () => {
    const healthy = gardens.filter(g => g.health).length;
    const blocked = [];
    if (!far.population) blocked.push('风中洲没有植被');
    if (far.soil < .14) blocked.push('远岸缺养分');
    if (far.water < .3) blocked.push('远岸缺水');
    if (far.mature < 4) blocked.push('远岸等待成熟');
    if (far.reproductive < 2) blocked.push('本地后代尚未接续结实');
    if (s.time - far.lastBirth >= 45) blocked.push('尚无近期自然新生');
    if (!gardens.slice(0, 2).some(g => g.health)) blocked.push('另一岸尚未恢复');
    return {healthy, progress: s.completed ? 1 : (Math.min(1, far.mature / 4) + Math.min(1, far.soil / .14) + Math.min(1, far.reproductive / 2) + s.goalHold / 15) / 4,
      title: s.completed ? '空岸已经拥有下一次生长' : '让风中洲的后代，接着繁殖',
      status: blocked.length ? blocked.slice(0, 3).join(' · ') : `两岸生机维持 ${Math.floor(s.goalHold)}/15秒`};
  };
  s.contribution = () => s.traces.filter((r, i, all) => !all.slice(i + 1).some(n => n.kind === r.kind)).reverse();
  s.goal = () => {
    const p = s.player, chosen = gardens[s.selectedGarden], at = containing(p.x, p.y), g = at || chosen;
    const state = `${g.name}：湿度 ${Math.round(g.water * 100)}% · 养分 ${Math.round(g.soil * 100)}% · 成熟 ${g.mature}株${g.id === 2 ? ' · 本地最深后代' + Math.max(...g.depth) + '代' : ''}`;
    let target, role, action, secondary, hint;
    if (s.stage === 0) {
      const nodes = s.nodes.filter(n => n.group === s.selectedGarden);
      target = {...nodes.reduce((a, b) => distance(a, p) < distance(b, p) ? a : b), label: chosen.name + '的微光'};
      role = '一粒微光'; action = '闪光 · 保湿'; secondary = '光的作用';
      hint = '游向任意岸地的光群，闪光帮助当地保湿。不能替代养分或种子。';
    } else if (s.stage === 1) {
      target = {...center(chosen), label: chosen.name + ' · 可播种'}; role = '一枚孢子'; action = `播种 · ${Math.floor(s.plantBudget)}`; secondary = patternNames[s.pattern];
      hint = '在岸地内播种，E 更换图案。结实会消耗当地养分；留些空间给下一次生长。';
    } else if (s.stage === 2) {
      const f = nearestFood(p); role = '一只蚂蚁'; action = '留下气味'; secondary = p.task === 'food' ? '任务：找食物' : '任务：送养分';
      target = p.cargo || (p.task === 'compost' && !p.compost) ? {...nest, label: p.cargo ? '回巢卸下食物' : '回巢取养分'} : p.compost ? {...center(chosen), label: chosen.name + ' · 进入岸地施肥'} : f ? {...f, label: '果实 · 靠近拾取'} : {...center(chosen), label: '等植物结实，或换个岸地'};
      hint = p.compost ? '你带着养分。进入岸地自动还给土壤；岸地按钮可以更换方向提示。' : p.cargo ? '你带着食物，回巢自动卸下；沿途持续留下真实运输的气味。' : '靠近自动拾取 / 卸下。E 切换食物与养分任务；空路浓气味也会误导同伴。';
    } else {
      const f = nearestFood(p, Infinity, true); role = '一只飞鸟'; action = '鸣叫 · 邀同行'; secondary = p.seed ? '落种 · 来自' + gardens[p.seed.source].name : '等待携籽';
      target = p.seed ? {...center(chosen), label: chosen.name + ' · E 落种'} : f ? {...f, label: '种子 · 飞近携带'} : {...center(chosen), label: '植物结实后会有种子'};
      hint = p.seed ? '你可以在任何地方落种。岸地内侧更安全，湿润而肥沃才能萌发；Shift 低飞减速。' : '始终向前飞。飞近金色种子便携带，E 落种；鸣叫让附近同伴接过你的转向。';
    }
    const summary = s.summary();
    return {...summary, role, action, secondary, hint, target, local: state,
      pocket: s.stage === 2 ? p.compost ? '携带：养分' : p.cargo ? '携带：食物' : '空手' : s.stage === 3 ? p.seed ? `携种来自${gardens[p.seed.source].name} · 预计落点${containing(p.x + s.wind.x * .49, p.y + s.wind.y * .49)?.name || '深水'}（当前风）` : '未携籽' : s.stage === 1 ? `孢子 ${Math.floor(s.plantBudget)}/5` : `已发光 ${s.pulseCount} 次`};
  };
  s.update = (elapsed, input = {}) => {
    const dt = clamp(elapsed, 0, .05); if (!dt) return;
    if (!s.started) { updateNodes(dt); s.events.length = 0; return; }
    s.time += dt; s.stageAge += dt; s.cooldown = Math.max(0, s.cooldown - dt); s.secondaryCooldown = Math.max(0, s.secondaryCooldown - dt);
    const phase = Math.floor(s.time / 45) % 3;
    s.weather = ['暖雨', '长风', '暮露'][phase]; s.wind = {x: phase === 1 ? 14 : 4, y: phase === 1 ? -5 : 1};
    if (phase !== season) {
      season = phase; message(null, ['暖雨经过，岸地慢慢湿润', '长风来了，远岸更容易干燥', '暮露落下，世界放慢呼吸'][phase], ['这段时间适合播种和等待萌发。四种生命仍然同时生活。', '微光能暂时保湿；也可以选择照看湿润的湾地。没有倒计时失败。', '看看哪些路线还在被走过，哪些岸地需要补给。'][phase]);
    }
    updatePlayer(dt, input); updateNodes(dt); updateLife(dt);
    antClock += dt; if (antClock >= .06) { updateAnts(antClock); antClock = 0; }
    updateBirds(dt);
    for (const f of s.falling) { f.age += dt; f.x += s.wind.x * dt * .35; f.y += s.wind.y * dt * .35; if (f.age >= f.life) landSeed(f); }
    s.falling = s.falling.filter(f => f.age < f.life);
    for (const a of [...s.waves, ...s.links]) a.age += dt;
    s.waves = s.waves.filter(a => a.age < 1.8); s.links = s.links.filter(a => a.age < 2);
    for (const p of s.sparks) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    s.sparks = s.sparks.filter(p => p.age < p.life).slice(-400);
    trailClock += dt;
    if (trailClock > .09) { trailClock = 0; for (const b of [...bodies, ...s.birds]) { b.trail.push({x: b.x, y: b.y}); if (b.trail.length > 24) b.trail.shift(); } }
    updateGoal(dt);
  };
  // A plain data snapshot is also used by the downloadable, offline world record.
  s.snapshot = () => {
    const data = {};
    for (const [key, value] of Object.entries(s)) if (typeof value !== 'function' && !['player', 'life', 'newborn', 'events', 'sparks', 'links', 'waves', 'focus'].includes(key)) data[key] = value;
    return JSON.parse(JSON.stringify({schema: 401, data, internal: {rng, serial, antClock, trailClock, logClock, season, queue, once: [...once]}}, (_, v) => v instanceof Set ? [...v] : ArrayBuffer.isView(v) ? Array.from(v) : v));
  };
  s.restore = snapshot => {
    // Validate before assigning; a failed import leaves the currently running world intact.
    if (snapshot?.schema !== 401 || !snapshot.data || !snapshot.internal) throw new Error('需要 v0.4.1 世界记录；旧版记录请在原 v0.4.0 中打开');
    const d = JSON.parse(JSON.stringify(snapshot.data)), it = snapshot.internal;
    if (!Number.isFinite(d.time) || d.time < 0 || !Number.isInteger(d.stage) || d.stage < 0 || d.stage > 3 || !Array.isArray(d.gardens) || d.gardens.length !== 3 || !Array.isArray(d.bodies) || d.bodies.length !== 4) throw new Error('世界记录不完整');
    for (const [i, g] of d.gardens.entries()) {
      const original = gardens[i];
      if (g.cols !== original.cols || g.rows !== original.rows || g.cell !== original.cell || g.id !== i) throw new Error('岸地尺寸不匹配');
      for (const key of ['values', 'depth', 'fruited', 'age', 'memory', 'bloom', 'maturity', 'yieldClock']) {
        if (!Array.isArray(g[key]) || g[key].length !== g.cols * g.rows || g[key].some(v => !Number.isFinite(v) || v < 0)) throw new Error('生长记录损坏');
      }
      if (!Array.isArray(g.ancestry) || g.ancestry.length !== g.cols * g.rows || g.ancestry.some(a => !Array.isArray(a) || a.some(id => !Number.isInteger(id)))) throw new Error('谱系记录损坏');
    }
    for (const key of ['foodField', 'homeField', 'playerField']) if (!Array.isArray(d[key]) || d[key].length !== 85 * 56 || d[key].some(v => !Number.isFinite(v))) throw new Error('气味记录损坏');
    for (const key of ['nodes', 'ants', 'birds', 'food', 'falling', 'seedlings', 'journal', 'timeline', 'traces', 'flockReached', 'plantedSites']) if (!Array.isArray(d[key])) throw new Error('记录缺少 ' + key);
    if (d.nodes.length !== s.nodes.length || d.ants.length > 100 || d.birds.length > 100 || d.food.length > 150 || d.seedlings.length > 400 || !Array.isArray(it.queue) || !Array.isArray(it.once)) throw new Error('记录大小异常');
    for (const b of [...d.bodies, ...d.nodes, ...d.ants, ...d.birds, ...d.food, ...d.falling, ...d.seedlings]) if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) throw new Error('位置记录损坏');
    for (let i = 0; i < 3; i++) {
      const g = d.gardens[i];
      for (const key of ['values', 'depth', 'fruited', 'age', 'memory', 'bloom', 'maturity', 'yieldClock']) g[key] = ['values', 'depth', 'fruited'].includes(key) ? new Uint8Array(g[key]) : new Float32Array(g[key]);
      Object.assign(gardens[i], g);
    }
    d.gardens = gardens; d.bodies.forEach((b, i) => Object.assign(bodies[i], b)); d.bodies = bodies;
    // Only copy known state keys. Imported files cannot replace methods or prototypes.
    for (const key of Object.keys(s)) if (typeof s[key] !== 'function' && Object.hasOwn(d, key) && !['__proto__', 'events', 'player', 'life', 'newborn'].includes(key)) s[key] = d[key];
    for (const key of ['foodField', 'homeField', 'playerField']) s[key] = new Float32Array(d[key]);
    s.flockReached = new Set(d.flockReached); s.plantedSites = new Set(d.plantedSites);
    s.player = bodies[s.stage]; s.life = gardens[0]; s.newborn = gardens[1]; s.started = true;
    rng = it.rng >>> 0; serial = it.serial; antClock = it.antClock; trailClock = it.trailClock; logClock = it.logClock; season = it.season;
    queue.splice(0, queue.length, ...it.queue); once.clear(); it.once.forEach(v => once.add(v));
    s.events.length = 0; message(null, '回来了。此前的变化，都还在。', '离开页面时世界会暂停，不在你不在场时推进。四种身体与携带物也一起保留。');
  };
  return s;
}
