/* =====================================================
   build.js —— 组装机甲:透明骨架 · 自由组装 · 预设 · 数值结算
   数值规则取自世界卡:
   战力 = 基础出力 × 品质系数 × 耦合率% × 协同倍率;耦合率>95% 触发「完美谐振」+20% 峰值出力
   灰件耦合率锁死 ≤75%;一至九阶 MSF 出力区间;武器四大禁忌(出力赤字 / 后坐力失衡 / 散热死锁)
   ===================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 基础表 ---------- */
const QUAL = [
  { n: '灰·残次', k: 'q0', c: .78 }, { n: '白·制式', k: 'q1', c: 1.00 }, { n: '蓝·精良', k: 'q2', c: 1.30 },
  { n: '紫·特装', k: 'q3', c: 1.75 }, { n: '金·传说', k: 'q4', c: 2.40 }, { n: '红·神话', k: 'q5', c: 3.50 },
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const TIERN = ['未达阶', '铁皮·启蒙', '制式·改装', '精锐·老兵', '特装·王牌', '统领·大师', '战略·宗师', '天灾·破军', '半神·星域', '神话·规则'];
const BANDS = [[5, 15], [15, 40], [40, 100], [100, 300], [300, 800], [800, 2500], [2500, 10000], [10000, 50000]];  // kW,一至八阶
const SPEED = [[95, 145], [210, 250], [290, 380], [460, 540], [600, 720], [780, 1150], [1600, 2200], [3600, 3700]];  // 摩托极速 km/h
const mid = t => { const b = BANDS[clamp(t, 1, 8) - 1]; return Math.sqrt(b[0] * b[1]); };
const fmtKW = v => v >= 1e6 ? (v / 1e6).toFixed(2) + ' GW' : v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' MW' : v.toFixed(v >= 100 ? 0 : 1) + ' kW';

const SERIES = [
  { id: 'seraph', cn: '圣翼天使',   t: 4, q: 3, b: [.95, 1.2, 1, 1.15],    light: true },
  { id: 'star',   cn: '星际机甲',   t: 4, q: 3, b: [1, 1.05, 1.1, 1.1],     light: false },
  { id: 'abyss',  cn: '深渊恶魔',   t: 5, q: 4, b: [1.2, 1, 1.25, .95],     light: false },
  { id: 'havoc',  cn: '破坏神',     t: 5, q: 4, b: [1.45, .75, 1.4, .8],    light: false },
  { id: 'sol',    cn: '太阳神',     t: 6, q: 4, b: [1.1, 1, 1.35, 1.1],     light: false },
];
const SBY = Object.fromEntries(SERIES.map(s => [s.id, s]));

// 部位:module=对应六大模块;z=层级;H=目标高度(舞台 1000×1400 单位);cx/cy=中心;hit=热区
const SLOTS = {
  halo:   { cn: '光环 / 法相', mod: 'M-03 · 外甲辅助(I-立场)', z: 1, H: 340, cx: 500, cy: 185, hit: [500, 60, 240, 80] },
  wings:  { cn: '背部推进 / 翼', mod: 'M-05 · 推进与机动总成', z: 2, H: 560, cx: 500, cy: 430, W: 1000, hit: [500, 292, 640, 34] },
  weapon: { cn: '武装挂载', mod: 'M-06 · 武装与战术挂载', z: 3, H: 800, cx: 105, cy: 770, hit: [115, 1100, 110, 520] },
  legL:   { cn: '双腿', mod: 'M-05 · 推进 / M-02 · 关节', z: 4, H: 640, cx: 565, cy: 1020, hit: [565, 1000, 170, 700] },
  legR:   { cn: '右腿', mod: 'M-05 · 推进 / M-02 · 关节', z: 4, H: 640, cx: 435, cy: 1020, hit: [435, 1000, 170, 700] },
  torso:  { cn: '躯干 / 炉心', mod: 'M-01 · 动力炉心 / M-03 · 外甲', z: 5, H: 440, cx: 500, cy: 505, hit: [500, 535, 190, 440] },
  armL:   { cn: '双臂', mod: 'M-02 · 骨架 / M-06 · 挂点', z: 6, H: 560, cx: 718, cy: 585, hit: [715, 560, 190, 480] },
  armR:   { cn: '右臂', mod: 'M-02 · 骨架 / M-06 · 挂点', z: 6, H: 560, cx: 282, cy: 585, hit: [285, 560, 190, 480] },
  head:   { cn: '头部 / 传感', mod: 'M-04 · 神经传感与火控', z: 7, H: 215, cx: 500, cy: 205, hit: [500, 190, 200, 260] },
};
const SLOT_ORDER = ['head', 'torso', 'armR', 'armL', 'legR', 'legL'];
const kindOf = s => s.startsWith('arm') ? 'arm' : s.startsWith('leg') ? 'leg' : s;
const MULT = {
  head:   { se: 1.5, ar: .35, at: .2, w: 3 },
  torso:  { ar: 2.0, w: 12 },
  arm:    { ar: .8, at: .7, se: .1, w: 6 },
  leg:    { ar: .6, mo: 1.1, w: 7 },
  wings:  { ar: .3, mo: 1.4, w: 5 },
  weapon: { at: 2.0, w: 4 },
  halo:   { se: .6, ar: .8, w: 2 },
  halo2:  { se: 1.0, ar: 1.2, at: .5, w: 3 },
};
const WEAPON_NAME = { seraph: '圣辉长枪', monkey: '武装挂载', abyss: '', falcon: '猎隼炮', sol: '日冕炮', star: '星核炮', havoc: '破坏重炮', gen: '制式步枪', sky: '穹顶炮', luna: '月华炮', cat: '' };

/* ---------- 零件库 ---------- */
let MAN = null;                       // manifest: {series:{slot:[w,h]}}
const PARTS = {};                     // key 'sid/slot' -> part
function mkPart(sid, slot){
  const s = SBY[sid], kind = slot === 'halo2' ? 'halo2' : kindOf(slot), m = MULT[kind];
  const base = 8 + s.t * 11, k = 1 + s.t * .25;
  let q = s.q; if (kind === 'halo') q = Math.min(5, q + 1); if (slot === 'halo2') q = 5;
  const st = {
    ar: Math.round(base * (m.ar || 0) * s.b[0]), mo: Math.round(base * (m.mo || 0) * s.b[1]),
    at: Math.round(base * (m.at || 0) * s.b[2]), se: Math.round(base * (m.se || 0) * s.b[3]),
    w: Math.round(m.w * k * 10) / 10,
  };
  if (kind === 'torso') st.kw = mid(s.t);
  if (kind === 'weapon') st.draw = mid(s.t) * .9;
  if (kind === 'wings') st.draw = mid(s.t) * .25;
  const nm = slot === 'halo2' ? '赤红法相' : kind === 'weapon' ? (WEAPON_NAME[sid] || '主武装') : SLOTS[slot === 'halo2' ? 'halo' : slot].cn.split(' ')[0];
  return { key: sid + '/' + slot, sid, slot, kind, q, t: s.t, st, name: nm, full: s.cn + '·' + nm };
}
function buildLibrary(){
  for (const sid of Object.keys(MAN)) for (const slot of Object.keys(MAN[sid])) PARTS[sid + '/' + slot] = mkPart(sid, slot);
}
const slotFits = (slot, p) => p.slot === (slot === 'armR' ? 'armL' : slot === 'legR' ? 'legL' : slot);
const partsFor = slot => Object.values(PARTS).filter(p => slotFits(slot, p)).sort((a, b) => a.t - b.t || a.q - b.q);

/* ---------- 状态 ---------- */
let eq = {};                          // slot -> part key
let sel = 'torso';
try { eq = JSON.parse(localStorage.getItem('orion.build2') || '{}') || {}; } catch (e) { eq = {}; }

/* ---------- 数值结算 ---------- */
function calc(){
  const P = SLOT_ORDER.map(s => eq[s] && PARTS[eq[s]]).filter(Boolean);
  const r = { n: P.length, warns: [], tags: [] };
  const torso = eq.torso && PARTS[eq.torso], head = eq.head && PARTS[eq.head], weapon = eq.weapon && PARTS[eq.weapon];
  if (!P.length) return r;
  if (!torso) r.warns.push(['err', '缺少躯干:没有 M-01 动力炉心,整机出力为 0']);
  if (!head) r.warns.push(['err', '缺少头部:M-04 神经传感与火控缺失,感知与锁定归零']);
  if (!eq.legL || !eq.legR) r.warns.push(['warn', '腿部不完整:机动与摩托形态大幅受限']);
  // 品质系数(躯干权重 3)
  let wq = 0, ws = 0; P.forEach(p => { const w = p.kind === 'torso' ? 3 : 1; wq += QUAL[p.q].c * w; ws += w; });
  r.Q = wq / ws;
  // 耦合率
  const ref = torso ? torso.sid : P[0].sid;
  const foreign = P.filter(p => p.sid !== ref).length;
  const qs = P.map(p => p.q), gap = Math.max(...qs) - Math.min(...qs);
  let c = 99.0 - 2.6 * foreign - (gap >= 3 ? 3 : gap >= 2 ? 1.5 : 0);
  if (!foreign && P.length >= 6) c += .8;
  const hasGray = qs.includes(0);
  if (hasGray) c = Math.min(c, 75);
  r.C = clamp(c, 60, 100); r.foreign = foreign; r.hasGray = hasGray;
  // 协同倍率
  let syn = 1; const same = (a, b) => a && b && PARTS[a].sid === PARTS[b].sid;
  if (same(eq.head, eq.torso)) { syn += .10; r.tags.push('头躯同源 +10%'); }
  if (same(eq.armL, eq.armR)) { syn += .06; r.tags.push('双臂同源 +6%'); }
  if (same(eq.legL, eq.legR)) { syn += .06; r.tags.push('双腿同源 +6%'); }
  if (weapon && (same(eq.weapon, eq.armL) || same(eq.weapon, eq.armR))) { syn += .05; r.tags.push('武器臂适配 +5%'); }
  if (P.length >= 6 && foreign === 0) { syn += .15; r.tags.push('整套同源 +15%'); }
  r.syn = syn;
  r.res = r.C > 95;                    // 完美谐振
  if (r.res) r.tags.push('完美谐振 +20% 峰值');
  // 出力
  const base = torso ? torso.st.kw : 0;
  r.base = base; r.kw = base * r.Q * (r.C / 100) * syn * (r.res ? 1.2 : 1);
  // 阶位
  let T = 0; if (r.kw >= BANDS[0][0]) { T = 1; for (let i = 0; i < 8; i++) if (r.kw >= BANDS[i][0]) T = i + 1; }
  const allRed = P.length >= 6 && qs.every(q => q === 5) && r.C >= 99.9;
  r.T = allRed && r.kw >= 50000 ? 9 : Math.min(T, 8);
  if (r.T === 9) r.C = 100;
  // 属性
  const sum = k => P.reduce((a, p) => a + p.st[k] * QUAL[p.q].c, 0) * (r.C / 100);
  r.ar = sum('ar'); r.mo = sum('mo') * ((eq.legL ? 1 : .35) * (eq.legR ? 1 : .35)); r.se = head ? sum('se') : 0;
  r.at = sum('at'); r.wt = P.reduce((a, p) => a + p.st.w, 0);
  // 禁忌
  if (weapon){
    const limit = (r.kw || 0) * 1.35;
    if (weapon.st.draw > limit){ r.at *= .5; r.warns.push(['err', `禁忌一·出力赤字:武器瞬时抽电 ${fmtKW(weapon.st.draw)} > 炉心缓冲上限 ${fmtKW(limit)}(135%),开火会黑屏熄火,火力减半`]); }
    const lightFrame = [eq.torso, eq.legL, eq.legR].some(k => k && SBY[PARTS[k].sid].light);
    if (weapon.t >= 5 && lightFrame){ r.at *= .8; r.warns.push(['warn', '禁忌二·后坐力失衡:轻量化骨架搭载重型武器,需加装驻锄,否则震碎肩肘关节(火力 -20%)']); }
  }
  if (eq.halo && weapon && eq.wings) r.warns.push(['warn', '禁忌三·散热过载:I-立场 + 武器 + 推进同开,超过十秒将热熔停机(稳定性 -6%)']), r.C = Math.max(60, r.C - 6 * 0);
  r.heat = (weapon ? weapon.st.draw : 0) + (eq.wings ? PARTS[eq.wings].st.draw : 0);
  r.heatPct = r.kw ? clamp(r.heat / r.kw * 100, 0, 200) : 0;
  if (hasGray) r.warns.push(['warn', '灰色残次件:耦合率被物理锁死在 75% 以下,随时可能炸膛']);
  if (foreign >= 3) r.warns.push(['info', `混搭 ${foreign} 个异系零件:接口公差累积,耦合率下降。把同系零件打磨成套可触发协同`]);
  // 摩托极速
  const ti = clamp(r.T, 1, 8) - 1, sp = SPEED[ti], f = clamp(r.mo / (r.mo + r.wt * 1.4), 0, 1);
  r.speed = r.T ? sp[0] + (sp[1] - sp[0]) * f : 0;
  r.hpTotal = Math.round(r.ar * 6);
  return r;
}

/* ---------- 渲染:舞台 ---------- */
const stage = () => $('#bStage');
function F(sid, slot){ return MAN[sid] && MAN[sid][slot] ? MAN[sid][slot][2] : null; }
/* ===== 对角正交视角 · 四件式零件(头 / 躯干 / 双臂 / 双腿)=====
   每套零件出自同一张母图,同系列拼装即原位还原;混搭时用「接口点」对位:
   头底 ↔ 躯干领口,双臂肩头 ↔ 躯干肩座,双腿髋球 ↔ 躯干髋座。
   遮挡顺序:后臂 → 双腿 → 躯干 → 头 → 前臂。 */
let ISO = null;
const cdn = p => (window.ORION_CDN || '') + p;
const FILE = { head: 'head', torso: 'torso', armL: 'armF', legL: 'legs' };
const UI_ORDER = ['head', 'torso', 'armL', 'legL'];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function layout(){
  const g = k => eq[k] && PARTS[eq[k]];
  const first = g('torso') || g('head') || g('armL') || g('legL');
  const tsid = first ? first.sid : 'seraph', It = ISO[tsid];
  const place = (b, pp, sock, s) => [sock[0] - (pp[0] - b[0]) * s, sock[1] - (pp[1] - b[1]) * s, b[2] * s, b[3] * s];
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const R = [];                                    // {id, slot, key, r:[x,y,w,h], z}
  const T = g('torso'); if (T) R.push({ id: 'torso', slot: 'torso', file: 'torso', key: eq.torso, r: It.parts.torso.slice(), z: 5 });
  const H = g('head');
  if (H){ const ip = ISO[H.sid], s = H.sid === tsid ? 1 : clamp(It.torsoW / ip.torsoW, .6, 1.5);
    const dx = (ip.plug.head[0] - ip.plug.collar[0]) * s, dy = (ip.plug.head[1] - ip.plug.collar[1]) * s;   // 头底相对本系列躯干领口的沉入量
    const sock = [It.plug.collar[0] + dx, It.plug.collar[1] + dy];
    R.push({ id: 'head', slot: 'head', file: 'head', key: eq.head, r: place(ip.parts.head, ip.plug.head, sock, s), z: 8 }); }
  const A = g('armL');
  if (A){ const ip = ISO[A.sid], same = A.sid === tsid;
    const s = same ? 1 : clamp(dist(It.plug.armF, It.plug.armB) / dist(ip.plug.armF, ip.plug.armB), .75, 1.3);
    const sm = mid(It.plug.armF, It.plug.armB), pm = mid(ip.plug.armF, ip.plug.armB);
    R.push({ id: 'armB', slot: 'armL', file: 'armB', key: eq.armL, r: place(ip.parts.armB, pm, sm, s), z: 2 });
    R.push({ id: 'armF', slot: 'armL', file: 'armF', key: eq.armL, r: place(ip.parts.armF, pm, sm, s), z: 9 }); }
  const L = g('legL');
  if (L){ const ip = ISO[L.sid], same = L.sid === tsid;
    const s = same ? 1 : clamp(dist(It.plug.legL, It.plug.legR) / dist(ip.plug.legL, ip.plug.legR), .75, 1.3);
    const sm = mid(It.plug.legL, It.plug.legR), pm = mid(ip.plug.legL, ip.plug.legR);
    R.push({ id: 'legs', slot: 'legL', file: 'legs', key: eq.legL, r: place(ip.parts.legs, pm, sm, s), z: 3 }); }
  // 舞台适配:以当前躯干系列的完整立绘为基准,混搭溢出时再整体缩小
  const f = It.fig; let x0 = f[0], y0 = f[1], x1 = f[2], y1 = f[3];
  for (const o of R){ x0 = Math.min(x0, o.r[0]); y0 = Math.min(y0, o.r[1]); x1 = Math.max(x1, o.r[0] + o.r[2]); y1 = Math.max(y1, o.r[1] + o.r[3]); }
  const F = Math.min(1290 / (y1 - y0), 930 / (x1 - x0)), ox = 500 - (x0 + x1) / 2 * F, oy = 700 - (y0 + y1) / 2 * F;
  const T2 = r => ({ cx: ox + (r[0] + r[2] / 2) * F, cy: oy + (r[1] + r[3] / 2) * F, w: r[2] * F, h: r[3] * F });
  const out = { layers: R.map(o => Object.assign(o, T2(o.r), { a: 0 })), hit: [] };
  const hz = [['armL', 'armB'], ['legL', 'legs'], ['torso', 'torso'], ['head', 'head']];     // 空位也要有热区:取躯干系列自己的位置
  for (const [slot, k] of hz){ const t = T2(It.parts[k]); out.hit.push({ slot, x: t.cx - t.w / 2, y: t.cy - t.h / 2, w: t.w, h: t.h });
    if (slot === 'armL'){ const u = T2(It.parts.armF); out.hit.push({ slot, x: u.cx - u.w / 2, y: u.cy - u.h / 2, w: u.w, h: u.h }); } }
  return out;
}
function pureSid(){ return null; }
function renderStage(anim){
  const host = $('#bFig'); if (!host) return;
  const L = layout(), keep = new Set(L.layers.map(o => o.id));
  host.querySelectorAll('img.bp').forEach(i => { const o = L.layers.find(q => q.id === i.dataset.layer); if (!o || o.key !== i.dataset.key) i.remove(); });
  for (const o of L.layers){
    let img = host.querySelector(`img.bp[data-layer="${o.id}"]`);
    if (!img){
      const p = PARTS[o.key];
      img = document.createElement('img'); img.className = 'bp' + (anim === o.slot ? ' drop' : ''); img.dataset.layer = o.id; img.dataset.slot = o.slot; img.dataset.key = o.key; img.draggable = false; img.alt = p.full;
      const u = `assets/iso/${p.sid}/${o.file}.webp`; img.src = cdn(u); img.onerror = () => { img.onerror = null; img.src = u; }; host.appendChild(img);
    }
    img._g = o; img.style.cssText = `left:${o.cx / 10}%;top:${o.cy / 14}%;width:${o.w / 10}%;height:${o.h / 14}%;z-index:${o.z}`;
  }
  $('#bHit').innerHTML = L.hit.map(h => `<g class="hz" data-slot="${h.slot}"><rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="14"/><text x="${h.x + h.w / 2}" y="${h.y + 24}">${SLOTS[h.slot].cn.split(' ')[0]}</text></g>`).join('');
  document.querySelectorAll('#bHit .hz').forEach(h => { h.classList.toggle('filled', !!eq[h.dataset.slot]); h.classList.toggle('sel', h.dataset.slot === sel); });
}

/* ---------- 渲染:零件库 ---------- */
function statChips(p){
  const o = [];
  if (p.st.kw) o.push(['出力', fmtKW(p.st.kw)]);
  if (p.st.draw && p.kind === 'weapon') o.push(['抽电', fmtKW(p.st.draw)]);
  if (p.st.at) o.push(['火力', p.st.at]); if (p.st.ar) o.push(['装甲', p.st.ar]);
  if (p.st.mo) o.push(['机动', p.st.mo]); if (p.st.se) o.push(['感知', p.st.se]);
  o.push(['重量', p.st.w + 'kg']);
  return o.map(([a, b]) => `<span><em>${a}</em>${b}</span>`).join('');
}
function renderLib(){
  const list = $('#bList'), tabs = $('#bTabs');
  tabs.innerHTML = UI_ORDER.map(s => `<button class="${s === sel ? 'on' : ''}${eq[s] ? ' has' : ''}" data-slot="${s}">${SLOTS[s].cn.split(' ')[0]}</button>`).join('');
  $('#bSlotInfo').innerHTML = `<b>${SLOTS[sel].cn}</b><i>${SLOTS[sel].mod}</i>`;
  const ps = partsFor(sel);
  list.innerHTML = ps.map(p => `<div class="pc ${QUAL[p.q].k}${eq[sel] === p.key ? ' on' : ''}" draggable="true" data-key="${p.key}">
      <div class="pc-img"><img loading="lazy" src="${cdn(`assets/iso/${p.sid}/${FILE[p.slot]}.webp`)}" alt=""></div>
      <div class="pc-t"><h5>${p.full}</h5><p><u class="qc ${QUAL[p.q].k}">${QUAL[p.q].n} ×${QUAL[p.q].c.toFixed(2)}</u><u class="tc">${ROMAN[p.t]}阶</u></p>
      <div class="pc-s">${statChips(p)}</div></div></div>`).join('') || '<p class="empty">此部位暂无零件</p>';
}

/* ---------- 渲染:数值面板 ---------- */
function bar(label, v, K, cls){
  const w = Math.round(v / (v + K) * 100);
  return `<div class="bar ${cls || ''}"><label>${label}</label><div class="bt"><i style="width:${w}%"></i></div><b>${Math.round(v)}</b></div>`;
}
function renderStats(){
  const r = calc(), el = $('#bStats');
  if (!r.n){ el.innerHTML = '<p class="empty">机架空置 —— 从左侧选择零件,或点击上方预设机甲。</p>'; return; }
  const q = QUAL.reduce((b, x) => Math.abs(x.c - r.Q) < Math.abs(b.c - r.Q) ? x : b);
  el.innerHTML = `
    <div class="s-top"><div class="s-tier t${r.T}"><small>综合阶位</small><b>${r.T ? ROMAN[r.T] : '—'}</b><em>${TIERN[r.T]}</em></div>
    <div class="s-kw"><small>实际出力</small><b>${r.kw ? fmtKW(r.kw) : '0 kW'}</b><em>基础 ${r.base ? fmtKW(r.base) : '—'}</em></div></div>
    <div class="s-form"><span>基础出力<b>${r.base ? fmtKW(r.base) : '0'}</b></span>×<span>品质<b class="${q.k}">${r.Q.toFixed(2)}</b></span>×<span>耦合率<b>${r.C.toFixed(1)}%</b></span>×<span>协同<b>${r.syn.toFixed(2)}</b></span>${r.res ? '×<span class="res">谐振<b>1.20</b></span>' : ''}</div>
    ${r.tags.length ? `<div class="s-tags">${r.tags.map(t => `<u>${t}</u>`).join('')}</div>` : ''}
    <div class="bars">
      ${bar('装甲 AP', r.ar, 260, 'b-ar')}${bar('机动', r.mo, 220, 'b-mo')}${bar('火力', r.at, 200, 'b-at')}${bar('感知', r.se, 150, 'b-se')}
      <div class="bar b-cp"><label>耦合率</label><div class="bt"><i style="width:${r.C}%"></i></div><b>${r.C.toFixed(1)}%</b></div>
      <div class="bar b-ht ${r.heatPct > 100 ? 'hot' : ''}"><label>热负荷</label><div class="bt"><i style="width:${clamp(r.heatPct / 2, 0, 100)}%"></i></div><b>${Math.round(r.heatPct)}%</b></div>
    </div>
    <dl class="s-meta"><div><dt>整机耐久</dt><dd>${r.hpTotal}</dd></div><div><dt>整备重量</dt><dd>${r.wt.toFixed(1)} kg</dd></div><div><dt>摩托极速</dt><dd>${r.speed ? Math.round(r.speed) + ' km/h' : '—'}</dd></div><div><dt>已装部位</dt><dd>${r.n} / 6</dd></div></dl>
    <div class="warns">${r.warns.map(([t, m]) => `<p class="${t}">${m}</p>`).join('')}</div>`;
}

function refresh(anim){ renderStage(anim); renderLib(); renderStats(); try { localStorage.setItem('orion.build2', JSON.stringify(eq)); } catch (e) {} }

/* ---------- 操作 ---------- */
function equip(slot, key){
  const p = PARTS[key]; if (!p || !slotFits(slot, p)) return;
  eq[slot] = key; if (slot === 'armL') eq.armR = key; if (slot === 'legL') eq.legR = key; sel = slot; refresh(slot); sfx(720);
}
function unequip(slot){ delete eq[slot]; if (slot === 'armL') delete eq.armR; if (slot === 'legL') delete eq.legR; refresh(); sfx(300); }
function preset(sid){
  eq = { head: sid + '/head', torso: sid + '/torso', armL: sid + '/armL', armR: sid + '/armL', legL: sid + '/legL', legR: sid + '/legL' };
  document.querySelectorAll('#bFig img.bp').forEach(i => i.remove());
  refresh(); document.querySelectorAll('#bFig img.bp').forEach((i, n) => { i.classList.add('drop'); i.style.animationDelay = n * 60 + 'ms'; });
  sfx(520);
}
function savePng(){
  const host = $('#bFig'); const imgs = [...host.querySelectorAll('img.bp,img.bfull')];
  if (!imgs.length) return;
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1400; const c = cv.getContext('2d');
  const g = c.createRadialGradient(500, 700, 100, 500, 700, 900); g.addColorStop(0, '#12304a'); g.addColorStop(1, '#050c16'); c.fillStyle = g; c.fillRect(0, 0, 1000, 1400);
  const W = host.clientWidth, H = host.clientHeight;
  const load = i => new Promise(res => { const m = new Image(); m.crossOrigin = 'anonymous'; m.onload = () => res(m); m.onerror = () => { const n = new Image(); n.onload = () => res(n); n.onerror = () => res(null); n.src = i.getAttribute('src').replace(/^https?:\/\/[^@]+@main\//, ''); }; m.src = i.currentSrc || i.src; });
  Promise.all(imgs.map(load)).then(ms => {
    imgs.map((i, k) => ({ i, m: ms[k], z: +i.style.zIndex || 0 })).sort((a, b) => a.z - b.z).forEach(o => {
      if (!o.m || !o.i._g) return; const g = o.i._g;
      c.save(); c.translate(g.cx, g.cy); c.rotate((g.a || 0) * Math.PI / 180); c.drawImage(o.m, -g.w / 2, -g.h / 2, g.w, g.h); c.restore();
    });
    c.fillStyle = 'rgba(95,243,255,.7)'; c.font = '20px sans-serif'; c.fillText('ORION · 机甲组装', 24, 1376);
    cv.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '我的机甲.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); sfx(800); }, 'image/png');
  });
}function randomize(){
  eq = {};
  for (const slot of UI_ORDER){ const ps = partsFor(slot); if (ps.length) equipQuiet(slot, ps[Math.floor(Math.random() * ps.length)].key); }
  document.querySelectorAll('#bFig img.bp').forEach(i => i.remove()); refresh(); sfx(640);
}
function equipQuiet(slot, key){ eq[slot] = key; if (slot === 'armL') eq.armR = key; if (slot === 'legL') eq.legR = key; }
function sfx(f){ try { window.OrionAudio && window.OrionAudio.blip(f, .09, 'triangle', .04, 200); } catch (e) {} }

/* ---------- 初始化 ---------- */
let inited = false;
async function init(){
  if (inited) return; inited = true;
  ISO = await (await fetch(cdn('assets/iso/iso.json')).catch(() => fetch('assets/iso/iso.json'))).json();
  MAN = Object.fromEntries(Object.keys(ISO).map(k => [k, { head: 1, torso: 1, armL: 1, legL: 1 }]));
  buildLibrary();
  // 预设芯片
  $('#bPresets').innerHTML = SERIES.map(s => `<button data-sid="${s.id}" title="${s.cn} · ${ROMAN[s.t]}阶 · ${QUAL[s.q].n}">
    <img src="${cdn(`assets/iso/${s.id}/head.webp`)}" alt=""><span>${s.cn}</span><i class="${QUAL[s.q].k}">${ROMAN[s.t]}</i></button>`).join('');
  // 事件
  $('#bPresets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) preset(b.dataset.sid); });
  $('#bTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b){ sel = b.dataset.slot; refresh(); } });
  $('#bList').addEventListener('click', e => { const c = e.target.closest('.pc'); if (c) equip(sel, c.dataset.key); });
  $('#bList').addEventListener('dragstart', e => { const c = e.target.closest('.pc'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.key); e.dataTransfer.effectAllowed = 'copy'; });
  const hit = $('#bHit');
  hit.addEventListener('click', e => { const g = e.target.closest('.hz'); if (g){ sel = g.dataset.slot; refresh(); } });
  hit.addEventListener('dblclick', e => { const g = e.target.closest('.hz'); if (g) unequip(g.dataset.slot); });
  hit.addEventListener('dragover', e => { const g = e.target.closest('.hz'); if (g){ e.preventDefault(); document.querySelectorAll('#bHit .hz').forEach(h => h.classList.toggle('over', h === g)); } });
  hit.addEventListener('dragleave', () => document.querySelectorAll('#bHit .hz.over').forEach(h => h.classList.remove('over')));
  hit.addEventListener('drop', e => { e.preventDefault(); document.querySelectorAll('#bHit .hz.over').forEach(h => h.classList.remove('over'));
    const g = e.target.closest('.hz'); const k = e.dataTransfer.getData('text/plain'); if (g && k) equip(g.dataset.slot, k); });
  $('#bClear').addEventListener('click', () => { eq = {}; document.querySelectorAll('#bFig img.bp').forEach(i => i.remove()); refresh(); sfx(260); });
  $('#bRand').addEventListener('click', randomize);
  $('#bSave').addEventListener('click', savePng);
  $('#bUnequip').addEventListener('click', () => unequip(sel));
  // 清理无效存档
  for (const s of Object.keys(eq)) if (!SLOTS[s] || !SLOT_ORDER.includes(s) || !PARTS[eq[s]] || !slotFits(s, PARTS[eq[s]])) delete eq[s];
}
async function open(){
  await init();
  document.querySelectorAll('#bFig img.bp').forEach(i => i.remove());
  refresh();
}
window.OrionBuild = { _set: o => { eq = o; refresh(); }, open, _calc: calc, _eq: () => eq, _preset: preset };
})();










