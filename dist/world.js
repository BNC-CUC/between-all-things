const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createWorld(seed = 1771) {
  let rng = seed;
  const random = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
  const origin = {x: 450, y: 650}, nest = {x: 1130, y: 685}, returnSite = {x: 485, y: 432};
  const makeLife = (x, y, cols, rows, cell) => ({x, y, cols, rows, cell,
    values: new Uint8Array(cols * rows), age: new Float32Array(cols * rows),
    memory: new Float32Array(cols * rows), bloom: new Float32Array(cols * rows),
    clock: 0, population: 0, births: 0, generation: 0});
  const life = makeLife(660, 592, 28, 20, 13), newborn = makeLife(414, 370, 16, 13, 11);
  const player = {x: 385, y: 650, angle: -.2, vx: 0, vy: 0, speed: 0, bank: 0,
    wing: 0, phase: .5, glow: 1, cargo: false, seed: false, altitude: .7, trail: []};
  const s = {width: 1700, height: 1120, time: 0, stage: 0, maxStage: 0, stageAge: 0,
    origin, nest, returnSite, life, newborn, player, nodes: [], ants: [], birds: [],
    food: [], waves: [], links: [], sparks: [], falling: [], events: [],
    fieldCols: 85, fieldRows: 56, foodField: new Float32Array(85 * 56), homeField: new Float32Array(85 * 56), playerField: new Float32Array(85 * 56),
    ready: [false, false, false, false], cooldown: 0, secondaryCooldown: 0,
    touched: 0, order: 0, fertility: 0, biomass: 0, plantBudget: 4, pattern: 0,
    blooms: 0, harvested: 0, playerReturns: 0, antReturns: 0, guidedReturns: 0, store: 0,
    returnedSeeds: 0, flockReached: new Set(), pulseCount: 0, planted: 0, plantSites: new Set(),
    endTime: 0, focus: null, started: false, stats: {signals: 0, plants: 0, seeds: 0},
    memory: ['等待回应', '等待生长', '等待连通', '等待归来']};
  const patterns = [
    [[0,-1],[1,0],[-1,1],[0,1],[1,1]],
    [[-2,0],[-1,0],[0,0],[1,0],[2,0],[0,-1],[0,1]],
    [[-1,-1],[0,-1],[-1,0],[0,0],[2,1],[3,1],[2,2],[3,2]]
  ], patternNames = ['游走', '舒展', '栖息'];
  let antClock = 0, birdClock = 0, growthMatter = 0, budgetClock = 0, trailClock = 0;
  let harvestClock = 0, lastNaturalBeat = -99, echoSerial = 0;
  const waveQueue = [], once = new Set();
  function message(key, title, text, at = null) {
    if (key && once.has(key)) return;
    if (key) once.add(key);
    s.events.push({type: 'story', title, text});
    if (at) s.focus = {...at, until: s.time + 3};
  }
  function event(type, x, y, extra = {}) { s.events.push({type, x, y, ...extra}); }
  function particle(x, y, count, kind = 'light') {
    for (let i = 0; i < count; i++) {
      const a = random() * TAU, v = 8 + random() * 27;
      s.sparks.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        age: 0, life: 1 + random() * 1.6, size: 1 + random() * 2.3, kind});
    }
  }
  function wave(x, y, max = 70, kind = 'light') { s.waves.push({x, y, age: 0, max, kind}); }
  function ready(stage, title, text) {
    if (s.ready[stage]) return;
    s.ready[stage] = true; event('milestone', player.x, player.y, {stage});
    message('ready-' + stage, title, text);
  }
  for (let i = 0; i < 64; i++) {
    const group = i < 32 ? 0 : 1, a = random() * TAU, r = Math.sqrt(random()) * 73;
    const x = origin.x + (group ? 93 : -55) + Math.cos(a) * r;
    const y = origin.y + Math.sin(a) * r * .83 + (group ? -16 : 14);
    s.nodes.push({id: i, group, x, y, homeX: x, homeY: y, phase: random() * TAU,
      omega: .87 + random() * .12, glow: 0, touched: false, echo: -1, respond: 0,
      size: 3.8 + random() * 3.4, drift: random() * TAU});
  }
  const fieldIndex = (x, y) => clamp(Math.floor(y / 20), 0, 55) * 85 + clamp(Math.floor(x / 20), 0, 84);
  const readField = (f, x, y) => f[fieldIndex(x, y)];
  const deposit = (f, x, y, n) => { const i = fieldIndex(x, y); f[i] = Math.min(24, f[i] + n); };
  function emitNode(n, phase, serial, from) {
    if (n.echo >= serial) return;
    n.echo = serial; n.phase = phase; n.respond = 1; n.glow = 1;
    if (!n.touched) { n.touched = true; s.touched++; }
    if (from) s.links.push({a: {...from}, b: {x: n.x, y: n.y}, age: 0, kind: 'light'});
    for (const other of s.nodes) if (other.id !== n.id && other.echo < serial && distance(n, other) < 53)
      waveQueue.push({at: s.time + .18 + distance(n, other) / 230, id: other.id, serial,
        phase, from: {x: n.x, y: n.y}});
  }
  function sowPattern(l, x, y, motif, count = true) {
    const cx = clamp(Math.round((x - l.x) / l.cell), 3, l.cols - 5);
    const cy = clamp(Math.round((y - l.y) / l.cell), 3, l.rows - 5);
    for (const [dx, dy] of patterns[motif]) {
      const i = (cy + dy) * l.cols + cx + dx;
      l.values[i] = 1; l.age[i] = .35; l.memory[i] = .9; l.bloom[i] = 1;
    }
    particle(l.x + cx * l.cell, l.y + cy * l.cell, 12, 'green');
    wave(l.x + cx * l.cell, l.y + cy * l.cell, 47, 'green');
    if (count) { s.plantSites.add(cx + ',' + cy); s.planted = s.plantSites.size; s.stats.plants++; }
    event('plant', x, y);
  }
  function addAnt() {
    const a = random() * TAU;
    s.ants.push({id: s.ants.length, x: nest.x + Math.cos(a) * 12,
      y: nest.y + Math.sin(a) * 10, angle: Math.PI + (random() - .5) * 1.8,
      carrying: false, speed: 23 + random() * 12, phase: random() * TAU,
      response: 0, usedTrail: false, guided: false});
  }
  function addBird() {
    const a = random() * TAU;
    s.birds.push({id: s.birds.length, x: nest.x + Math.cos(a) * 65,
      y: nest.y - 120 + Math.sin(a) * 45, angle: a, speed: 72 + random() * 24,
      wing: random() * TAU, bank: 0, influence: 0, heard: 0, seed: false,
      altitude: .25 + random() * .75, phase: random() * TAU, trail: []});
  }
  function receiveFood(byPlayer, guided = false) {
    if (byPlayer) s.playerReturns++; else { s.antReturns++; if (guided) s.guidedReturns++; }
    s.store += 3; s.harvested++;
    wave(nest.x, nest.y, 46, 'amber'); particle(nest.x, nest.y, 6, 'amber');
    event('return', nest.x, nest.y, {player: byPlayer});
    if (byPlayer) message('first-return', '一趟往返，留下了路', '你留下的气味会被附近同伴发现。它们也会沿路带回食物。', nest);
    else message('others-return', '地面上的往返，也开始了', '探索者找到了生长留下的食物。搬运途中，它们也在留下气味。');
  }
  function returnSeed(x, y, byPlayer) {
    s.falling.push({x, y, age: 0, life: 1.3, byPlayer});
    event('drop', x, y);
  }
  function landSeed(x, y, byPlayer) {
    s.returnedSeeds++; s.stats.seeds++;
    sowPattern(newborn, x, y, s.returnedSeeds % 2, false);
    wave(x, y, 85, 'green');
    for (const n of s.nodes) if (distance(n, returnSite) < 250) n.respond = Math.max(n.respond, .6);
    s.fertility = Math.min(1, s.fertility + .15); event('seed', x, y);
    message('seed-home', '一粒种子，把天空带回地面', '新生的斑块仍按邻居的状态变化。起初的微光，也继续在那里。', returnSite);
    if (byPlayer) s.playerSeedReturned = true;
  }
  s.start = () => {
    s.started = true;
    message('start', '你是一粒微光', '靠近另一粒光，按空格闪光。看清第一个回应，然后跟随它的传播。');
  };
  s.action = () => {
    if (!s.started || s.cooldown > 0) return false;
    if (s.stage === 0) {
      s.cooldown = 1.5; s.pulseCount++; s.stats.signals++;
      const serial = ++echoSerial; wave(player.x, player.y, 69); player.glow = 1;
      let reached = 0;
      for (const n of s.nodes) if (distance(n, player) < 64) { emitNode(n, player.phase, serial, player); reached++; }
      event('pulse', player.x, player.y, {reached});
      if (reached) message('response', '你闪了一下。附近的光，接住了', '细线显示这一次回应的传递。游向另一簇，把同一个节拍带过去。');
      else message('closer', '还隔着一点距离', '游近发光的生命。你的闪光只影响身边的邻居。');
    } else if (s.stage === 1) {
      const l = life;
      if (player.x < l.x - 15 || player.x > l.x + l.cols * l.cell + 15 || player.y < l.y - 15 || player.y > l.y + l.rows * l.cell + 15) {
        message(null, '水流把你带远了', '回到浅绿色的湿润地带，再留下生命的初始图案。'); return false;
      }
      if (s.plantBudget < 1) return false;
      s.cooldown = 1.1; s.plantBudget--; sowPattern(life, player.x, player.y, s.pattern);
      message('first-plant', '先留下一小片，再看邻居怎样回应', '细胞的连接、诞生和消退会继续发生。你可以换一种初始形状，种在另一处。', player);
    } else if (s.stage === 2) {
      s.cooldown = .7; wave(player.x, player.y, 50, 'amber'); deposit(s.foodField, player.x, player.y, 8); deposit(s.playerField, player.x, player.y, 8);
      for (const a of s.ants) if (distance(a, player) < 66) a.response = 1;
      event('scent', player.x, player.y);
      message('scent', '这一步，会留下气味', '带食物回巢时会持续留痕。走过的路线，会成为附近同伴的选择。');
    } else if (s.stage === 3) {
      s.cooldown = 1.7; wave(player.x, player.y, 158, 'bird'); let heard = 0;
      for (const b of s.birds) if (distance(b, player) < 160) {
        b.heard = 4; b.influence = 1; s.flockReached.add(b.id); heard++;
        s.links.push({a: {x: player.x, y: player.y}, b: {x: b.x, y: b.y}, age: 0, kind: 'bird'});
      }
      event('call', player.x, player.y, {heard});
      if (heard) message('flock-call', '身边的转向，会传到更远处', '同行的鸟也能携带草籽。带着它们，飞向左侧最初的微光。');
    } else { s.visit(0); return true; }
    return true;
  };
  s.secondary = () => {
    if (s.stage === 1) { s.pattern = (s.pattern + 1) % 3; return; }
    if (s.stage !== 3 || s.secondaryCooldown > 0) return;
    if (!player.seed) { message(null, '先带上一粒草籽', '飞近金色的岸边草丛。你和同伴都可以在那里拾取草籽。'); return; }
    if (distance(player, returnSite) > 135) { message(null, '把它带回微光附近', '左侧的绿色环标出适合萌发的湿润地面。'); return; }
    s.secondaryCooldown = 1.5; player.seed = false; player.altitude = .15;
    returnSeed(clamp(player.x, newborn.x + 35, newborn.x + newborn.cols * newborn.cell - 45),
      clamp(player.y, newborn.y + 30, newborn.y + newborn.rows * newborn.cell - 40), true);
  };
  function setPerspective(stage) {
    s.stage = stage; s.stageAge = 0; s.cooldown = .8; player.trail = [];
    player.cargo = false; player.vx = 0; player.vy = 0;
    const positions = [{x: 405, y: 650}, {x: 782, y: 720}, nest, {x: 1090, y: 570}, {x: 850, y: 560}];
    Object.assign(player, positions[stage]);
    if (stage === 3) { player.angle = Math.atan2(nest.y - player.y, nest.x - player.x); player.speed = 92; }
    if (stage === 4) s.endTime = 0;
    event('perspective', player.x, player.y, {stage});
  }
  s.advance = () => {
    if (s.stage > 3 || !s.ready[s.stage]) return false;
    s.maxStage = Math.max(s.maxStage, s.stage + 1); setPerspective(s.stage + 1);
    const titles = ['', '光留下了生长的条件', '这一次，你是地上的一只蚂蚁', '现在，你是一只始终向前飞的鸟', '看见你们共同形成的世界'];
    const texts = ['', '视角来到岸边的一枚孢子。选择位置留下初始图案，让生长为地上的生命留下食物。',
      '走向绿金色的食物，靠近后自动拾取。沿你选择的路线带回巢穴，看同伴怎样接过这条路。',
      '蚁群留下的资源滋养了岸边草丛。靠近草丛携籽，鸣叫与身边同伴同行，飞回微光附近。',
      '微光没有熄灭，生长没有停止，道路仍被走过。你带回的一粒种子，正在成为新的开始。'];
    message(null, titles[s.stage], texts[s.stage]); if (s.stage === 4) event('ending', 850, 560);
    return true;
  };
  s.visit = stage => {
    if (stage < 0 || stage > Math.min(s.maxStage, 3)) return;
    setPerspective(stage);
    message(null, ['回到微光之间', '回到岸边的生长', '回到地上的道路', '回到风里'][stage], '此前留下的变化仍然保留。你可以继续参与。');
  };
  s.goal = () => {
    if (s.stage === 0) {
      const target = s.nodes.filter(n => !n.touched).sort((a, b) => distance(a, player) - distance(b, player))[0] || s.nodes[45];
      return {title: '让两簇微光，接住同一个节拍', hint: '游近微光，按空格。回应会沿着邻居传开。',
        action: '闪光', secondary: '', role: '一粒微光', status: `闪光 ${Math.min(2, s.pulseCount)} / 2 · 回应 ${Math.min(48, s.touched)} / 48 · 合拍 ${Math.round(s.order * 100)}%`,
        progress: Math.min(1, s.touched / 48) * .65 + Math.min(1, s.order / .68) * .35,
        target: {x: target.x, y: target.y, label: '靠近这簇微光'}, next: '沿着微光，看向岸边'};
    }
    if (s.stage === 1) return {title: '让微小生命，连成一片生长', hint: '在两处湿润地面播下图案；E 更换形状。亮起、消退都来自邻居的变化。',
      action: `播种 · ${Math.floor(s.plantBudget)}`, secondary: `形状：${patternNames[s.pattern]}`, role: '随水漂流的孢子',
      status: `播种 ${Math.min(2, s.planted)} / 2 · 新生 ${Math.min(28, life.births)} / 28 · 食物 ${Math.min(3, s.blooms)} / 3`, progress: Math.min(1, s.planted / 2) * .2 + Math.min(1, life.births / 28) * .4 + Math.min(1, s.blooms / 3) * .4,
      target: {x: life.x + 220, y: life.y + 145, label: '选择一处留下图案'}, next: '跟随食物，来到地面'};
    if (s.stage === 2) {
      const food = s.food.filter(f => f.amount > 0).sort((a, b) => distance(a, player) - distance(b, player))[0];
      return {title: player.cargo ? '带它回家，留下一条路' : '找到食物，让同伴发现你的路',
        hint: !food && !player.cargo && !life.population ? '岸边的食物暂时耗尽。点击下方「生长」补种，再回到「道路」，此前的进度会保留。' : '靠近食物自动拾取，回巢自动放下。带着食物行走会留下气味；空格加深痕迹。',
        action: '留下气味', secondary: '', role: '一只探索中的蚂蚁',
        status: `你带回 ${s.playerReturns} / 1 份 · 同伴沿你的路带回 ${s.guidedReturns} / 3 份`,
        progress: Math.min(1, s.playerReturns) * .4 + Math.min(1, s.guidedReturns / 3) * .6,
        target: player.cargo ? {...nest, label: '带回巢穴'} : food ? {...food, label: '靠近拾取食物'} : {x: 965, y: 735, label: '生长正在留下食物'},
        next: '沿着生机，抬头看向天空'};
    }
    if (s.stage === 3) return {title: s.playerSeedReturned ? (s.flockReached.size < 8 ? '让更多同伴，接过你的转向' : '看看你带回的种子') : player.seed ? '带着同伴，把种子送回微光' : '携一粒草籽，与同伴同行',
      hint: s.playerSeedReturned ? (s.flockReached.size < 8 ? '种子已经落地。靠近鸟群鸣叫，把你的转向传给至少八位同伴。' : '种子落地后，邻近的生长正在发生。你可以盘旋着看它继续。') : player.seed ? '在微光上方的绿色环内按 E 落种。空格鸣叫，转向会在附近同伴间传播。' : '飞近金色草丛拾取草籽。松开方向，鸟仍会向前飞。',
      action: '鸣叫', secondary: player.seed ? '落下草籽' : '尚未携籽', role: '一只随风飞行的鸟',
      status: `同伴 ${Math.min(8, s.flockReached.size)} / 8 · ${s.playerSeedReturned ? '你的种子已落地' : '等待你带回种子'} · 新生 ${Math.min(6, newborn.births)} / 6`,
      progress: Math.min(1, s.flockReached.size / 8) * .4 + (s.playerSeedReturned ? .4 : 0) + Math.min(1, newborn.births / 6) * .2,
      target: s.playerSeedReturned ? (s.flockReached.size < 8 && s.birds.length ? {...s.birds.reduce((best, b) => distance(b, player) < distance(best, player) ? b : best), label: '靠近同伴，轻轻鸣叫'} : {...returnSite, label: '你的种子，正在成为新生'}) : player.seed ? {...returnSite, label: '在这里落种 · E'} : {...nest, label: '掠过草丛，带上种子'},
      next: '拉远，看见整个世界'};
    return {title: '你很小。你们形成了这个世界。', hint: '选择下方任何一种生命，再回到它的尺度。它们的生活还在继续。',
      action: '回到微光', secondary: '', role: '万物之间', status: '一次回应，会成为下一次开始。', progress: 1,
      target: {...returnSite, label: '新的开始'}, next: ''};
  };
  function updateNodes(dt) {
    const old = s.nodes.map(n => n.phase);
    for (let i = 0; i < s.nodes.length; i++) {
      const n = s.nodes[i]; let coupling = 0, count = 0;
      for (let j = 0; j < s.nodes.length; j++) if (i !== j && distance(n, s.nodes[j]) < 57) { coupling += Math.sin(old[j] - old[i]); count++; }
      n.phase = (n.phase + dt * (n.omega + (count ? coupling / count * 1.55 : 0))) % TAU;
      n.respond = Math.max(0, n.respond - dt * 1.2);
      n.glow = Math.max(n.respond, Math.pow(Math.max(0, Math.cos(n.phase)), 10));
      n.x = n.homeX + Math.sin(s.time * .27 + n.drift) * 3; n.y = n.homeY + Math.cos(s.time * .32 + n.drift) * 2;
    }
    let processed = 0;
    for (let i = waveQueue.length - 1; i >= 0 && processed < 240; i--) {
      if (waveQueue[i].at > s.time) continue;
      const q = waveQueue.splice(i, 1)[0]; processed++; emitNode(s.nodes[q.id], q.phase + .28, q.serial, q.from);
    }
    const x = s.nodes.reduce((sum, n) => sum + Math.cos(n.phase), 0), y = s.nodes.reduce((sum, n) => sum + Math.sin(n.phase), 0);
    s.order = Math.hypot(x, y) / s.nodes.length;
    player.phase = (player.phase + dt * .94) % TAU;
    player.glow = Math.max(Math.pow(Math.max(0, Math.cos(player.phase)), 10), player.glow - dt * 1.3);
    s.fertility = Math.max(s.fertility, s.touched / 64 * s.order);
    if (s.touched >= 48 && s.order >= .68 && s.pulseCount >= 2)
      ready(0, '微小的光，开始分享同一种呼吸', '你的闪光由邻居传了下去。岸边的生命，获得了最初的生长条件。');
    const glow = s.nodes.reduce((sum, n) => sum + n.glow, 0) / 64;
    if (s.touched > 10 && glow > .62 && s.time - lastNaturalBeat > 2) { lastNaturalBeat = s.time; event('chorus', origin.x, origin.y, {order: s.order}); }
    s.memory[0] = s.touched ? `${s.touched} 个回应` : '等待第一声回应';
  }
  function evolve(l, dt) {
    l.clock += dt;
    for (let i = 0; i < l.values.length; i++) {
      l.age[i] = l.values[i] ? Math.min(1, l.age[i] + dt * 2) : Math.max(0, l.age[i] - dt * 1.1);
      l.memory[i] = Math.max(l.age[i], l.memory[i] - dt * .055); l.bloom[i] = Math.max(0, l.bloom[i] - dt * .8);
    }
    if (l.clock < .7) return 0;
    l.clock -= .7; l.generation++;
    const next = new Uint8Array(l.values.length); let count = 0, born = 0;
    for (let y = 1; y < l.rows - 1; y++) for (let x = 1; x < l.cols - 1; x++) {
      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) neighbours += l.values[(y + dy) * l.cols + x + dx];
      const i = y * l.cols + x;
      next[i] = neighbours === 3 || (l.values[i] && neighbours === 2) ? 1 : 0;
      if (next[i]) { count++; if (!l.values[i]) { born++; l.bloom[i] = 1; } }
    }
    l.values = next; l.population = count; l.births += born; return born;
  }
  function updateLife(dt) {
    const born = evolve(life, dt); evolve(newborn, dt);
    s.biomass += born * .07 + life.population * dt * .008;
    growthMatter += (born * .15 + life.population * dt * .025) * (.25 + .75 * s.fertility); budgetClock += dt;
    if (budgetClock > 5 && s.fertility > .25) { budgetClock = 0; s.plantBudget = Math.min(5, s.plantBudget + 1); }
    harvestClock += dt;
    if (growthMatter > 2.4 && harvestClock > 2 && s.food.filter(f => f.amount > 0).length < 10) {
      growthMatter -= 2.4; harvestClock = 0;
      const alive = []; for (let i = 0; i < life.values.length; i++) if (life.values[i]) alive.push(i);
      if (alive.length) {
        const index = alive[Math.floor(random() * alive.length)], y = life.y + Math.floor(index / life.cols) * life.cell;
        const food = {x: life.x + life.cols * life.cell + 16 + random() * 37,
          y: clamp(y + (random() - .5) * 35, 650, 810), amount: 7, age: 0,
          from: {x: life.x + index % life.cols * life.cell, y}};
        s.food.push(food); s.blooms++;
        s.links.push({a: food.from, b: {x: food.x, y: food.y}, age: 0, kind: 'food'});
        event('food', food.x, food.y); particle(food.x, food.y, 5, 'amber');
        message('first-food', '生长，在岸边留下了食物', '金色碎屑来自这片生命的积累。地上的探索者开始靠近。', food);
      }
    }
    for (const f of s.food) f.age += dt; s.food = s.food.filter(f => f.amount > 0 || f.age < 25);
    if (life.births >= 28 && s.blooms >= 3 && s.planted >= 2)
      ready(1, '这片生长，开始养活别的生命', '岸边出现了可以搬运的食物。下一次，你将从地面看见它。');
    if (s.returnedSeeds > 0 && s.playerSeedReturned && s.flockReached.size >= 8 && newborn.births >= 6)
      ready(3, '你带回的种子，已经开始回应邻居', '微光、生长、道路与飞行仍在一起发生。现在，可以拉远看看了。');
    s.memory[1] = life.births ? `${life.births} 次新生` : '等待生长';
  }
  function updateAnts(dt) {
    if (s.food.some(f => f.amount > 0)) while (s.ants.length < Math.min(48, 18 + s.blooms * 4)) addAnt();
    for (let i = 0; i < s.foodField.length; i++) { s.foodField[i] *= Math.exp(-dt * .06); s.homeField[i] *= Math.exp(-dt * .03); s.playerField[i] *= Math.exp(-dt * .035); }
    for (const a of s.ants) {
      const field = a.carrying ? s.homeField : s.foodField;
      const probes = [-.65, 0, .65].map(offset => ({offset, value: readField(field, a.x + Math.cos(a.angle + offset) * 25, a.y + Math.sin(a.angle + offset) * 25)}));
      probes.sort((p, q) => q.value - p.value);
      let desired = a.angle + Math.sin(s.time * 1.4 + a.phase) * .3;
      if (probes[0].value > .04) { desired = a.angle + probes[0].offset; a.usedTrail = true; a.response = Math.min(1, a.response + dt * 2); }
      else a.response = Math.max(0, a.response - dt);
      if (!a.carrying && (readField(s.playerField, a.x, a.y) > .2 || readField(s.playerField, a.x + Math.cos(a.angle) * 25, a.y + Math.sin(a.angle) * 25) > .2)) a.guided = true;
      if (a.carrying) {
        desired += turn(desired, Math.atan2(nest.y - a.y, nest.x - a.x)) * .8; deposit(s.foodField, a.x, a.y, dt * 2.4);
        if (distance(a, nest) < 23) { a.carrying = false; receiveFood(false, a.guided); a.guided = false; a.angle += Math.PI; }
      } else {
        let target = null, nearest = 105;
        for (const f of s.food) if (f.amount > (s.playerReturns < 1 ? 1 : 0) && f.age > 1) { const d = distance(a, f); if (d < nearest) { nearest = d; target = f; } }
        if (target) {
          desired = Math.atan2(target.y - a.y, target.x - a.x);
          if (nearest < 12) { target.amount--; a.carrying = true; desired += Math.PI; particle(a.x, a.y, 2, 'amber'); }
        } else if (distance(a, nest) > 280) desired += turn(desired, Math.atan2(nest.y - a.y, nest.x - a.x)) * .4;
        deposit(s.homeField, a.x, a.y, dt * .8);
      }
      a.angle += clamp(turn(a.angle, desired), -dt * 3.4, dt * 3.4);
      a.x = clamp(a.x + Math.cos(a.angle) * a.speed * dt, 630, 1310);
      a.y = clamp(a.y + Math.sin(a.angle) * a.speed * dt, 520, 930);
    }
    if (s.playerReturns >= 1 && s.guidedReturns >= 3)
      ready(2, '一只的探索，成了许多只的道路', '不断的往返让岸边积起了资源。草丛更繁茂，也有鸟愿意停留。');
    s.memory[2] = s.harvested ? `${s.harvested} 趟往返` : '等待第一条路';
  }
  function edgeHeading(x, y, angle) {
    let dx = Math.cos(angle), dy = Math.sin(angle); const margin = 140;
    if (x < margin) dx += (margin - x) / margin * 3; if (x > s.width - margin) dx -= (x - s.width + margin) / margin * 3;
    if (y < margin) dy += (margin - y) / margin * 3; if (y > s.height - margin) dy -= (y - s.height + margin) / margin * 3;
    return Math.atan2(dy, dx);
  }
  function updateBirds(dt) {
    birdClock += dt; const capacity = Math.min(72, s.harvested * 5);
    if (birdClock > .65 && s.birds.length < capacity) { birdClock = 0; addBird(); }
    const old = s.birds.map(b => ({x: b.x, y: b.y, angle: b.angle, influence: b.influence}));
    for (let i = 0; i < s.birds.length; i++) {
      const b = s.birds[i], nearby = [];
      for (let j = 0; j < old.length; j++) if (i !== j) { const d = distance(b, old[j]); if (d < 150) nearby.push({...old[j], d}); }
      nearby.sort((a, c) => a.d - c.d); nearby.length = Math.min(7, nearby.length);
      let dx = Math.cos(b.angle), dy = Math.sin(b.angle), influence = 0;
      for (const n of nearby) {
        dx += Math.cos(n.angle) * .24 + (n.x - b.x) * .0018; dy += Math.sin(n.angle) * .24 + (n.y - b.y) * .0018;
        if (n.d < 24) { dx += (b.x - n.x) / Math.max(1, n.d); dy += (b.y - n.y) / Math.max(1, n.d); }
        influence = Math.max(influence, n.influence * .94);
      }
      b.heard = Math.max(0, b.heard - dt); b.influence = Math.max(0, b.influence - dt * .065);
      if (influence > b.influence) b.influence += (influence - b.influence) * dt * 2;
      if (s.stage === 3 && distance(b, player) < 155) {
        dx += Math.cos(player.angle) * .5; dy += Math.sin(player.angle) * .5;
        if (b.heard > 0) { dx += Math.cos(player.angle) * 2 + (player.x - b.x) * .009; dy += Math.sin(player.angle) * 2 + (player.y - b.y) * .009; }
      }
      if (b.influence > .24) s.flockReached.add(b.id);
      if (b.influence < .2) { dx += (nest.x - b.x) * .0018; dy += (nest.y - 120 - b.y) * .0018; }
      const heading = edgeHeading(b.x, b.y, Math.atan2(dy, dx)), delta = clamp(turn(b.angle, heading), -dt * 2.2, dt * 2.2);
      b.angle += delta; b.bank += (delta / Math.max(dt, .001) * .25 - b.bank) * dt * 4;
      b.x = clamp(b.x + Math.cos(b.angle) * b.speed * dt, 12, s.width - 12); b.y = clamp(b.y + Math.sin(b.angle) * b.speed * dt, 12, s.height - 12); b.wing += dt * 5;
      if (!b.seed && s.store > 1 && distance(b, nest) < 95) { b.seed = true; s.store--; }
      if (b.seed && b.influence > .2 && distance(b, returnSite) < 110) { b.seed = false; returnSeed(newborn.x + 35 + random() * 85, newborn.y + 35 + random() * 55, false); }
    }
    s.memory[3] = s.returnedSeeds ? `${s.returnedSeeds} 粒种子归来` : s.birds.length ? `${s.birds.length} 只鸟来到岸边` : '等待生命聚集';
  }
  function updatePlayer(dt, input) {
    if (s.stage === 4) return;
    let dx = input.dx || 0, dy = input.dy || 0;
    if (!dx && !dy && input.active) { dx = input.x - player.x; dy = input.y - player.y; }
    const magnitude = Math.hypot(dx, dy), steering = magnitude > 4 || !!input.dx || !!input.dy;
    if (s.stage === 3) {
      let wanted = steering ? Math.atan2(dy, dx) : player.angle;
      if (input.active && magnitude < 68) wanted += .5;
      wanted = edgeHeading(player.x, player.y, wanted);
      const delta = clamp(turn(player.angle, wanted), -dt * 1.9, dt * 1.9);
      player.angle += delta; player.bank += (delta / Math.max(dt, .001) * .34 - player.bank) * dt * 4;
      const low = input.low || distance(player, nest) < 85 || distance(player, returnSite) < 110;
      player.altitude += ((low ? .2 : .8) - player.altitude) * dt * 2.4;
      player.speed += ((low ? 105 : 94) - player.speed) * dt * 2;
      player.vx = Math.cos(player.angle) * player.speed + Math.sin(s.time * .15) * 5; player.vy = Math.sin(player.angle) * player.speed;
      player.wing += dt * (low ? 4 : 5.4);
      if (!player.seed && distance(player, nest) < 90 && s.store > 0) {
        player.seed = true; s.store--; particle(player.x, player.y, 9, 'amber'); event('pickup', player.x, player.y);
        message('bird-pickup', '羽下，多了一粒草籽', '它来自你曾经走过的岸边。带它飞向微光上方的绿色环。');
      }
    } else {
      const speed = s.stage === 2 ? 60 : s.stage === 1 ? 45 : 43;
      const tx = steering ? dx / (magnitude || 1) * speed : s.stage < 2 ? Math.sin(s.time * .6) * 3 : 0;
      const ty = steering ? dy / (magnitude || 1) * speed : s.stage < 2 ? Math.cos(s.time * .4) * 2 : 0;
      player.vx += (tx - player.vx) * Math.min(1, dt * (s.stage === 2 ? 12 : 4)); player.vy += (ty - player.vy) * Math.min(1, dt * (s.stage === 2 ? 12 : 4));
      player.speed = Math.hypot(player.vx, player.vy);
      if (player.speed > 1) player.angle += turn(player.angle, Math.atan2(player.vy, player.vx)) * Math.min(1, dt * 8);
    }
    player.x += player.vx * dt; player.y += player.vy * dt;
    const bounds = s.stage === 0 ? [275, 660, 510, 800] : s.stage === 1 ? [620, 1070, 560, 895] : s.stage === 2 ? [640, 1300, 525, 925] : [15, s.width - 15, 15, s.height - 15];
    player.x = clamp(player.x, bounds[0], bounds[1]); player.y = clamp(player.y, bounds[2], bounds[3]);
    if (s.stage === 2) {
      if (player.cargo) { deposit(s.foodField, player.x, player.y, dt * 5); deposit(s.playerField, player.x, player.y, dt * 5); if (distance(player, nest) < 25) { player.cargo = false; receiveFood(true); } }
      else for (const f of s.food) if (f.amount > 0 && distance(player, f) < 16) {
        f.amount--; player.cargo = true; particle(player.x, player.y, 8, 'amber'); event('pickup', player.x, player.y);
        message('ant-pickup', '接住了，带它回家', '金色的食物就在你身上。现在走向右侧的巢穴，沿路会留下气味。'); break;
      }
    }
  }
  s.update = (elapsed, input = {}) => {
    const dt = clamp(elapsed, 0, .05); if (!dt) return;
    s.time += dt; if (!s.started) { updateNodes(dt); s.events.length = 0; return; }
    s.stageAge += dt; s.cooldown = Math.max(0, s.cooldown - dt); s.secondaryCooldown = Math.max(0, s.secondaryCooldown - dt);
    updatePlayer(dt, input); updateNodes(dt); updateLife(dt);
    antClock += dt; if (antClock > .06) { updateAnts(antClock); antClock = 0; } updateBirds(dt);
    if (s.stage === 4) s.endTime += dt;
    for (const w of s.waves) w.age += dt; s.waves = s.waves.filter(w => w.age < 1.8);
    for (const l of s.links) l.age += dt; s.links = s.links.filter(l => l.age < (l.kind === 'food' ? 4 : 1.5));
    for (const f of s.falling) { f.age += dt; if (f.age >= f.life) landSeed(f.x, f.y, f.byPlayer); } s.falling = s.falling.filter(f => f.age < f.life);
    for (const p of s.sparks) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * .8; p.vy *= 1 - dt * .8; }
    s.sparks = s.sparks.filter(p => p.age < p.life); trailClock += dt;
    if (trailClock > .09) { trailClock = 0; for (const b of [player, ...s.birds]) { b.trail.push({x: b.x, y: b.y}); if (b.trail.length > (b === player ? 35 : 14)) b.trail.shift(); } }
  };
  return s;
}
