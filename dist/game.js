import {createWorld} from './world.js';
import {createRenderer} from './renderer.js';
import {createSoundscape} from './soundscape.js';

const $ = id => document.getElementById(id), canvas = $('world');
const renderer = createRenderer(canvas), sound = createSoundscape();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const keys = new Set(), pointer = {active: false, x: 0, y: 0};
let world = createWorld(), mode = 'menu', wide = false, last = performance.now();
let stories = [], storyEnd = 0, uiClock = 0, transitionEnd = 0, endShown = false;
let audioOn = true, focusBefore = null;
const history = [...document.querySelectorAll('#world-history [data-stage]')];
const scaleNotes = ['微观 · 贴近一个生命', '近景 · 看见生长的结构', '地面 · 一条路怎样形成', '天空 · 从个体看见群体', '回望 · 生命仍在继续'];
const chainNames = [
  ['你的闪光', '邻居接住', '群体合拍'],
  ['初始图案', '邻近演化', '岸边的食物'],
  ['个体探索', '气味留痕', '群体往返'],
  ['带上草籽', '与同伴同行', '新的生长'],
  ['微光与生长', '道路与天空', '下一次开始']
];
const details = [
  '亮起的细线，是一次回应经过的地方。远处的生命通过邻居接到它。',
  '新生的细胞以亮色显现，消退的部分留下痕迹；金色资源会流向岸边。',
  '地上的气味会逐渐消退。被反复选择的路，才会持续变得清楚。',
  '鸣叫只影响身边同伴。更远处的转向，由它们继续传递。',
  '世界保存了所有改变。你可以随时回到其中一个生命的尺度。'
];
function clearInput() { keys.clear(); pointer.active = false; renderer.setHover(null); }
function queueStory(title, text, priority = false) {
  const item = {title, text};
  if (priority) { stories = [item]; storyEnd = 0; }
  else if (!stories.some(s => s.title === title)) { stories.push(item); if (stories.length > 3) stories.splice(1, 1); }
}
function start() {
  world = createWorld(); renderer.reset(); clearInput(); mode = 'playing'; wide = false;
  stories = []; storyEnd = 0; transitionEnd = 0; endShown = false; uiClock = 0;
  $('landing').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pause').classList.remove('hidden');
  for (const id of ['ending','modal','story','perspective','ready-card']) $(id).classList.add('hidden');
  $('overview').setAttribute('aria-pressed', 'false'); document.body.classList.remove('has-ready');
  sound.start(); sound.pause(false); world.start(); consumeEvents(); updateUi(); canvas.focus({preventScroll: true}); last = performance.now();
}
function pause(help = false) {
  if (mode === 'paused') return;
  focusBefore = document.activeElement; clearInput(); mode = 'paused'; sound.pause(true);
  $('modal-title').textContent = help ? '从身边开始，让世界回应' : '世界，暂时屏住了呼吸';
  $('guide').classList.toggle('hidden', !help); $('modal').classList.remove('hidden'); $('resume').focus({preventScroll: true});
}
function resume() {
  mode = $('landing').classList.contains('hidden') ? 'playing' : 'menu';
  $('modal').classList.add('hidden'); sound.pause(mode !== 'playing'); last = performance.now();
  if (focusBefore?.isConnected) focusBefore.focus({preventScroll: true});
}
function act() { if (mode !== 'playing') return; sound.start(); world.action(); consumeEvents(); updateUi(); }
function secondary() { if (mode !== 'playing') return; world.secondary(); consumeEvents(); updateUi(); }
function advance() {
  if (mode !== 'playing') return;
  if (world.advance()) { wide = false; $('overview').setAttribute('aria-pressed', 'false'); consumeEvents(); updateUi(); }
}
function toggleOverview() {
  if (mode !== 'playing' || world.stage === 4) return;
  wide = !wide; clearInput(); $('overview').setAttribute('aria-pressed', String(wide)); updateUi();
}
$('start').onclick = start; $('pause').onclick = () => pause(); $('help').onclick = () => pause(true);
$('brand').onclick = () => pause(); $('resume').onclick = resume; $('new-world').onclick = start;
$('action').onclick = act; $('secondary').onclick = secondary; $('next').onclick = advance;
$('overview').onclick = toggleOverview; $('restart').onclick = start;
$('sound').onclick = () => { audioOn = !audioOn; sound.setEnabled(audioOn); $('sound').textContent = '声音 ' + (audioOn ? '开' : '关'); $('sound').setAttribute('aria-pressed', String(audioOn)); };
$('keep-living').onclick = () => { $('ending').classList.add('hidden'); canvas.focus({preventScroll: true}); };
for (const button of history) button.onclick = () => {
  if (mode !== 'playing') return;
  world.visit(Number(button.dataset.stage)); wide = false; $('overview').setAttribute('aria-pressed', 'false');
  $('ending').classList.add('hidden'); consumeEvents(); updateUi();
};
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'playing' || world.stage === 4) return;
  pointer.active = true; pointer.x = e.clientX; pointer.y = e.clientY; canvas.setPointerCapture(e.pointerId); e.preventDefault();
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; if (mode === 'playing') renderer.setHover(renderer.fromScreen(e.clientX, e.clientY)); });
canvas.addEventListener('pointerup', () => pointer.active = false); canvas.addEventListener('pointercancel', () => pointer.active = false);
canvas.addEventListener('pointerleave', () => renderer.setHover(null));
const controlledKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyV','Enter','ShiftLeft','ShiftRight'];
addEventListener('keydown', e => {
  if (e.code === 'Escape') { e.preventDefault(); if (mode === 'paused') resume(); else pause(); return; }
  if (mode === 'paused' && e.code === 'Tab') {
    const first = $('resume'), last = $('new-world');
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (mode !== 'playing' || !controlledKeys.includes(e.code)) return;
  if (document.activeElement?.tagName === 'BUTTON' && e.code === 'Enter') return;
  e.preventDefault(); keys.add(e.code);
  if (!e.repeat) {
    if (e.code === 'Space') act(); if (e.code === 'KeyE') secondary(); if (e.code === 'KeyV') toggleOverview(); if (e.code === 'Enter') advance();
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { clearInput(); if (mode === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });
function updateUi() {
  const goal = world.goal();
  $('role').textContent = goal.role; $('scale-note').textContent = wide ? '远望 · 同一个生命世界' : scaleNotes[world.stage];
  $('goal-title').textContent = goal.title; $('goal-hint').textContent = goal.hint; $('goal-status').textContent = goal.status;
  $('goal-progress').style.width = (world.ready[world.stage] ? 1 : Math.min(1, goal.progress)) * 100 + '%';
  $('action-label').textContent = world.cooldown > 0 ? `${goal.action} · ${world.cooldown.toFixed(1)}` : goal.action;
  $('action').disabled = world.cooldown > 0 || (world.stage === 1 && world.plantBudget < 1);
  $('secondary').classList.toggle('hidden', !goal.secondary); $('secondary-label').textContent = goal.secondary;
  $('secondary').disabled = world.stage === 3 && (!world.player.seed || world.secondaryCooldown > 0);
  $('move-note').textContent = world.stage === 3 ? '或按住画面转向 · 始终飞行' : world.stage === 2 ? '或按住画面行走' : '或按住画面游动';
  $('overview').innerHTML = (wide ? '回到身边' : '看整个世界') + ' <kbd>V</kbd>';
  $('overview').classList.toggle('hidden', world.stage === 4);
  const ready = !!world.ready[world.stage]; $('ready-card').classList.toggle('hidden', !ready); document.body.classList.toggle('has-ready', ready);
  $('next-label').textContent = goal.next;
  history.forEach((button, i) => {
    button.disabled = i > world.maxStage; button.classList.toggle('active', i === world.stage);
    button.setAttribute('aria-label', ['回到微光','回到生长','回到道路','回到飞行'][i] + '，' + world.memory[i]);
    $('memory-' + i).textContent = i > world.maxStage ? '尚未抵达' : world.memory[i];
  });
  const chain = chainNames[world.stage];
  $('causal-chain').textContent = '';
  for (let i = 0; i < chain.length; i++) {
    if (i) { const arrow = document.createElement('i'); arrow.textContent = '↓'; $('causal-chain').append(document.createElement('br'), arrow, document.createElement('br')); }
    $('causal-chain').append(document.createTextNode(chain[i]));
  }
  $('causal-detail').textContent = details[world.stage];
}
function consumeEvents() {
  for (const e of world.events.splice(0)) {
    sound.event(e, world);
    if (e.type === 'story') queueStory(e.title, e.text);
    if (e.type === 'perspective') {
      stories = []; storyEnd = 0; $('story').classList.add('hidden'); clearInput();
      const titles = ['一粒微光', '一枚孢子', '一只蚂蚁', '一只飞鸟', '一个世界'];
      const bodies = ['由身边的回应，开始。', '把最初的图案，留给生命。', '走出的路，会被同伴接过。', '你始终在飞行，也始终属于其中。', '每一种生命，都还在继续。'];
      $('perspective-kicker').textContent = '视角来到另一种生命'; $('perspective-title').textContent = titles[e.stage]; $('perspective-body').textContent = bodies[e.stage];
      $('perspective').classList.remove('hidden'); $('perspective').style.animation = 'none';
      void $('perspective').offsetWidth; $('perspective').style.animation = ''; transitionEnd = world.time + 4.2;
    }
    if (e.type === 'milestone') { updateUi(); }
    if (e.type === 'ending') { endShown = false; }
  }
}
function updateStories() {
  if (transitionEnd > world.time) return;
  $('perspective').classList.add('hidden');
  if (storyEnd && world.time > storyEnd - 1.4) $('story').classList.add('fading');
  if (!storyEnd || world.time > storyEnd) {
    $('story').classList.add('hidden'); storyEnd = 0;
    if (stories.length) {
      const item = stories.shift(); $('story-title').textContent = item.title; $('story-body').textContent = item.text;
      $('story').classList.remove('hidden','fading'); storyEnd = world.time + 7;
    }
  }
}
function frame(now) {
  const dt = Math.min(.045, Math.max(0, (now - last) / 1000)); last = now;
  if (mode === 'playing') {
    const dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    const p = renderer.fromScreen(pointer.x, pointer.y);
    world.update(dt, {...p, active: pointer.active && !dx && !dy, dx, dy, low: keys.has('ShiftLeft') || keys.has('ShiftRight')});
    consumeEvents(); sound.tick(world); updateStories(); uiClock += dt;
    if (uiClock > .2) { uiClock = 0; updateUi(); }
    if (world.stage === 4 && world.endTime > 9 && !endShown) {
      endShown = true;
      $('ending-memory').textContent = `${world.touched} 个生命接住过你的微光。\n${world.life.births} 次新生留在岸边。\n${world.harvested} 趟往返，走出地上的路。\n${world.returnedSeeds} 粒种子，又回到了起点。`;
      $('ending').classList.remove('hidden');
    }
  } else if (mode === 'menu') world.update(dt);
  renderer.draw(world, mode === 'paused' ? 0 : dt, {menu: mode === 'menu' || !$('landing').classList.contains('hidden'), wide, reduced: reducedMotion});
  requestAnimationFrame(frame);
}
addEventListener('error', () => $('load-error').classList.remove('hidden'));
requestAnimationFrame(frame);
