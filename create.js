/* =====================================================
   create.js —— 创造角色(三页):身份 / 开局地点 / 天赋与机甲 + 创造答案
   依赖:places.js(ORION_REGIONS / ORION_PLACES)、talents.js(ORION_TSTAGES / ORION_TALENTS)
   ===================================================== */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'orion.create', MKEY = 'orion.mech';
/* 多条线路:三个 jsDelivr 镜像 + 本站,依次回退 */
const LINES = [
  'https://gcore.jsdelivr.net/gh/hykhxy/star-armor-orion@main/',
  'https://fastly.jsdelivr.net/gh/hykhxy/star-armor-orion@main/',
  'https://testingcf.jsdelivr.net/gh/hykhxy/star-armor-orion@main/',
  ''
];
const ABS = p => LINES[0] + p;
const NOTE_FILE = '(本地上传的图片,仅保存在本机浏览器,没有外链)';
const PORTS = [{ k: 'boy', n: '少男' }, { k: 'girl', n: '少女' }, { k: 'man', n: '青年' }, { k: 'lady', n: '美少女' }];
const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
const REG = window.ORION_REGIONS || [], PL = window.ORION_PLACES || [];
const TS = window.ORION_TSTAGES || [];
const TL = (window.ORION_TALENTS || []).map(r => ({ id: r[0], s: r[1], n: r[2], e: r[3], c: r[4] }));
const TBY = Object.fromEntries(TL.map(t => [t.id, t])), PBY = Object.fromEntries(PL.map(p => [p.id, p]));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sfx = f => { try { window.OrionAudio && window.OrionAudio.blip(f, .08, 'triangle', .04, 200); } catch (e) {} };

let S = { name: '', gender: '', look: '', pers: '', port: { kind: 'builtin', key: 'boy', url: '' }, place: '', talents: [], mech: null };
let page = 1, inited = false, tab = 1, rolling = false, tk = 0;

/* ---------- 图片:多线路回退 ---------- */
function tryLines(path, ok, fail){
  let i = 0;
  (function next(){
    if (i >= LINES.length){ fail && fail(); return; }
    const u = LINES[i++] + path, im = new Image(); let done = false;
    const t = setTimeout(() => { if (!done){ done = true; im.src = ''; next(); } }, 7000);
    im.onload = () => { if (done) return; done = true; clearTimeout(t); ok(u); };
    im.onerror = () => { if (done) return; done = true; clearTimeout(t); next(); };
    im.src = u;
  })();
}
function setImg(img, ref, onfail){
  if (!img) return;
  const my = img._tk = ++tk;
  img.classList.remove('in');
  if (!ref){ img.removeAttribute('src'); return; }
  const show = () => requestAnimationFrame(() => img.classList.add('in'));
  img.onload = show;
  if (/^assets\//.test(ref)) tryLines(ref, u => { if (img._tk === my) img.src = u; }, () => { onfail && onfail(); });
  else { img.onerror = () => { onfail && onfail(); }; img.src = ref; }
}
function setBg(el, path){ tryLines(path, u => { el.style.setProperty('--img', `url("${u}")`); }); }

/* ---------- 视差:鼠标位置 → --mx/--my(-1…1),平滑跟随;顺带更新坐标读数 ---------- */
let tx = 0, ty = 0, cx = 0, cy = 0, rafP = 0;
function startParallax(){
  const root = $('#create'), coord = $('#crCoord');
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  root.addEventListener('mousemove', e => {
    const w = innerWidth || 1, h = innerHeight || 1;
    tx = (e.clientX / w) * 2 - 1; ty = (e.clientY / h) * 2 - 1;
    if (coord) coord.textContent = `X ${(e.clientX / w * 360).toFixed(1).padStart(5, '0')} · Y ${(e.clientY / h * 180).toFixed(1).padStart(5, '0')}`;
  });
  root.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
  (function loop(){
    rafP = requestAnimationFrame(loop);
    if (!document.body.classList.contains('stage-create')) return;
    cx += (tx - cx) * .07; cy += (ty - cy) * .07;
    root.style.setProperty('--mx', cx.toFixed(4)); root.style.setProperty('--my', cy.toFixed(4));
  })();
}

/* ---------- 尘埃画布:远近三层光点缓慢漂移 ---------- */
function startDust(){
  const cv = $('#crDust'); if (!cv) return;
  const g = cv.getContext('2d'); let W = 0, H = 0, P = [];
  const DPR = Math.min(devicePixelRatio || 1, 2);
  function fit(){
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(W * H / 11000);
    P = Array.from({ length: n }, () => {
      const z = Math.random();
      return { x: Math.random() * W, y: Math.random() * H, z, r: .5 + z * 2.2, vx: (Math.random() - .3) * (.1 + z * .5), vy: -(.05 + Math.random() * .25) * (.4 + z), a: .15 + Math.random() * .5, hue: Math.random() < .5 ? 190 : (Math.random() < .5 ? 330 : 42), ph: Math.random() * 6.28 };
    });
  }
  fit(); addEventListener('resize', fit);
  let t0 = 0;
  (function loop(t){
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('stage-create')) return;
    g.clearRect(0, 0, W, H);
    for (const p of P){
      p.x += p.vx + cx * p.z * .5; p.y += p.vy;
      if (p.y < -6) p.y = H + 6; if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;
      const tw = .55 + .45 * Math.sin(t / 900 + p.ph);
      g.beginPath(); g.fillStyle = `hsla(${p.hue},95%,${p.hue === 42 ? 70 : 72}%,${p.a * tw})`;
      g.shadowColor = `hsla(${p.hue},100%,65%,.9)`; g.shadowBlur = p.r * 4;
      g.arc(p.x - cx * p.z * 14, p.y - cy * p.z * 9, p.r, 0, 6.2832); g.fill();
    }
    g.shadowBlur = 0;
  })(0);
}

/* ---------- 存取 ---------- */
function load(){
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) S = Object.assign(S, d); } catch (e) {}
  if (!Array.isArray(S.talents)) S.talents = [];
  S.talents = S.talents.filter(id => TBY[id]).slice(0, 3);
  if (!S.port || !S.port.kind) S.port = { kind: 'builtin', key: 'boy', url: '' };
}
function readForm(){
  S.name = $('#fName').value.trim(); S.look = $('#fLook').value.trim(); S.pers = $('#fPers').value.trim();
}
function save(msg){
  readForm();
  try { localStorage.setItem(KEY, JSON.stringify(S)); if (msg !== false) toast(typeof msg === 'string' ? msg : '已保存全部设定', false); sfx(880); return true; }
  catch (e) { toast('保存失败:图片太大,浏览器存储空间不足,请换小一点的图或使用外链', true); return false; }
}
let toastT;
function toast(t, warn){
  const el = $('#crToast'); el.textContent = t; el.classList.toggle('warn', !!warn); el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600);
}
function pickedMech(){ try { return JSON.parse(localStorage.getItem(MKEY) || 'null'); } catch (e) { return null; } }

/* ---------- 图片文件 → 压缩 dataURL ---------- */
function readImage(file, max, cb){
  if (!file) return;
  if (!/^image\//.test(file.type)){ toast('请选择图片文件', true); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      let d = c.toDataURL('image/webp', .86); if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/png');
      cb(d);
    };
    im.onerror = () => toast('这张图片读取失败', true);
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* ---------- 页面切换 ---------- */
function val(n){
  if (n >= 2 && !S.name){ toast('请先填写姓名', true); goPage(1, true); $('#fName').focus(); return false; }
  if (n >= 3 && !S.place){ toast('请先在地图上选定一个开局地点', true); goPage(2, true); return false; }
  return true;
}
function goPage(n, force){
  if (!force && n > page){ readForm(); for (let k = page + 1; k <= n; k++){ if (!val(k)) return; } }
  const prev = page; page = n;
  $$('.cr-page').forEach(p => { const pn = +p.dataset.p; p.classList.toggle('on', pn === n); p.classList.toggle('prevp', pn < n); });
  $$('.cr-bg').forEach(b => b.classList.toggle('on', +b.dataset.p === n));
  $$('#crSteps li').forEach(li => { const pn = +li.dataset.p; li.classList.toggle('on', pn === n); li.classList.toggle('done', pn < n); });
  if (n === 3){ syncPick(); renderMech(); renderSlots(); renderList(); }
  if (n === 2) renderSel();
  if (prev !== n) sfx(560);
  const pg = $(`.cr-page[data-p="${n}"]`); if (pg) pg.scrollTop = 0;
}

/* ---------- 第 1 页:立绘与表单 ---------- */
function portRef(){
  const p = S.port;
  if (p.kind === 'builtin') return { full: `assets/create/c-${p.key}.webp`, av: `assets/create/a-${p.key}.webp`, link: ABS(`assets/create/c-${p.key}.webp`), avlink: ABS(`assets/create/a-${p.key}.webp`), cover: false };
  if (p.kind === 'url') return { full: p.url, av: p.url, link: p.url, avlink: p.url, cover: true };
  return { full: p.url, av: p.url, link: NOTE_FILE, avlink: NOTE_FILE, cover: true };
}
function renderPort(){
  const r = portRef();
  setImg($('#pPrev'), r.full, () => toast('立绘加载失败,请检查外链', true));
  $$('#pOpts .port-opt').forEach(b => b.classList.toggle('on', S.port.kind === 'builtin' && b.dataset.k === S.port.key));
  $('#pUrl').value = S.port.kind === 'url' ? S.port.url : '';
}
function buildPortOpts(){
  $('#pOpts').innerHTML = PORTS.map(p => `<button type="button" class="port-opt" data-k="${p.k}" title="${p.n}"><img alt="${p.n}"><span>${p.n}</span></button>`).join('');
  $$('#pOpts .port-opt').forEach(b => setImg(b.querySelector('img'), `assets/create/t-${b.dataset.k}.webp`));
}
function fillForm(){
  $('#fName').value = S.name || ''; $('#fLook').value = S.look || ''; $('#fPers').value = S.pers || '';
  $$('#fGender button').forEach(b => b.classList.toggle('on', b.dataset.v === S.gender));
}

/* ---------- 第 2 页:地图 ---------- */
function buildMap(){
  $('#mapRegs').innerHTML = REG.map(r => `<span class="map-reg" data-r="${r.id}" style="left:${r.cx}%;top:${Math.max(4, r.cy - r.sy * 1.4)}%;--c:${r.col}">${esc(r.cn.split(' · ')[1].split('·')[0])}</span>`).join('');
  $('#mapPins').innerHTML = PL.map((p, i) => {
    const r = REG[p.r - 1];
    return `<button class="pin" data-id="${p.id}" data-r="${p.r}" style="left:${p.x}%;top:${p.y}%;--c:${r.col};--d:${(i % 10) * .26}s" aria-label="${esc(p.n)}"><span>${p.id.split('.')[1]}</span><span class="tip">${p.id} ${esc(p.n)}</span></button>`;
  }).join('');
  $('#regLegend').innerHTML = REG.map(r => `<button type="button" data-r="${r.id}" style="--c:${r.col}"><div>${esc(r.cn)}<small>${esc(r.sub)} · 10 处</small></div></button>`).join('');
}
function renderSel(){
  $$('#mapPins .pin').forEach(b => b.classList.toggle('sel', b.dataset.id === S.place));
  const p = PBY[S.place], el = $('#selPlace');
  if (!p){ el.innerHTML = '<em>尚未选择开局地点</em>'; return; }
  const r = REG[p.r - 1];
  el.innerHTML = `<b style="color:${r.col}">${esc(p.id)} ${esc(p.n)}</b><small>${esc(r.cn)}</small><br>控制方:${esc(p.ctl)}`;
}
function openPlace(id){
  const p = PBY[id]; if (!p) return;
  const r = REG[p.r - 1], box = $('#plModal');
  box.style.setProperty('--c', r.col);
  $('#plIn').innerHTML = `<p class="pl-reg">${esc(r.cn)} · ${esc(r.sub)}</p><h3 class="pl-h">${esc(p.n)}</h3><span class="pl-id">LOCATION ${esc(p.id)}</span>
    <p class="pl-imp">${esc(p.imp)}</p>
    <dl class="pl-dl"><div><dt>空间坐标 / 海拔</dt><dd>${esc(p.alt)}</dd></div><div><dt>实际控制方</dt><dd>${esc(p.ctl)}</dd></div><div><dt>核心流通物资</dt><dd>${esc(p.goods)}</dd></div><div><dt>区域铁律与武装限制</dt><dd>${esc(p.rule)}</dd></div></dl>
    <div class="pl-acts"><button class="cr-btn" data-act="close">关闭</button><button class="cr-btn go" data-act="pick" data-id="${esc(p.id)}">${S.place === p.id ? '✓ 已是开局地点' : '选为开局地点'}</button></div>`;
  openModal(box); sfx(700);
}
function openModal(m){ m.classList.add('on'); m.setAttribute('aria-hidden', 'false'); }
function closeModals(){ let any = false; $$('.cr-modal.on').forEach(m => { m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); any = true; }); return any; }

/* ---------- 第 3 页:机甲 ---------- */
function syncPick(){
  const pm = pickedMech();
  if (pm && pm.src && (!S.mech || S.mech.kind === 'pick')) S.mech = { kind: 'pick', src: pm.src, cn: pm.cn, sid: pm.sid, view: pm.view };
}
function renderMech(){
  const m = S.mech, img = $('#mPrev');
  $('#mEmpty').style.display = m ? 'none' : '';
  if (!m){ setImg(img, ''); $('#mName').innerHTML = ''; return; }
  setImg(img, m.src, () => toast('机甲图片加载失败,请检查外链', true));
  const tag = m.kind === 'pick' ? `<i>来自「选择机甲」· ${m.view === 'side' ? '侧身' : '对角正交'}</i>` : `<i>${m.kind === 'url' ? '外链图片' : '本地上传'}</i>`;
  $('#mName').innerHTML = `${esc(m.cn || '自定义机甲')}${tag}`;
  $('#mUrl').value = m.kind === 'url' ? m.src : '';
}
function mechRef(){
  const m = S.mech; if (!m) return { link: '' };
  if (m.kind === 'pick') return { src: m.src, link: ABS(m.src) };
  if (m.kind === 'url') return { src: m.src, link: m.src };
  return { src: m.src, link: NOTE_FILE };
}

/* ---------- 天赋 ---------- */
const stOf = n => TS[n - 1] || { cn: '', col: '#fff', tier: '' };
function costHtml(t){ return t.c ? `<div class="co">代价:${esc(t.c)}</div>` : '<div class="co free">无代价</div>'; }
function renderTabs(){
  $('#talTabs').innerHTML = TS.map(s => {
    const n = TL.filter(t => t.s === s.n).length;
    return `<button type="button" data-s="${s.n}" class="${tab === s.n ? 'on' : ''}" style="--c:${s.col}">${s.tier} ${esc(s.cn)}${s.cost ? '' : ' · 无代价'}<small>${n}</small></button>`;
  }).join('');
}
function renderList(){
  renderTabs();
  const s = stOf(tab);
  $('#talList').innerHTML = TL.filter(t => t.s === tab).map(t => {
    const on = S.talents.includes(t.id);
    return `<button type="button" class="tcard${on ? ' on' : ''}${!on && S.talents.length >= 3 ? ' dis' : ''}" data-id="${t.id}" style="--c:${s.col}"><b>${esc(t.n)}</b><div class="ef">${esc(t.e)}</div>${costHtml(t)}</button>`;
  }).join('');
  $('#talCnt').textContent = `${S.talents.length} / 3`;
  $('#talRand').textContent = S.talents.length >= 3 ? '重新抽取' : '随机抽取';
}
function slotHtml(id){
  const t = TBY[id], s = stOf(t.s);
  return `<div class="slot full" style="--c:${s.col}"><button type="button" class="x" data-id="${id}" aria-label="移除">×</button><span class="st">${s.tier} ${esc(s.cn)}</span><b>${esc(t.n)}</b><div class="ef">${esc(t.e)}</div>${costHtml(t)}</div>`;
}
function renderSlots(){
  let h = '';
  for (let i = 0; i < 3; i++) h += S.talents[i] ? slotHtml(S.talents[i]) : `<div class="slot blank">天赋 ${i + 1}</div>`;
  $('#talSlots').innerHTML = h;
  $('#talCnt').textContent = `${S.talents.length} / 3`;
  $('#talRand').textContent = S.talents.length >= 3 ? '重新抽取' : '随机抽取';
}
function toggleTal(id){
  const i = S.talents.indexOf(id);
  if (i >= 0) S.talents.splice(i, 1);
  else if (S.talents.length >= 3){ toast('最多只能选三个天赋,先点 × 移除一个', true); return; }
  else S.talents.push(id);
  sfx(i >= 0 ? 420 : 760); renderSlots(); renderList();
}
const W = [55, 25, 12, 6, 2];
function drawOne(excl){
  let r = Math.random() * W.reduce((a, b) => a + b, 0), st = 1;
  for (let i = 0; i < 5; i++){ if (r < W[i]){ st = i + 1; break; } r -= W[i]; }
  const pool = TL.filter(t => t.s === st && !excl.includes(t.id));
  return pool[Math.floor(Math.random() * pool.length)];
}
function randomDraw(){
  if (rolling) return;
  if (S.talents.length >= 3) S.talents = [];
  const need = 3 - S.talents.length, picked = S.talents.slice(), result = [];
  for (let i = 0; i < need; i++){ const t = drawOne(picked.concat(result.map(x => x.id))); result.push(t); }
  rolling = true; renderSlots(); renderList();
  const slots = $$('#talSlots .slot.blank');
  slots.forEach(s => { s.classList.remove('blank'); s.classList.add('roll'); });
  let n = 0; const tm = setInterval(() => {
    slots.forEach(s => { const t = TL[Math.floor(Math.random() * TL.length)]; s.textContent = t.n; });
    if (++n % 3 === 0) sfx(500 + n * 12);
    if (n >= 9){
      clearInterval(tm); rolling = false;
      S.talents = picked.concat(result.map(t => t.id));
      renderSlots(); renderList(); sfx(980);
      const top = Math.max(...result.map(t => t.s));
      toast(top >= 4 ? `抽到了 ${ROMAN[top]} 阶天赋!` : '抽取完成', false);
    }
  }, 110);
}

/* ---------- 创造答案 ---------- */
function textAll(){
  const p = PBY[S.place], r = portRef(), m = mechRef();
  const tl = S.talents.map(id => { const t = TBY[id], s = stOf(t.s); return `  · [${s.tier} ${s.cn}] ${t.n}:${t.e}${t.c ? '  代价:' + t.c : '  (无代价)'}`; }).join('\n') || '  (未选择)';
  return ['【创造答案 · ORION】', `姓名:${S.name || '—'}`, `性别:${S.gender || '—'}`, `身材样貌:${S.look || '—'}`, `性格:${S.pers || '—'}`,
    `开局地点:${p ? p.id + ' ' + p.n + '(' + REG[p.r - 1].cn + ';控制方:' + p.ctl + ')' : '—'}`, '天赋:\n' + tl,
    `机甲:${S.mech ? (S.mech.cn || '自定义机甲') : '—'}`, `头像立绘外链:${r.avlink}`, `主角立绘外链:${r.link}`, `机甲立绘外链:${m.link || '—'}`].join('\n');
}
function copy(t){
  const done = () => toast('已复制到剪贴板', false);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done));
  else fallbackCopy(t, done);
}
function fallbackCopy(t, done){ const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败,请手动选择文字', true); } a.remove(); }
function openAnswer(){
  readForm(); save(false);
  const p = PBY[S.place], r = portRef(), m = mechRef(), reg = p ? REG[p.r - 1] : null;
  const val = v => v ? esc(v) : '<em>未设定</em>';
  const imgBox = (cap, ref, link, av) => `<div class="ans-im"><div class="box">${ref ? `<img data-ref="${esc(ref)}" class="${av ? 'av' : ''}" alt="${cap}">` : '<i>未设定</i>'}</div><b>${cap}</b><textarea class="lk" readonly>${esc(link || '')}</textarea><button type="button" class="cp" data-t="${esc(link || '')}">复制外链</button></div>`;
  $('#ansIn').innerHTML = `<p class="ans-h">CREATION RESULT</p><h3 class="ans-t">创造答案</h3>
  <div class="ans-g">
    <div class="ans-imgs">${imgBox('头像立绘', r.av, r.avlink, true)}${imgBox('主角立绘', r.full, r.link)}${imgBox('机甲立绘', m.src, m.link)}</div>
    <div class="ans-tx"><dl>
      <div><dt>姓名</dt><dd>${val(S.name)}</dd></div>
      <div><dt>性别</dt><dd>${val(S.gender)}</dd></div>
      <div><dt>身材样貌</dt><dd>${val(S.look)}</dd></div>
      <div><dt>性格</dt><dd>${val(S.pers)}</dd></div>
      <div><dt>开局地点</dt><dd>${p ? `${esc(p.id)} ${esc(p.n)}<br><small style="opacity:.7">${esc(reg.cn)} · 控制方:${esc(p.ctl)}</small>` : '<em>未设定</em>'}</dd></div>
      <div><dt>机甲</dt><dd>${S.mech ? esc(S.mech.cn || '自定义机甲') : '<em>未设定</em>'}</dd></div>
      <div><dt>天赋(${S.talents.length}/3)</dt><dd><div class="ans-tal">${S.talents.length ? S.talents.map(id => { const t = TBY[id], s = stOf(t.s); return `<div style="--c:${s.col}"><b>${esc(t.n)}</b><small>${s.tier} ${esc(s.cn)}</small><br>${esc(t.e)}${t.c ? `<div class="co">代价:${esc(t.c)}</div>` : '<div class="co free">无代价</div>'}</div>`; }).join('') : '<em>未选择天赋</em>'}</div></dd></div>
    </dl></div>
  </div>
  <div class="ans-acts"><button class="cr-btn" data-act="copyall">复制全部设定</button><button class="cr-btn" data-act="json">下载设定 .json</button><button class="cr-btn" data-act="close">关闭</button><button class="cr-btn go" data-act="saveclose">保存并关闭</button></div>`;
  $$('#ansIn img[data-ref]').forEach(im => setImg(im, im.dataset.ref));
  openModal($('#ansModal')); sfx(900);
}
function downloadJson(){
  const p = PBY[S.place], r = portRef(), m = mechRef();
  const o = { name: S.name, gender: S.gender, look: S.look, personality: S.pers, start: p ? { id: p.id, name: p.n, region: REG[p.r - 1].cn, controller: p.ctl } : null,
    talents: S.talents.map(id => { const t = TBY[id]; return { id, stage: t.s, name: t.n, effect: t.e, cost: t.c || null }; }),
    mech: S.mech ? { name: S.mech.cn || null, kind: S.mech.kind } : null, links: { avatar: r.avlink, portrait: r.link, mech: m.link || null } };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }));
  a.download = (S.name || '角色') + '-设定.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ---------- 初始化 ---------- */
function init(){
  if (inited) return; inited = true;
  load();
  // 背景 / 地图 / 画框(多线路)
  [1, 2, 3].forEach(n => setBg($(`.cr-bg[data-p="${n}"]`), `assets/create/bg-${n}.webp`));
  setBg($('#mapImg'), 'assets/create/map.webp');
  tryLines('assets/create/frame.webp', u => $('#create').style.setProperty('--frame', `url("${u}")`));
  buildPortOpts(); buildMap(); fillForm();
  startParallax(); startDust();
  $$('.cm-box').forEach(b => b.insertAdjacentHTML('afterbegin', '<button type="button" class="cm-x" data-act="close" aria-label="关闭">×</button>'));

  // 第 1 页
  $('#pOpts').addEventListener('click', e => { const b = e.target.closest('.port-opt'); if (!b) return; S.port = { kind: 'builtin', key: b.dataset.k, url: '' }; renderPort(); sfx(640); });
  $('#pFile').addEventListener('change', e => readImage(e.target.files[0], 1100, d => { S.port = { kind: 'file', key: '', url: d }; renderPort(); toast('已使用本地图片,别忘了点保存'); e.target.value = ''; }));
  $('#pUrlGo').addEventListener('click', () => { const u = $('#pUrl').value.trim(); if (!/^https?:\/\//i.test(u)){ toast('请输入以 http:// 或 https:// 开头的图片外链', true); return; } S.port = { kind: 'url', key: '', url: u }; renderPort(); });
  $('#pUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pUrlGo').click(); });
  $('#pSave').addEventListener('click', () => save());
  $('#fGender').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.gender = S.gender === b.dataset.v ? '' : b.dataset.v; $$('#fGender button').forEach(x => x.classList.toggle('on', x.dataset.v === S.gender)); sfx(600); });
  $('#n1').addEventListener('click', () => { readForm(); if (!S.name){ toast('请先填写姓名', true); $('#fName').focus(); return; } save(false); goPage(2, true); });
  // 第 2 页
  $('#mapPins').addEventListener('click', e => { const b = e.target.closest('.pin'); if (b) openPlace(b.dataset.id); });
  $('#regLegend').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const id = b.dataset.r, box = $('#mapBox'), on = box.dataset.reg === id;
    if (on) delete box.dataset.reg; else box.dataset.reg = id;
    $$('#regLegend button').forEach(x => x.classList.toggle('on', !on && x.dataset.r === id));
    $$('#mapPins .pin,#mapRegs .map-reg').forEach(x => x.classList.toggle('r-on', !on && x.dataset.r === id));
    sfx(520);
  });
  $('#b2').addEventListener('click', () => goPage(1, true));
  $('#n2').addEventListener('click', () => { if (!S.place){ toast('请先在地图上选定一个开局地点', true); return; } save(false); goPage(3, true); });
  // 弹窗
  document.addEventListener('click', e => {
    if (!$('#create').contains(e.target)) return;
    const a = e.target.closest('[data-act]');
    if (a){
      const act = a.dataset.act;
      if (act === 'close') closeModals();
      else if (act === 'pick'){ S.place = a.dataset.id; renderSel(); closeModals(); save(false); toast('已选定开局地点:' + PBY[S.place].n); sfx(900); }
      else if (act === 'copyall') copy(textAll());
      else if (act === 'json') downloadJson();
      else if (act === 'saveclose'){ save(); closeModals(); }
      return;
    }
    const cp = e.target.closest('.cp'); if (cp){ if (cp.dataset.t) copy(cp.dataset.t); return; }
    if (e.target.classList && e.target.classList.contains('cr-modal')) closeModals();
  });
  // 第 3 页
  $('#talTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = +b.dataset.s; renderList(); sfx(520); });
  $('#talList').addEventListener('click', e => { const b = e.target.closest('.tcard'); if (b) toggleTal(+b.dataset.id); });
  $('#talSlots').addEventListener('click', e => { const b = e.target.closest('.x'); if (b) toggleTal(+b.dataset.id); });
  $('#talRand').addEventListener('click', randomDraw);
  $('#talClear').addEventListener('click', () => { if (rolling) return; S.talents = []; renderSlots(); renderList(); sfx(420); });
  $('#mGoPick').addEventListener('click', () => { readForm(); save(false); if (window.OrionNav) window.OrionNav.toBuild(true); });
  $('#mUsePick').addEventListener('click', () => { const pm = pickedMech(); if (!pm){ toast('还没有在「选择机甲」里选定机甲,点左边的按钮前往', true); return; } S.mech = { kind: 'pick', src: pm.src, cn: pm.cn, sid: pm.sid, view: pm.view }; renderMech(); toast('已使用「选择机甲」里选定的机甲'); });
  $('#mUrlGo').addEventListener('click', () => { const u = $('#mUrl').value.trim(); if (!/^https?:\/\//i.test(u)){ toast('请输入以 http:// 或 https:// 开头的图片外链', true); return; } S.mech = { kind: 'url', src: u, cn: '自定义机甲' }; renderMech(); });
  $('#mUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('#mUrlGo').click(); });
  $('#mFile').addEventListener('change', e => readImage(e.target.files[0], 1300, d => { S.mech = { kind: 'file', src: d, cn: '自定义机甲' }; renderMech(); toast('已使用本地图片,别忘了点保存'); e.target.value = ''; }));
  $('#b3').addEventListener('click', () => goPage(2, true));
  $('#s3').addEventListener('click', () => save());
  $('#ans').addEventListener('click', openAnswer);
  // 顶栏
  $('#crSave').addEventListener('click', () => save());
  $('#crSteps').addEventListener('click', e => { const li = e.target.closest('li'); if (li && +li.dataset.p !== page) goPage(+li.dataset.p); });
  document.addEventListener('orion:mech', e => {
    const m = e.detail; if (!m) return;
    S.mech = { kind: 'pick', src: m.src, cn: m.cn, sid: m.sid, view: m.view };
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (err) {}
  });
}
function open(p){
  init(); load(); fillForm(); renderPort(); renderSel(); syncPick(); renderSlots(); renderList(); renderMech();
  closeModals();
  const n = p || 1; page = 0; goPage(n, true);
}
window.OrionCreate = { open, escape: () => closeModals(), _state: () => S };
})();
