// ══════════════════════════════════════════════════════════════════════════════
//  Dijkstra Graph Visualizer — Canvas + Events + Render Loop
//  Ported and adapted for AlgoViz React
// ══════════════════════════════════════════════════════════════════════════════

import { THEMES, SPEED_TABLE, colA } from '../trees/avlTree.js';

const NODE_R = 22;
const NODE_COLORS = ['#5aa0ff', '#37be73', '#ff913c', '#b450f0', '#f54b82', '#2dc3c8'];

export function initDijkstraVisualizer(container) {
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.height = '100%';

  // Side panel
  const panel = document.createElement('aside');
  panel.className = 'tree-panel';
  panel.innerHTML = `
    <div class="tree-panel-title">
      <span class="tree-title-main">Dijkstra</span>
      <span class="tree-title-sub">Visualizer</span>
      <span class="tree-title-edition">Educational Edition</span>
    </div>
    <hr class="tree-divider"/>
    <section class="tree-section">
      <div class="tree-section-label">GRAPH SETUP</div>
      <div class="tree-gen-row">
        <label>Nodes:</label>
        <input class="tree-rand-input" id="dj-node-count" type="number" min="3" max="20" value="6"/>
        <button class="tree-btn tree-btn-green sm" id="dj-btn-create">Create</button>
      </div>
      <div class="tree-tip">Then click nodes to add edges (source → target)</div>
    </section>
    <hr class="tree-divider"/>
    <section class="tree-section">
      <div class="tree-section-label">EDGE WEIGHT</div>
      <div class="tree-gen-row">
        <label>Next Weight:</label>
        <input class="tree-rand-input" id="dj-edge-weight" type="number" min="1" max="99" value="5"/>
      </div>
    </section>
    <hr class="tree-divider"/>
    <section class="tree-section">
      <div class="tree-section-label">DIJKSTRA ALGO</div>
      <div class="tree-gen-row">
        <label>Start:</label>
        <input class="tree-rand-input" id="dj-start-node" type="number" min="0" value="0" style="width:50px"/>
        <button class="tree-btn tree-btn-accent sm" id="dj-btn-start">▶ Run Dijkstra</button>
      </div>
      <div id="dj-dist-display" style="margin-top:8px;font-size:11px;color:var(--text-muted);min-height:40px;line-height:1.4"></div>
      <div id="dj-path-display" style="margin-top:4px;font-size:12px;color:var(--accent);min-height:20px"></div>
    </section>
    <hr class="tree-divider"/>
    <section class="tree-section">
      <div class="tree-section-label">ANIMATION SPEED</div>
      <div class="tree-speed-row">
        <button class="tree-speed-btn active" data-speed="0">Slow</button>
        <button class="tree-speed-btn" data-speed="1">Normal</button>
        <button class="tree-speed-btn" data-speed="2">Fast</button>
      </div>
    </section>
    <button class="tree-btn tree-btn-danger-dim sm" id="dj-btn-reset" style="margin:8px 18px">Reset Graph</button>
    <button class="tree-btn tree-btn-danger sm" id="dj-btn-clear" style="margin:8px 18px">Clear Graph</button>
    <div class="tree-status-bar">
      <div class="tree-status-title">STATUS</div>
      <div class="tree-stat-line1" id="dj-stat1">Graph Ready</div>
      <div class="tree-stat-line2" id="dj-stat2">Create graph, then add weighted edges</div>
    </div>
  `;

  // Canvas area
  const canvasWrap = document.createElement('main');
  canvasWrap.className = 'tree-canvas-wrap';
  canvasWrap.innerHTML = `
    <canvas class="tree-canvas" id="dj-canvas"></canvas>
    <div class="tree-live-stats">
      <div class="tree-ls-label">LIVE STATS</div>
      <div class="tree-ls-nodes" id="dj-ls-nodes">Nodes: 0</div>
      <div class="tree-ls-edges" id="dj-ls-edges">Edges: 0</div>
      <div class="tree-ls-algo" id="dj-ls-algo">Dijkstra: Not Started</div>
    </div>
    <div class="tree-hints">Click nodes to add edges &nbsp;|&nbsp; Drag to move &nbsp;|&nbsp; Scroll: Zoom &nbsp;|&nbsp; Right-click+Drag: Pan</div>
    <div class="tree-popup" id="dj-popup" style="display:none">
      <span class="tree-popup-msg" id="dj-popup-msg"></span>
      <div class="tree-popup-progress" id="dj-popup-progress"></div>
    </div>
  `;

  container.appendChild(panel);
  container.appendChild(canvasWrap);

  const canvas = canvasWrap.querySelector('#dj-canvas');
  const ctx = canvas.getContext('2d');
  let speedIdx = 0;
  let destroyed = false;
  let algoActive = false; // Guard against concurrent Dijkstra executions

  // Graph state
  const graph = {
    nodes: [],
    edges: [],
    nodeCount: 0,
    pendingEdgeStart: null,
    running: false,
    dist: {},
    prev: {},
    visited: new Set(),
    path: [],
    current: null,
  };

  const cam = { x: 0, y: 0, zoom: 1, offsetX: 0, offsetY: 0 };
  let camReady = false;
  let isPanning = false, dragStartX = 0, dragStartY = 0, lastClickTime = 0;
  let draggedNode = null;

  let popupTimer = 0, popupMaxT = 0;
  const popupEl = canvasWrap.querySelector('#dj-popup');
  const popupMsg = canvasWrap.querySelector('#dj-popup-msg');
  const popupProg = canvasWrap.querySelector('#dj-popup-progress');

  function showPopup(msg, color, dur = 3.5) {
    popupMsg.textContent = msg;
    popupEl.style.setProperty('--popup-border', color);
    popupEl.style.borderColor = color;
    popupEl.style.display = 'block';
    popupEl.style.opacity = '1';
    popupProg.style.width = '100%';
    popupProg.style.background = color;
    popupTimer = dur; popupMaxT = dur;
  }

  function tickPopup(dt) {
    if (popupTimer <= 0) return;
    popupTimer = Math.max(0, popupTimer - dt);
    const frac = popupMaxT > 0 ? popupTimer / popupMaxT : 0;
    const fade = Math.min(1, popupTimer * 3);
    popupEl.style.opacity = fade.toFixed(3);
    popupProg.style.width = (frac * 100).toFixed(1) + '%';
    if (popupTimer <= 0) popupEl.style.display = 'none';
  }

  function setStatus(l1, l2) {
    panel.querySelector('#dj-stat1').textContent = l1;
    panel.querySelector('#dj-stat2').textContent = l2;
  }

  function updateLiveStats() {
    canvasWrap.querySelector('#dj-ls-nodes').textContent = `Nodes: ${graph.nodes.length}`;
    canvasWrap.querySelector('#dj-ls-edges').textContent = `Edges: ${graph.edges.length}`;
    canvasWrap.querySelector('#dj-ls-algo').textContent = graph.running 
      ? `Dijkstra: ${graph.current !== null ? 'Running...' : 'Starting...'}`
      : 'Dijkstra: Not Started';
  }

  function getT() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return isLight ? THEMES.light : THEMES.night;
  }

  function resizeCanvas() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    if (!camReady) resetCamera();
  }

  function resetCamera() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    cam.offsetX = W * 0.5; cam.offsetY = H * 0.5;
    cam.x = 0; cam.y = 0; cam.zoom = 1; camReady = true;
  }

  const onResize = () => { if (!destroyed) resizeCanvas(); };
  window.addEventListener('resize', onResize);
  resizeCanvas();
  requestAnimationFrame(() => { if (!destroyed) resizeCanvas(); });

  function createGraph() {
    const count = parseInt(panel.querySelector('#dj-node-count').value, 10);
    if (isNaN(count) || count < 3 || count > 20) {
      showPopup('Please enter 3-20 nodes', '#ff4b4b', 2);
      return;
    }
    graph.nodes = [];
    graph.edges = [];
    graph.nodeCount = count;
    graph.running = false;
    algoActive = false;
    graph.dist = {};
    graph.prev = {};
    graph.visited = new Set();
    graph.path = [];
    graph.current = null;
    graph.pendingEdgeStart = null;

    const cx = 0, cy = 0, radius = Math.min(200, 60 + count * 15);
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      graph.nodes.push({
        id: i,
        label: String(i),
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        curX: cx + radius * Math.cos(angle),
        curY: cy + radius * Math.sin(angle),
        color: NODE_COLORS[i % NODE_COLORS.length],
        state: 'default',
        pulseTimer: 0,
        alpha: 1, // Start fully visible
      });
    }

    showPopup(`Created graph with ${count} nodes`, '#48d782', 2);
    setStatus('Graph Created', 'Add weighted edges, then click ▶ Run Dijkstra');
    const startInput = panel.querySelector('#dj-start-node');
    if (startInput) startInput.max = count - 1;
    panel.querySelector('#dj-dist-display').textContent = '';
    panel.querySelector('#dj-path-display').textContent = '';
  }

  function addEdge(fromId, toId) {
    if (fromId === toId) return;
    const weight = parseInt(panel.querySelector('#dj-edge-weight').value, 10) || 5;
    const exists = graph.edges.some(e => 
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    if (exists) return;

    graph.edges.push({ from: fromId, to: toId, weight });
    showPopup(`Added edge: ${fromId}–${toId} (w=${weight})`, '#5aa0ff', 2);
  }

  function resetGraph() {
    graph.running = false;
    algoActive = false;
    graph.dist = {};
    graph.prev = {};
    graph.visited = new Set();
    graph.path = [];
    graph.current = null;
    graph.pendingEdgeStart = null;
    graph.nodes.forEach(n => { n.state = 'default'; n.pulseTimer = 0; });
    panel.querySelector('#dj-dist-display').textContent = '';
    panel.querySelector('#dj-path-display').textContent = '';
    showPopup('Graph reset', '#ff913c', 2);
  }

  function clearGraph() {
    graph.nodes = [];
    graph.edges = [];
    graph.running = false;
    algoActive = false;
    graph.dist = {};
    graph.prev = {};
    graph.visited = new Set();
    graph.path = [];
    graph.current = null;
    graph.pendingEdgeStart = null;
    panel.querySelector('#dj-dist-display').textContent = '';
    panel.querySelector('#dj-path-display').textContent = '';
    showPopup('Graph cleared', '#ff4b4b', 2);
    setStatus('Graph Cleared', 'Create nodes to start');
  }

  function startDijkstra() {
    if (graph.nodes.length === 0) {
      showPopup('Create graph first!', '#ff4b4b', 2);
      return;
    }
    if (algoActive) {
      showPopup('Dijkstra is already running!', '#ff4b4b', 2);
      return;
    }
    let startId = parseInt(panel.querySelector('#dj-start-node').value, 10);
    if (isNaN(startId) || startId < 0 || startId >= graph.nodes.length) {
      startId = 0;
      panel.querySelector('#dj-start-node').value = '0';
    }
    graph.running = true;
    algoActive = false;
    graph.pendingEdgeStart = null;
    runDijkstra(startId);
  }

  async function runDijkstra(startId) {
    if (algoActive) return; // Prevent concurrent executions
    algoActive = true;

    const n = graph.nodes.length;
    graph.dist = {};
    graph.prev = {};
    graph.visited = new Set();
    graph.path = [];
    graph.nodes.forEach(node => {
      graph.dist[node.id] = Infinity;
      graph.prev[node.id] = -1;
      node.state = 'default';
    });
    graph.dist[startId] = 0;

    const T = getT();
    setStatus(`Dijkstra from ${startId}`, 'Initializing distances...');
    updateDistUI();
    
    await sleep(1000 / SPEED_TABLE[speedIdx]);

    while (graph.visited.size < n && !destroyed) {
      // Find unvisited node with smallest distance
      let u = -1;
      for (let i = 0; i < n; i++) {
        if (!graph.visited.has(i) && (u === -1 || graph.dist[i] < graph.dist[u])) {
          u = i;
        }
      }

      if (u === -1 || graph.dist[u] === Infinity) break;

      graph.current = u;
      graph.visited.add(u);
      graph.nodes[u].state = 'visited';
      graph.nodes[u].pulseTimer = 1;

      showPopup(`Processing Node ${u}`, T.accent2, 1.2);
      setStatus(`Processing node ${u}`, `Current min dist: ${graph.dist[u]}`);
      updateDistUI();

      await sleep(1000 / SPEED_TABLE[speedIdx]);
      if (destroyed) return;

      // Relax edges
      const neighbors = [];
      graph.edges.forEach(e => {
        if (e.from === u) neighbors.push({ id: e.to, w: e.weight });
        else if (e.to === u) neighbors.push({ id: e.from, w: e.weight });
      });

      for (const nb of neighbors) {
        if (destroyed) return;
        if (!graph.visited.has(nb.id)) {
          graph.nodes[nb.id].state = 'queued';
          const newDist = graph.dist[u] + nb.w;
          if (newDist < graph.dist[nb.id]) {
            graph.dist[nb.id] = newDist;
            graph.prev[nb.id] = u;
            showPopup(`Updating Node ${nb.id} dist: ${newDist}`, '#48d782', 1);
            updateDistUI();
            await sleep(600 / SPEED_TABLE[speedIdx]);
          }
        }
      }
      
      await sleep(400 / SPEED_TABLE[speedIdx]);
    }

    graph.running = false;
    algoActive = false;
    graph.current = null;
    if (!destroyed) {
      showPopup('Dijkstra Complete!', T.success, 3);
      setStatus('Dijkstra Complete', 'All reachable nodes processed');
    }
  }

  function updateDistUI() {
    let html = '<strong>Distances:</strong><br/>';
    graph.nodes.forEach(n => {
      const d = graph.dist[n.id] === Infinity ? '?' : graph.dist[n.id];
      html += `${n.label}: ${d}&nbsp;&nbsp;`;
      if (n.id % 3 === 2) html += '<br/>';
    });
    panel.querySelector('#dj-dist-display').innerHTML = html;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Event Listeners
  panel.querySelector('#dj-btn-create').addEventListener('click', createGraph);
  panel.querySelector('#dj-btn-reset').addEventListener('click', resetGraph);
  panel.querySelector('#dj-btn-clear').addEventListener('click', clearGraph);
  panel.querySelector('#dj-btn-start').addEventListener('click', startDijkstra);

  panel.querySelectorAll('.tree-speed-btn[data-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      speedIdx = parseInt(btn.dataset.speed, 10);
      panel.querySelectorAll('.tree-speed-btn[data-speed]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function getNodeAt(x, y) {
    const wx = (x - cam.offsetX) / cam.zoom + cam.x;
    const wy = (y - cam.offsetY) / cam.zoom + cam.y;
    for (const node of graph.nodes) {
      const dx = node.curX - wx;
      const dy = node.curY - wy;
      if (Math.sqrt(dx*dx + dy*dy) < NODE_R + 5) return node;
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) { isPanning = true; dragStartX = e.clientX; dragStartY = e.clientY; }
    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const node = getNodeAt(mx, my);
      if (node) {
        if (algoActive || graph.running) {
          return; // Algorithm running — ignore canvas clicks
        }
        if (graph.pendingEdgeStart !== null) {
          if (graph.pendingEdgeStart !== node.id) {
            addEdge(graph.pendingEdgeStart, node.id);
            graph.pendingEdgeStart = null;
            graph.nodes.forEach(n => n.state = n.state === 'queued' ? 'default' : n.state);
          }
        } else {
          graph.pendingEdgeStart = node.id;
          node.state = 'queued';
          node.pulseTimer = 2;
          showPopup(`Source: Node ${node.id}`, '#ff913c', 2);
        }
        draggedNode = node;
      } else {
        graph.pendingEdgeStart = null;
        graph.nodes.forEach(n => { if (n.state === 'queued') n.state = 'default'; });
      }
      lastClickTime = Date.now();
    }
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const wx = (mx - cam.offsetX) / cam.zoom + cam.x;
    const wy = (my - cam.offsetY) / cam.zoom + cam.y;
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    cam.zoom = Math.max(0.08, Math.min(6, cam.zoom * f));
    cam.offsetX = mx - (wx - cam.x) * cam.zoom;
    cam.offsetY = my - (wy - cam.y) * cam.zoom;
  }, { passive: false });

  const onMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (isPanning) {
      cam.offsetX += e.clientX - dragStartX; cam.offsetY += e.clientY - dragStartY;
      dragStartX = e.clientX; dragStartY = e.clientY;
    }
    if (draggedNode) {
      const wx = (mx - cam.offsetX) / cam.zoom + cam.x;
      const wy = (my - cam.offsetY) / cam.zoom + cam.y;
      draggedNode.x = draggedNode.curX = wx;
      draggedNode.y = draggedNode.curY = wy;
    }
  };
  const onMouseUp = () => { isPanning = false; draggedNode = null; };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  let lastTime = performance.now();
  let rafId = null;

  function loop(now) {
    if (destroyed) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    tickPopup(dt);
    updateLiveStats();

    const W = canvas.clientWidth, H = canvas.clientHeight;
    const T = getT();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(cam.offsetX, cam.offsetY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // Edges
    graph.edges.forEach(e => {
      const n1 = graph.nodes[e.from], n2 = graph.nodes[e.to];
      if (!n1 || !n2) return;
      const alpha = Math.min(n1.alpha, n2.alpha);
      ctx.beginPath(); ctx.moveTo(n1.curX, n1.curY); ctx.lineTo(n2.curX, n2.curY);
      ctx.strokeStyle = colA(T.edgeCol, alpha * 0.8); ctx.lineWidth = 2; ctx.stroke();

      // Weight label
      const mx = (n1.curX + n2.curX) * 0.5, my = (n1.curY + n2.curY) * 0.5;
      ctx.fillStyle = T.bg; ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI*2); ctx.fill();
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = T.accent;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.weight, mx, my);
    });

    // Nodes
    graph.nodes.forEach(node => {
      if (node.alpha < 1) node.alpha = Math.min(1, node.alpha + dt * 2);
      if (node.pulseTimer > 0) node.pulseTimer -= dt;
      const cx = node.curX, cy = node.curY, a = node.alpha;

      if ((node.state === 'queued' || node.state === 'visiting') && node.pulseTimer > 0) {
        const p = Math.sin(node.pulseTimer * 8) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, NODE_R + 10 * p, 0, Math.PI * 2);
        ctx.fillStyle = colA('#ffe628', p * 0.4 * a); ctx.fill();
      }

      ctx.beginPath(); ctx.arc(cx + 2, cy + 3, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = colA(T.nodeShadow, a * 0.4); ctx.fill();

      let nodeColor = node.color;
      if (node.state === 'visited') nodeColor = '#48d782';
      else if (node.state === 'visiting') nodeColor = '#ff913c';
      else if (node.state === 'queued') nodeColor = '#ffc832';
      
      ctx.beginPath(); ctx.arc(cx, cy, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = colA(nodeColor, a); ctx.fill();
      
      if (node.id === graph.pendingEdgeStart) {
        ctx.beginPath(); ctx.arc(cx, cy, NODE_R + 5, 0, Math.PI * 2);
        ctx.strokeStyle = colA('#ff913c', a); ctx.lineWidth = 2; ctx.stroke();
      }

      ctx.font = '700 14px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.fillText(node.label, cx, cy + 1);

      // Dist label
      if (graph.dist[node.id] !== undefined && graph.dist[node.id] !== Infinity) {
        ctx.font = '600 10px Space Grotesk'; ctx.fillStyle = T.textDim;
        ctx.fillText('d:'+graph.dist[node.id], cx, cy - NODE_R - 5);
      }
    });

    ctx.restore();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  function destroy() {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    container.innerHTML = '';
  }

  return { graph, destroy, resetCamera };
}
