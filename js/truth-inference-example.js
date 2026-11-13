/* Illustrative truth inference example: eight diagnoses of one patient.
   The numbers are illustrative and are not output from the model. */
(function () {
  var root = document.getElementById('ti-demo');
  if (!root) return;

  var W = 184, H = 60;
  var NODES = {
    ill:    { x: 592,  y: 196, label: ['Disease'] },
    inf:    { x: 202,  y: 348, label: ['Infections'] },
    lung:   { x: 492,  y: 348, label: ['Lung conditions'] },
    heart:  { x: 992,  y: 348, label: ['Heart conditions'] },
    chest:  { x: 322,  y: 500, label: ['Chest infection'] },
    asthma: { x: 632,  y: 500, label: ['Asthma'] },
    hf:     { x: 872,  y: 500, label: ['Heart failure'] },
    ha:     { x: 1112, y: 500, label: ['Heart attack'] },
    bron:   { x: 82,   y: 652, label: ['Bronchitis'] },
    pneu:   { x: 322,  y: 652, label: ['Pneumonia'] },
    tb:     { x: 562,  y: 652, label: ['Tuberculosis'] },
    bact:   { x: 202,  y: 804, label: ['Bacterial', 'pneumonia'] },
    viral:  { x: 442,  y: 804, label: ['Viral', 'pneumonia'] }
  };
  var EDGES = [
    ['ill', 'inf'], ['ill', 'lung'], ['ill', 'heart'],
    ['inf', 'chest'], ['lung', 'chest'], ['lung', 'asthma'],
    ['heart', 'hf'], ['heart', 'ha'],
    ['chest', 'bron'], ['chest', 'pneu'], ['chest', 'tb'],
    ['pneu', 'bact'], ['pneu', 'viral']
  ];
  var NAMES = { ill: 'Some disease', chest: 'Chest infection', pneu: 'Pneumonia' };
  var WHO = [
    { id: 'drA', label: 'Dr A', doc: true,  pos: [330, 704] },
    { id: 'drB', label: 'Dr B', doc: true,  pos: [268, 856] },
    { id: 'drC', label: 'Dr C', doc: true,  pos: [326, 482] },
    { id: 'drD', label: 'Dr D', doc: true,  pos: [938, 552] },
    { id: 'ai1', label: 'AI 1', doc: false, pos: [446, 704] },
    { id: 'ai2', label: 'AI 2', doc: false, pos: [508, 856] },
    { id: 'ai3', label: 'AI 3', doc: false, pos: [148, 704] },
    { id: 'ai4', label: 'AI 4', doc: false, pos: [698, 552] }
  ];
  var THRESHOLD = 30;
  var STEPS = [
    { best: 'ill', tint: {}, scores: {},
      text: 'No diagnoses yet. Select "Next diagnosis" to add the first one.' },
    { best: 'pneu', tint: { chest: 1, bact: 1, viral: 1 }, scores: { drA: 50 },
      text: 'Dr A says pneumonia. With one opinion, the inferred diagnosis is simply Dr A’s. Dr A’s reliability cannot be judged yet, because there is nobody to compare with.' },
    { best: 'ill', tint: { pneu: 1, chest: 1, inf: 1, lung: 1, heart: 1, hf: 1 }, scores: { drA: 38, drD: 38 },
      text: 'Dr D says heart failure. It can present like pneumonia, but it is far from pneumonia in the hierarchy. The inferred diagnosis becomes the general “some disease”, and both diagnosers lose some reliability.' },
    { best: 'chest', tint: { pneu: 2, bron: 2, inf: 1, lung: 1 }, scores: { drA: 50, drD: 30, ai3: 50 },
      text: 'AI 3 says bronchitis, which is close to Dr A’s answer. The inferred diagnosis becomes chest infection, and Dr D starts to look like the outlier.' },
    { best: 'pneu', tint: { chest: 2, viral: 1, bron: 1 }, scores: { drA: 66, drD: 22, ai3: 50, ai2: 66 },
      text: 'AI 2 says viral pneumonia. The answers are now grouped around pneumonia, so it becomes the inferred diagnosis. Dr D falls below the reliability threshold.' },
    { best: 'pneu', tint: { chest: 2, viral: 1, lung: 1 }, scores: { drA: 68, drD: 18, ai3: 50, ai2: 62, ai4: 34 },
      text: 'AI 4 says asthma: a lung condition, but away from the other answers. One outlying answer does not change the inferred diagnosis.' },
    { best: 'pneu', tint: { chest: 1, bact: 1, viral: 1 }, scores: { drA: 80, drD: 15, ai3: 50, ai2: 66, ai4: 31, drB: 66 },
      text: 'Dr B says bacterial pneumonia. Pneumonia is now well supported, and the diagnosers whose answers are close to it gain reliability.' },
    { best: 'pneu', tint: { chest: 2, bact: 1 }, scores: { drA: 82, drD: 13, ai3: 52, ai2: 68, ai4: 29, drB: 68, drC: 70 },
      text: 'Dr C says chest infection. This is less specific, but in the right part of the hierarchy, so Dr C’s reliability increases. AI 4 falls below the reliability threshold.' },
    { best: 'pneu', tint: { chest: 1 }, scores: { drA: 88, drD: 12, ai3: 52, ai2: 70, ai4: 27, drB: 70, drC: 70, ai1: 88 },
      text: 'AI 1 says pneumonia. The final inferred diagnosis is pneumonia. Dr D and AI 4 are flagged as unreliable, so their opinions count for less.' }
  ];
  var LAST = STEPS.length - 1;
  var TINT = [
    { bg: '#FFFFFF', bd: '#C5CED8', fg: '#142130' },
    { bg: '#EEE9FA', bd: '#CFC4EC', fg: '#142130' },
    { bg: '#DCD2F4', bd: '#B4A5E0', fg: '#142130' }
  ];
  var BEST = { bg: '#142130', bd: '#142130', fg: '#FFFFFF' };

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Build the diagram
  var svg = el('svg', { viewBox: '66 180 1246 712', role: 'img',
    'aria-label': 'Simplified disease hierarchy with the diagnoses given by each doctor and AI system' });
  var defs = el('defs', {}, svg);
  var marker = el('marker', { id: 'ti-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5',
    markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M 0 0 L 10 5 L 0 10', fill: 'none', stroke: '#A3AEBA', 'stroke-width': '2' }, marker);

  EDGES.forEach(function (e) {
    var a = NODES[e[0]], b = NODES[e[1]];
    el('line', { x1: a.x + W / 2, y1: a.y + H, x2: b.x + W / 2, y2: b.y,
      stroke: '#A3AEBA', 'stroke-width': '2', 'marker-end': 'url(#ti-arrow)' }, svg);
  });

  var nodeEls = {};
  Object.keys(NODES).forEach(function (k) {
    var n = NODES[k];
    var g = el('g', {}, svg);
    var rect = el('rect', { x: n.x, y: n.y, width: W, height: H, rx: 12, 'stroke-width': '1.5' }, g);
    var text = el('text', { x: n.x + W / 2, 'text-anchor': 'middle', 'font-size': '19', 'font-weight': '700' }, g);
    n.label.forEach(function (line, i) {
      var t = el('tspan', { x: n.x + W / 2, y: n.y + H / 2 + 7 + (i - (n.label.length - 1) / 2) * 22 }, text);
      t.textContent = line;
    });
    rect.style.transition = 'fill 400ms, stroke 400ms';
    text.style.transition = 'fill 400ms';
    nodeEls[k] = { rect: rect, text: text };
  });

  var ring = el('rect', { width: W + 16, height: H + 16, rx: 18, fill: 'none',
    stroke: '#7C63C9', 'stroke-width': '3' }, svg);
  ring.style.transition = 'transform 500ms ease';
  var halo = el('rect', { width: W + 28, height: H + 28, rx: 24, fill: 'none',
    stroke: 'rgba(124,99,201,0.22)', 'stroke-width': '6' }, svg);
  halo.style.transition = 'transform 500ms ease';

  var badgeEls = {};
  WHO.forEach(function (w) {
    var g = el('g', {}, svg);
    var r = el('rect', { x: w.pos[0], y: w.pos[1], width: 56, height: 28, rx: w.doc ? 14 : 5, 'stroke-width': '1.5' }, g);
    var t = el('text', { x: w.pos[0] + 28, y: w.pos[1] + 19, 'text-anchor': 'middle', 'font-size': '14', 'font-weight': '700' }, g);
    t.textContent = w.label;
    g.style.transition = 'opacity 300ms';
    badgeEls[w.id] = { g: g, r: r, t: t, doc: w.doc };
  });

  document.getElementById('ti-graph').appendChild(svg);

  // Reliability rows
  var rowsEl = document.getElementById('ti-rows');
  var rowEls = {};
  WHO.forEach(function (w) {
    var row = document.createElement('div');
    row.className = 'rel-row';
    row.innerHTML =
      '<span class="badge ' + (w.doc ? 'doc' : 'ai') + '">' + w.label + '</span>' +
      '<span class="meter"><span class="fill"></span><span class="thr"></span><span class="mid"></span></span>' +
      '<span class="rel-num"></span><span class="tail"></span>';
    rowsEl.appendChild(row);
    rowEls[w.id] = {
      row: row, fill: row.querySelector('.fill'),
      num: row.querySelector('.rel-num'), tail: row.querySelector('.tail')
    };
  });

  var bestEl = document.getElementById('ti-best');
  var stepEl = document.getElementById('ti-step');
  var capEl = document.getElementById('ti-caption');
  var btnBack = document.getElementById('ti-back');
  var btnNext = document.getElementById('ti-next');
  var btnRestart = document.getElementById('ti-restart');
  var btnPlay = document.getElementById('ti-play');

  var step = 0, timer = null;
  var METER = 120;

  function render() {
    var S = STEPS[step];
    Object.keys(NODES).forEach(function (k) {
      var c = k === S.best ? BEST : TINT[S.tint[k] || 0];
      nodeEls[k].rect.setAttribute('fill', c.bg);
      nodeEls[k].rect.setAttribute('stroke', c.bd);
      nodeEls[k].text.setAttribute('fill', c.fg);
    });
    var p = NODES[S.best];
    ring.style.transform = 'translate(' + (p.x - 8) + 'px,' + (p.y - 8) + 'px)';
    halo.style.transform = 'translate(' + (p.x - 14) + 'px,' + (p.y - 14) + 'px)';

    WHO.forEach(function (w) {
      var v = S.scores[w.id];
      var has = v !== undefined;
      var flagged = has && v < THRESHOLD;
      var b = badgeEls[w.id];
      b.g.style.opacity = has ? 1 : 0;
      if (flagged) {
        b.r.setAttribute('fill', '#F3F5F7'); b.r.setAttribute('stroke', '#8A96A3');
        b.r.setAttribute('stroke-dasharray', '4 3'); b.t.setAttribute('fill', '#5F6B78');
      } else {
        b.r.setAttribute('fill', b.doc ? '#DDE9F7' : '#FCE6D6');
        b.r.setAttribute('stroke', b.doc ? '#2B5D96' : '#B4501A');
        b.r.removeAttribute('stroke-dasharray');
        b.t.setAttribute('fill', b.doc ? '#1F4A7A' : '#8A3510');
      }

      var r = rowEls[w.id];
      var score = has ? v : 50;
      var x = score / 100 * METER, mid = METER / 2;
      r.fill.style.left = Math.min(x, mid) + 'px';
      r.fill.style.width = Math.abs(x - mid) + 'px';
      r.fill.style.background = score >= 50 ? '#142130' : '#8A96A3';
      r.row.style.opacity = has ? 1 : 0.45;
      r.num.textContent = has ? String(v) : '–';
      r.tail.className = 'tail' + (flagged ? ' flag' : (has ? '' : ' wait'));
      r.tail.textContent = flagged ? 'Unreliable' : (has ? '' : 'waiting');
    });

    bestEl.textContent = NAMES[S.best];
    stepEl.textContent = step === 0 ? 'Ready' : ('Diagnosis ' + step + ' of ' + LAST);
    capEl.textContent = S.text;
    btnBack.disabled = step === 0;
    btnRestart.disabled = step === 0;
    btnNext.disabled = step === LAST;
    btnPlay.textContent = timer ? 'Pause' : 'Play';
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function go(s) { step = Math.max(0, Math.min(LAST, s)); render(); }

  btnNext.addEventListener('click', function () { stop(); go(step + 1); });
  btnBack.addEventListener('click', function () { stop(); go(step - 1); });
  btnRestart.addEventListener('click', function () { stop(); go(0); });
  btnPlay.addEventListener('click', function () {
    if (timer) { stop(); render(); return; }
    if (step === LAST) step = 0;
    timer = setInterval(function () {
      if (step >= LAST) { stop(); render(); return; }
      go(step + 1);
      if (step >= LAST) { stop(); render(); }
    }, 5000);
    go(step + 1);
  });

  render();
})();
