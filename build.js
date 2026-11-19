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
  { id: 'gen',    cn: '通用机甲',   t: 2, q: 1, b: [1, 1, 1, 1],           light: false },
  { id: 'monkey', cn: '齐天大圣',   t: 3, q: 2, b: [1.1, 1.1, 1.2, .9],    light: true },
  { id: 'falcon', cn: '苍穹猎隼',   t: 3, q: 2, b: [.8, 1.45, 1, 1.2],     light: true },
  { id: 'seraph', cn: '圣翼天使',   t: 4, q: 3, b: [.95, 1.2, 1, 1.15],    light: true },
  { id: 'star',   cn: '星际机甲',   t: 4, q: 3, b: [1, 1.05, 1.1, 1.1],     light: false },
  { id: 'luna',   cn: '月亮神',     t: 4, q: 3, b: [.9, 1.15, .95, 1.45],   light: true },
  { id: 'cat',    cn: '头头猫',     t: 4, q: 3, b: [1, 1.1, 1, 1.2],        light: false },
  { id: 'abyss',  cn: '深渊恶魔',   t: 5, q: 4, b: [1.2, 1, 1.25, .95],     light: false },
  { id: 'havoc',  cn: '破坏神',     t: 5, q: 4, b: [1.45, .75, 1.4, .8],    light: false },
  { id: 'sol',    cn: '太阳神',     t: 6, q: 4, b: [1.1, 1, 1.35, 1.1],     light: false },
  { id: 'sky',    cn: '天空之神',   t: 6, q: 4, b: [.9, 1.35, 1.1, 1.3],    light: true },
];
const SBY = Object.fromEntries(SERIES.map(s => [s.id, s]));

// 部位:module=对应六大模块;z=层级;H=目标高度(舞台 1000×1400 单位);cx/cy=中心;hit=热区
const SLOTS = {
  halo:   { cn: '光环 / 法相', mod: 'M-03 · 外甲辅助(I-立场)', z: 1, H: 340, cx: 500, cy: 185, hit: [500, 60, 240, 80] },
  wings:  { cn: '背部推进 / 翼', mod: 'M-05 · 推进与机动总成', z: 2, H: 560, cx: 500, cy: 430, W: 1000, hit: [500, 292, 640, 34] },
  weapon: { cn: '武装挂载', mod: 'M-06 · 武装与战术挂载', z: 3, H: 800, cx: 105, cy: 770, hit: [115, 1100, 110, 520] },
  legL:   { cn: '左腿', mod: 'M-05 · 推进 / M-02 · 关节', z: 4, H: 640, cx: 565, cy: 1020, hit: [565, 1000, 170, 700] },
  legR:   { cn: '右腿', mod: 'M-05 · 推进 / M-02 · 关节', z: 4, H: 640, cx: 435, cy: 1020, hit: [435, 1000, 170, 700] },
  torso:  { cn: '躯干 / 炉心', mod: 'M-01 · 动力炉心 / M-03 · 外甲', z: 5, H: 440, cx: 500, cy: 505, hit: [500, 535, 190, 440] },
  armL:   { cn: '左臂', mod: 'M-02 · 骨架 / M-06 · 挂点', z: 6, H: 560, cx: 718, cy: 585, hit: [715, 560, 190, 480] },
  armR:   { cn: '右臂', mod: 'M-02 · 骨架 / M-06 · 挂点', z: 6, H: 560, cx: 282, cy: 585, hit: [285, 560, 190, 480] },
  head:   { cn: '头部 / 传感', mod: 'M-04 · 神经传感与火控', z: 7, H: 215, cx: 500, cy: 205, hit: [500, 190, 200, 260] },
};
const SLOT_ORDER = ['head', 'torso', 'armR', 'armL', 'legR', 'legL', 'wings', 'weapon', 'halo'];
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
const slotFits = (slot, p) => slot === 'halo' ? (p.slot === 'halo' || p.slot === 'halo2') : p.slot === slot;
const partsFor = slot => Object.values(PARTS).filter(p => slotFits(slot, p)).sort((a, b) => a.t - b.t || a.q - b.q);

/* ---------- 状态 ---------- */
let eq = {};                          // slot -> part key
let sel = 'torso';
try { eq = JSON.parse(localStorage.getItem('orion.build') || '{}') || {}; } catch (e) { eq = {}; }

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
/* 接口对位:每套零件由 SIFT 匹配回整机原图,得到「零件缩放 + 插头位置 + 躯干上的插座位置」。
   混搭时:插座取自当前躯干(它决定手臂、腿、头接在哪),插头取自零件自己(它决定零件哪一点接上去),
   缩放各按本系列在原图里的真实比例,所以头、手、腿天然与躯干匹配。 */
let RIG = null;
const HF = 1320;                                   // 原图整机高度映射到舞台的像素
const ru = (sid, s) => s * HF / RIG[sid].torso.fh;  // 零件像素 → 舞台像素
function layout(){
  const out = {}, CX = 500;
  const pk = s => eq[s] && PARTS[eq[s]];
  const tp = pk('torso'), tsid = tp ? tp.sid : 'gen', rt = RIG[tsid];
  const tu = ru(tsid, rt.torso.s), tw = rt.torso.w * tu, th = rt.torso.h * tu;
  const tx = CX - tw / 2, ty = 60 + rt.torso.t0 * HF;
  if (tp) out.torso = { cx: tx + tw / 2, cy: ty + th / 2, w: tw, h: th, a: 0, z: 5 };
  const put = (slot, z, rot) => {
    const p = pk(slot); if (!p) return;
    const rp = RIG[p.sid] && RIG[p.sid][slot]; if (!rp) return;
    const sk = (rt[slot] && rt[slot].sock) || RIG._avg[slot];
    const u = ru(p.sid, rp.s), w = rp.pw * u, h = rp.ph * u;
    let Wx = tx + sk[0] * tw; const Wy = ty + sk[1] * th;        // 躯干上的插座
    if (slot.startsWith('arm') && p.sid !== tsid && rt[slot] && rt[slot].ie != null && rp.ie != null){
      // 内缘对齐:异系手臂的内侧边,贴到躯干自带手臂的内侧边(肩甲宽窄不同也不会脱开)
      const ieA = rt[slot].ie * ru(tsid, rt[slot].s), ieB = rp.ie * u;
      Wx += slot === 'armL' ? (ieB - ieA) : (ieA - ieB);
    }
    const lx = rp.p[0] * u, ly = rp.p[1] * u;                    // 零件上的插头
    const a = rot ? rp.a : 0, r = a * Math.PI / 180, dx = w / 2 - lx, dy = h / 2 - ly;
    let ox = 0, oy = 0;
    if (slot === 'head') oy = (window.ORION_HD != null ? window.ORION_HD : .24) * h;      // 头压进颈口,盖住接缝
    if (slot.startsWith('arm')){ ox = (slot === 'armL' ? -1 : 1) * (window.ORION_AX != null ? window.ORION_AX : .07) * tw; oy = (window.ORION_AY != null ? window.ORION_AY : .02) * th; }  // 手臂向躯干收拢
    out[slot] = { cx: Wx + ox + dx * Math.cos(r) - dy * Math.sin(r), cy: Wy + oy + dx * Math.sin(r) + dy * Math.cos(r), w, h, a, z };
  };
  put('legL', 3, true); put('legR', 3, true); put('armL', 6, true); put('armR', 6, true); put('head', 8, false); put('weapon', 7, false);
  // 整体适配舞台:过大时等比缩小,超出边界时平移
  const ks = Object.keys(out);
  if (ks.length){
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of ks){ const g = out[k]; x0 = Math.min(x0, g.cx - g.w / 2); x1 = Math.max(x1, g.cx + g.w / 2); y0 = Math.min(y0, g.cy - g.h / 2); y1 = Math.max(y1, g.cy + g.h / 2); }
    const k = Math.min(1, 1330 / (y1 - y0), 960 / (x1 - x0)), Y0 = Math.max(40, Math.min(y0, 1360 - (y1 - y0) * k));
    const nx0 = 500 + (x0 - 500) * k, nx1 = 500 + (x1 - 500) * k, dx = nx0 < 20 ? 20 - nx0 : (nx1 > 980 ? 980 - nx1 : 0);
    for (const q of ks){ const g = out[q]; g.cx = 500 + (g.cx - 500) * k + dx; g.cy = Y0 + (g.cy - y0) * k; g.w *= k; g.h *= k; }
  }
  const T = out.torso || { cx: 500, cy: 500, w: tw, h: th }, H = out.head;
  const wg = pk('wings');
  if (wg){ const d = MAN[wg.sid].wings; let hh = 1.3 * T.h, ww = d[0] / d[1] * hh; if (ww > 980){ ww = 980; hh = ww * d[1] / d[0]; }
    out.wings = { cx: T.cx, cy: T.cy - T.h * .08, w: ww, h: hh, a: 0, z: 2 }; }
  const ha = pk('halo');
  if (ha){ const d = MAN[ha.sid][ha.slot], hy = H ? H.cy : T.cy - T.h * .45;
    if (ha.slot === 'halo2'){ const hh = 1000, ww = d[0] / d[1] * hh; out.halo = { cx: T.cx, cy: 640, w: ww, h: hh, a: 0, z: 0 }; }
    else { let hh = 1.0 * T.h, ww = d[0] / d[1] * hh; if (ww > 560){ ww = 560; hh = ww * d[1] / d[0]; }
      out.halo = { cx: T.cx, cy: hy, w: ww, h: hh, a: 0, z: 1 }; } }
  return out;
}
const cdn = p => (window.ORION_CDN || '') + p;
const FULL = { seraph: [730, 1100], monkey: [703, 1100], abyss: [725, 1100], falcon: [635, 1100], sol: [676, 1100], star: [678, 1100],
  havoc: [735, 1100], gen: [546, 1100], sky: [713, 1100], luna: [671, 1100], cat: [731, 1100] };
/* 当前装备恰好是某一套预设的完整原件时,返回该套 id(此时直接显示整机原图) */
function pureSid(){
  const keys = Object.keys(eq); if (!keys.length) return null;
  const sid = eq[keys[0]].split('/')[0]; if (!FULL[sid]) return null;
  const want = {};
  for (const slot of SLOT_ORDER){ const alt = slot === 'halo' ? (MAN[sid].halo ? 'halo' : null) : slot; if (alt && MAN[sid][alt]) want[slot] = sid + '/' + alt; }
  const wk = Object.keys(want);
  return wk.length === keys.length && wk.every(k => eq[k] === want[k]) ? sid : null;
}
function renderStage(anim){
  const host = $('#bFig'); if (!host) return;
  const ps = pureSid(); let full = host.querySelector('img.bfull');
  if (ps){
    host.querySelectorAll('img.bp').forEach(i => i.remove());
    const d = FULL[ps]; let h = 1340, w = d[0] / d[1] * h; if (w > 980){ w = 980; h = w * d[1] / d[0]; }
    if (!full){ full = document.createElement('img'); full.className = 'bfull'; full.draggable = false; host.appendChild(full); }
    if (full.dataset.sid !== ps){ full.dataset.sid = ps; full.src = cdn(`assets/full/${ps}.webp`); full.onerror = () => { full.onerror = null; full.src = `assets/full/${ps}.webp`; }; full.alt = ps; }
    full._g = { cx: 500, cy: 700, w, h, a: 0, z: 5 }; full.style.cssText = `left:${500 / 10}%;top:${700 / 14}%;width:${w / 10}%;height:${h / 14}%;z-index:5`;
    document.querySelectorAll('#bHit .hz').forEach(h2 => { h2.classList.toggle('filled', !!eq[h2.dataset.slot]); h2.classList.toggle('sel', h2.dataset.slot === sel); });
    return;
  }
  if (full) full.remove();
  host.querySelectorAll('img.bp').forEach(i => { if (!eq[i.dataset.slot] || eq[i.dataset.slot] !== i.dataset.key) i.remove(); });
  const L = layout();
  for (const slot of SLOT_ORDER){
    const key = eq[slot]; if (!key || !L[slot]) continue;
    let img = host.querySelector(`img.bp[data-slot="${slot}"]`);
    if (!img || img.dataset.key !== key){
      const p = PARTS[key];
      img = document.createElement('img'); img.className = 'bp' + (anim === slot ? ' drop' : '');
      img.dataset.slot = slot; img.dataset.key = key; img.draggable = false; img.alt = p.full;
      img.src = cdn(`assets/parts/${p.sid}/${p.slot}.webp`); img.onerror = () => { img.onerror = null; img.src = `assets/parts/${p.sid}/${p.slot}.webp`; }; host.appendChild(img);
    }
    const g = L[slot];
    img._g = g; img.style.cssText = `left:${g.cx / 10}%;top:${g.cy / 14}%;width:${g.w / 10}%;height:${g.h / 14}%;z-index:${g.z};rotate:${g.a || 0}deg;transform-origin:0 0`;
  }
  document.querySelectorAll('#bHit .hz').forEach(h => {
    h.classList.toggle('filled', !!eq[h.dataset.slot]); h.classList.toggle('sel', h.dataset.slot === sel);
  });
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
  tabs.innerHTML = SLOT_ORDER.map(s => `<button class="${s === sel ? 'on' : ''}${eq[s] ? ' has' : ''}" data-slot="${s}">${SLOTS[s].cn.split(' ')[0]}</button>`).join('');
  $('#bSlotInfo').innerHTML = `<b>${SLOTS[sel].cn}</b><i>${SLOTS[sel].mod}</i>`;
  const ps = partsFor(sel);
  list.innerHTML = ps.map(p => `<div class="pc ${QUAL[p.q].k}${eq[sel] === p.key ? ' on' : ''}" draggable="true" data-key="${p.key}">
      <div class="pc-img"><img loading="lazy" src="assets/parts/${p.sid}/${p.slot}.webp" alt=""></div>
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
    <dl class="s-meta"><div><dt>整机耐久</dt><dd>${r.hpTotal}</dd></div><div><dt>整备重量</dt><dd>${r.wt.toFixed(1)} kg</dd></div><div><dt>摩托极速</dt><dd>${r.speed ? Math.round(r.speed) + ' km/h' : '—'}</dd></div><div><dt>已装部位</dt><dd>${r.n} / 9</dd></div></dl>
    <div class="warns">${r.warns.map(([t, m]) => `<p class="${t}">${m}</p>`).join('')}</div>`;
}

function refresh(anim){ renderStage(anim); renderLib(); renderStats(); try { localStorage.setItem('orion.build', JSON.stringify(eq)); } catch (e) {} }

/* ---------- 操作 ---------- */
function equip(slot, key){
  const p = PARTS[key]; if (!p || !slotFits(slot, p)) return;
  eq[slot] = key; sel = slot; refresh(slot); sfx(720);
}
function unequip(slot){ delete eq[slot]; refresh(); sfx(300); }
function preset(sid){
  eq = {};
  for (const slot of SLOT_ORDER){
    const alt = slot === 'halo' ? (MAN[sid].halo ? 'halo' : null) : slot;
    if (alt && MAN[sid][alt]) eq[slot] = sid + '/' + alt;
  }
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
  for (const slot of SLOT_ORDER){
    if ((slot === 'wings' || slot === 'halo' || slot === 'weapon') && Math.random() < .35) continue;
    const ps = partsFor(slot); if (ps.length) eq[slot] = ps[Math.floor(Math.random() * ps.length)].key;
  }
  document.querySelectorAll('#bFig img.bp').forEach(i => i.remove()); refresh(); sfx(640);
}
function sfx(f){ try { window.OrionAudio && window.OrionAudio.blip(f, .09, 'triangle', .04, 200); } catch (e) {} }

/* ---------- 初始化 ---------- */
let inited = false;
async function init(){
  if (inited) return; inited = true;
  MAN = await (await fetch('assets/parts/manifest.json')).json();
  RIG = await (await fetch(cdn('assets/parts/rig.json')).catch(() => fetch('assets/parts/rig.json'))).json();
  buildLibrary();
  // 预设芯片
  $('#bPresets').innerHTML = SERIES.map(s => `<button data-sid="${s.id}" title="${s.cn} · ${ROMAN[s.t]}阶 · ${QUAL[s.q].n}">
    <img src="assets/parts/${s.id}/head.webp" alt=""><span>${s.cn}</span><i class="${QUAL[s.q].k}">${ROMAN[s.t]}</i></button>`).join('');
  // 热区 + 骨架
  const hz = SLOT_ORDER.map(s => { const [x, y, w, h] = SLOTS[s].hit;
    return `<g class="hz" data-slot="${s}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="14"/><text x="${x}" y="${y - h / 2 + 24}">${SLOTS[s].cn.split(' ')[0]}</text></g>`; }).join('');
  $('#bHit').innerHTML = hz;
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
  for (const s of Object.keys(eq)) if (!SLOTS[s] || !PARTS[eq[s]] || !slotFits(s, PARTS[eq[s]])) delete eq[s];
}
async function open(){
  await init();
  document.querySelectorAll('#bFig img.bp').forEach(i => i.remove());
  refresh();
}
window.OrionBuild = { _set: o => { eq = o; refresh(); }, open, _calc: calc, _eq: () => eq, _preset: preset };
})();










