import { DIMENSIONS } from '../data/dimensions.js';
import { TROPES } from '../data/tropes.js';

// Compact shareable encoding: #s=<13 digits in DIMENSIONS key order>&t=<trope ids joined by dots>
// Example: #s=3300020001032&t=emdash.fillers

const DIM_ORDER = Object.keys(DIMENSIONS);

export function isDefaultState(state) {
  return DIM_ORDER.every((k) => state[k] === 0) && state.tropes.length === 0;
}

export function encodeState(state) {
  const digits = DIM_ORDER.map((k) => state[k]).join('');
  let encoded = `s=${digits}`;
  if (state.tropes.length > 0) encoded += `&t=${state.tropes.join('.')}`;
  return encoded;
}

export function decodeState(hash) {
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const s = params.get('s');
  if (!s || s.length !== DIM_ORDER.length || /\D/.test(s)) return null;
  const state = {};
  DIM_ORDER.forEach((k, i) => {
    const v = parseInt(s[i], 10);
    state[k] = v < DIMENSIONS[k].options.length ? v : 0;
  });
  const t = params.get('t');
  state.tropes = t ? t.split('.').filter((id) => TROPES.some((tr) => tr.id === id)) : [];
  return state;
}
