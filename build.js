/* =====================================================
   build.js —— 选择机甲:11 台整机(侧身 / 对角正交图)· 数值结算
   数值规则取自世界卡:
   战力 = 基础出力 × 品质系数 × 耦合率% × 协同倍率;耦合率>95% 触发「完美谐振」+20% 峰值出力
   灰件耦合率锁死 ≤75%;一至九阶 MSF 出力区间;武器四大禁忌(出力赤字 / 后坐力失衡 / 散热死锁)
   ===================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MEM = window.__ORION_MEM = window.__ORION_MEM || {};
const lsGet = k => window.ORION_STORE ? window.ORION_STORE.get(k) : (()=>{ try { return localStorage.getItem(k); } catch(e){ return MEM[k] ?? null; } })();
const lsSet = (k, v) => window.ORION_STORE ? window.ORION_STORE.set(k, v) : (()=>{ MEM[k]=String(v); try { localStorage.setItem(k, v); } catch(e){} })();

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
try { eq = JSON.parse(lsGet('orion.build2') || '{}') || {}; } catch (e) { eq = {}; }

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

/* ---------- 选择机甲:整机侧身 / 对角正交图 ---------- */
const cdn = p => (window.ORION_CDN || '') + p;
function setSrc(img, u){
  if (window.ORION_RES && window.ORION_RES.setImg) { window.ORION_RES.setImg(img, u); return; }
  img.src = cdn(u); img.onerror = () => { img.onerror = null; if (location.protocol !== 'about:') img.src = u; };
}
const BLURB = {
  seraph: '白金羽翼与圣辉长枪,高机动的空域压制型。',
  star:   '紫蓝流线装甲与光束长枪,均衡的星际制式旗舰机。',
  abyss:  '黑角、蝠翼与尖刺肩甲,以压迫感著称的重装突击型。',
  havoc:  '熔岩纹路的重甲破坏者,火力与装甲拉满,机动偏弱。',
  sol:    '金白羽冠与日轮光环,持权杖斧的高阶统领机。',
  gen:    '橄榄与沙色涂装的制式步枪机,量产主力。',
  monkey: '赤金披挂与如意金箍棒,近战格斗见长。',
  falcon: '青蓝翼状肩炮与长炮,机动与感知极高的猎杀型。',
  luna:   '月轮光环与新月镰杖,偏重感知与机动的特装机。',
  cat:    '红金火焰与多臂法相,头头猫专属的特装机。',
  sky:    '蓝白羽翼与光枪,轻量化的高阶空战机。',
};
let view = 'iso', cur = null, SZ = {};
const IDS = SERIES.map(s => s.id);
const uOf = (v, sid, t) => `assets/pick/${t ? 't-' : ''}${v}-${sid}.webp`;
function fullSet(sid){ return { head: sid + '/head', torso: sid + '/torso', armL: sid + '/armL', armR: sid + '/armR', legL: sid + '/legL', legR: sid + '/legR' }; }

function renderList(){
  $('#bList').innerHTML = SERIES.map((s, i) => `<button class="pc ${QUAL[s.q].k}${cur === s.id ? ' on' : ''}" data-sid="${s.id}">
    <i class="pc-no">${String(i + 1).padStart(2, '0')}</i>
    <div class="pc-img"><img loading="lazy" alt="${s.cn}"></div>
    <h5>${s.cn}</h5><p><u class="qc ${QUAL[s.q].k}">${QUAL[s.q].n}</u><u class="tc">${ROMAN[s.t]}阶</u></p></button>`).join('');
  $('#bList').querySelectorAll('.pc').forEach(b => setSrc(b.querySelector('img'), uOf('side', b.dataset.sid, 1)));
}
function renderStage(){
  const host = $('#bFig'), key = cur + '|' + view;
  if (!cur || host.dataset.key === key) return;
  host.dataset.key = key;
  const img = document.createElement('img'); img.className = 'pimg'; img.alt = SBY[cur].cn; img.draggable = false;
  img.onload = () => {
    if (!img.isConnected) return;
    if (img.nextElementSibling) { img.remove(); return; }            // 已有更新的图,这张作废
    while (img.previousElementSibling) img.previousElementSibling.remove();  // 只清理更早的
    img.classList.add('in');
  };
  setSrc(img, uOf(view, cur)); host.appendChild(img);
  $('#bName').innerHTML = `<b>${SBY[cur].cn}</b><i>${view === 'side' ? '侧身 · SIDE' : '对角正交 · ISO'}</i>`;
  document.querySelectorAll('#bView button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
}
function bar(label, v, K, cls){
  const w = Math.round(v / (v + K) * 100);
  return `<div class="bar ${cls || ''}"><label>${label}</label><div class="bt"><i style="width:${w}%"></i></div><b>${Math.round(v)}</b></div>`;
}
function renderStats(){
  const el = $('#bStats');
  if (!cur){ el.innerHTML = '<p class="empty">从左侧选择一台机甲。</p>'; return; }
  const s = SBY[cur], r = calc();
  el.innerHTML = `
    <div class="s-who"><h3>${s.cn}</h3><p>${BLURB[cur] || ''}</p></div>
    <div class="s-top"><div class="s-tier tier-${r.T}"><small>综合阶位</small><b>${r.T ? ROMAN[r.T] : '—'}</b><em>${TIERN[r.T]}</em></div>
    <div class="s-kw"><small>实际出力</small><b>${r.kw ? fmtKW(r.kw) : '0 kW'}</b><em>基础 ${r.base ? fmtKW(r.base) : '—'}</em></div></div>
    <div class="s-form"><span>基础出力<b>${fmtKW(r.base)}</b></span>×<span>品质<b class="${QUAL[s.q].k}">${r.Q.toFixed(2)}</b></span>×<span>耦合率<b>${r.C.toFixed(1)}%</b></span>×<span>协同<b>${r.syn.toFixed(2)}</b></span>${r.res ? '×<span class="res">谐振<b>1.20</b></span>' : ''}</div>
    <div class="bars">
      ${bar('装甲 AP', r.ar, 260, 'b-ar')}${bar('机动', r.mo, 220, 'b-mo')}${bar('火力', r.at, 200, 'b-at')}${bar('感知', r.se, 150, 'b-se')}
      <div class="bar b-cp"><label>耦合率</label><div class="bt"><i style="width:${r.C}%"></i></div><b>${r.C.toFixed(1)}%</b></div>
    </div>
    <dl class="s-meta"><div><dt>整机耐久</dt><dd>${r.hpTotal}</dd></div><div><dt>整备重量</dt><dd>${r.wt.toFixed(1)} kg</dd></div><div><dt>摩托极速</dt><dd>${r.speed ? Math.round(r.speed) + ' km/h' : '—'}</dd></div><div><dt>品质</dt><dd class="${QUAL[s.q].k}">${QUAL[s.q].n}</dd></div></dl>`;
}
function pick(sid, quiet){
  if (!SBY[sid]) return;
  cur = sid; eq = fullSet(sid);
  if (!$('#bList .pc')) renderList();
  document.querySelectorAll('#bList .pc').forEach(b => b.classList.toggle('on', b.dataset.sid === cur));
  renderStage(); renderStats();
  lsSet('orion.pick', sid);
  const on = $('#bList .pc.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (!quiet) sfx(640);
}
function step(d){ const i = IDS.indexOf(cur); pick(IDS[(i + d + IDS.length) % IDS.length]); }
function setView(v){ view = v; renderStage(); sfx(520); }
function savePng(){
  const img = $('#bFig img.pimg.in'); if (!img || !cur) return;
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1400; const c = cv.getContext('2d');
  const g = c.createRadialGradient(500, 700, 100, 500, 700, 900); g.addColorStop(0, '#12304a'); g.addColorStop(1, '#050c16'); c.fillStyle = g; c.fillRect(0, 0, 1000, 1400);
  const u = uOf(view, cur);
  const load = src => new Promise(res => { const m = new Image(); m.crossOrigin = 'anonymous'; m.onload = () => res(m); m.onerror = () => res(null); m.src = src; });
  load(cdn(u)).then(m => m || load(u)).then(m => {
    if (!m) return;
    const k = Math.min(940 / m.naturalWidth, 1240 / m.naturalHeight), w = m.naturalWidth * k, h = m.naturalHeight * k;
    c.drawImage(m, (1000 - w) / 2, 70 + (1240 - h) / 2, w, h);
    c.fillStyle = 'rgba(95,243,255,.8)'; c.font = '600 30px sans-serif'; c.fillText(SBY[cur].cn, 28, 1350);
    c.fillStyle = 'rgba(95,243,255,.5)'; c.font = '18px sans-serif'; c.fillText('ORION · 选择机甲 · ' + (view === 'side' ? '侧身' : '对角正交'), 28, 1378);
    cv.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = SBY[cur].cn + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); sfx(800); }, 'image/png');
  });
}
function confirmMech(){
  if (!cur) return;
  const m = { sid: cur, cn: SBY[cur].cn, view, src: uOf(view, cur) };
  lsSet('orion.mech', JSON.stringify(m));
  const b = $('#bConfirm'); if (b){ b.classList.add('ok'); b.textContent = '已选定 ✓ ' + m.cn; clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('ok'); b.textContent = '选择此机甲'; }, 2200); }
  sfx(900);
  document.dispatchEvent(new CustomEvent('orion:mech', { detail: m }));
}
function sfx(f){ try { window.OrionAudio && window.OrionAudio.blip(f, .09, 'triangle', .04, 200); } catch (e) {} }

/* ---------- 初始化 ---------- */
let inited = false;
function init(){
  if (inited) return; inited = true;
  MAN = Object.fromEntries(IDS.map(k => [k, { head: 1, torso: 1, armL: 1, armR: 1, legL: 1, legR: 1 }]));
  buildLibrary();
  $('#bList').addEventListener('click', e => { const b = e.target.closest('.pc'); if (b) pick(b.dataset.sid); });
  $('#bView').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
  $('#bPrev').addEventListener('click', () => step(-1));
  $('#bNext').addEventListener('click', () => step(1));
  $('#bRand').addEventListener('click', () => { let n; do { n = IDS[Math.floor(Math.random() * IDS.length)]; } while (n === cur && IDS.length > 1); pick(n); });
  $('#bSave').addEventListener('click', savePng);
  $('#bConfirm').addEventListener('click', confirmMech);
  document.addEventListener('keydown', e => { if (!document.body.classList.contains('stage-build')) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') setView(view === 'side' ? 'iso' : 'side'); });
}
function open(){
  init();
  const s = lsGet('orion.pick');
  view = 'iso';   // 进入页面默认对角正交视角
  const host = $('#bFig'); host.innerHTML = ''; host.dataset.key = '';
  pick(SBY[s] ? s : IDS[0], true);
}
window.OrionBuild = { open, _calc: calc, _eq: () => eq, _pick: pick, _view: setView };
})();

