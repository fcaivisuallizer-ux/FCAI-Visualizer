const fs = require('fs');
let data = fs.readFileSync('algoviz-react/src/algorithms/sorting/scratch.js', 'utf8');

const prefix = `let canvas, ctx;
let state = { speed: 5, steps: [], array: [], algo: 'bubble' };
let _anim = { active: false, offsets: {} };
let sortViewMode = 'bars'; // 'bars' or 'cells'

function _animReset() { 
  _anim.active = false; 
  _anim.offsets = {}; 
  if (_anim.rafId) cancelAnimationFrame(_anim.rafId); 
  _anim.rafId = null; 
}

// Easing functions
function _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function _easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function _easeOutBack(t) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

function setDsScroll(val) { /* mock */ }

`;

data = prefix + data;

data += `

export const SortingVisualizer = {
  init: (canvasEl) => {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  },
  setState: (newState) => { 
    state = { ...state, ...newState }; 
  },
  setMode: (mode) => { sortViewMode = mode; },
  drawStep: (idx) => { drawStep(idx); },
  animateStep: (idx, callback) => { _animateStep(idx, callback); },
  stopAnimation: () => { _animReset(); },
};
`;

fs.writeFileSync('algoviz-react/src/algorithms/sorting/sortingVisualizer.js', data);
console.log('Done!');
