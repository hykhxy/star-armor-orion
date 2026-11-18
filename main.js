(() => {
'use strict';
const $ = s => document.querySelector(s);
const body = document.body;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let DPR = Math.min(devicePixelRatio || 1, 2);

/* ---------- 阶段管理 ---------- */
const STAGES = ['boot','banner','glitch','menu','pressed','panel','warp','sortie'];
function setStage(...on){
  STAGES.forEach(s => body.classList.remove('stage-' + s));
  on.forEach(s => body.classList.add('stage-' + s));
}

/* ---------- 音效(Web Audio 合成,无外部文件) ---------- */
let actx = null, soundOn = false, ambience = null;
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
function noiseBurst(dur = .4, vol = .08){
  if (!soundOn || !actx) return;
  const n = actx.sampleRate * dur, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 1800; g.gain.value = vol;
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
function setSound(on){
  soundOn = on; const b = $('#mute');
  b.textContent = 'SOUND: ' + (on ? 'ON' : 'OFF'); b.classList.toggle('on', on);
  if (on) { ensureAudio(); startAmbience(); if (ambience) ambience.gain.linearRampToValueAtTime(.05, actx.currentTime + 1); blip(1200, .1, 'sine', .05); }
  else if (ambience) ambience.gain.linearRampToValueAtTime(0, actx.currentTime + .4);
}
$('#mute').addEventListener('click', e => { e.stopPropagation(); setSound(!soundOn); });

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
    // 逐字打出
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

/* ---------- 菜单交互 ---------- */
let pressed = false, idx = 0;
const items = [...document.querySelectorAll('#menu li')];
function press(){
  if (pressed || !body.classList.contains('stage-menu')) return;
  pressed = true; ensureAudio(); setStage('menu', 'pressed');
  blip(660, .12, 'sine', .06); blip(990, .2, 'sine', .05);
  setActive(0);
}
function setActive(i){
  idx = (i + items.length) % items.length;
  items.forEach((li, k) => li.classList.toggle('active', k === idx));
  blip(520 + idx * 140, .05, 'square', .03);
}
function choose(){
  const act = items[idx].dataset.act;
  blip(880, .15, 'sine', .06, 400);
  if (act === 'license') { setStage('menu', 'pressed', 'panel'); }
  else warp();
}
items.forEach((li, k) => {
  li.addEventListener('mouseenter', () => { if (idx !== k) setActive(k); });
  li.addEventListener('click', e => { e.stopPropagation(); setActive(k); choose(); });
});
$('#panelback').addEventListener('click', () => { setStage('menu', 'pressed'); blip(440, .08); });
$('#sortieback').addEventListener('click', () => {
  warpRun = false; setStage('menu', 'pressed'); blip(440, .08);
});
document.addEventListener('click', press);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && body.classList.contains('stage-panel')) { setStage('menu', 'pressed'); return; }
  if (!body.classList.contains('stage-menu')) return;
  if (!pressed) { press(); return; }
  if (body.classList.contains('stage-panel')) return;
  if (e.key === 'ArrowUp' || e.key === 'w') setActive(idx - 1);
  else if (e.key === 'ArrowDown' || e.key === 's') setActive(idx + 1);
  else if (e.key === 'Enter' || e.key === ' ') choose();
});

/* ---------- 视差(鼠标 + 陀螺仪 + 缓动) ---------- */
const layers = [...document.querySelectorAll('.layer')].filter(l => +l.dataset.depth);
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener('pointermove', e => {
  tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2;
});
addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 40) / 25));
});
function parallax(){
  cx += (tx - cx) * .06; cy += (ty - cy) * .06;
  for (const l of layers){
    const d = +l.dataset.depth, x = -cx * d * innerWidth, y = -cy * d * innerHeight;
    l.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  const tb = $('#titleblock');
  if (tb && !body.classList.contains('stage-warp')) tb.style.transform = `translate3d(${cx * 8}px,${cy * 6}px,0)`;
}

/* ---------- 星空 / 尘埃 / 噪点 ---------- */
const stars = $('#stars'), sctx = stars.getContext('2d');
const dust = $('#dust'), dctx = dust.getContext('2d');
const noise = $('#noise'), nctx = noise.getContext('2d');
let S = [], D = [];
function resize(){
  DPR = Math.min(devicePixelRatio || 1, 2);
  for (const c of [stars, dust, warpC]){ c.width = innerWidth * DPR; c.height = innerHeight * DPR; }
  noise.width = Math.ceil(innerWidth / 3); noise.height = Math.ceil(innerHeight / 3);
  S = Array.from({ length: Math.min(260, innerWidth / 5) }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.6
  }));
  D = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, vx: (Math.random() - .5) * .00012, vy: -Math.random() * .00022 - .00005, a: Math.random()
  }));
}
function drawStars(t){
  const w = stars.width, h = stars.height; sctx.clearRect(0, 0, w, h);
  for (const s of S){
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

/* ---------- 超空间跃迁 ---------- */
const warpC = $('#warp'), wctx = warpC.getContext('2d');
let warpRun = false, W = [];
async function warp(){
  setStage('warp'); ensureAudio();
  noiseBurst(1.6, .1); blip(60, 1.8, 'sawtooth', .07, 700);
  W = Array.from({ length: 420 }, () => ({ a: Math.random() * 6.283, d: Math.random() * .1, v: .002 + Math.random() * .01 }));
  warpRun = true; const t0 = performance.now();
  const loop = now => {
    if (!warpRun) return;
    const t = (now - t0) / 1000, w = warpC.width, h = warpC.height, c = [w / 2, h / 2], R = Math.hypot(w, h) / 2;
    wctx.fillStyle = `rgba(2,6,10,${t < 2.2 ? .22 : .5})`; wctx.fillRect(0, 0, w, h);
    const boost = Math.min(1, t / 1.6) ** 2 * 9 + 1;
    wctx.lineCap = 'round';
    for (const s of W){
      const d0 = s.d; s.d += s.v * boost * (1 + s.d * 3);
      if (s.d > 1.1){ s.d = Math.random() * .05; s.a = Math.random() * 6.283; }
      const x0 = c[0] + Math.cos(s.a) * d0 * R, y0 = c[1] + Math.sin(s.a) * d0 * R;
      const x1 = c[0] + Math.cos(s.a) * s.d * R, y1 = c[1] + Math.sin(s.a) * s.d * R;
      wctx.strokeStyle = Math.random() < .08 ? 'rgba(255,90,120,.8)' : `rgba(160,240,255,${Math.min(1, s.d * 1.4)})`;
      wctx.lineWidth = (.6 + s.d * 2.4) * DPR;
      wctx.beginPath(); wctx.moveTo(x0, y0); wctx.lineTo(x1, y1); wctx.stroke();
    }
    if (t > 2.3 && t < 2.8){ wctx.fillStyle = `rgba(210,250,255,${1 - (t - 2.3) / .5})`; wctx.fillRect(0, 0, w, h); }
    if (t >= 2.4 && !body.classList.contains('stage-sortie')) setStage('warp', 'sortie');
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------- 其它 ---------- */
function startIdle(){
  const t0 = performance.now(), clk = $('#clock');
  setInterval(() => {
    const s = Math.floor((performance.now() - t0) / 1000);
    clk.textContent = 'T+ ' + [s / 3600, s / 60 % 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':');
  }, 1000);
  // 偶发全屏故障
  (function rnd(){
    setTimeout(() => {
      if (body.classList.contains('stage-menu')){
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
  parallax(); drawStars(t); drawDust();
  if ((nt++ & 1) === 0) drawNoise();
  requestAnimationFrame(frame);
})(0);

setStage('boot');
boot();
})();
