(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, parent, text) {
 const node = document.createElement(tag);
 for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
 if (text != null) node.textContent = text;
 if (parent) parent.appendChild(node);
 return node;
}
function sv(tag, attrs = {}, parent, text) {
 const node = document.createElementNS(SVGNS, tag);
 for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
 if (text != null) node.textContent = text;
 if (parent) parent.appendChild(node);
 return node;
}
function scrollToEl(node) {
 node.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
}

// Keyboard users get tooltips on focus; pointer users get them on hover.
let keyboardMode = false;
if (document.addEventListener) {
 document.addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyboardMode = true; });
 document.addEventListener('pointerdown', () => { keyboardMode = false; });
}

/* ------------------------------------------------------------------ tasks */

// Descriptions and operation plans follow the paper (Appendix A.2, Table 5). Recording lengths
// come from the media inventory of the real-world clips (original timeline).
const tasks = [
 {id: 'task2', letter: 'A', name: 'Cross Transfer', level: 'Easy', ops: {2: [2, 2], 3: [3, 3]}, seconds: {2: 83.0, 3: 107.5},
  plan: 'Per source layer: grasp → place',
  description: 'Each source layer holds one target block, with adjacent layers rotated by about 90°. The robot transfers blocks one by one and rebuilds the layer order and cross orientation on the destination base.'},
 {id: 'task1', letter: 'B', name: 'Two-Block Transfer', level: 'Easy', ops: {2: [4, 4], 3: [6, 6]}, seconds: {2: 113.7, 3: 160.8},
  plan: 'Per block: grasp → place; two blocks per layer',
  description: 'Each layer holds two side blocks in alternating orientation. The robot must preserve within-layer spacing and layer-to-layer orientation while rebuilding the tower; an early placement error changes the support for every later block.'},
 {id: 'task6', letter: 'C', name: 'Extract and Stack', level: 'Medium', ops: {2: [1, 1], 3: [2, 2]}, seconds: {2: 34.6, 3: 64.4},
  plan: 'Per target: grasp → extract → place',
  description: 'A protruding center block exposes a limited grasping surface. The robot grasps its end, extracts it horizontally without destabilizing neighboring supports, and places it at the prescribed pose on top of the tower.'},
 {id: 'task5', letter: 'D', name: 'Lateral Insertion', level: 'Medium', ops: {2: [1, 1], 3: [2, 2]}, seconds: {2: 43.4, 3: 109.0},
  plan: 'Per block: grasp → insert',
  description: 'The robot grasps an additional block, aligns it with the narrow gap between two side blocks, inserts it, and pushes it to the required depth. Small angular errors can jam the block or disturb the surrounding structure.'},
 {id: 'task4', letter: 'E', name: 'Layerwise Pushdown', level: 'Hard', ops: {2: [3, 3], 3: [6, 3]}, seconds: {2: 78.2, 3: 111.2},
  plan: 'Each prescribed push is one step, layer by layer',
  description: 'Starting at the top of a full tower, the robot pushes designated blocks in a prescribed arm-specific order before moving to the next layer. Each contact changes the structure presented to later actions.'},
 {id: 'task7', letter: 'F', name: 'Tool-Assisted Extraction', level: 'Hard', ops: {2: [5, 3], 3: [10, 6]}, seconds: {2: 126.2, 3: 204.8},
  plan: 'Per cycle: grasp tool → two pushes → place tool → two × (grasp → extract → place)',
  description: 'One arm grasps a dedicated red tool, pushes two designated side blocks into graspable configurations, and returns the tool. The other arm then extracts the exposed blocks and places them in the destination region.'}
];
const taskByLetter = Object.fromEntries(tasks.map(t => [t.letter, t]));
let task = 0, layer = 3, mediaMode = 'cinematic';
const cinematicSeconds = [15.2,15.733,14.5,14.6,15.767,16.467];
const player = document.getElementById('task-video');
const fmtTime = s => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
const setText = (id, text) => { const n = document.getElementById(id); if (n) n.textContent = text; };

function updateTask() {
 const t = tasks[task], key = `${t.id}-${layer}`, [g, p] = t.ops[layer];
 player.pause();
 const cinematic = mediaMode === 'cinematic';
 const mediaKey = cinematic ? `cinematic-${t.letter}` : key;
 player.src = cinematic ? `assets/${mediaKey}-no-footer.mp4` : `assets/${mediaKey}.mp4`;
 player.poster = `assets/${mediaKey}.jpg`;
 player.classList.toggle('cinematic', cinematic);
 setText('task-media-caption', cinematic ? 'Simulation · 3 layers · scripted demonstration · edited recorded-state replay; speed labeled in each shot.' : 'Real-world recording · four synchronized camera views · original speed. Independent from the simulation demo.');
 document.querySelectorAll('[data-media]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.media === mediaMode)));
 document.querySelectorAll('[data-layer]').forEach(b => { b.disabled = cinematic && b.dataset.layer === '2'; });
 player.setAttribute('aria-label', `${t.name}, ${layer} layers, ${cinematic ? 'cinematic simulation' : 'real-world four camera views'}`);
 player.load();
 setText('task-title', t.name);
 setText('task-description', t.description);
 setText('task-letter', t.letter);
 setText('task-level', `Task ${t.letter} · ${t.level}`);
 setText('task-ops', `${g + p} (${g} G + ${p} P)`);
 setText('task-plan', t.plan);
 setText('task-duration', fmtTime(cinematic ? cinematicSeconds[task] : t.seconds[layer]));
 const compare = document.getElementById('task-compare');
 if (compare && compare.firstChild) compare.firstChild.textContent = `Compare policies on Task ${t.letter}, ${layer} layers `;
 document.querySelectorAll('[data-task]').forEach(b => {
  const i = Number(b.dataset.task);
  b.setAttribute('aria-pressed', String(i === task));
  const img = b.querySelector && b.querySelector('img');
  if (img) img.src = cinematic ? `assets/cinematic-${tasks[i].letter}.jpg` : `assets/${tasks[i].id}-${layer}.jpg`;
 });
 document.querySelectorAll('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.layer) === layer)));
}
document.querySelectorAll('[data-task]').forEach(b => b.addEventListener('click', () => { task = Number(b.dataset.task); updateTask(); }));
document.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => { layer = Number(b.dataset.layer); updateTask(); }));

document.querySelectorAll('[data-media]').forEach(b => b.addEventListener('click', () => {
 mediaMode = b.dataset.media;
 if (mediaMode === 'cinematic') layer = 3;
 updateTask();
}));
updateTask();

/* ------------------------------------------------------------------ citation */

const copyButton = document.getElementById('copy-citation');
if (copyButton) copyButton.addEventListener('click', async () => {
 const status = document.getElementById('copy-status');
 const citation = document.getElementById('citation-text') || document.getElementById('citation');
 try { await navigator.clipboard.writeText(citation.textContent); status.textContent = 'Citation copied.'; }
 catch {
  const range = document.createRange(); range.selectNodeContents(citation);
  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  status.textContent = 'Citation selected. Use your browser’s Copy command.';
 }
});

/* ------------------------------------------------------------------ results data */

const DATA = typeof window !== 'undefined' ? window.TOWER_RESULTS : undefined;
const explorerEl = document.getElementById('explorer-chart');
const scatterEl = document.getElementById('scatter-chart');
if (!DATA || !explorerEl || !scatterEl || !document.createElementNS) return;

// Colours and marker shapes follow the paper's Figure 4; order follows Appendix Tables 17-20.
const POLICIES = [
 {id: 'pi05', name: 'π0.5', base: 'π', sub: '0.5', color: '#36C2F2', shape: 'circle'},
 {id: 'starvla', name: 'StarVLA-α', color: '#6D3DEB', shape: 'triangle'},
 {id: 'openwam', name: 'OpenWAM', color: '#16252E', shape: 'diamond'},
 {id: 'fastwam', name: 'Fast-WAM', color: '#FF5A67', shape: 'square'}
];
const policyById = Object.fromEntries(POLICIES.map(p => [p.id, p]));
const METRICS = {
 LHPR: {long: 'Long-horizon progress rate', unit: '%', max: 100, step: 25, better: 'higher', digits: 1},
 TSR: {long: 'Task success rate', unit: '%', max: 100, step: 25, better: 'higher', digits: 1},
 ODR: {long: 'Operation disturbance rate', unit: 'per counted step', max: 5, step: 1, better: 'lower', digits: 2},
 GSR: {long: 'G-operation success rate', unit: '%', max: 100, step: 25, better: 'higher', digits: 1},
 PSR: {long: 'P-operation success rate', unit: '%', max: 100, step: 25, better: 'higher', digits: 1}
};
const METRIC_ORDER = ['TSR', 'GSR', 'PSR', 'LHPR', 'ODR'];
const LETTERS = 'ABCDEF'.split('');
const index = new Map();
for (const row of DATA.rows) {
 const r = Object.fromEntries(DATA.fields.map((f, i) => [f, row[i]]));
 index.set(`${r.policy}|${r.task}|${r.layers}|${r.domain}`, r);
}
const get = (policy, letter, layers, domain) => index.get(`${policy}|${letter}|${layers}|${domain}`);
const fmt = (metric, v) => v.toFixed(METRICS[metric].digits);

function policyName(p, parent) {
 parent.appendChild(document.createTextNode(p.base || p.name));
 if (p.sub) el('sub', {}, parent, p.sub);
 return parent;
}
function policyNameSvg(p, textNode) {
 sv('tspan', {}, textNode, p.base || p.name);
 if (p.sub) sv('tspan', {dy: '3', 'font-size': '9.5'}, textNode, p.sub);
}
function shapeAt(parent, shape, x, y, size, attrs) {
 const s = size;
 if (shape === 'circle') return sv('circle', {cx: x, cy: y, r: s * 0.52, ...attrs}, parent);
 if (shape === 'square') return sv('rect', {x: x - s * 0.46, y: y - s * 0.46, width: s * 0.92, height: s * 0.92, ...attrs}, parent);
 if (shape === 'triangle') return sv('path', {d: `M${x} ${y - s * 0.62}L${x + s * 0.6} ${y + s * 0.42}L${x - s * 0.6} ${y + s * 0.42}Z`, ...attrs}, parent);
 return sv('path', {d: `M${x} ${y - s * 0.66}L${x + s * 0.62} ${y}L${x} ${y + s * 0.66}L${x - s * 0.62} ${y}Z`, ...attrs}, parent);
}
function glyphSvg(parent, kind, color, label) {
 const g = sv('svg', {viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false'}, parent);
 if (kind === 'dot') sv('circle', {cx: 7, cy: 7, r: 4.6, fill: color}, g);
 else if (kind === 'hollow') sv('rect', {x: 2, y: 2, width: 10, height: 10, fill: 'none', stroke: color, 'stroke-width': 2.2}, g);
 else shapeAt(g, kind, 7, 7, 11, {fill: color});
 if (label) parent.appendChild(document.createTextNode(label));
 return g;
}
function tooltipFor(container) {
 let tip = container.querySelector('.tooltip');
 if (!tip) { tip = el('div', {class: 'tooltip', role: 'presentation'}, container); tip.hidden = true; }
 return tip;
}
function placeTooltip(container, tip, x, y) {
 tip.hidden = false;
 const cw = container.clientWidth, tw = tip.offsetWidth || 260, th = tip.offsetHeight || 160;
 let left = x + 16; if (left + tw > cw) left = Math.max(0, x - tw - 16);
 let top = y + 14; const ch = container.clientHeight; if (top + th > ch && y - th - 14 > 0) top = y - th - 14;
 tip.style.left = `${left}px`; tip.style.top = `${top}px`;
}
function keyLine(parent, color) { el('i', {class: 'tt-key', style: `background:${color}`, 'aria-hidden': 'true'}, parent); }
function setPressed(selector, attr, value) {
 $$(selector).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(value))));
}
function observeWidth(node, fn) {
 let last = 0, raf = 0;
 const run = () => { raf = 0; const w = node.clientWidth; if (w && Math.abs(w - last) > 1) { last = w; fn(); } };
 if ('ResizeObserver' in window) new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(run); }).observe(node);
 else window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(run); });
}

/* ------------------------------------------------------------------ results explorer */

const SERIES = {
 domain: [{label: 'SIM', color: '#2765C5', kind: 'dot'}, {label: 'REAL', color: '#986B15', kind: 'hollow'}],
 height: [{label: '2 layers', color: '#2EC0E8', kind: 'dot'}, {label: '3 layers', color: '#6939EF', kind: 'hollow'}]
};
const ex = {metric: 'LHPR', mode: 'domain', layer: 3, domain: 'real', focusTask: null, active: null, rows: []};

function explorerRows() {
 const rows = [];
 for (const letter of LETTERS) for (const p of POLICIES) {
  const a = ex.mode === 'domain' ? get(p.id, letter, ex.layer, 'sim') : get(p.id, letter, 2, ex.domain);
  const b = ex.mode === 'domain' ? get(p.id, letter, ex.layer, 'real') : get(p.id, letter, 3, ex.domain);
  rows.push({letter, policy: p, a, b});
 }
 return rows;
}
function sourceNote() {
 return ex.mode === 'domain' ? `Appendix Table ${ex.layer === 2 ? 17 : 18}` : 'Appendix Tables 17–18';
}
function explorerSummary() {
 const m = METRICS[ex.metric], [A, B] = SERIES[ex.mode];
 const scope = ex.mode === 'domain' ? `${ex.layer} layers` : ex.domain.toUpperCase();
 return `${m.long} (${ex.metric}${m.unit === '%' ? ', %' : ''}; ${m.better} is better) · ${scope} · ${A.label} (dot) vs ${B.label} (square) for four policies on six tasks. Source: ${sourceNote()}.`;
}
function renderLegend() {
 const legend = document.getElementById('explorer-legend');
 legend.textContent = '';
 for (const s of SERIES[ex.mode]) glyphSvg(el('span', {}, legend), s.kind, s.color, s.label);
 const span = el('span', {}, legend);
 const g = sv('svg', {viewBox: '0 0 14 14', 'aria-hidden': 'true'}, span);
 sv('line', {x1: 1, y1: 7, x2: 13, y2: 7, stroke: '#C3CBD4', 'stroke-width': 2.4, 'stroke-linecap': 'round'}, g);
 span.appendChild(document.createTextNode(ex.mode === 'domain' ? 'gap between domains' : 'change with height'));
}

function renderExplorer() {
 ex.rows = explorerRows();
 const m = METRICS[ex.metric], [A, B] = SERIES[ex.mode];
 const W = Math.max(300, explorerEl.clientWidth || 900);
 const compact = W < 620;
 const taskW = compact ? 0 : 184, polW = compact ? 82 : 98, valW = compact ? 0 : 132;
 const x0 = taskW + polW + 10, x1 = W - valW - (compact ? 12 : 24);
 const axisH = 30, rowH = compact ? 26 : 24, headH = compact ? 28 : 0, gap = compact ? 12 : 14;
 const x = v => x0 + (Math.min(v, m.max) / m.max) * (x1 - x0);
 const groupH = headH + rowH * POLICIES.length;
 const H = axisH + LETTERS.length * (groupH + gap) + 6;

 explorerEl.textContent = '';
 const svgEl = sv('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': explorerSummary()}, explorerEl);

 // group bands
 LETTERS.forEach((letter, gi) => {
  const top = axisH + gi * (groupH + gap);
  const cls = ex.focusTask === letter ? 'group-band is-focus' : 'group-band';
  if (gi % 2 === 0 || ex.focusTask === letter) sv('rect', {class: cls, x: 0, y: top - gap / 2 + 2, width: W, height: groupH + gap - 4, rx: 8}, svgEl);
 });
 // grid and ticks
 for (let v = 0; v <= m.max + 1e-9; v += m.step) {
  sv('line', {x1: x(v), x2: x(v), y1: axisH - 6, y2: H - 4, stroke: '#E5E9ED', 'stroke-width': 1}, svgEl);
  sv('text', {class: 'tick', x: x(v), y: axisH - 12, 'text-anchor': 'middle'}, svgEl, m.unit === '%' ? `${v}%` : String(v));
 }
 if (!compact) {
  sv('text', {x: W - valW + 58, y: axisH - 12, 'text-anchor': 'end', class: 'ink', 'font-weight': 600}, svgEl, A.label);
  sv('text', {x: W - 6, y: axisH - 12, 'text-anchor': 'end', class: 'ink', 'font-weight': 600}, svgEl, B.label);
 }

 const rowsLayer = sv('g', {}, svgEl);
 ex.rows.forEach((row, i) => {
  const gi = Math.floor(i / POLICIES.length), pi = i % POLICIES.length;
  const top = axisH + gi * (groupH + gap);
  const t = taskByLetter[row.letter];
  if (pi === 0) {
   const focus = ex.focusTask === row.letter ? ' is-focus-label' : '';
   if (compact) {
    const head = sv('text', {x: 4, y: top + 18, class: 'ink' + focus, 'font-weight': 700, 'font-size': 13}, rowsLayer);
    sv('tspan', {class: 'is-focus-label', fill: '#0866D9'}, head, `${t.letter}  `);
    sv('tspan', {}, head, `${t.name} · ${t.level}`);
   } else {
    const cy = top + groupH / 2;
    sv('text', {x: 4, y: cy + 1, 'font-size': 20, 'font-weight': 700, fill: '#0866D9'}, rowsLayer, t.letter);
    sv('text', {x: 30, y: cy - 3, class: 'ink' + focus, 'font-weight': 600, 'font-size': 13.5}, rowsLayer, t.name);
    sv('text', {x: 30, y: cy + 14, 'font-size': 12}, rowsLayer, t.level);
   }
  }
  const cy = top + headH + pi * rowH + rowH / 2;
  const g = sv('g', {class: 'row' + (ex.active === i ? ' is-active' : ''), 'data-i': i}, rowsLayer);
  sv('rect', {class: 'row-hit', x: compact ? 0 : taskW - 6, y: cy - rowH / 2 + 1, width: W - (compact ? 0 : taskW - 6), height: rowH - 2, rx: 6}, g);
  policyNameSvg(row.policy, sv('text', {x: compact ? 6 : taskW, y: cy + 4, class: 'ink', 'font-size': 13}, g));
  const va = row.a[ex.metric], vb = row.b[ex.metric];
  const xa = x(va), xb = x(vb);
  sv('line', {x1: xa, x2: xb, y1: cy, y2: cy, stroke: '#C3CBD4', 'stroke-width': 2.4, 'stroke-linecap': 'round'}, g);
  sv('circle', {cx: xa, cy, r: 4.8, fill: A.color, stroke: '#fff', 'stroke-width': 1.5}, g);
  sv('rect', {x: xb - 5.5, y: cy - 5.5, width: 11, height: 11, fill: 'none', stroke: B.color, 'stroke-width': 2.2}, g);
  if (!compact) {
   sv('text', {class: 'tick ink', x: W - valW + 58, y: cy + 4, 'text-anchor': 'end'}, g, fmt(ex.metric, va));
   sv('text', {class: 'tick ink', x: W - 6, y: cy + 4, 'text-anchor': 'end'}, g, fmt(ex.metric, vb));
  }
  row.cy = cy; row.xa = xa; row.xb = xb;
 });

 document.getElementById('explorer-summary').textContent = explorerSummary();
 renderLegend();
 renderExplorerTable();
 if (ex.active != null) showExplorerTip(ex.active);
 else tooltipFor(explorerEl).hidden = true;
}

function showExplorerTip(i, px) {
 const row = ex.rows[i]; if (!row) return;
 ex.active = i;
 $$('.row', explorerEl).forEach(g => g.classList.toggle('is-active', Number(g.dataset.i) === i));
 const [A, B] = SERIES[ex.mode];
 const t = taskByLetter[row.letter];
 const tip = tooltipFor(explorerEl);
 tip.textContent = '';
 const title = el('div', {class: 'tt-title'}, tip);
 policyName(row.policy, title);
 title.appendChild(document.createTextNode(` · Task ${row.letter}`));
 el('div', {class: 'tt-sub'}, tip, `${t.name} · ${ex.mode === 'domain' ? `${ex.layer} layers` : ex.domain.toUpperCase()}`);
 const table = el('table', {}, tip);
 const head = el('tr', {}, el('thead', {}, table));
 el('th', {scope: 'col'}, head, '');
 for (const s of [A, B]) { const th = el('th', {scope: 'col'}, head); keyLine(th, s.color); th.appendChild(document.createTextNode(s.label)); }
 const body = el('tbody', {}, table);
 for (const k of METRIC_ORDER) {
  const tr = el('tr', {class: k === ex.metric ? 'is-metric' : ''}, body);
  el('th', {scope: 'row'}, tr, k);
  el('td', {}, tr, fmt(k, row.a[k]));
  el('td', {}, tr, fmt(k, row.b[k]));
 }
 const tr = el('tr', {}, body);
 el('th', {scope: 'row'}, tr, 'Ops / episode');
 el('td', {}, tr, `${row.a.C.toFixed(1)} / ${row.a.planned}`);
 el('td', {}, tr, `${row.b.C.toFixed(1)} / ${row.b.planned}`);
 const anchorX = px != null ? px : Math.max(row.xa, row.xb);
 placeTooltip(explorerEl, tip, anchorX, row.cy);
 if (keyboardMode) document.getElementById('explorer-live').textContent = `${row.policy.name}, Task ${row.letter} ${t.name}: ${ex.metric} ${A.label} ${fmt(ex.metric, row.a[ex.metric])}, ${B.label} ${fmt(ex.metric, row.b[ex.metric])}.`;
}
function hideExplorerTip() {
 ex.active = null;
 tooltipFor(explorerEl).hidden = true;
 $$('.row', explorerEl).forEach(g => g.classList.remove('is-active'));
}

function renderExplorerTable() {
 const box = document.getElementById('explorer-table');
 box.textContent = '';
 const [A, B] = SERIES[ex.mode], m = METRICS[ex.metric];
 const table = el('table', {}, box);
 el('caption', {}, table, `${m.long} (${ex.metric}), ${ex.mode === 'domain' ? `${ex.layer} layers` : ex.domain.toUpperCase()}. Source: ${sourceNote()}.`);
 const head = el('tr', {}, el('thead', {}, table));
 for (const h of ['Task', 'Policy', A.label, B.label]) el('th', {scope: 'col'}, head, h);
 const body = el('tbody', {}, table);
 for (const row of ex.rows) {
  const tr = el('tr', {}, body);
  el('th', {scope: 'row'}, tr, `${row.letter} · ${taskByLetter[row.letter].name}`);
  policyName(row.policy, el('td', {class: 'left'}, tr));
  el('td', {}, tr, fmt(ex.metric, row.a[ex.metric]));
  el('td', {}, tr, fmt(ex.metric, row.b[ex.metric]));
 }
}

function syncExplorerControls() {
 setPressed('[data-metric]', 'data-metric', ex.metric);
 setPressed('[data-mode]', 'data-mode', ex.mode);
 setPressed('[data-ex-layer]', 'data-ex-layer', ex.layer);
 setPressed('[data-ex-domain]', 'data-ex-domain', ex.domain);
 document.getElementById('height-control').hidden = ex.mode !== 'domain';
 document.getElementById('domain-control').hidden = ex.mode !== 'height';
}
function setExplorer(patch, activeKey) {
 Object.assign(ex, patch);
 ex.active = null;
 if (activeKey) {
  const [pid, letter] = activeKey.split('|');
  ex.active = LETTERS.indexOf(letter) * POLICIES.length + POLICIES.findIndex(p => p.id === pid);
 }
 syncExplorerControls();
 renderExplorer();
}

$$('[data-metric]').forEach(b => b.addEventListener('click', () => setExplorer({metric: b.dataset.metric})));
$$('[data-mode]').forEach(b => b.addEventListener('click', () => setExplorer({mode: b.dataset.mode})));
$$('[data-ex-layer]').forEach(b => b.addEventListener('click', () => setExplorer({layer: Number(b.dataset.exLayer)})));
$$('[data-ex-domain]').forEach(b => b.addEventListener('click', () => setExplorer({domain: b.dataset.exDomain})));

function rowFromEvent(e) {
 const g = e.target.closest && e.target.closest('.row');
 return g ? Number(g.dataset.i) : null;
}
function localX(e, node) { return e.clientX - node.getBoundingClientRect().left; }
explorerEl.addEventListener('pointermove', e => {
 if (e.pointerType === 'touch') return;
 const i = rowFromEvent(e);
 if (i == null) { hideExplorerTip(); return; }
 showExplorerTip(i, localX(e, explorerEl));
});
explorerEl.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !keyboardMode) hideExplorerTip(); });
explorerEl.addEventListener('pointerdown', e => {
 if (e.pointerType !== 'touch') return;
 const i = rowFromEvent(e);
 if (i == null || i === ex.active) hideExplorerTip(); else showExplorerTip(i, localX(e, explorerEl));
});
explorerEl.addEventListener('focus', () => { if (ex.active == null && keyboardMode) showExplorerTip(0); });
explorerEl.addEventListener('blur', hideExplorerTip);
explorerEl.addEventListener('keydown', e => {
 const n = ex.rows.length; let i = ex.active == null ? -1 : ex.active;
 if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = Math.min(n - 1, i + 1);
 else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = Math.max(0, i - 1);
 else if (e.key === 'Home') i = 0;
 else if (e.key === 'End') i = n - 1;
 else if (e.key === 'Escape') { hideExplorerTip(); return; }
 else return;
 e.preventDefault(); keyboardMode = true; showExplorerTip(i);
});
document.addEventListener('pointerdown', e => {
 if (e.pointerType === 'touch' && !explorerEl.contains(e.target)) hideExplorerTip();
});

function focusChart(node) {
 scrollToEl(node.closest('.chart-card'));
 node.focus({preventScroll: true});
}
const compareBtn = document.getElementById('task-compare');
if (compareBtn) compareBtn.addEventListener('click', () => {
 setExplorer({mode: 'domain', layer, focusTask: tasks[task].letter});
 focusChart(explorerEl);
});
$$('[data-show]').forEach(b => b.addEventListener('click', () => {
 const what = b.dataset.show;
 if (what === 'partial') { setExplorer({metric: 'LHPR', mode: 'domain', layer: 3, focusTask: 'D'}, 'fastwam|D'); focusChart(explorerEl); }
 else if (what === 'height') { setExplorer({metric: 'LHPR', mode: 'height', focusTask: null}); focusChart(explorerEl); }
 else if (what === 'correspondence') { focusChart(scatterEl); }
}));

/* ------------------------------------------------------------------ SIM-REAL scatter */

const sc = {visible: new Set(POLICIES.map(p => p.id)), layer: 'all', active: null, points: []};
for (const p of POLICIES) for (const layers of [2, 3]) for (const letter of LETTERS) {
 const s = get(p.id, letter, layers, 'sim'), r = get(p.id, letter, layers, 'real');
 sc.points.push({policy: p, letter, layers, sim: s.C, real: r.C, planned: s.planned, lhprSim: s.LHPR, lhprReal: r.LHPR});
}
const isShown = pt => sc.visible.has(pt.policy.id) && (sc.layer === 'all' || String(pt.layers) === sc.layer);

const chipBox = document.getElementById('policy-chips');
for (const p of POLICIES) {
 const b = el('button', {type: 'button', 'aria-pressed': 'true', 'data-policy-chip': p.id}, chipBox);
 glyphSvg(b, p.shape, p.color);
 policyName(p, b);
 b.addEventListener('click', () => {
  if (sc.visible.has(p.id)) sc.visible.delete(p.id); else sc.visible.add(p.id);
  if (!sc.visible.size) POLICIES.forEach(q => sc.visible.add(q.id));
  sc.active = null; renderScatter();
 });
}
$$('[data-sc-layer]').forEach(b => b.addEventListener('click', () => { sc.layer = b.dataset.scLayer; sc.active = null; renderScatter(); }));

function renderScatter() {
 $$('[data-policy-chip]').forEach(b => b.setAttribute('aria-pressed', String(sc.visible.has(b.dataset.policyChip))));
 setPressed('[data-sc-layer]', 'data-sc-layer', sc.layer);
 $$('#policy-stats tr[data-policy]').forEach(tr => tr.classList.toggle('is-dim', !sc.visible.has(tr.dataset.policy)));

 const S = Math.max(280, Math.min(scatterEl.clientWidth || 520, 560));
 const ml = 50, mr = 14, mt = 24, mb = 48, pw = S - ml - mr, ph = S - mt - mb;
 const X = v => ml + (v / 12) * pw, Y = v => mt + ph - (v / 12) * ph;
 scatterEl.textContent = '';
 const shown = sc.points.filter(isShown);
 const svgEl = sv('svg', {width: S, height: S, viewBox: `0 0 ${S} ${S}`, role: 'img',
  'aria-label': `Scatter plot of mean successful operations per episode, SIM on the horizontal axis and REAL on the vertical axis, ${shown.length} of 48 settings shown.`}, scatterEl);
 for (let v = 0; v <= 12; v += 2) {
  sv('line', {x1: X(v), x2: X(v), y1: mt, y2: mt + ph, stroke: '#E5E9ED'}, svgEl);
  sv('line', {x1: ml, x2: ml + pw, y1: Y(v), y2: Y(v), stroke: '#E5E9ED'}, svgEl);
  sv('text', {class: 'tick', x: X(v), y: mt + ph + 18, 'text-anchor': 'middle'}, svgEl, String(v));
  sv('text', {class: 'tick', x: ml - 10, y: Y(v) + 4, 'text-anchor': 'end'}, svgEl, String(v));
 }
 sv('line', {x1: X(0), y1: Y(0), x2: X(12), y2: Y(12), stroke: '#8E99A3', 'stroke-width': 1.2, 'stroke-dasharray': '4 3'}, svgEl);
 sv('text', {x: X(12), y: mt - 8, 'text-anchor': 'end', 'font-size': 11.5}, svgEl, 'dashed line: SIM = REAL');
 sv('text', {x: ml + pw / 2, y: S - 8, 'text-anchor': 'middle', class: 'ink', 'font-weight': 600}, svgEl, 'SIM · successful operations per episode');
 sv('text', {x: 14, y: mt + ph / 2, 'text-anchor': 'middle', class: 'ink', 'font-weight': 600, transform: `rotate(-90 14 ${mt + ph / 2})`}, svgEl, 'REAL · successful operations per episode');

 const dim = sv('g', {opacity: 0.16}, svgEl), live = sv('g', {}, svgEl);
 for (const pt of sc.points) {
  pt.x = X(pt.sim); pt.y = Y(pt.real); pt.shown = isShown(pt);
  if (!pt.shown) shapeAt(dim, pt.policy.shape, pt.x, pt.y, 10, {fill: pt.policy.color});
 }
 for (const pt of sc.points.filter(p => p.shown)) {
  shapeAt(live, pt.policy.shape, pt.x, pt.y, 11, {fill: pt.policy.color, stroke: '#fff', 'stroke-width': 1.4});
 }
 sc.ring = sv('circle', {r: 11, fill: 'none', stroke: '#0866D9', 'stroke-width': 2, opacity: 0}, svgEl);

 const names = POLICIES.filter(p => sc.visible.has(p.id)).map(p => p.name);
 document.getElementById('scatter-summary').textContent =
  `${shown.length} of 48 settings shown · ${names.length === 4 ? 'all four policies' : names.join(', ')} · ${sc.layer === 'all' ? 'both heights' : `${sc.layer} layers`}. Each point averages ten episodes per domain.`;
 renderScatterTable(shown);
 if (sc.active != null && sc.points[sc.active] && sc.points[sc.active].shown) showScatterTip(sc.active);
 else hideScatterTip();
}

function showScatterTip(i) {
 const pt = sc.points[i]; if (!pt) return;
 sc.active = i;
 sc.ring.setAttribute('cx', pt.x); sc.ring.setAttribute('cy', pt.y); sc.ring.setAttribute('opacity', 1);
 const tip = tooltipFor(scatterEl);
 tip.textContent = '';
 const title = el('div', {class: 'tt-title'}, tip);
 policyName(pt.policy, title);
 title.appendChild(document.createTextNode(` · Task ${pt.letter}, ${pt.layers} layers`));
 el('div', {class: 'tt-sub'}, tip, taskByLetter[pt.letter].name);
 const table = el('table', {}, tip);
 const head = el('tr', {}, el('thead', {}, table));
 el('th', {scope: 'col'}, head, '');
 for (const [label, color] of [['SIM', '#2765C5'], ['REAL', '#986B15']]) { const th = el('th', {scope: 'col'}, head); keyLine(th, color); th.appendChild(document.createTextNode(label)); }
 const body = el('tbody', {}, table);
 let tr = el('tr', {class: 'is-metric'}, body);
 el('th', {scope: 'row'}, tr, 'Ops / episode'); el('td', {}, tr, pt.sim.toFixed(1)); el('td', {}, tr, pt.real.toFixed(1));
 tr = el('tr', {}, body);
 el('th', {scope: 'row'}, tr, 'LHPR'); el('td', {}, tr, pt.lhprSim.toFixed(1)); el('td', {}, tr, pt.lhprReal.toFixed(1));
 tr = el('tr', {}, body);
 el('th', {scope: 'row'}, tr, 'Planned ops'); el('td', {colspan: 2}, tr, String(pt.planned));
 placeTooltip(scatterEl, tip, pt.x, pt.y);
 if (keyboardMode) document.getElementById('scatter-live').textContent =
  `${pt.policy.name}, Task ${pt.letter}, ${pt.layers} layers: SIM ${pt.sim.toFixed(1)}, REAL ${pt.real.toFixed(1)} successful operations of ${pt.planned} planned.`;
}
function hideScatterTip() {
 sc.active = null;
 tooltipFor(scatterEl).hidden = true;
 if (sc.ring) sc.ring.setAttribute('opacity', 0);
}
function nearestPoint(e) {
 const rect = scatterEl.querySelector('svg').getBoundingClientRect();
 const mx = e.clientX - rect.left, my = e.clientY - rect.top;
 let best = null, bestD = 26 * 26;
 sc.points.forEach((pt, i) => { if (!pt.shown) return; const d = (pt.x - mx) ** 2 + (pt.y - my) ** 2; if (d < bestD) { bestD = d; best = i; } });
 return best;
}
scatterEl.addEventListener('pointermove', e => {
 if (e.pointerType === 'touch') return;
 const i = nearestPoint(e);
 if (i == null) hideScatterTip(); else if (i !== sc.active) showScatterTip(i);
});
scatterEl.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !keyboardMode) hideScatterTip(); });
scatterEl.addEventListener('pointerdown', e => {
 if (e.pointerType !== 'touch') return;
 const i = nearestPoint(e);
 if (i == null || i === sc.active) hideScatterTip(); else showScatterTip(i);
});
document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !scatterEl.contains(e.target)) hideScatterTip(); });
function shownOrder() { return sc.points.map((p, i) => [p, i]).filter(([p]) => p.shown).map(([, i]) => i); }
scatterEl.addEventListener('focus', () => { if (sc.active == null && keyboardMode) { const o = shownOrder(); if (o.length) showScatterTip(o[0]); } });
scatterEl.addEventListener('blur', hideScatterTip);
scatterEl.addEventListener('keydown', e => {
 const order = shownOrder(); if (!order.length) return;
 let k = order.indexOf(sc.active);
 if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = Math.min(order.length - 1, k + 1);
 else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = Math.max(0, k < 0 ? 0 : k - 1);
 else if (e.key === 'Home') k = 0;
 else if (e.key === 'End') k = order.length - 1;
 else if (e.key === 'Escape') { hideScatterTip(); return; }
 else return;
 e.preventDefault(); keyboardMode = true; showScatterTip(order[k]);
});

function renderScatterTable(shown) {
 const box = document.getElementById('scatter-table');
 box.textContent = '';
 const table = el('table', {}, box);
 el('caption', {}, table, 'Mean successful operations per episode (ten episodes per domain). Source: Appendix Tables 19–20; planned operations from Table 5.');
 const head = el('tr', {}, el('thead', {}, table));
 for (const h of ['Policy', 'Task', 'Layers', 'SIM', 'REAL', 'Planned']) el('th', {scope: 'col'}, head, h);
 const body = el('tbody', {}, table);
 for (const pt of shown) {
  const tr = el('tr', {}, body);
  policyName(pt.policy, el('th', {scope: 'row'}, tr));
  el('td', {class: 'left'}, tr, `${pt.letter} · ${taskByLetter[pt.letter].name}`);
  el('td', {}, tr, String(pt.layers));
  el('td', {}, tr, pt.sim.toFixed(1));
  el('td', {}, tr, pt.real.toFixed(1));
  el('td', {}, tr, String(pt.planned));
 }
}

const paperView = document.getElementById('paper-view');
$$('[data-view]').forEach(b => b.addEventListener('click', () => {
 const paper = b.dataset.view === 'paper';
 setPressed('[data-view]', 'data-view', b.dataset.view);
 paperView.hidden = !paper;
 scatterEl.hidden = paper;
 $('#correspondence .corr-main .controls').hidden = paper;
 document.getElementById('scatter-summary').hidden = paper;
}));

syncExplorerControls();
renderExplorer();
renderScatter();
observeWidth(explorerEl, renderExplorer);
observeWidth(scatterEl, renderScatter);
})();
