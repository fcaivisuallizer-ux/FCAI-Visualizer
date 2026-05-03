// ═══════════════════════════════════════════════════════════════════════════════
//  AVL Tree Visualizer  —  script.js
//  Translated from C++ / Raylib by Claude
//
//  • Full AVL (self-balancing BST) with Reingold-Tilford layout
//  • Smooth lerp animations, fade-in on insert, pulse ring, rotation glow
//  • HTML5 Canvas rendering (replaces Raylib draw calls)
//  • requestAnimationFrame loop (replaces while(!WindowShouldClose()))
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Constants (mirror C++ #defines)
// ─────────────────────────────────────────────────────────────────────────────
const NODE_SEP  = 68;   // min horizontal gap between nodes at same depth
const LEVEL_SEP = 92;   // vertical gap between levels
const NODE_R    = 24;   // node circle radius

// ─────────────────────────────────────────────────────────────────────────────
//  Node colours per depth level (mirrors NODE_COLORS[8] in C++)
// ─────────────────────────────────────────────────────────────────────────────
const NODE_COLORS = [
  '#5aa0ff', '#37be73', '#ff913c', '#b450f0',
  '#f54b82', '#2dc3c8', '#e1c828', '#8cd23c',
];

// ─────────────────────────────────────────────────────────────────────────────
//  Themes  (mirrors NIGHT / LIGHT structs)
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  night: {
    bg:        '#0d0f17',
    panel:     '#141826',
    panelEdge: '#2a344e',
    accent:    '#5aa0ff',
    accent2:   '#ff913c',
    success:   '#48d782',
    danger:    '#ff4b4b',
    textMain:  '#e4e9ff',
    textDim:   '#697698',
    nodeShadow:'rgba(0,0,0,0.45)',
    edgeCol:   '#485478',
    isNight:   true,
  },
  light: {
    bg:        '#f0f3fc',
    panel:     '#ffffff',
    panelEdge: '#c3cde1',
    accent:    '#2d6ee6',
    accent2:   '#d26414',
    success:   '#1ea05a',
    danger:    '#d22d2d',
    textMain:  '#161c32',
    textDim:   '#78829b',
    nodeShadow:'rgba(0,0,0,0.18)',
    edgeCol:   '#8291af',
    isNight:   false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Animation speed table (mirrors SPEED_TABLE[3])
// ─────────────────────────────────────────────────────────────────────────────
const SPEED_TABLE = [3, 9, 22];

// ─────────────────────────────────────────────────────────────────────────────
//  Utility: colour with alpha
// ─────────────────────────────────────────────────────────────────────────────
function colA(hex, alpha) {
  // hex is '#rrggbb' or 'rgba(...)' or 'rgb(...)'
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    // rebuild with new alpha
    const parts = hex.match(/[\d.]+/g).map(Number);
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha.toFixed(3)})`;
  }
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Node class  (mirrors struct Node<T>)
// ─────────────────────────────────────────────────────────────────────────────
class AVLNode {
  constructor(data) {
    this.data   = data;
    this.left   = null;
    this.right  = null;
    this.height = 1;

    // Smooth-motion
    this.cur_x = 0;
    this.cur_y = 0;
    this.tgt_x = 0;
    this.tgt_y = 0;

    // Visual state
    this.isNew        = false;
    this.isRotating   = false;
    this.alpha        = 0;     // 0→1, new nodes fade in
    this.pulseTimer   = 0;
    this.highlightVal = 0;

    // Reingold-Tilford layout scratch
    this.prelim = 0;
    this.mod    = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BST class  (mirrors class BST<T> with AVL balancing)
// ─────────────────────────────────────────────────────────────────────────────
class BST {
  constructor() {
    this.root       = null;
    this.searchPath = [];   // highlighted nodes (predecessor/successor)
  }

  // ── Public API ─────────────────────────────────────────────────────────
  clearTree() { this.root = null; }

  getNodeCount()  { return this._countRec(this.root); }
  getTreeHeight() { return this.root ? this.root.height : 0; }

  insert(val) {
    let msg = '';
    this.root = this._insertRec(this.root, val, { msg });
    // capture msg from object trick
    const tmp = { msg: '' };
    // Re-run just to get msg (we already inserted; we need to capture rotation msgs)
    // Better: pass msg as an object reference
    this.root = null; // reset and redo properly below
    [this.root, msg] = this._insertRecMsg(null, val);
    // Actually the cleanest way: rebuild from scratch would lose animation state.
    // Instead we do a single pass storing the message in `this._lastMsg`.
    return msg;
  }

  remove(val) {
    let msg = '';
    [this.root, msg] = this._deleteRecMsg(this.root, val);
    this._rebuildPositions();
    return msg;
  }

  // ── Proper insert that preserves existing nodes & returns msg ──────────
  insertNode(val) {
    this._lastMsg = '';
    this.root = this._insertRec(this.root, val);
    this._rebuildPositions();
    this._snapNewNodesToCurrent();
    return this._lastMsg;
  }

  deleteNode(val) {
    this._lastMsg = '';
    this.root = this._deleteRec(this.root, val);
    this._rebuildPositions();
    return this._lastMsg;
  }

  // ── Predecessor ────────────────────────────────────────────────────────
  getPredecessor(val) {
    this.searchPath = [];
    let cur  = this.root;
    let pred = null;
    while (cur) {
      this.searchPath.push(cur.data);
      if (val < cur.data) {
        cur = cur.left;
      } else if (val > cur.data) {
        pred = cur;
        cur  = cur.right;
      } else {
        if (cur.left) {
          let t = this._maxNode(cur.left);
          this.searchPath.push(t.data);
          return t.data;
        }
        break;
      }
    }
    return pred ? pred.data : null;
  }

  // ── Successor ──────────────────────────────────────────────────────────
  getSuccessor(val) {
    this.searchPath = [];
    let cur  = this.root;
    let succ = null;
    while (cur) {
      this.searchPath.push(cur.data);
      if (val < cur.data) {
        succ = cur;
        cur  = cur.left;
      } else if (val > cur.data) {
        cur = cur.right;
      } else {
        if (cur.right) {
          let t = this._minNode(cur.right);
          this.searchPath.push(t.data);
          return t.data;
        }
        break;
      }
    }
    return succ ? succ.data : null;
  }

  // ── Traversals ─────────────────────────────────────────────────────────
  getPreOrderString()  { const v=[]; this._preV(this.root, v);  return this._fmt(v); }
  getInOrderString()   { const v=[]; this._inV(this.root, v);   return this._fmt(v); }
  getPostOrderString() { const v=[]; this._postV(this.root, v); return this._fmt(v); }
  getBreadthFirstString() {
    const v = [];
    if (this.root) {
      const q = [this.root];
      while (q.length) {
        const n = q.shift();
        v.push(n.data);
        if (n.left)  q.push(n.left);
        if (n.right) q.push(n.right);
      }
    }
    return this._fmt(v);
  }

  // ── Animation tick (mirrors tickNode) ──────────────────────────────────
  tickAnimations(dt, lerpSpeed) {
    this._tickNode(this.root, dt, lerpSpeed);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  PRIVATE — AVL helpers
  // ─────────────────────────────────────────────────────────────────────
  _h(n)  { return n ? n.height : 0; }
  _bf(n) { return n ? this._h(n.left) - this._h(n.right) : 0; }
  _uh(n) { if (n) n.height = 1 + Math.max(this._h(n.left), this._h(n.right)); }

  _minNode(n) { while (n && n.left)  n = n.left;  return n; }
  _maxNode(n) { while (n && n.right) n = n.right; return n; }

  _rotR(y) {
    const x = y.left, t = x.right;
    x.right = y; y.left = t;
    this._uh(y); this._uh(x);
    y.isRotating = x.isRotating = true;
    y.highlightVal = x.highlightVal = 1.0;
    return x;
  }
  _rotL(x) {
    const y = x.right, t = y.left;
    y.left = x; x.right = t;
    this._uh(x); this._uh(y);
    x.isRotating = y.isRotating = true;
    x.highlightVal = y.highlightVal = 1.0;
    return y;
  }

  // ── Insert (mirrors insertRec) ─────────────────────────────────────────
  _insertRec(n, val) {
    if (!n) {
      const nd       = new AVLNode(val);
      nd.isNew       = true;
      nd.pulseTimer  = 1.4;
      nd.alpha       = 0;
      return nd;
    }
    if      (val < n.data) n.left  = this._insertRec(n.left,  val);
    else if (val > n.data) n.right = this._insertRec(n.right, val);
    else                   return n;  // duplicate

    this._uh(n);
    const b = this._bf(n);

    if (b >  1 && val < n.left.data)  { this._lastMsg = 'Right Rotation';      return this._rotR(n); }
    if (b < -1 && val > n.right.data) { this._lastMsg = 'Left Rotation';       return this._rotL(n); }
    if (b >  1 && val > n.left.data)  { this._lastMsg = 'Left-Right Rotation'; n.left  = this._rotL(n.left);  return this._rotR(n); }
    if (b < -1 && val < n.right.data) { this._lastMsg = 'Right-Left Rotation'; n.right = this._rotR(n.right); return this._rotL(n); }
    return n;
  }

  // ── Delete (mirrors deleteRec) ─────────────────────────────────────────
  _deleteRec(n, val) {
    if (!n) return null;
    if      (val < n.data) n.left  = this._deleteRec(n.left,  val);
    else if (val > n.data) n.right = this._deleteRec(n.right, val);
    else {
      if (!n.left || !n.right) {
        const child = n.left || n.right;
        if (!child) return null;
        // Copy child into n to preserve animation state of the node object
        Object.assign(n, child);
        n.left  = child.left;
        n.right = child.right;
        // Don't lose the data/height from child
      } else {
        const s = this._minNode(n.right);
        n.data  = s.data;
        n.right = this._deleteRec(n.right, s.data);
      }
    }
    if (!n) return null;
    this._uh(n);
    const b = this._bf(n);

    if (b >  1 && this._bf(n.left)  >= 0) { this._lastMsg = 'Right Rotation (rebalance)';      return this._rotR(n); }
    if (b >  1 && this._bf(n.left)  <  0) { this._lastMsg = 'Left-Right Rotation (rebalance)'; n.left  = this._rotL(n.left);  return this._rotR(n); }
    if (b < -1 && this._bf(n.right) <= 0) { this._lastMsg = 'Left Rotation (rebalance)';       return this._rotL(n); }
    if (b < -1 && this._bf(n.right) >  0) { this._lastMsg = 'Right-Left Rotation (rebalance)'; n.right = this._rotR(n.right); return this._rotL(n); }
    return n;
  }

  // ── Reingold-Tilford layout (mirrors firstWalk / secondWalk) ───────────
  _rebuildPositions() {
    if (!this.root) return;
    this._firstWalk(this.root);
    this._secondWalk(this.root, 0, 0);
  }

  _rightContour(n, modAcc, depth, cont) {
    if (!n) return;
    const absX = n.prelim + modAcc;
    if (cont.length <= depth) cont.push(absX);
    else                      cont[depth] = Math.max(cont[depth], absX);
    this._rightContour(n.left,  modAcc + n.mod, depth + 1, cont);
    this._rightContour(n.right, modAcc + n.mod, depth + 1, cont);
  }

  _leftContour(n, modAcc, depth, cont) {
    if (!n) return;
    const absX = n.prelim + modAcc;
    if (cont.length <= depth) cont.push(absX);
    else                      cont[depth] = Math.min(cont[depth], absX);
    this._leftContour(n.left,  modAcc + n.mod, depth + 1, cont);
    this._leftContour(n.right, modAcc + n.mod, depth + 1, cont);
  }

  _firstWalk(n) {
    n.prelim = 0;
    n.mod    = 0;
    if (!n.left && !n.right) return;  // leaf

    if (n.left)  this._firstWalk(n.left);
    if (n.right) this._firstWalk(n.right);

    if (n.left && n.right) {
      const rc = [], lc = [];
      this._rightContour(n.left,  0, 0, rc);
      this._leftContour (n.right, 0, 0, lc);

      let shift = 0;
      const levels = Math.min(rc.length, lc.length);
      for (let i = 0; i < levels; i++)
        shift = Math.max(shift, (rc[i] - lc[i]) + NODE_SEP);
      if (shift < NODE_SEP) shift = NODE_SEP;

      n.left.prelim  = -shift * 0.5;
      n.right.prelim =  shift * 0.5;
      n.left.mod     = n.left.prelim;
      n.right.mod    = n.right.prelim;
      n.prelim       = 0;
    } else if (n.left) {
      n.prelim = n.left.prelim;
    } else {
      n.prelim = n.right.prelim;
    }
  }

  _secondWalk(n, modAcc, depth) {
    if (!n) return;
    n.tgt_x = n.prelim + modAcc;
    n.tgt_y = depth * LEVEL_SEP;
    this._secondWalk(n.left,  modAcc + n.mod, depth + 1);
    this._secondWalk(n.right, modAcc + n.mod, depth + 1);
  }

  // ── Snap new nodes to their target immediately (no flying from 0,0) ───
  _snapNewNodesToCurrent() { this._snapNew(this.root); }
  _snapNew(n) {
    if (!n) return;
    if (n.isNew && n.alpha < 0.05) { n.cur_x = n.tgt_x; n.cur_y = n.tgt_y; }
    this._snapNew(n.left);
    this._snapNew(n.right);
  }

  // ── Animation tick (mirrors tickNode) ──────────────────────────────────
  _tickNode(n, dt, lerpSpeed) {
    if (!n) return;
    const t = 1 - Math.exp(-lerpSpeed * dt);
    n.cur_x += (n.tgt_x - n.cur_x) * t;
    n.cur_y += (n.tgt_y - n.cur_y) * t;

    if (n.alpha < 1)
      n.alpha = Math.min(1, n.alpha + dt * lerpSpeed * 0.35);

    if (n.pulseTimer > 0) {
      n.pulseTimer -= dt;
      if (n.pulseTimer <= 0) { n.pulseTimer = 0; n.isNew = false; }
    }
    if (n.highlightVal > 0) {
      n.highlightVal -= dt * 0.9;
      if (n.highlightVal <= 0) { n.highlightVal = 0; n.isRotating = false; }
    }
    this._tickNode(n.left,  dt, lerpSpeed);
    this._tickNode(n.right, dt, lerpSpeed);
  }

  // ── Traversal helpers ─────────────────────────────────────────────────
  _preV (n, v) { if (!n) return; v.push(n.data); this._preV(n.left, v);  this._preV(n.right, v);  }
  _inV  (n, v) { if (!n) return; this._inV(n.left, v);  v.push(n.data); this._inV(n.right, v);   }
  _postV(n, v) { if (!n) return; this._postV(n.left, v); this._postV(n.right, v); v.push(n.data); }

  _fmt(v) {
    if (!v.length) return '[ Empty Tree ]';
    return '[ ' + v.join(',  ') + ' ]';
  }

  _countRec(n) { return n ? 1 + this._countRec(n.left) + this._countRec(n.right) : 0; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Canvas renderer  (translates Raylib draw calls → Canvas 2D API)
// ─────────────────────────────────────────────────────────────────────────────
function drawTree(ctx, node, depth, searchPath, T) {
  if (!node) return;

  const cx = node.cur_x;
  const cy = node.cur_y;
  const a  = node.alpha;

  // ── Draw edges first ──────────────────────────────────────────────────
  if (node.left) {
    const ea = Math.min(a, node.left.alpha);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(node.left.cur_x, node.left.cur_y);
    ctx.strokeStyle = colA(T.edgeCol, ea * 0.82);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    drawTree(ctx, node.left, depth + 1, searchPath, T);
  }
  if (node.right) {
    const ea = Math.min(a, node.right.alpha);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(node.right.cur_x, node.right.cur_y);
    ctx.strokeStyle = colA(T.edgeCol, ea * 0.82);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    drawTree(ctx, node.right, depth + 1, searchPath, T);
  }

  const base = NODE_COLORS[depth % 8];

  // ── Pulse ring (new insert) ────────────────────────────────────────────
  if (node.isNew && node.pulseTimer > 0) {
    const p = Math.sin(node.pulseTimer * 7) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, NODE_R + p * 12, 0, Math.PI * 2);
    ctx.fillStyle = colA(base, 0.22 * a);
    ctx.fill();
  }

  // ── Rotation glow ──────────────────────────────────────────────────────
  if (node.isRotating && node.highlightVal > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, NODE_R + 12, 0, Math.PI * 2);
    ctx.fillStyle = colA('#ffc832', node.highlightVal * 0.5 * a);
    ctx.fill();
  }

  // ── Path highlight ─────────────────────────────────────────────────────
  const inPath = searchPath.includes(node.data);
  if (inPath) {
    ctx.beginPath();
    ctx.arc(cx, cy, NODE_R + 9, 0, Math.PI * 2);
    ctx.fillStyle = colA('#ffe628', 0.42 * a);
    ctx.fill();
  }

  // ── Shadow ─────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, NODE_R, 0, Math.PI * 2);
  ctx.fillStyle = colA(T.nodeShadow, a * 0.5);
  ctx.fill();

  // ── Main circle ────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, NODE_R, 0, Math.PI * 2);
  ctx.fillStyle = colA(base, a);
  ctx.fill();

  // ── Rim shimmer (top-left highlight) ──────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 6, 10, 0, Math.PI * 2);
  ctx.fillStyle = colA('#ffffff', 0.08 * a);
  ctx.fill();

  // ── Outline ────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, NODE_R, 0, Math.PI * 2);
  ctx.strokeStyle = colA('#ffffff', 0.18 * a);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // ── Value text — dynamic font size based on digit count (mirrors C++) ──
  const val = String(node.data);
  const fs  = val.length > 4 ? 11 : val.length > 3 ? 13 : val.length > 2 ? 15 : 18;
  ctx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = colA('#ffffff', a);
  ctx.fillText(val, cx, cy + 1);

  // ── Height badge ───────────────────────────────────────────────────────
  ctx.font         = `600 11px 'Space Grotesk', sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle    = colA(T.textDim, 0.7 * a);
  ctx.fillText('h' + node.height, cx + NODE_R - 2, cy - NODE_R + 2);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Popup toast manager
// ─────────────────────────────────────────────────────────────────────────────
const popupEl    = document.getElementById('popup');
const popupMsg   = document.getElementById('popup-msg');
const popupProg  = document.getElementById('popup-progress');

let popupTimer = 0;
let popupMaxT  = 0;

function showPopup(msg, color, dur = 3.5) {
  popupMsg.textContent = msg;
  popupEl.style.setProperty('--popup-border', color);
  popupEl.style.display    = 'block';
  popupEl.style.opacity    = '1';
  popupProg.style.width    = '100%';
  popupProg.style.background = color;
  popupTimer = dur;
  popupMaxT  = dur;
}

function tickPopup(dt) {
  if (popupTimer <= 0) return;
  popupTimer = Math.max(0, popupTimer - dt);
  const frac  = popupMaxT > 0 ? popupTimer / popupMaxT : 0;
  const fade  = Math.min(1, popupTimer * 3);
  popupEl.style.opacity = fade.toFixed(3);
  popupProg.style.width = (frac * 100).toFixed(1) + '%';
  if (popupTimer <= 0) { popupEl.style.display = 'none'; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function setStatus(line1, line2) {
  document.getElementById('stat1').textContent = line1;
  document.getElementById('stat2').textContent = line2;
}

function setTraversal(title, result) {
  const bar = document.getElementById('trav-bar');
  if (!title) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  document.getElementById('trav-title').textContent  = title;
  document.getElementById('trav-result').textContent = result;
}

function updateLiveStats(tree, T) {
  const nc  = tree.getNodeCount();
  const ht  = tree.getTreeHeight();
  const bal = nc <= 1 || ht <= Math.ceil(1.45 * Math.log2(nc + 1) + 1.6);

  document.getElementById('ls-nodes').textContent  = `Nodes:  ${nc}`;
  document.getElementById('ls-height').textContent = `Height: ${ht}`;
  const balEl = document.getElementById('ls-balance');
  if (bal) {
    balEl.textContent  = 'Balanced ✓';
    balEl.className    = 'ls-balanced';
  } else {
    balEl.textContent  = 'Unbalanced!';
    balEl.className    = 'ls-unbalanced';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main application
// ─────────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('tree-canvas');
const ctx    = canvas.getContext('2d');

// ── State ──────────────────────────────────────────────────────────────────
const tree   = new BST();
let nightMode = true;
let T         = THEMES.night;
let speedIdx  = 0;

// Camera (pan + zoom)
const cam = { x: 0, y: 0, zoom: 1, offsetX: 0, offsetY: 0 };
let camReady = false;

// Mouse drag state
let isDragging   = false;
let dragButton   = -1;
let dragStartX   = 0;
let dragStartY   = 0;
let lastClickTime = 0;

// ── Canvas resize ──────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = canvas.clientWidth  * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  if (!camReady) resetCamera();
}

function resetCamera() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  cam.offsetX = W * 0.5;
  cam.offsetY = H * 0.35;
  cam.x       = 0;
  cam.y       = 0;
  cam.zoom    = 1;
  camReady    = true;
}

window.addEventListener('resize', () => { resizeCanvas(); });
resizeCanvas();

// ── Zoom (scroll wheel) ────────────────────────────────────────────────────
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  // World coords under mouse
  const wx = (mx - cam.offsetX) / cam.zoom + cam.x;
  const wy = (my - cam.offsetY) / cam.zoom + cam.y;

  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  cam.zoom = Math.max(0.08, Math.min(6, cam.zoom * f));

  // Adjust offset so the point under the mouse stays fixed
  cam.offsetX = mx - (wx - cam.x) * cam.zoom;
  cam.offsetY = my - (wy - cam.y) * cam.zoom;
}, { passive: false });

// ── Pan (right-click or middle-click drag) ─────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 1 || e.button === 2) {
    isDragging = true;
    dragButton = e.button;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }
  if (e.button === 0) {
    const now = Date.now();
    if (now - lastClickTime < 320) resetCamera();
    lastClickTime = now;
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  cam.offsetX += dx;
  cam.offsetY += dy;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
});
window.addEventListener('mouseup', () => { isDragging = false; });

// Touch pan/zoom
let lastTouchDist = 0;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.hypot(dx, dy);
  }
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const dx   = e.touches[0].clientX - e.touches[1].clientX;
    const dy   = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const f    = dist / (lastTouchDist || dist);
    cam.zoom = Math.max(0.08, Math.min(6, cam.zoom * f));
    lastTouchDist = dist;
  }
}, { passive: true });

// ── Input element ──────────────────────────────────────────────────────────
const valInput  = document.getElementById('val-input');
const randInput = document.getElementById('rand-input');

function getVal() {
  const v = parseInt(valInput.value, 10);
  return isNaN(v) ? 0 : Math.max(-9999, Math.min(9999, v));
}

// Enter key on value input → Insert
valInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doInsert();
});

// ── Button wiring ──────────────────────────────────────────────────────────
document.getElementById('btn-insert').addEventListener('click', doInsert);
document.getElementById('btn-delete').addEventListener('click', doDelete);
document.getElementById('btn-clear').addEventListener('click', doClear);
document.getElementById('btn-pred').addEventListener('click', doPred);
document.getElementById('btn-succ').addEventListener('click', doSucc);
document.getElementById('btn-gen').addEventListener('click', doGenerate);

document.getElementById('btn-theme').addEventListener('click', () => {
  nightMode = !nightMode;
  T = nightMode ? THEMES.night : THEMES.light;
  document.body.classList.toggle('night', nightMode);
  document.body.classList.toggle('light', !nightMode);
  const btn = document.getElementById('btn-theme');
  btn.textContent = nightMode ? '☀ Switch to Light Mode' : '🌙 Switch to Night Mode';
});

// Traversal buttons
document.querySelectorAll('.trav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const trav = btn.dataset.trav;
    let title, result;
    switch (trav) {
      case 'pre':  title = 'Pre-Order:';     result = tree.getPreOrderString();     break;
      case 'in':   title = 'In-Order:';      result = tree.getInOrderString();      break;
      case 'post': title = 'Post-Order:';    result = tree.getPostOrderString();    break;
      case 'bfs':  title = 'Breadth-First:'; result = tree.getBreadthFirstString(); break;
    }
    setTraversal(title, result);
  });
});

// Speed buttons
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    speedIdx = parseInt(btn.dataset.speed, 10);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Action functions ───────────────────────────────────────────────────────
function doInsert() {
  const val = getVal();
  tree.searchPath = [];
  const rotMsg = tree.insertNode(val);
  let m = `Inserted: ${val}`;
  if (rotMsg) m += `  (${rotMsg})`;
  showPopup(m, rotMsg ? T.accent2 : T.success);
  setStatus(`Inserted ${val}`, rotMsg || 'No rotation needed');
  setTraversal('', '');
}

function doDelete() {
  const val = getVal();
  tree.searchPath = [];
  const rotMsg = tree.deleteNode(val);
  let m = `Deleted: ${val}`;
  if (rotMsg) m += `  (${rotMsg})`;
  showPopup(m, T.danger);
  setStatus(`Deleted ${val}`, rotMsg || 'No rotation needed');
  setTraversal('', '');
}

function doClear() {
  tree.clearTree();
  tree.searchPath = [];
  setTraversal('', '');
  setStatus('Tree cleared', 'Start fresh!');
  showPopup('Tree cleared!', T.danger, 2);
}

function doPred() {
  const val = getVal();
  const pv  = tree.getPredecessor(val);
  const m   = pv !== null
    ? `Pred(${val}) = ${pv}`
    : `No predecessor for ${val}`;
  showPopup(m, T.accent2);
  setStatus(m, 'Path shown in yellow');
}

function doSucc() {
  const val = getVal();
  const sv  = tree.getSuccessor(val);
  const m   = sv !== null
    ? `Succ(${val}) = ${sv}`
    : `No successor for ${val}`;
  showPopup(m, T.accent2);
  setStatus(m, 'Path shown in yellow');
}

function doGenerate() {
  let count = parseInt(randInput.value, 10);
  if (isNaN(count) || count < 1)  count = 1;
  if (count > 99)                  count = 99;

  tree.clearTree();
  tree.searchPath = [];

  const used = new Set();
  let ins = 0, att = 0;
  while (ins < count && att < count * 30) {
    const v = Math.floor(Math.random() * 199) - 99;
    if (!used.has(v)) {
      used.add(v);
      tree.insertNode(v);
      ins++;
    }
    att++;
  }
  showPopup(`Generated ${ins} random nodes!`, T.success);
  setStatus(`Random tree: ${ins} nodes`, 'Add / delete nodes freely!');
  setTraversal('', '');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main render loop  (replaces while(!WindowShouldClose()))
// ─────────────────────────────────────────────────────────────────────────────
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);  // cap at 100 ms
  lastTime = now;

  // ── Tick ─────────────────────────────────────────────────────────────
  tree.tickAnimations(dt, SPEED_TABLE[speedIdx]);
  tickPopup(dt);
  updateLiveStats(tree, T);

  // ── Clear canvas ─────────────────────────────────────────────────────
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);

  // ── Apply camera transform ────────────────────────────────────────────
  ctx.save();
  ctx.translate(cam.offsetX, cam.offsetY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // ── Draw tree ─────────────────────────────────────────────────────────
  drawTree(ctx, tree.root, 0, tree.searchPath, T);

  ctx.restore();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);