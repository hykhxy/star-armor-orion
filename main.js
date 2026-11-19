(() => {
'use strict';
const $ = s => document.querySelector(s);
const body = document.body;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let DPR = Math.min(devicePixelRatio || 1, 2);

/* ---------- 阶段管理 ---------- */
const STAGES = ['boot','banner','glitch','menu','welcome','hub','panel','info'];
function setStage(...on){
  STAGES.forEach(s => body.classList.remove('stage-' + s));
  on.forEach(s => body.classList.add('stage-' + s));
}
const has = s => body.classList.contains('stage-' + s);

/* ---------- 音效(Web Audio 合成) + 欢迎语音 ---------- */
const welcomeAudio = $('#welcomeAudio');
let actx = null, soundOn = false, soundPref = null, ambience = null;
function ensureAudio(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
  if (actx && actx.state === 'suspended') actx.resume();
}
function blip(freq = 880, dur = .06, type = 'square', vol = .04, slide = 0){
  if (!soundOn || !actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .02);
}
function noiseBurst(dur = .4, vol = .08, freq = 1800){
  if (!soundOn || !actx) return;
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
  s.buffer = buf; s.connect(f).connect(g).connect(actx.destination); s.start();
}
function startAmbience(){
  if (!actx || ambience) return;
  const g = actx.createGain(); g.gain.value = 0; g.connect(actx.destination);
  [55, 82.4, 110.3].forEach((f, i) => {
    const o = actx.createOscillator(), lg = actx.createGain(), l = actx.createOscillator();
    o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = f;
    lg.gain.value = i ? .5 : .18; l.frequency.value = .05 + i * .03;
    const lfoG = actx.createGain(); lfoG.gain.value = .3; l.connect(lfoG).connect(lg.gain);
    const flt = actx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 380;
    o.connect(lg).connect(flt).connect(g); o.start(); l.start();
  });
  g.gain.linearRampToValueAtTime(.05, actx.currentTime + 3);
  ambience = g;
}
function setSound(on, byUser){
  soundOn = on; if (byUser) soundPref = on;
  const b = $('#mute');
  b.textContent = 'SOUND: ' + (on ? 'ON' : 'OFF'); b.classList.toggle('on', on);
  welcomeAudio.muted = !on;
  if (on) { ensureAudio(); startAmbience(); if (ambience) ambience.gain.linearRampToValueAtTime(.05, actx.currentTime + 1); blip(1200, .1, 'sine', .05); }
  else if (ambience) ambience.gain.linearRampToValueAtTime(0, actx.currentTime + .4);
}
$('#mute').addEventListener('click', e => { e.stopPropagation(); setSound(!soundOn, true); });

/* ---------- 阶段 1:启动自检 ---------- */
const LOG = [
  ['系统确认开始', ''],
  ['记忆体装置确认', '无异常'],
  ['核聚变反应炉输出', '稳定'],
  ['战术方案', '恢复预设'],
  ['星图资料', '开始载入'],
  ['跃迁引擎校准', '99.2%'],
  ['生命数值确认', '无异常'],
  ['装甲完整度确认', '100%'],
  ['MP数值全部确认', '100%'],
  ['驾驶员同步率', '98.7%'],
  ['武装系统', '全部解锁'],
  ['链路建立', '完成'],
];
let skipped = false;
async function boot(){
  const el = $('#bootlog'), bar = $('#bootbar');
  let html = '';
  for (let i = 0; i < LOG.length && !skipped; i++){
    const [k, v] = LOG[i];
    const line = `> ${k}${v ? ' ... ' : ''}`;
    for (let c = 0; c <= line.length && !skipped; c++){
      el.innerHTML = html + line.slice(0, c) + '<span class="cur"></span>';
      if (c % 3 === 0) blip(1500 + Math.random() * 600, .02, 'square', .015);
      await sleep(reduce ? 0 : 14);
    }
    html += line + (v ? `<span class="ok">${v}</span>` : '') + '\n';
    el.innerHTML = html + '<span class="cur"></span>';
    bar.style.width = ((i + 1) / LOG.length * 100) + '%';
    await sleep(reduce ? 0 : 90 + Math.random() * 120);
  }
  bar.style.width = '100%';
  if (!skipped) await sleep(600);
  banner();
}
async function banner(){
  setStage('banner');
  await sleep(skipped ? 700 : 3200);
  glitchToMenu();
}
async function glitchToMenu(){
  setStage('glitch');
  noiseBurst(.9, .12); blip(90, .6, 'sawtooth', .05, -50);
  await sleep(950);
  setStage('menu');
  startIdle();
}
$('#skip').addEventListener('click', e => { e.stopPropagation(); ensureAudio(); skipped = true; });

/* ---------- 标题页:点击登录 → 欢迎语音 → 进入主菜单 ---------- */
let loggingIn = false, inHub = false, prevMain = 'menu';
async function login(){
  if (loggingIn || !has('menu') || has('panel')) return;
  loggingIn = true;
  ensureAudio();
  if (soundPref !== false) setSound(true);
  welcomeAudio.muted = !soundOn;
  try { welcomeAudio.currentTime = 0; const p = welcomeAudio.play(); if (p && p.catch) p.catch(() => {}); } catch(e){}
  setStage('welcome');
  const f = $('#gflash'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = 'gflash .6s steps(2,end)';
  noiseBurst(.5, .08, 2600); blip(300, .5, 'sine', .04, 900);
  await sleep(reduce ? 1200 : 3400);
  enterHub();
}
document.addEventListener('click', login);
$('#licbtn').addEventListener('click', e => { e.stopPropagation(); openLicense(); });
function openLicense(){ prevMain = has('hub') ? 'hub' : 'menu'; setStage(prevMain, 'panel'); blip(880, .12, 'sine', .05, 300); }
function closePanels(){ setStage(prevMain); blip(440, .08); }
$('#panelback').addEventListener('click', closePanels);
$('#infoback').addEventListener('click', closePanels);

/* ---------- 主菜单:机甲 + 公转星球 ---------- */
const W0 = 1672, H0 = 941;
const hubEl = $('#hub'), canvasEl = $('#hubcanvas');
const stageBack = $('#stageBack'), stageFront = $('#stageFront');
const orbsEl = $('#orbs'), ringsEl = $('#rings');
const head = $('#mechhead');
let S = 1;

function layoutHub(){
  const vw = innerWidth, vh = innerHeight, aspect = vw / vh;
  const contain = Math.min(vw / W0, vh / H0), cover = Math.max(vw / W0, vh / H0);
  S = aspect < 1.2 ? vw / W0 : Math.max(contain, cover * .9);
  const w = W0 * S, h = H0 * S;
  const topShift = aspect < 1.2 ? -vh * .08 : 0;
  canvasEl.style.width = w + 'px'; canvasEl.style.height = h + 'px';
  canvasEl.style.left = (vw - w) / 2 + 'px';
  canvasEl.style.top = (vh - h) * (aspect < 1.2 ? .5 : .35) + topShift + 'px';
}

/* 五个槽位(沿机甲一圈的轨道,顺时针):手 → 下 → 左下 → 左上 → 上 */
const SLOT = [
  { x: 1368, y: 283, r: 208 },
  { x: 612,  y: 650, r: 116 },
  { x: 262,  y: 475, r: 102 },
  { x: 432,  y: 185, r: 100 },
  { x: 1053, y: 95,  r: 82  },
];
const N = SLOT.length;
const ORBS = [
  { cn: '创造角色', en: 'CREATE PILOT',   desc: '设定你的驾驶员 —— 姓名、代号、出身星域与同步率。' },
  { cn: '作者的话', en: "AUTHOR'S NOTE",  desc: '来自创作者的留言、设计笔记与致谢。' },
  { cn: '组装机甲', en: 'ASSEMBLE MECHA', desc: '挑选骨架、装甲、推进器与武装,拼装属于你的星际机甲。' },
  { cn: '世界观',   en: 'WORLDVIEW',      desc: '猎户纪元:星海、沉睡的舰队,以及被遗落的机甲文明。' },
  { cn: '角色图鉴', en: 'CODEX',          desc: '收录已知驾驶员、机体与势力的档案。' },
];
function cr(p0, p1, p2, p3, t){
  const t2 = t * t, t3 = t2 * t;
  return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function orbitAt(u){
  u = ((u % N) + N) % N;
  const i = Math.floor(u), t = u - i, g = k => SLOT[(i + k + N) % N];
  const a = g(-1), b = g(0), c = g(1), d = g(2);
  return {
    x: cr(a.x, b.x, c.x, d.x, t),
    y: cr(a.y, b.y, c.y, d.y, t),
    r: clamp(cr(a.r, b.r, c.r, d.r, t), 60, 216),
  };
}

// 轨道环(用同一条样条曲线画,球永远走在环上)
(function buildRings(){
  const pts = [];
  for (let k = 0; k <= 140; k++){ const o = orbitAt(k / 140 * N); pts.push(`${o.x.toFixed(1)},${o.y.toFixed(1)}`); }
  const d = 'M' + pts.join('L') + 'Z';
  const mk = (cls, tf) => `<path class="ring ${cls}" d="${d}" transform="${tf}"/>`;
  const cx = 800, cy = 400;
  const T = (s, rot, dx, dy) => `translate(${cx + dx} ${cy + dy}) rotate(${rot}) scale(${s}) translate(${-cx} ${-cy})`;
  ringsEl.innerHTML = mk('r1', T(1, 0, 0, 0)) + mk('r2', T(1.045, -2.5, 6, -4)) + mk('r3', T(.955, 3, -6, 6));
})();

// 星球 DOM
const orbs = ORBS.map((o, i) => {
  const el = document.createElement('div');
  el.className = 'orb';
  el.innerHTML = '<div class="orb-glass"><div class="orb-neb"></div><div class="orb-neb n2"></div><div class="orb-stars"></div></div>' +
    `<div class="orb-label">${o.cn}</div>`;
  orbsEl.appendChild(el);
  el.addEventListener('click', e => { e.stopPropagation(); onOrbClick(i); });
  return { el, i };
});
const pos = ORBS.map((_, i) => i);      // 每个球所在的槽位(连续值)
let rot = null, busy = false, introT0 = 0, introOn = false;
const slotOf = i => ((Math.round(pos[i]) % N) + N) % N;
const activeIndex = () => pos.findIndex((_, i) => slotOf(i) === 0);
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeBack = k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

function setCaption(i, instant){
  const cap = $('#cap'), set = () => {
    $('#capno').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    $('#capcn').textContent = ORBS[i].cn; $('#capen').textContent = ORBS[i].en; $('#capdesc').textContent = ORBS[i].desc;
    cap.classList.remove('swap');
  };
  if (instant) { set(); return; }
  cap.classList.add('swap'); setTimeout(set, 520);
}
function rotate(steps){
  if (busy || !steps || !introOn) return;
  busy = true;
  const dur = 1250 + (Math.abs(steps) - 1) * 520;
  rot = { t0: performance.now(), dur, from: pos.slice(), delta: steps };
  ringsEl.classList.add('spin');
  blip(300, .9, 'sine', .035, 900); noiseBurst(.9, .035, 900);
  const idxAfter = pos.findIndex((p, i) => ((Math.round(p + steps) % N) + N) % N === 0);
  setCaption(idxAfter);
}
function onOrbClick(i){
  if (busy || !introOn || has('panel') || has('info')) return;
  const k = slotOf(i);
  if (k === 0) rotate(1);                       // 点击手中的球:下一个转进手里,它转到下一格
  else { const cw = N - k, ccw = k; rotate(cw <= ccw ? cw : -ccw); }
}
function openInfo(){
  if (!introOn || busy) return;
  const i = activeIndex();
  $('#infot').textContent = ORBS[i].cn; $('#infoen').textContent = ORBS[i].en; $('#infod').textContent = ORBS[i].desc;
  prevMain = 'hub'; setStage('hub', 'info'); blip(880, .15, 'sine', .06, 400);
}
$('#capgo').addEventListener('click', e => { e.stopPropagation(); openInfo(); });

function enterHub(){
  layoutHub(); resizeFx();
  setCaption(activeIndex(), true);
  setStage('hub');
  inHub = true; introOn = false; introT0 = performance.now() + 900;
  $('#cap').style.opacity = 0;
  setTimeout(() => { introOn = true; $('#cap').style.opacity = ''; }, 900 + 1700);
  noiseBurst(.7, .06, 700); blip(80, 1.4, 'sawtooth', .05, 160);
  scheduleBlink();
}

function updateOrbs(now){
  if (rot){
    const k = clamp((now - rot.t0) / rot.dur, 0, 1), e = ease(k);
    for (let i = 0; i < N; i++) pos[i] = rot.from[i] + rot.delta * e;
    if (k >= 1){
      for (let i = 0; i < N; i++) pos[i] = ((Math.round(pos[i]) % N) + N) % N;
      rot = null; busy = false; ringsEl.classList.remove('spin');
    }
  }
  const act = rot ? -1 : activeIndex();
  for (let i = 0; i < N; i++){
    const o = orbitAt(pos[i]);
    const tt = clamp((now - introT0 - i * 170) / 900, 0, 1);
    const k = tt <= 0 ? 0 : easeBack(tt);
    const r = o.r * k * (1 + .012 * Math.sin(now * .002 + i));
    const bob = Math.sin(now * .0011 + i * 1.7) * 5 + Math.sin(now * .0007 + i) * 3;
    const el = orbs[i].el;
    el.style.width = el.style.height = (2 * r * S) + 'px';
    el.style.fontSize = Math.max(11, (10 + o.r * .16) * S * k) + 'px';
    el.style.transform = `translate(${(o.x - r) * S}px,${(o.y + bob - r) * S}px)`;
    el.style.opacity = clamp(tt * 1.6, 0, 1);
    el.style.zIndex = Math.round(o.r);
    el.classList.toggle('active', i === act);
    if (rot && Math.random() < .55) emitSpark(canvasEl.offsetLeft + o.x * S, canvasEl.offsetTop + (o.y + bob) * S, o.r * S);
  }
}

/* ---------- 机甲:眨眼 ---------- */
let blinkTimer = null;
function doBlink(){
  head.classList.remove('blink'); void head.offsetWidth; head.classList.add('blink');
  setTimeout(() => head.classList.remove('blink'), 280);
}
function scheduleBlink(){
  clearTimeout(blinkTimer);
  blinkTimer = setTimeout(async () => {
    if (inHub && !document.hidden){
      doBlink();
      if (Math.random() < .25){ await sleep(380); doBlink(); }
    }
    scheduleBlink();
  }, 2600 + Math.random() * 3800);
}

/* ---------- 星辰落下:流星 + 飘落星尘 + 公转火花 ---------- */
const fx = $('#hubfx'), fctx = fx.getContext('2d');
let meteors = [], motes = [], sparks = [], nextMeteor = 0, lastT = 0;
function resizeFx(){
  DPR = Math.min(devicePixelRatio || 1, 2);
  fx.width = innerWidth * DPR; fx.height = innerHeight * DPR;
  const n = clamp(Math.round(innerWidth / 14), 40, 130);
  motes = Array.from({ length: n }, () => newMote(true));
}
function newMote(init){
  return {
    x: Math.random() * fx.width, y: init ? Math.random() * fx.height : -10 * DPR,
    vy: (14 + Math.random() * 42) * DPR, sway: Math.random() * 6.28, sa: (6 + Math.random() * 16) * DPR,
    r: (.5 + Math.random() * 1.6) * DPR, tw: Math.random() * 6.28, ts: .8 + Math.random() * 2.4,
    glint: Math.random() < .16, hue: Math.random() < .2 ? '255,170,200' : '190,238,255',
  };
}
function spawnMeteor(){
  const ang = (101 + Math.random() * 20) * Math.PI / 180, sp = (650 + Math.random() * 950) * DPR;
  meteors.push({
    x: (.15 + Math.random() * .95) * fx.width, y: -30 * DPR,
    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, sp,
    len: (150 + Math.random() * 260) * DPR, w: (1 + Math.random() * 1.7) * DPR,
    c: Math.random() < .2 ? '255,120,160' : '160,235,255',
  });
}
function emitSpark(x, y, r){
  const a = Math.random() * 6.283, d = r * (.85 + Math.random() * .3);
  sparks.push({ x: x + Math.cos(a) * d * .6, y: y + Math.sin(a) * d * .6, vx: (Math.random() - .5) * 40 * DPR, vy: (Math.random() - .2) * 50 * DPR, life: 0, max: .7 + Math.random() * .6, r: (.8 + Math.random() * 1.8) * DPR });
}
function drawFx(now){
  const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
  const w = fx.width, h = fx.height; fctx.clearRect(0, 0, w, h);
  if (!inHub) return;
  fctx.globalCompositeOperation = 'lighter';
  // 飘落星尘
  for (const p of motes){
    p.y += p.vy * dt; p.sway += dt * .8;
    const x = p.x + Math.sin(p.sway) * p.sa;
    if (p.y > h + 10) Object.assign(p, newMote(false), { x: Math.random() * w });
    const a = .25 + .75 * Math.abs(Math.sin(now * .001 * p.ts + p.tw));
    fctx.fillStyle = `rgba(${p.hue},${a * .85})`;
    fctx.beginPath(); fctx.arc(x, p.y, p.r, 0, 6.283); fctx.fill();
    if (p.glint){
      fctx.strokeStyle = `rgba(${p.hue},${a * .6})`; fctx.lineWidth = DPR * .8;
      const L = p.r * 5 * a;
      fctx.beginPath(); fctx.moveTo(x - L, p.y); fctx.lineTo(x + L, p.y); fctx.moveTo(x, p.y - L); fctx.lineTo(x, p.y + L); fctx.stroke();
    }
  }
  // 流星
  nextMeteor -= dt;
  if (nextMeteor <= 0 && !reduce){ spawnMeteor(); if (Math.random() < .3) spawnMeteor(); nextMeteor = .55 + Math.random() * 1.5; }
  for (let i = meteors.length - 1; i >= 0; i--){
    const m = meteors[i];
    m.x += m.vx * dt; m.y += m.vy * dt;
    const tx = m.x - m.vx / m.sp * m.len, ty = m.y - m.vy / m.sp * m.len;
    const g = fctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,.95)`); g.addColorStop(.25, `rgba(${m.c},.55)`); g.addColorStop(1, `rgba(${m.c},0)`);
    fctx.strokeStyle = g; fctx.lineWidth = m.w; fctx.lineCap = 'round';
    fctx.beginPath(); fctx.moveTo(m.x, m.y); fctx.lineTo(tx, ty); fctx.stroke();
    const hg = fctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.w * 7);
    hg.addColorStop(0, 'rgba(255,255,255,.9)'); hg.addColorStop(1, `rgba(${m.c},0)`);
    fctx.fillStyle = hg; fctx.beginPath(); fctx.arc(m.x, m.y, m.w * 7, 0, 6.283); fctx.fill();
    if (m.y - m.len > h || m.x + m.len < 0) meteors.splice(i, 1);
  }
  // 公转火花
  for (let i = sparks.length - 1; i >= 0; i--){
    const s = sparks[i]; s.life += dt; if (s.life > s.max){ sparks.splice(i, 1); continue; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const a = 1 - s.life / s.max;
    const g = fctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
    g.addColorStop(0, `rgba(210,245,255,${a})`); g.addColorStop(1, 'rgba(110,200,255,0)');
    fctx.fillStyle = g; fctx.beginPath(); fctx.arc(s.x, s.y, s.r * 4, 0, 6.283); fctx.fill();
  }
  fctx.globalCompositeOperation = 'source-over';
}

/* ---------- 键盘 ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (has('panel') || has('info'))) { closePanels(); return; }
  if (has('menu') && !has('panel')) { if (e.key !== 'Tab') login(); return; }
  if (!has('hub') || has('panel') || has('info')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd' || e.key === 's') rotate(1);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'w') rotate(-1);
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInfo(); }
});

/* ---------- 视差(标题页 + 主菜单) ---------- */
const layers = [...document.querySelectorAll('.scene .layer')].filter(l => +l.dataset.depth);
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener('pointermove', e => {
  tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2;
});
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  tx = clamp(e.gamma / 25, -1, 1); ty = clamp((e.beta - 40) / 25, -1, 1);
});
function parallax(){
  cx += (tx - cx) * .06; cy += (ty - cy) * .06;
  if (inHub){
    const m = Math.min(1, S * 1.2);
    const back = `translate3d(${-cx * 9 * m}px,${-cy * 6 * m}px,0)`;
    stageBack.style.transform = back; stageFront.style.transform = back;
    const mid = `translate3d(${-cx * 14 * m}px,${-cy * 9 * m}px,0)`;
    orbsEl.style.transform = mid; ringsEl.style.transform = mid;
    return;
  }
  for (const l of layers){
    const d = +l.dataset.depth, x = -cx * d * innerWidth, y = -cy * d * innerHeight;
    l.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  const tb = $('#titleblock');
  if (tb) tb.style.transform = `translate3d(${cx * 8}px,${cy * 6}px,0)`;
}

/* ---------- 星空 / 尘埃 / 噪点(标题页) ---------- */
const stars = $('#stars'), sctx = stars.getContext('2d');
const dust = $('#dust'), dctx = dust.getContext('2d');
const noise = $('#noise'), nctx = noise.getContext('2d');
let SS = [], D = [];
function resize(){
  DPR = Math.min(devicePixelRatio || 1, 2);
  for (const c of [stars, dust]){ c.width = innerWidth * DPR; c.height = innerHeight * DPR; }
  noise.width = Math.ceil(innerWidth / 3); noise.height = Math.ceil(innerHeight / 3);
  SS = Array.from({ length: Math.min(260, innerWidth / 5) }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.6
  }));
  D = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, vx: (Math.random() - .5) * .00012, vy: -Math.random() * .00022 - .00005, a: Math.random()
  }));
  layoutHub(); resizeFx();
}
function drawStars(t){
  const w = stars.width, h = stars.height; sctx.clearRect(0, 0, w, h);
  for (const s of SS){
    const a = .35 + .65 * Math.abs(Math.sin(t * .0008 * s.s + s.p));
    sctx.fillStyle = `rgba(200,240,255,${a})`;
    sctx.beginPath(); sctx.arc(s.x * w, s.y * h, s.r * DPR, 0, 6.283); sctx.fill();
  }
}
function drawDust(){
  const w = dust.width, h = dust.height; dctx.clearRect(0, 0, w, h);
  for (const p of D){
    p.x += p.vx; p.y += p.vy; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
    if (p.x < -.02) p.x = 1.02; if (p.x > 1.02) p.x = -.02;
    const g = dctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r * 5 * DPR);
    g.addColorStop(0, `rgba(140,235,255,${.55 * p.a})`); g.addColorStop(1, 'rgba(140,235,255,0)');
    dctx.fillStyle = g; dctx.beginPath(); dctx.arc(p.x * w, p.y * h, p.r * 5 * DPR, 0, 6.283); dctx.fill();
  }
}
function drawNoise(){
  const w = noise.width, h = noise.height, img = nctx.createImageData(w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4){ const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  nctx.putImageData(img, 0, 0);
}

/* ---------- 其它 ---------- */
function startIdle(){
  const t0 = performance.now(), clk = $('#clock');
  setInterval(() => {
    const s = Math.floor((performance.now() - t0) / 1000);
    clk.textContent = 'T+ ' + [s / 3600, s / 60 % 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':');
  }, 1000);
  (function rnd(){
    setTimeout(() => {
      if (has('menu') && !has('panel')){
        const f = $('#gflash'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = 'gflash .6s steps(2,end)';
        blip(120, .25, 'sawtooth', .03, -60);
      }
      rnd();
    }, 7000 + Math.random() * 9000);
  })();
}
addEventListener('resize', resize);
resize();
let nt = 0;
(function frame(t){
  parallax();
  if (inHub){ updateOrbs(t); drawFx(t); }
  else { drawStars(t); drawDust(); }
  if ((nt++ & 1) === 0) drawNoise();
  requestAnimationFrame(frame);
})(0);

setStage('boot');
boot();
})();
