import {createWorld} from './world.js';
import {createRenderer} from './renderer.js';
import {createSoundscape} from './soundscape.js';

const $ = id => document.getElementById(id), canvas = $('world');
const renderer = createRenderer(canvas), sound = createSoundscape();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const keys = new Set(), pointer = {active: false, x: 0, y: 0}, stick = {id: null, dx: 0, dy: 0};
const saveKey = 'between-all-things-world-v401';
let world = createWorld(), mode = 'menu', wide = false, last = performance.now();
let stories = [], storyEnd = 0, uiClock = 0, saveClock = 0, transitionEnd = 0, endingPending = false;
let audioOn = true, focusBefore = null, cachedSave = null;
const history = [...document.querySelectorAll('#world-history [data-stage]')];
const shores = [...document.querySelectorAll('[data-garden]')];
const names = ['一粒微光', '一枚孢子', '一只蚂蚁', '一只飞鸟'];
const scaleNotes = ['水边 · 光与湿润', '岸地 · 生长与结实', '地面 · 食物与养分', '天空 · 种子与远方'];
const chains = ['你的闪光 → 邻居回应 → 当地保湿', '邻近生长 → 原地结实 → 食物与种子', '食物回巢 → 腐殖养分 → 搬回岸地', '植物结籽 → 飞鸟携带 → 异地萌发'];
const details = ['长风使岸地变干，微光的帮助只停留一会儿。', '成熟需要时间，结实需要湿润与当地养分。', '气味会衰减，空路也会误导；观察同伴的实际往返。', '落种没有指定答案，深水、风、干旱和土壤都会改变结果。'];
function clearInput() {
  keys.clear(); pointer.active = false; stick.id = null; stick.dx = stick.dy = 0;
  $('stick').style.transform = 'translate(-50%,-50%)'; renderer.setHover(null);
}
function queueStory(title, text) {
  if (stories.some(s => s.title === title)) return;
  stories.push({title, text}); if (stories.length > 4) stories.shift();
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return;
    const snapshot = JSON.parse(raw), candidate = createWorld(); candidate.restore(snapshot);
    cachedSave = snapshot; $('continue').classList.remove('hidden'); $('start').className = 'text-button';
    $('start').textContent = '另起一个世界'; $('save-note').textContent = '发现本机世界记录 · 离开页面时世界暂停';
  } catch { $('save-note').textContent = '本机存档暂不可用；仍可开始，并手动导出世界记录。'; }
}
function saveLocal(notify = false) {
  if (!world.started) return;
  try {
    const snapshot = world.snapshot(); localStorage.setItem(saveKey, JSON.stringify(snapshot)); cachedSave = snapshot;
    $('save-status').textContent = '已保存到本机 · 世界时间 ' + Math.floor(world.time / 60) + ':' + String(Math.floor(world.time % 60)).padStart(2, '0');
    if (notify) queueStory('这个世界，留在了本机', '可以继续生活，或从菜单导出一份独立记录。');
  } catch { $('save-status').textContent = '本机存储不可用。请用「导出世界记录」保留进度。'; }
}
function exportSave() {
  if (!world.started) { $('save-status').textContent = '进入世界后即可保存记录。'; return; }
  const blob = new Blob([JSON.stringify(world.snapshot())], {type: 'application/json'});
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = '万物之间-世界记录-' + Math.floor(world.time) + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function enter(nextWorld, fresh) {
  world = nextWorld; renderer.reset(); clearInput(); mode = 'playing'; wide = false;
  stories = []; storyEnd = 0; transitionEnd = 0; uiClock = 0; saveClock = 0; endingPending = world.completed && !world.endingSeen;
  document.body.classList.remove('has-ending');
  $('landing').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pause').classList.remove('hidden');
  for (const id of ['ending', 'modal', 'story', 'perspective', 'review', 'restart-choice']) $(id).classList.add('hidden');
  $('overview').setAttribute('aria-pressed', 'false'); document.body.classList.remove('world-wide');
  sound.start(); sound.pause(false); if (fresh) world.start(); consumeEvents(); updateUi(); saveLocal();
  canvas.focus({preventScroll: true}); last = performance.now();
}
function startNew() { enter(createWorld(), true); }
function pause(help = false) {
  if (mode === 'paused') return;
  focusBefore = document.activeElement; clearInput(); saveLocal(); mode = 'paused'; sound.pause(true);
  $('modal-title').textContent = help ? '先看身边，再看它去了哪里' : '世界，暂时屏住了呼吸';
  $('guide').classList.toggle('hidden', !help); $('restart-choice').classList.add('hidden');
  $('modal').classList.remove('hidden'); $('resume').focus({preventScroll: true});
}
function resume() {
  mode = $('landing').classList.contains('hidden') ? 'playing' : 'menu';
  $('modal').classList.add('hidden'); sound.pause(mode !== 'playing'); last = performance.now();
  if (focusBefore?.isConnected) focusBefore.focus({preventScroll: true}); else canvas.focus();
}
function act() { if (mode !== 'playing' || wide || document.body.classList.contains('has-ending')) return; sound.start(); world.action(); consumeEvents(); updateUi(); }
function secondary() { if (mode !== 'playing' || wide || document.body.classList.contains('has-ending')) return; world.secondary(); consumeEvents(); updateUi(); }
function hideEnding() { $('ending').classList.add('hidden'); document.body.classList.remove('has-ending'); }
function setWide(value) {
  wide = value; clearInput(); $('overview').setAttribute('aria-pressed', String(wide));
  $('review').classList.toggle('hidden', !wide); document.body.classList.toggle('world-wide', wide); updateUi();
}
function toggleOverview() { if (mode === 'playing') setWide(!wide); }
function visit(stage) {
  if (mode !== 'playing') return;
  clearInput(); world.visit(stage); setWide(false); hideEnding(); consumeEvents(); updateUi(); saveLocal();
}
$('start').onclick = () => {
  if (cachedSave) { pause(); $('restart-choice').classList.remove('hidden'); } else startNew();
};
$('continue').onclick = () => {
  try { const next = createWorld(); next.restore(cachedSave); enter(next, false); }
  catch { $('save-note').textContent = '记录无法恢复，可另起世界或从菜单导入备份。'; }
};
$('pause').onclick = () => pause(); $('help').onclick = () => pause(true); $('brand').onclick = () => pause(); $('resume').onclick = resume;
$('action').onclick = act; $('secondary').onclick = secondary; $('overview').onclick = toggleOverview;
$('sound').onclick = () => { audioOn = !audioOn; sound.setEnabled(audioOn); $('sound').textContent = '声音 ' + (audioOn ? '开' : '关'); $('sound').setAttribute('aria-pressed', String(audioOn)); };
$('keep-living').onclick = () => { hideEnding(); canvas.focus({preventScroll: true}); };
$('ending-review').onclick = () => { hideEnding(); setWide(true); };
$('new-world').onclick = () => $('restart-choice').classList.remove('hidden');
$('cancel-restart').onclick = () => $('restart-choice').classList.add('hidden'); $('restart').onclick = startNew;
$('save-now').onclick = () => saveLocal(true); $('export-save').onclick = exportSave; $('export-world').onclick = exportSave;
$('import-save').onclick = () => $('import-file').click();
$('import-file').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 4 * 1024 * 1024) throw new Error('记录文件过大');
    const data = JSON.parse(await file.text()), candidate = createWorld(); candidate.restore(data);
    enter(candidate, false);
  } catch (error) { $('save-status').textContent = '未导入：' + error.message; }
  e.target.value = '';
};
$('dismiss-orientation').onclick = () => $('orientation-note').classList.add('hidden');
history.forEach((button, i) => button.onclick = () => visit(i));
shores.forEach((button, i) => button.onclick = () => { if (mode !== 'playing') return; world.selectGarden(i); consumeEvents(); updateUi(); });
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'playing' || wide) return;
  pointer.active = true; pointer.x = e.clientX; pointer.y = e.clientY; canvas.setPointerCapture(e.pointerId); e.preventDefault();
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; if (mode === 'playing' && !wide) renderer.setHover(renderer.fromScreen(e.clientX, e.clientY)); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => pointer.active = false);
canvas.addEventListener('pointerleave', () => renderer.setHover(null));
function moveStick(e) {
  if (e.pointerId !== stick.id) return;
  const r = $('joystick').getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
  const d = Math.hypot(x, y), k = Math.min(1, 34 / (d || 1)); stick.dx = d < 8 ? 0 : x * k / 34; stick.dy = d < 8 ? 0 : y * k / 34;
  $('stick').style.transform = `translate(calc(-50% + ${x * k}px),calc(-50% + ${y * k}px))`; e.preventDefault();
}
$('joystick').addEventListener('pointerdown', e => {
  if (mode !== 'playing' || wide) return; stick.id = e.pointerId; $('joystick').setPointerCapture(e.pointerId); moveStick(e);
});
$('joystick').addEventListener('pointermove', moveStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('joystick').addEventListener(type, () => { stick.id = null; stick.dx = stick.dy = 0; $('stick').style.transform = 'translate(-50%,-50%)'; });
const controlledKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyV','ShiftLeft','ShiftRight','Digit1','Digit2','Digit3','Digit4'];
addEventListener('keydown', e => {
  if (mode === 'paused' && e.code === 'Tab') {
    const controls = [...$('modal').querySelectorAll('button,input')].filter(el => !el.disabled && el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.code === 'Escape') { e.preventDefault(); if (mode === 'paused') resume(); else pause(); return; }
  if (mode !== 'playing' || !controlledKeys.includes(e.code)) return;
  e.preventDefault(); keys.add(e.code);
  if (!e.repeat) {
    if (e.code === 'Space') act(); if (e.code === 'KeyE') secondary(); if (e.code === 'KeyV') toggleOverview();
    if (/^Digit[1-4]$/.test(e.code)) visit(Number(e.code.slice(-1)) - 1);
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { clearInput(); if (mode === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });
addEventListener('pagehide', () => saveLocal());
function updateReview() {
  $('review-totals').textContent = `世界共同进展：${Math.floor(world.time / 60)}分${Math.floor(world.time % 60)}秒 · ${world.harvested}次搬运 · ${world.stats.nourished}次补给 · ${world.returnedSeeds}次萌发。你的直接搬回：${world.playerReturns}份食物、${world.stats.playerNourished}份养分。远岸当前有${world.gardens[2].reproductive}株本地第二代及以后成熟结实。`;
  $('journal').replaceChildren();
  for (const item of world.journal.slice(-12).reverse()) {
    const li = document.createElement('li'); li.textContent = `${Math.floor(item.time / 60)}:${String(item.time % 60).padStart(2, '0')} ${item.title}：${item.text}`; $('journal').append(li);
  }
  $('review-traces').replaceChildren();
  for (const r of world.traces.slice(-24).reverse()) {
    const li = document.createElement('li');
    li.textContent = `${r.kind} #${r.id} · 起点(${Math.round(r.originX)},${Math.round(r.originY)}) · ${r.status}。` + r.history.map(h => `${Math.floor(h.time / 60)}:${String(h.time % 60).padStart(2, '0')} ${h.text}`).join(' → ');
    $('review-traces').append(li);
  }
  const data = world.timeline.slice(-90), max = Math.max(20, ...data.map(d => d.plants));
  $('trend').replaceChildren();
  if (data.length > 1) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', data.map((d, i) => `${5 + i / (data.length - 1) * 250},${55 - d.plants / max * 50}`).join(' '));
    line.setAttribute('stroke', '#bfdca1'); line.setAttribute('fill', 'none'); line.setAttribute('stroke-width', '1.7'); $('trend').append(line);
  }
}
function updateUi() {
  const g = world.goal();
  $('role').textContent = g.role; $('scale-note').textContent = wide ? '回望 · 所有生命继续生活' : scaleNotes[world.stage];
  $('goal-title').textContent = g.title; $('goal-hint').textContent = g.hint; $('goal-status').textContent = g.status;
  $('local-status').textContent = g.local; $('goal-progress').style.width = g.progress * 100 + '%';
  $('action-label').textContent = world.cooldown > 0 ? `${g.action} · ${world.cooldown.toFixed(1)}` : g.action;
  $('action').disabled = wide || world.cooldown > 0 || (world.stage === 1 && world.plantBudget < 1);
  $('secondary-label').textContent = g.secondary; $('secondary').disabled = wide || (world.stage === 3 && (!world.player.seed || world.secondaryCooldown > 0));
  $('move-note').textContent = world.stage === 3 ? '持续飞行 · Shift 低飞' : '或按住画面移动';
  $('overview').innerHTML = (wide ? '回到身边' : '世界回望') + ' <kbd>V</kbd>';
  $('causal-chain').textContent = chains[world.stage]; $('causal-detail').textContent = details[world.stage]; $('cargo-status').textContent = g.pocket;
  $('season').textContent = `${world.weather} · ${45 - Math.floor(world.time % 45)}秒后轮替`;
  history.forEach((button, i) => {
    button.disabled = false; button.classList.toggle('active', i === world.stage); button.setAttribute('aria-pressed', String(i === world.stage));
    $('memory-' + i).textContent = world.memory[i];
  });
  shores.forEach((button, i) => {
    const g = world.gardens[i]; button.classList.toggle('active', i === world.selectedGarden); button.setAttribute('aria-pressed', String(i === world.selectedGarden));
    $('shore-' + i).textContent = `${!g.population ? '空岸 · 无植被' : g.soil < .14 ? '缺少养分' : g.water < .3 ? '缺水' : g.mature < 4 ? '等待成熟' : '生机延续'} · ${g.mature}株\n湿${Math.round(g.water * 100)}% 肥${Math.round(g.soil * 100)}%${i === 2 ? ' · 后代结实' + g.reproductive + '/2' : ''}`;
    button.title = `${g.name}：4株成熟、湿度30%、养分14%可维持生机。风中洲还须本地第二代后代结实与近期自然新生。点击仅标记方向。`;
  });
  $('action-traces').replaceChildren();
  const traces = world.contribution();
  if (!traces.length) {
    const li = document.createElement('li'); li.textContent = '尚无行动记录。世界自主变化会单独记入回望。'; $('action-traces').append(li);
  }
  for (const r of traces) {
    const li = document.createElement('li'); li.textContent = `${r.kind} #${r.id} · ${r.status}`; $('action-traces').append(li);
  }
  if (wide) updateReview();
}
function consumeEvents() {
  for (const e of world.events.splice(0)) {
    sound.event(e, world);
    if (e.type === 'story') queueStory(e.title, e.text);
    if (e.type === 'perspective') {
      clearInput(); storyEnd = 0; $('story').classList.add('hidden');
      $('perspective-title').textContent = names[e.stage]; $('perspective-body').textContent = chains[e.stage];
      $('perspective').classList.remove('hidden'); $('perspective').style.animation = 'none'; void $('perspective').offsetWidth;
      $('perspective').style.animation = ''; transitionEnd = world.time + 1.8;
    }
    if (e.type === 'ending') endingPending = true;
  }
}
function updateStories() {
  if (transitionEnd > world.time) return;
  $('perspective').classList.add('hidden');
  if (storyEnd && world.time > storyEnd - 1) $('story').classList.add('fading');
  if (!storyEnd || world.time > storyEnd) {
    $('story').classList.add('hidden'); storyEnd = 0;
    if (stories.length) {
      const item = stories.shift(); $('story-title').textContent = item.title; $('story-body').textContent = item.text;
      $('story').classList.remove('hidden', 'fading'); storyEnd = world.time + 6;
    }
  }
}
function frame(now) {
  const dt = Math.min(.045, Math.max(0, (now - last) / 1000)); last = now;
  if (mode === 'playing') {
    const dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) || stick.dx;
    const dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) || stick.dy;
    const p = renderer.fromScreen(pointer.x, pointer.y);
    world.update(dt, wide || document.body.classList.contains('has-ending') ? {} : {...p, active: pointer.active && !dx && !dy, dx, dy, low: keys.has('ShiftLeft') || keys.has('ShiftRight')});
    consumeEvents(); sound.tick(world); updateStories(); uiClock += dt; saveClock += dt;
    if (uiClock > .4) { uiClock = 0; updateUi(); }
    if (saveClock > 15) { saveClock = 0; saveLocal(); }
    if (endingPending && world.time - world.endTime > 3) {
      endingPending = false; world.endingSeen = true;
      $('ending-memory').textContent = `达成时，风中洲有${world.completionProof.reproductive}株本地第二代及以后后代成熟结实，近期仍有自然新生。\n世界共同完成${world.harvested}次食物运输、${world.stats.nourished}次补给。你直接搬回${world.playerReturns}份食物、送达${world.stats.playerNourished}份养分。\n具体播种、携种与同伴回应，保留在世界回望中；生态成果由生命和环境共同形成。`;
      clearInput(); document.body.classList.add('has-ending');
      $('ending').classList.remove('hidden'); $('keep-living').focus({preventScroll: true}); saveLocal();
    }
  } else if (mode === 'menu') world.update(dt);
  renderer.draw(world, mode === 'paused' ? 0 : dt, {menu: mode === 'menu' || !$('landing').classList.contains('hidden'), wide, reduced: reducedMotion});
  requestAnimationFrame(frame);
}
addEventListener('error', () => $('load-error').classList.remove('hidden'));
addEventListener('unhandledrejection', () => $('load-error').classList.remove('hidden'));
loadLocal(); requestAnimationFrame(frame);
