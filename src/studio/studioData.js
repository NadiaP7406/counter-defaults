// Studio (mixing-desk design) wired to OUR vetted content. Channels are built
// from the existing DIMENSIONS/DIM_COLORS/PRESETS so the copy, levels, and
// generated output stay byte-identical to the current tool. The Studio is a
// presentation layer only — no content lives here.
import { DIMENSIONS } from '../data/dimensions.js';
import { PRESETS as RAW_PRESETS } from '../data/presets.js';

const KEYS = Object.keys(DIMENSIONS); // channel index order

// Short fader labels (compact). Full title still shows in the info card.
const SHORT = {
  sovereignty: 'Sovereignty', uncertainty: 'Uncertainty', referencing: 'Reference',
  worldview: 'Worldview', divergence: 'Divergence', sycophancy: 'Sycophancy',
  anthropo: 'Persona', presence: 'Presence', memory: 'Context', privacy: 'Privacy',
  calibration: 'Calibration', voice: 'Voice', frugality: 'Frugality', reflection: 'Reflection',
};

// A distinct hue per channel (Studio-only; cosmetic, no effect on output). The
// live tool's cluster colors repeat, which muddied the desk — here every fader,
// node and level-pill is its own color.
const STUDIO_COLORS = {
  sovereignty: '#68FF9E', uncertainty: '#80F2FF', referencing: '#A5A6F6',
  worldview: '#8A6CEF', divergence: '#3C69FD', sycophancy: '#FC6653',
  anthropo: '#F0C8C8', presence: '#92FFB9', memory: '#5BD6C0', privacy: '#FF55CF',
  calibration: '#FFD23F', voice: '#F5FF6E', frugality: '#F59E2E', reflection: '#E08CFF',
};

export const CHANNELS = KEYS.map((key) => {
  const d = DIMENSIONS[key];
  return {
    key,
    name: d.title,
    short: SHORT[key] || d.title,
    emoji: d.emoji,
    color: STUDIO_COLORS[key],
    poles: d.poles,        // [left/default, right/counter]
    why: d.why,            // human blurb (may contain markdown links/italics)
    caveat: d.caveat || null, // e.g. Memory/Calibration "assumes memory features on"
    advanced: !!d.advanced,
    labels: d.options.map((o) => o.label),  // 4 level labels
    descs: d.options.map((o) => o.desc),     // 4 short level descriptions
  };
});

// Default state: everything at 0 (our conceptual core). The 6 core dims load by
// default; the rest sit in the channel library.
export const DEFAULTS = CHANNELS.map(() => 0);
const CORE_KEYS = ['sovereignty', 'uncertainty', 'sycophancy', 'voice', 'referencing', 'frugality'];
export const CORE = CORE_KEYS.map((k) => KEYS.indexOf(k));

// Presets converted from our state-object form to a per-channel level array.
export const PRESETS = Object.values(RAW_PRESETS).map((p) => ({
  name: p.name,
  desc: p.desc,
  levels: KEYS.map((k) => p.state[k] || 0),
  tropes: (p.state.tropes || []).slice(),
}));

// Build the state object our generateMarkdown expects, from a levels array
// (+ optional trope ids). This drives the byte-identical output.
export function levelsToState(levels, tropes = []) {
  const state = {};
  KEYS.forEach((k, i) => { state[k] = levels[i]; });
  state.tropes = tropes;
  return state;
}
