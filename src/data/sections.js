import { CORAL, GREEN, BLUE, COBALT, PINK } from '../utils/constants.js';

// One section since June 2026 (Nadia's call: the 5 categories overwhelmed people).
// The first 6 dims are always visible, in this order; the rest carry
// `advanced: true` in dimensions.js and sit behind the section toggle.
// NOTE: this is render order only. The key order in DIMENSIONS drives the
// URL encoding and must not change.
export const SECTIONS = [
  {
    id: 'dims', num: '01', title: 'Dimensions', color: CORAL,
    dims: [
      'sovereignty', 'uncertainty', 'sycophancy', 'voice', 'referencing', 'frugality',
      'worldview', 'divergence', 'anthropo', 'presence', 'privacy', 'memory', 'calibration',
    ],
  },
];

// Accent color per dim (slider thumb, option box tint), carried over from the
// old 5-section grouping so the palette keeps its variety.
export const DIM_COLORS = {
  sovereignty: CORAL, uncertainty: CORAL, divergence: CORAL,
  referencing: GREEN, worldview: GREEN, presence: GREEN,
  sycophancy: BLUE, anthropo: BLUE, calibration: BLUE,
  frugality: COBALT, memory: COBALT, privacy: COBALT,
  voice: PINK,
};
