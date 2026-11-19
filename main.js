(() => {
'use strict';
const $ = s => document.querySelector(s);
const body = document.body;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let DPR = Math.min(devicePixelRatio || 1, 2);
const easeIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const tween = (ms, fn) => new Promise(res => {
  const t0 = performance.now();
  (function step(){
    const k = clamp((performance.now() - t0) / ms, 0, 1);
    fn(k);
    if (k < 1) requestAnimationFrame(step); else res();
  })();
});

/* ---------- 阶段管理 ---------- */
const STAGES = ['boot','banner','glitch','menu','welcome','warp','hub','panel','world','coming','build'];
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

/* ---------- 点击登录 → 语音播报 → 穿梭 → 机甲 ---------- */
let loggingIn = false, inHub = false, prevMain = 'menu';
async function login(){
  if (loggingIn || !has('menu') || has('panel')) return;
  loggingIn = true;
  ensureAudio();
  if (soundPref !== false) setSound(true);
  welcomeAudio.muted = !soundOn;
  let ended = false;
  welcomeAudio.addEventListener('ended', () => { ended = true; }, { once: true });
  try { welcomeAudio.currentTime = 0; const p = welcomeAudio.play(); if (p && p.catch) p.catch(() => { ended = true; }); } catch(e){ ended = true; }
  setStage('welcome');
  const f = $('#gflash'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = 'gflash .6s steps(2,end)';
  noiseBurst(.5, .08, 2600); blip(300, .5, 'sine', .04, 900);
  // 等语音播完(至少让欢迎动画走完),再进入穿梭
  const t0 = performance.now(), minMs = reduce ? 900 : 3000;
  while ((!ended || performance.now() - t0 < minMs) && performance.now() - t0 < 6000) await sleep(80);
  await sleep(250);
  await warp();
  enterHub();
}
document.addEventListener('click', login);
$('#licbtn').addEventListener('click', e => { e.stopPropagation(); openLicense(); });
function openLicense(){ prevMain = has('hub') ? 'hub' : 'menu'; setStage(prevMain, 'panel'); blip(880, .12, 'sine', .05, 300); }
function closePanels(){ setStage(prevMain); blip(440, .08); }
$('#panelback').addEventListener('click', closePanels);

/* ---------- 穿梭(跃迁)画布 ---------- */
const warpC = $('#warp'), wctx = warpC.getContext('2d');
let warpRun = false, WS = [];
function warp(){
  return new Promise(resolve => {
    setStage('warp'); ensureAudio();
    noiseBurst(1.8, .1, 1400); blip(60, 2.0, 'sawtooth', .07, 800);
    WS = Array.from({ length: 460 }, () => ({ a: Math.random() * 6.283, d: Math.random() * .1, v: .002 + Math.random() * .01, h: Math.random() }));
    warpRun = true; const t0 = performance.now();
    let done = false;
    const total = reduce ? .6 : 2.9;
    const loop = now => {
      if (!warpRun) return;
      const t = (now - t0) / 1000, w = warpC.width, h = warpC.height, c = [w / 2, h / 2], R = Math.hypot(w, h) / 2;
      wctx.fillStyle = `rgba(2,6,10,${t < 2.2 ? .22 : .5})`; wctx.fillRect(0, 0, w, h);
      // 中心光晕
      const gk = clamp(t / 2.2, 0, 1), gr = R * (.05 + gk * .35);
      const gg = wctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], gr);
      gg.addColorStop(0, `rgba(200,245,255,${.25 * gk})`); gg.addColorStop(1, 'rgba(60,150,255,0)');
      wctx.fillStyle = gg; wctx.fillRect(0, 0, w, h);
      const boost = Math.min(1, t / 1.6) ** 2 * 9 + 1;
      wctx.lineCap = 'round';
      for (const s of WS){
        const d0 = s.d; s.d += s.v * boost * (1 + s.d * 3);
        if (s.d > 1.1){ s.d = Math.random() * .05; s.a = Math.random() * 6.283; }
        const x0 = c[0] + Math.cos(s.a) * d0 * R, y0 = c[1] + Math.sin(s.a) * d0 * R;
        const x1 = c[0] + Math.cos(s.a) * s.d * R, y1 = c[1] + Math.sin(s.a) * s.d * R;
        wctx.strokeStyle = s.h < .08 ? 'rgba(255,90,120,.8)' : s.h < .2 ? 'rgba(190,150,255,.8)' : `rgba(160,240,255,${Math.min(1, s.d * 1.4)})`;
        wctx.lineWidth = (.6 + s.d * 2.4) * DPR;
        wctx.beginPath(); wctx.moveTo(x0, y0); wctx.lineTo(x1, y1); wctx.stroke();
      }
      if (t > 2.3 && t < 2.9){ wctx.fillStyle = `rgba(210,250,255,${1 - (t - 2.3) / .6})`; wctx.fillRect(0, 0, w, h); }
      if (t >= total && !done){ done = true; resolve(); }
      if (t > total + 1.3){ warpRun = false; wctx.clearRect(0, 0, warpC.width, warpC.height); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

/* ================= 主菜单:机甲 + 公转星球 ================= */
const W0 = 1672, H0 = 941;
const hubEl = $('#hub'), canvasEl = $('#hubcanvas'), hubzoom = $('#hubzoom');
const stageBack = $('#stageBack'), stageFront = $('#stageFront');
const orbsEl = $('#orbs'), ringsEl = $('#rings'), mistEl = $('#mist'), raysEl = $('#rays');
const head = $('#mechhead'), handbox = $('#handbox');
const hubfar = $('#hubfar'), fctxFar = hubfar.getContext('2d');
const beltB = $('#beltback'), bctxB = beltB.getContext('2d');
const beltF = $('#beltfront'), bctxF = beltF.getContext('2d');
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
  for (const c of [hubfar, beltB, beltF]){ c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
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
  { key: 'create', cn: '创造角色', en: 'CREATE PILOT',   desc: '设定你的驾驶员 —— 姓名、代号、出身星域与同步率。选择三个起点身份之一,开始你的拆装人生。' },
  { key: 'author', cn: '作者的话', en: "AUTHOR'S NOTE",  desc: '来自创作者的留言、设计笔记与致谢。' },
  { key: 'build',  cn: '组装机甲', en: 'ASSEMBLE MECHA', desc: '挑选六大模块:炉心、骨架、外甲、神经中枢、推进与武装,拼装属于你的贴身机甲与高达。' },
  { key: 'world',  cn: '世界观',   en: 'WORLDVIEW',      desc: '' },
  { key: 'codex',  cn: '角色图鉴', en: 'CODEX',          desc: '收录十二大势力、具名人物与七十二款机体的档案。' },
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

// 轨道采样表(星带粒子沿它运动)
const TN = 720;
const TAB = [];
(function buildTable(){
  for (let k = 0; k < TN; k++){ const o = orbitAt(k / TN * N); TAB.push({ x: o.x, y: o.y, r: o.r, nx: 0, ny: 0 }); }
  for (let k = 0; k < TN; k++){
    const p = TAB[(k + 1) % TN], q = TAB[(k - 1 + TN) % TN];
    const tx = p.x - q.x, ty = p.y - q.y, l = Math.hypot(tx, ty) || 1;
    TAB[k].nx = -ty / l; TAB[k].ny = tx / l;
  }
})();

// 手:手掌 + 四根手指(独立图层,可弯曲)
handbox.innerHTML = '<img class="fg palm" src="assets/palm.webp" alt="" draggable="false">' +
  [1, 2, 3, 4].map(k => `<img class="fg f${k}" src="assets/finger${k}.webp" alt="" draggable="false">`).join('');
const fingers = [...handbox.querySelectorAll('.fg:not(.palm)')];
function setCurl(c){
  fingers.forEach((f, j) => f.style.setProperty('--c', clamp(c * 1.28 - j * .09, 0, 1).toFixed(3)));
}
setCurl(0);

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
let rot = null, busy = false, locked = false, introT0 = 0, introOn = false;
const slotOf = i => ((Math.round(pos[i]) % N) + N) % N;
const activeIndex = () => pos.findIndex((_, i) => slotOf(i) === 0);
const easeBack = k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

function rotate(steps, dur){
  return new Promise(res => {
    if (busy || !steps || !introOn || locked) return res();
    busy = true;
    const d = dur || (1250 + (Math.abs(steps) - 1) * 520);
    rot = { t0: performance.now(), dur: d, from: pos.slice(), delta: steps, done: res };
    ringsEl.classList.add('spin');
    blip(300, .9, 'sine', .035, 900); noiseBurst(.9, .035, 900);
  });
}
async function onOrbClick(i){
  if (busy || locked || !introOn || has('panel')) return;
  const k = slotOf(i);
  if (k !== 0){ const cw = N - k, ccw = k; await rotate(cw <= ccw ? cw : -ccw, 900 + Math.min(cw, ccw) * 160); }
  await sleep(120);
  crush(activeIndex());
}

function enterHub(){
  layoutHub(); resizeFx();
  setStage('hub');
  inHub = true; locked = false; busy = false; rot = null; introOn = false; introT0 = performance.now() + 900;
  setTimeout(() => { introOn = true; }, 900 + 1700);
  noiseBurst(.7, .06, 700); blip(80, 1.4, 'sawtooth', .05, 160);
  scheduleBlink();
}

function updateOrbs(now){
  if (rot){
    const k = clamp((now - rot.t0) / rot.dur, 0, 1), e = easeIO(k);
    for (let i = 0; i < N; i++) pos[i] = rot.from[i] + rot.delta * e;
    if (k >= 1){
      for (let i = 0; i < N; i++) pos[i] = ((Math.round(pos[i]) % N) + N) % N;
      const d = rot.done; rot = null; busy = false; ringsEl.classList.remove('spin'); d && d();
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
    if (rot && Math.random() < .55) emitSpark(canvasEl.offsetLeft + o.x * S + pxo.x, canvasEl.offsetTop + (o.y + bob) * S + pxo.y, o.r * S);
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

/* ---------- 远景星点(三层景深,各自视差) ---------- */
const FAR = [
  { n: 150, rmin: .3, rmax: .9,  px: 3,  a: .55, arr: [] },
  { n: 90,  rmin: .5, rmax: 1.4, px: 7,  a: .75, arr: [] },
  { n: 44,  rmin: .9, rmax: 2.2, px: 13, a: .95, arr: [] },
];
function seedFar(){
  for (const L of FAR) L.arr = Array.from({ length: L.n }, () => ({
    x: Math.random(), y: Math.random(), r: lerp(L.rmin, L.rmax, Math.random()), p: Math.random() * 6.28, s: .5 + Math.random() * 1.8,
    c: Math.random() < .18 ? '255,190,215' : Math.random() < .3 ? '190,170,255' : '200,240,255',
  }));
}
function drawFar(now){
  const w = hubfar.width, h = hubfar.height; fctxFar.clearRect(0, 0, w, h);
  for (const L of FAR){
    const ox = -cx * L.px * DPR * S, oy = -cy * L.px * .7 * DPR * S;
    for (const s of L.arr){
      const a = L.a * (.3 + .7 * Math.abs(Math.sin(now * .0009 * s.s + s.p)));
      fctxFar.fillStyle = `rgba(${s.c},${a})`;
      const x = ((s.x * w + ox) % w + w) % w, y = ((s.y * h + oy) % h + h) % h, r = s.r * DPR * Math.max(.7, S);
      if (r < 1.2) fctxFar.fillRect(x, y, r * 1.6, r * 1.6);
      else { fctxFar.beginPath(); fctxFar.arc(x, y, r, 0, 6.283); fctxFar.fill(); }
      if (L.px === 13 && r > 1.7){
        fctxFar.strokeStyle = `rgba(${s.c},${a * .5})`; fctxFar.lineWidth = DPR * .7;
        const g = r * 4.5;
        fctxFar.beginPath(); fctxFar.moveTo(x - g, y); fctxFar.lineTo(x + g, y); fctxFar.moveTo(x, y - g); fctxFar.lineTo(x, y + g); fctxFar.stroke();
      }
    }
  }
}

/* ---------- 轨道星带(球前后两层,沿轨道流动) ---------- */
let BELT = [];
function seedBelt(){
  const n = clamp(Math.round(innerWidth * .75), 420, 1200);
  BELT = Array.from({ length: n }, () => {
    const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    return {
      u: Math.random() * TN, v: 3 + Math.random() * 11, off: g * (22 + Math.random() * 48) * (Math.random() < .12 ? 2.4 : 1),
      r: .5 + Math.pow(Math.random(), 3) * 2.2, p: Math.random() * 6.28, s: .6 + Math.random() * 2.2,
      front: Math.random() < .36, c: Math.random() < .22 ? '190,160,255' : Math.random() < .5 ? '255,255,255' : '140,225,255',
    };
  });
}
function drawBelt(now, dt){
  const w = beltB.width, h = beltB.height;
  bctxB.clearRect(0, 0, w, h); bctxF.clearRect(0, 0, w, h);
  const k = S * DPR;
  // 星云带:沿轨道的宽柔光
  bctxB.save(); bctxB.globalCompositeOperation = 'lighter'; bctxB.lineJoin = 'round';
  bctxB.beginPath();
  for (let i = 0; i <= TN; i += 6){ const p = TAB[i % TN]; i ? bctxB.lineTo(p.x * k, p.y * k) : bctxB.moveTo(p.x * k, p.y * k); }
  bctxB.closePath();
  const pulse = .7 + .3 * Math.sin(now * .0012);
  bctxB.strokeStyle = `rgba(90,140,255,${.035 * pulse})`; bctxB.lineWidth = 110 * k; bctxB.stroke();
  bctxB.strokeStyle = `rgba(150,110,255,${.04 * pulse})`; bctxB.lineWidth = 56 * k; bctxB.stroke();
  bctxB.strokeStyle = `rgba(120,225,255,${.05})`; bctxB.lineWidth = 18 * k; bctxB.stroke();
  bctxB.restore();
  bctxB.globalCompositeOperation = 'lighter'; bctxF.globalCompositeOperation = 'lighter';
  const boost = rot ? 6.5 : 1;
  for (const b of BELT){
    b.u = (b.u + b.v * dt * boost) % TN;
    const i = Math.floor(b.u), f = b.u - i, p = TAB[i], q = TAB[(i + 1) % TN];
    const sf = .55 + p.r / 216 * .7;
    const x = (lerp(p.x, q.x, f) + lerp(p.nx, q.nx, f) * b.off * sf) * k;
    const y = (lerp(p.y, q.y, f) + lerp(p.ny, q.ny, f) * b.off * sf) * k;
    const a = (.25 + .75 * Math.abs(Math.sin(now * .001 * b.s + b.p))) * (b.front ? .95 : .8);
    const ctx = b.front ? bctxF : bctxB;
    const r = b.r * DPR * Math.max(.75, S) * (b.front ? 1.25 : 1);
    ctx.fillStyle = `rgba(${b.c},${a})`;
    if (r < 1.3) ctx.fillRect(x, y, r * 1.8, r * 1.8);
    else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      if (r > 1.9){
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        g.addColorStop(0, `rgba(${b.c},${a * .45})`); g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 6.283); ctx.fill();
      }
    }
  }
  bctxB.globalCompositeOperation = 'source-over'; bctxF.globalCompositeOperation = 'source-over';
}

/* ---------- 星辰落下:流星 + 飘落星尘 + 火花 + 碎片 + 凝聚 ---------- */
const fx = $('#hubfx'), fctx = fx.getContext('2d');
let meteors = [], motes = [], sparks = [], shards = [], cond = [], nextMeteor = 0, lastT = 0;
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
  sparks.push({ x: (x + Math.cos(a) * d * .6) * DPR, y: (y + Math.sin(a) * d * .6) * DPR, vx: (Math.random() - .5) * 40 * DPR, vy: (Math.random() - .2) * 50 * DPR, life: 0, max: .7 + Math.random() * .6, r: (.8 + Math.random() * 1.8) * DPR });
}
function drawFx(now){
  const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
  const w = fx.width, h = fx.height; fctx.clearRect(0, 0, w, h);
  if (!inHub) return;
  // 碎片(玻璃三角)
  for (let i = shards.length - 1; i >= 0; i--){
    const s = shards[i]; s.life += dt;
    if (s.life > s.max || s.y > h + 80 * DPR){ shards.splice(i, 1); continue; }
    s.vy += 1500 * DPR * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
    const al = clamp(1 - Math.max(0, s.life - s.max * .55) / (s.max * .45), 0, 1);
    fctx.save(); fctx.translate(s.x, s.y); fctx.rotate(s.a); fctx.globalAlpha = al;
    fctx.beginPath(); fctx.moveTo(s.p[0], s.p[1]); fctx.lineTo(s.p[2], s.p[3]); fctx.lineTo(s.p[4], s.p[5]); fctx.closePath();
    const g = fctx.createLinearGradient(-s.z, -s.z, s.z, s.z);
    g.addColorStop(0, 'rgba(210,240,255,.85)'); g.addColorStop(.5, 'rgba(90,150,255,.5)'); g.addColorStop(1, 'rgba(150,100,255,.55)');
    fctx.fillStyle = g; fctx.fill();
    fctx.strokeStyle = 'rgba(235,250,255,.95)'; fctx.lineWidth = DPR * 1.2; fctx.stroke();
    fctx.restore();
  }
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
  if (nextMeteor <= 0 && !reduce && !locked){ spawnMeteor(); if (Math.random() < .3) spawnMeteor(); nextMeteor = .55 + Math.random() * 1.5; }
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
  // 凝聚粒子(向掌心汇聚)
  for (let i = cond.length - 1; i >= 0; i--){
    const c = cond[i]; c.life += dt; if (c.life > c.max){ cond.splice(i, 1); continue; }
    const k = easeIn(c.life / c.max);
    const x = lerp(c.x0, c.cx, k) + Math.cos(c.sp + k * 5) * c.sw * (1 - k), y = lerp(c.y0, c.cy, k) + Math.sin(c.sp + k * 5) * c.sw * (1 - k);
    const a = Math.min(1, c.life / .15) * (1 - k * .3);
    fctx.fillStyle = `rgba(${c.c},${a})`;
    fctx.beginPath(); fctx.arc(x, y, c.r * (1 - k * .5), 0, 6.283); fctx.fill();
  }
  fctx.globalCompositeOperation = 'source-over';
}

/* ---------- 捏碎 → 碎片 → 张手 → 掌心光球 → 第一人称进入 ---------- */
const lightorb = document.createElement('div');
lightorb.className = 'lightorb'; orbsEl.appendChild(lightorb); lightorb.style.display = 'none';
const iris = $('#iris');
const orbScreenCenter = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; };

function shatter(el){
  const c = orbScreenCenter(el), R = c.r;
  const n = 70;
  for (let i = 0; i < n; i++){
    const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * R * .9, z = (R * (.05 + Math.random() * .16)) * DPR;
    const sp = (140 + Math.random() * 520) * DPR;
    shards.push({
      x: (c.x + Math.cos(a) * d) * DPR, y: (c.y + Math.sin(a) * d) * DPR,
      vx: Math.cos(a) * sp * (.4 + Math.random() * .8), vy: Math.sin(a) * sp * .6 - (180 + Math.random() * 300) * DPR,
      a: Math.random() * 6.283, va: (Math.random() - .5) * 9, z,
      p: [(Math.random() - .5) * z, -z * (.6 + Math.random() * .6), z * (.6 + Math.random() * .6), z * (.3 + Math.random() * .5), -z * (.8 + Math.random() * .4), z * (.2 + Math.random() * .6)],
      life: 0, max: 1.5 + Math.random() * 1.3,
    });
  }
  for (let i = 0; i < 90; i++) emitSpark(c.x + (Math.random() - .5) * R, c.y + (Math.random() - .5) * R, R * .3);
  const hf = $('#hubflash'); hf.classList.remove('on'); void hf.offsetWidth; hf.classList.add('on');
  noiseBurst(.55, .17, 4200); noiseBurst(.9, .09, 1300);
  for (let i = 0; i < 6; i++) setTimeout(() => blip(1800 + Math.random() * 2600, .18, 'triangle', .035, -900), i * 45);
  if (!reduce) hubzoom.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,5px)' }, { transform: 'translate(6px,-4px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 320, easing: 'ease-out' });
}
function emitCondense(cxp, cyp, rr){
  for (let i = 0; i < 3; i++){
    const a = Math.random() * 6.283, d = rr * (1.6 + Math.random() * 2.2);
    cond.push({ x0: cxp + Math.cos(a) * d, y0: cyp + Math.sin(a) * d, cx: cxp, cy: cyp, sp: Math.random() * 6.28, sw: 40 * DPR * Math.random(), life: 0, max: .55 + Math.random() * .5, r: (1 + Math.random() * 2.2) * DPR, c: Math.random() < .3 ? '190,170,255' : '190,240,255' });
  }
}
async function crush(i){
  if (locked) return;
  locked = true; busy = true;
  const el = orbs[i].el, info = ORBS[i];
  // 1 手指收拢,球被攥紧
  blip(70, 1, 'sawtooth', .07, -20); noiseBurst(.6, .06, 500);
  const sq = setTimeout(() => el.classList.add('picked'), 420);
  await tween(reduce ? 80 : 820, k => setCurl(easeIO(k)));
  clearTimeout(sq);
  // 2 捏碎
  handbox.classList.add('squeeze'); setTimeout(() => handbox.classList.remove('squeeze'), 260);
  shatter(el); el.classList.add('gone');
  await sleep(reduce ? 50 : 480);
  // 3 手重新张开
  blip(420, 1, 'sine', .04, 800);
  await tween(reduce ? 80 : 1000, k => setCurl(1 - easeOut(k)));
  // 4 掌心凝聚光球
  const o = SLOT[0];
  lightorb.style.display = 'block';
  lightorb.style.setProperty('--s', (150 * S) + 'px');
  const sx0 = o.x * S, sy0 = o.y * S;
  blip(220, 1.4, 'sine', .05, 1400); noiseBurst(1.2, .04, 2400);
  await tween(reduce ? 80 : 1500, k => {
    const e = easeBack(clamp(k * 1.05, 0, 1));
    lightorb.style.transform = `translate(${sx0}px,${sy0}px) scale(${Math.max(0, e)})`;
    lightorb.style.opacity = clamp(k * 3, 0, 1);
    const c = orbScreenCenter(lightorb);
    if (k < .8) emitCondense(c.x * DPR, c.y * DPR, 150 * S * .5);
  });
  await sleep(reduce ? 50 : 350);
  // 5 第一人称:镜头冲进光球
  await dive(info);
}
async function dive(info){
  const c = orbScreenCenter(lightorb);
  hubzoom.style.transition = 'none';
  hubzoom.style.transformOrigin = `${c.x}px ${c.y}px`;
  iris.style.left = c.x + 'px'; iris.style.top = c.y + 'px';
  blip(50, 2.2, 'sawtooth', .08, 500); noiseBurst(2, .1, 600);
  const base = 150 * S;
  await tween(reduce ? 200 : 2300, k => {
    const e = easeIn(k);
    hubzoom.style.transform = `scale(${1 + e * 11})`;
    hubzoom.style.filter = `blur(${e * 3}px) brightness(${1 + e * .5})`;
    lightorb.style.transform = `translate(${SLOT[0].x * S}px,${SLOT[0].y * S}px) scale(${1 + e * 1.2})`;
    const kk = clamp((k - .45) / .55, 0, 1);
    iris.style.opacity = kk; iris.style.transform = `scale(${.05 + easeIn(kk) * 16})`;
  });
  hubzoom.style.transition = ''; hubzoom.style.transform = ''; hubzoom.style.filter = ''; hubzoom.style.transformOrigin = '';
  inHub = false;
  if (info.key === 'world') openWorld(); else if (info.key === 'build') openBuild(); else openComing(info);
  await tween(reduce ? 100 : 1500, k => { iris.style.opacity = 1 - easeOut(k); });
  iris.style.opacity = 0; iris.style.transform = 'scale(0)';
}
async function returnToHub(){
  if (!(has('world') || has('coming') || has('build'))) return;
  const sx = innerWidth / 2, sy = innerHeight / 2;
  iris.style.left = sx + 'px'; iris.style.top = sy + 'px';
  blip(300, 1, 'sine', .04, 600);
  await tween(reduce ? 80 : 700, k => { iris.style.opacity = k; iris.style.transform = `scale(${.4 + easeOut(k) * 16})`; });
  // 重置主菜单
  orbs.forEach(o => o.el.classList.remove('picked', 'gone'));
  lightorb.style.display = 'none'; lightorb.style.transform = 'scale(0)';
  shards.length = 0; cond.length = 0; setCurl(0);
  worldActive = false; comingActive = false; buildActive = false;
  enterHub();
  await tween(reduce ? 100 : 1300, k => { iris.style.opacity = 1 - easeOut(k); });
  iris.style.opacity = 0; iris.style.transform = 'scale(0)';
}
$('#wback').addEventListener('click', e => { e.stopPropagation(); returnToHub(); });
$('#wback2').addEventListener('click', e => { e.stopPropagation(); returnToHub(); });
$('#cmBack').addEventListener('click', e => { e.stopPropagation(); returnToHub(); });
$('#bBack').addEventListener('click', e => { e.stopPropagation(); returnToHub(); });
let buildActive = false;
function openBuild(){
  setStage('build'); buildActive = true; PE = null;
  blip(200, 1.1, 'sine', .05, 700);
  if (window.OrionBuild) window.OrionBuild.open();
}
window.OrionAudio = { blip };

/* ---------- 键盘 ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    if (has('panel')) { closePanels(); return; }
    if (has('world') || has('coming') || has('build')) { returnToHub(); return; }
  }
  if (has('menu') && !has('panel')) { if (e.key !== 'Tab') login(); return; }
  if (!has('hub') || has('panel') || locked) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd' || e.key === 's') rotate(1);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'w') rotate(-1);
  else if ((e.key === 'Enter' || e.key === ' ') && introOn && !busy) { e.preventDefault(); crush(activeIndex()); }
});

/* ================= 世界观页 ================= */
let worldActive = false, worldInit = false, wsecs = [], wnavBtns = [];
const wscroll = $('#wscroll');
const wstarsC = $('#wstars'), wsctx = wstarsC.getContext('2d');
let WSTARS = [];
function seedWorldStars(){
  WSTARS = [0, 1, 2].map(l => Array.from({ length: [140, 80, 36][l] }, () => ({ x: Math.random(), y: Math.random(), r: [.5, .9, 1.6][l] * (.6 + Math.random() * .8), p: Math.random() * 6.28, s: .4 + Math.random() * 1.6, c: Math.random() < .2 ? '190,170,255' : '200,240,255' })));
}
function drawWorldStars(now){
  const w = wstarsC.width, h = wstarsC.height; wsctx.clearRect(0, 0, w, h);
  const sy = wscroll.scrollTop;
  WSTARS.forEach((arr, l) => {
    const sp = [.03, .08, .16][l];
    for (const s of arr){
      const a = (.3 + .7 * Math.abs(Math.sin(now * .001 * s.s + s.p))) * [.55, .75, .95][l];
      const x = s.x * w, y = (((s.y * h - sy * sp * DPR) % h) + h) % h;
      wsctx.fillStyle = `rgba(${s.c},${a})`;
      wsctx.beginPath(); wsctx.arc(x, y, s.r * DPR, 0, 6.283); wsctx.fill();
    }
  });
}
function initWorld(){
  if (worldInit) return; worldInit = true;
  wsecs = [...wscroll.querySelectorAll('[data-title]')];
  const nav = $('#wnav');
  wsecs.forEach((s, i) => {
    const b = document.createElement('button');
    b.textContent = String(i).padStart(2, '0') + ' ' + s.dataset.title;
    b.addEventListener('click', () => wscroll.scrollTo({ top: s.offsetTop, behavior: reduce ? 'auto' : 'smooth' }));
    nav.appendChild(b); wnavBtns.push(b);
  });
  // 进入动画
  const groups = new Map();
  wscroll.querySelectorAll('.rv').forEach(el => {
    const p = el.parentElement; const idx = groups.get(p) || 0; groups.set(p, idx + 1);
    el.style.setProperty('--d', (Math.min(idx, 8) * .09).toFixed(2) + 's');
  });
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }), { root: wscroll, threshold: .12, rootMargin: '0px 0px -6% 0px' });
  wscroll.querySelectorAll('.rv').forEach(el => io.observe(el));
  wscroll.addEventListener('scroll', onWorldScroll, { passive: true });
}
function onWorldScroll(){
  const st = wscroll.scrollTop, max = wscroll.scrollHeight - wscroll.clientHeight;
  $('#wprog').style.width = (max > 0 ? st / max * 100 : 0) + '%';
  let cur = 0; wsecs.forEach((s, i) => { if (s.offsetTop <= st + innerHeight * .4) cur = i; });
  wnavBtns.forEach((b, i) => b.classList.toggle('on', i === cur));
}
const pEls = () => [...wscroll.querySelectorAll('[data-p]')];
let PE = null;
function worldParallax(){
  if (!PE) PE = pEls();
  const vh = innerHeight;
  for (const el of PE){
    const par = el.parentElement.getBoundingClientRect();
    if (par.bottom < -200 || par.top > vh + 200) continue;
    const off = par.top + par.height / 2 - vh / 2, p = +el.dataset.p;
    const lim = el.classList.contains('wh-bg') || el.classList.contains('wh-ring') ? 1e9 : par.height * .055;
    const ty = clamp(-off * p, -lim, lim);
    el.style.transform = el.classList.contains('wh-ring') ? `translate(-50%,-50%) translate3d(0,${ty}px,0)` : `translate3d(0,${ty}px,0)`;
  }
}
function countUp(){
  wscroll.querySelectorAll('.wh-stats b[data-n]').forEach(b => {
    const n = +b.dataset.n; tween(reduce ? 50 : 1800, k => { b.textContent = Math.round(n * easeOut(k)); });
  });
}
function openWorld(){
  initWorld();
  setStage('world'); worldActive = true; PE = null;
  wscroll.style.scrollBehavior = 'auto'; wscroll.scrollTop = 0; wscroll.style.scrollBehavior = '';
  onWorldScroll();
  // 重放 hero 入场动画
  wscroll.querySelectorAll('.wh .eyebrow,.wh-title,.wh-en,.wh-lead,.wh-stats').forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  if (!reduce) wscroll.animate([{ transform: 'scale(1.35)', filter: 'blur(12px)' }, { transform: 'scale(1)', filter: 'blur(0)' }], { duration: 1600, easing: 'cubic-bezier(.16,.7,.2,1)' });
  setTimeout(countUp, 1700);
  blip(160, 1.4, 'sine', .05, 700);
}

/* ================= 其它球:占位页 ================= */
let comingActive = false;
const cstarsC = $('#cstars'), cctx = cstarsC.getContext('2d');
let CST = [];
function openComing(info){
  $('#cmEn').textContent = info.en; $('#cmCn').textContent = info.cn; $('#cmDesc').textContent = info.desc;
  setStage('coming'); comingActive = true; blip(160, 1.2, 'sine', .05, 600);
}
function drawComing(now, dt){
  const w = cstarsC.width, h = cstarsC.height;
  cctx.fillStyle = 'rgba(2,5,10,.35)'; cctx.fillRect(0, 0, w, h);
  const cx0 = w / 2, cy0 = h / 2, R = Math.hypot(w, h) / 2;
  for (const s of CST){
    s.d += s.v * dt * (1 + s.d * 2.5); if (s.d > 1.05){ s.d = Math.random() * .04; s.a = Math.random() * 6.283; }
    const x0 = cx0 + Math.cos(s.a) * s.d * R, y0 = cy0 + Math.sin(s.a) * s.d * R;
    const x1 = cx0 + Math.cos(s.a) * (s.d + s.v * .06 * (1 + s.d * 2)) * R, y1 = cy0 + Math.sin(s.a) * (s.d + s.v * .06 * (1 + s.d * 2)) * R;
    cctx.strokeStyle = `rgba(170,238,255,${Math.min(1, s.d * 1.6) * .8})`; cctx.lineWidth = (.5 + s.d * 1.6) * DPR;
    cctx.beginPath(); cctx.moveTo(x0, y0); cctx.lineTo(x1, y1); cctx.stroke();
  }
}

/* ---------- 视差(标题页 + 主菜单) ---------- */
const layers = [...document.querySelectorAll('.scene .layer')].filter(l => +l.dataset.depth);
let tx = 0, ty = 0, cx = 0, cy = 0;
const pxo = { x: 0, y: 0 };
addEventListener('pointermove', e => {
  tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2;
});
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  tx = clamp(e.gamma / 25, -1, 1); ty = clamp((e.beta - 40) / 25, -1, 1);
});
let hudN = 0;
function parallax(){
  cx += (tx - cx) * .06; cy += (ty - cy) * .06;
  if (inHub){
    const m = Math.min(1, S * 1.2);
    const T = (a, b = a * .65) => `translate3d(${-cx * a * m}px,${-cy * b * m}px,0)`;
    const back = T(9, 6);
    stageBack.style.transform = back; stageFront.style.transform = back;
    mistEl.style.transform = T(5, 3); raysEl.style.transform = T(13, 8);
    const mid = T(17, 11);
    orbsEl.style.transform = mid; ringsEl.style.transform = mid;
    beltB.style.transform = T(14, 9); beltF.style.transform = T(22, 14);
    pxo.x = -cx * 17 * m; pxo.y = -cy * 11 * m;
    if ((hudN++ % 6) === 0){
      $('#hudX').textContent = 'X ' + (cx >= 0 ? '+' : '') + cx.toFixed(3);
      $('#hudY').textContent = 'Y ' + (cy >= 0 ? '+' : '') + cy.toFixed(3);
      $('#hudZ').textContent = 'DEPTH ' + (1.2 + Math.sin(performance.now() * .0004) * .35 + (rot ? 2.4 : 0)).toFixed(2) + ' AU';
      const a = activeIndex(); if (a >= 0) $('#hudO').textContent = 'ORBIT ' + String(a + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    }
    return;
  }
  for (const l of layers){
    const d = +l.dataset.depth, x = -cx * d * innerWidth, y = -cy * d * innerHeight;
    l.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  const tb = $('#titleblock');
  if (tb && !has('warp')) tb.style.transform = `translate3d(${cx * 8}px,${cy * 6}px,0)`;
}

/* ---------- 星空 / 尘埃 / 噪点(标题页) ---------- */
const stars = $('#stars'), sctx = stars.getContext('2d');
const dust = $('#dust'), dctx = dust.getContext('2d');
const noise = $('#noise'), nctx = noise.getContext('2d');
let SS = [], D = [];
function resize(){
  DPR = Math.min(devicePixelRatio || 1, 2);
  for (const c of [stars, dust, warpC, wstarsC, cstarsC]){ c.width = innerWidth * DPR; c.height = innerHeight * DPR; }
  noise.width = Math.ceil(innerWidth / 3); noise.height = Math.ceil(innerHeight / 3);
  SS = Array.from({ length: Math.min(260, innerWidth / 5) }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.6
  }));
  D = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, vx: (Math.random() - .5) * .00012, vy: -Math.random() * .00022 - .00005, a: Math.random()
  }));
  CST = Array.from({ length: 300 }, () => ({ a: Math.random() * 6.283, d: Math.random(), v: .05 + Math.random() * .2 }));
  layoutHub(); resizeFx(); seedFar(); seedBelt(); seedWorldStars();
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
let nt = 0, lastF = 0;
(function frame(t){
  const dt = Math.min(.05, (t - lastF) / 1000 || .016); lastF = t;
  parallax();
  if (inHub){ updateOrbs(t); drawFar(t); drawBelt(t, dt); drawFx(t); }
  else if (worldActive){ drawWorldStars(t); worldParallax(); }
  else if (comingActive){ drawComing(t, dt); }
  else if (buildActive){ /* 组装页:CSS 背景 */ }
  else if (!has('warp')){ drawStars(t); drawDust(); }
  if ((nt++ & 1) === 0) drawNoise();
  requestAnimationFrame(frame);
})(0);

setStage('boot');
boot();
})();
