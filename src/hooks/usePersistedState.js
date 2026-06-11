import { useState, useEffect } from 'react';
import { DIMENSIONS } from '../data/dimensions.js';
import { TROPES } from '../data/tropes.js';
import { encodeState, decodeState, isDefaultState } from '../utils/urlState.js';

const STORAGE_KEY = 'counter-defaults-state';

function sanitize(parsed, initialState) {
  const state = { ...initialState };
  Object.keys(DIMENSIONS).forEach((k) => {
    const v = parsed[k];
    if (Number.isInteger(v) && v >= 0 && v < DIMENSIONS[k].options.length) state[k] = v;
  });
  if (Array.isArray(parsed.tropes)) {
    state.tropes = parsed.tropes.filter((id) => TROPES.some((t) => t.id === id));
  }
  return state;
}

// Load priority: URL hash (shared link) > localStorage > default.
// Every change mirrors to localStorage and the URL hash, so the address bar
// is always a shareable link. Default state keeps the URL clean.
export function usePersistedState(initialState) {
  const [state, setState] = useState(() => {
    const fromUrl = decodeState(window.location.hash);
    if (fromUrl) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return sanitize(JSON.parse(stored), initialState);
    } catch {
      // corrupted storage or storage unavailable; fall through to default
    }
    return initialState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode, embedded context); URL hash still works
    }
    const url = isDefaultState(state)
      ? window.location.pathname + window.location.search
      : '#' + encodeState(state);
    window.history.replaceState(null, '', url);
  }, [state]);

  return [state, setState];
}
