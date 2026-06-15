import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CREAM, PAPER, INK, CORAL, CORAL_TEXT, GREEN, PINK, BLUE, LILAC, YELLOW, COBALT, PURPLE } from '../utils/constants.js';
import { DIMENSIONS } from '../data/dimensions.js';
import { SECTIONS, DIM_COLORS } from '../data/sections.js';
import { TROPES } from '../data/tropes.js';
import { PRESETS } from '../data/presets.js';
import { generateMarkdown } from '../utils/generateMarkdown.js';
import { usePersistedState } from '../hooks/usePersistedState.js';
import { decodeState } from '../utils/urlState.js';

function renderInline(text) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g;
  let match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<a key={`l${key++}`} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>);
    else if (match[3]) parts.push(<em key={`i${key++}`}>{match[3]}</em>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const Divider = () => (
  <div style={{ textAlign: 'center', margin: '60px 0 36px', letterSpacing: '24px', fontSize: '22px', opacity: 0.45 }}>✱ ✱ ✱</div>
);

const initialState = {
  sovereignty: 0, uncertainty: 0, referencing: 0, worldview: 0, divergence: 0,
  sycophancy: 0, anthropo: 0, presence: 0, memory: 0, privacy: 0,
  voice: 0, frugality: 0, calibration: 0, reflection: 0, tropes: [],
};

// Section index for the sticky nav: the dimensions section plus the output.
// Two stops: the sliders, then the generated output. The count of set
// counter-defaults rides on the 'instructions' stop (B-2 layout).
const NAV_ITEMS = [
  { id: 'dims', label: 'tune', color: CORAL },
  { id: 'output', label: 'instructions', color: PURPLE },
];

const scrollToSection = (id) => {
  const el = document.getElementById(`sec-${id}`);
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};

function matchPreset(state) {
  return Object.keys(PRESETS).find(key => {
    const p = PRESETS[key].state;
    return Object.keys(DIMENSIONS).every(k => p[k] === state[k])
      && p.tropes.length === state.tropes.length
      && p.tropes.every(t => state.tropes.includes(t));
  }) || null;
}

export default function CounterDefaults() {
  const [state, setState] = usePersistedState(initialState);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [preReset, setPreReset] = useState(null);
  const undoTimer = useRef(null);
  const [presetApplied, setPresetApplied] = useState(null);
  const presetTimer = useRef(null);
  // True when this page loaded from a shared link (encoded state in the URL hash).
  const [fromShared, setFromShared] = useState(() => {
    try { return !!decodeState(window.location.hash); } catch { return false; }
  });
  const [showRefs, setShowRefs] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [editedOutput, setEditedOutput] = useState(null);
  const [activePreset, setActivePreset] = useState(() => matchPreset(state));
  // Toggled dims start collapsed even when set; the toggle label and the jump
  // pill carry the active count instead, so nothing expands uninvited.
  const [expandedSections, setExpandedSections] = useState({});
  const [pasteTab, setPasteTab] = useState('claude');
  const [outputInView, setOutputInView] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [progress, setProgress] = useState(0);
  const outputRef = useRef(null);

  // Hide the jump pill while the output section is on screen
  useEffect(() => {
    const el = outputRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setOutputInView(entry.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Track scroll for the section nav highlight and the mobile progress bar.
  // Runs directly (the work is two getBoundingClientRect calls); React bails on
  // the setState when the value is unchanged, so no rAF throttle is needed, and
  // it keeps working when the tab is backgrounded (rAF would be throttled).
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      const marker = window.innerHeight * 0.35;
      let current = null;
      NAV_ITEMS.forEach(item => {
        const el = document.getElementById(`sec-${item.id}`);
        if (el && el.getBoundingClientRect().top <= marker) current = item.id;
      });
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const changeCount = Object.keys(DIMENSIONS).filter(k => state[k] !== 0).length + state.tropes.length;

  const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const generated = useMemo(() => generateMarkdown(state), [state]);
  const displayOutput = editedOutput !== null ? editedOutput : generated;
  const outChars = displayOutput.length;
  const outWords = displayOutput.trim() ? displayOutput.trim().split(/\s+/).length : 0;

  useEffect(() => { setEditedOutput(null); }, [state]);

  // Any manual edit dismisses the transient preset confirmation and the
  // shared-link banner (you're now editing your own thing, not just viewing).
  const onManualChange = () => { setActivePreset(null); setPresetApplied(null); setFromShared(false); };
  const updateField = (id, value) => { setState((s) => ({ ...s, [id]: value })); onManualChange(); };
  const toggleTrope = (id) => { setState((s) => ({ ...s, tropes: s.tropes.includes(id) ? s.tropes.filter((t) => t !== id) : [...s.tropes, id] })); onManualChange(); };
  // Reset stashes the prior state so an accidental wipe is recoverable for a few
  // seconds; the RESET button morphs into UNDO during that window.
  const reset = () => {
    if (changeCount > 0) {
      setPreReset(state);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setPreReset(null), 7000);
    }
    setState(initialState);
    setActivePreset(null);
    setPresetApplied(null);
    setFromShared(false);
  };
  const undoReset = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (preReset) {
      setState(preReset);
      setActivePreset(matchPreset(preReset));
    }
    setPreReset(null);
  };
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (presetTimer.current) clearTimeout(presetTimer.current);
  }, []);
  const applyPreset = (key) => {
    const preset = PRESETS[key];
    setState({ ...preset.state });
    setActivePreset(key);
    setFromShared(false);
    setPresetApplied(key);
    if (presetTimer.current) clearTimeout(presetTimer.current);
    presetTimer.current = setTimeout(() => setPresetApplied(null), 6000);
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  };

  const copyToClipboard = async () => {
    await copyText(displayOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareConfig = async () => {
    await copyText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const thumbStyles = Object.entries(DIM_COLORS).map(([d, color]) => `
    input.cd-slider-${d}::-webkit-slider-thumb { background: ${color}; }
    input.cd-slider-${d}::-moz-range-thumb { background: ${color}; }
  `).join('\n');

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM, color: INK }}>
      <style>{`
        body { font-family: 'Inter', system-ui, sans-serif; }
        .mono { font-family: 'VT323', monospace; letter-spacing: 1px; }
        .smono { font-family: 'Space Mono', monospace; letter-spacing: 0.5px; }
        .display { font-family: 'Jersey 25', 'Darker Grotesque', 'Inter', sans-serif; font-weight: 400; letter-spacing: -0.01em; }
        .grain { background-image: radial-gradient(rgba(26,24,20,0.05) 1px, transparent 1px); background-size: 4px 4px; }
        .cd-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 1px; background: ${INK}; opacity: 0.6;
          outline: none; margin: 0; padding: 0;
        }
        .cd-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px;
          cursor: pointer; border: 1.5px solid ${INK};
          border-radius: 50%;
          transition: transform 0.15s ease;
        }
        .cd-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .cd-slider::-moz-range-thumb {
          width: 20px; height: 20px;
          cursor: pointer; border: 1.5px solid ${INK};
          border-radius: 50%;
        }
        ${thumbStyles}
        .opt-label {
          font-family: 'Inter', sans-serif; font-size: 12px; cursor: pointer;
          padding: 6px 11px; border-radius: 999px; white-space: nowrap;
          transition: all 0.1s ease; color: ${INK};
          background: none; border: none; min-height: 28px;
          display: inline-flex; align-items: center;
        }
        .opt-label:hover { background: rgba(26,24,20,0.08); }
        .opt-label.selected { background: ${INK}; color: ${CREAM}; font-weight: 500; }
        .opt-label.selected:hover { background: ${INK}; }
        .callout-tab {
          position: absolute; top: -12px; left: 16px;
          padding: 2px 10px; border: 1.5px solid ${INK}; border-radius: 5px;
          font-family: 'VT323', monospace; font-size: 14px; letter-spacing: 1px;
        }
        .callout {
          position: relative; border: 1.5px dashed ${INK}; border-radius: 10px;
          padding: 22px 20px 18px;
        }
        .callout-toggle {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; margin-top: 4px; padding: 0; background: none; border: none;
          cursor: pointer; text-align: left; color: ${INK}; font-family: 'Inter', sans-serif;
        }
        .callout-toggle:hover span:first-child { text-decoration: underline; }
        .preset-btn {
          background: ${PAPER}; border: 1.5px solid ${INK}; border-radius: 8px;
          padding: 12px 16px; cursor: pointer; text-align: left;
          transition: all 0.1s ease; font-family: 'Inter', sans-serif;
        }
        .preset-btn:hover { background: ${YELLOW}; }
        .preset-btn.active { background: ${CORAL}; }
        .btn-primary {
          color: ${INK}; border: 1.5px solid ${INK};
          font-family: 'VT323', monospace; font-size: 18px; letter-spacing: 1px;
          padding: 8px 18px; cursor: pointer; border-radius: 6px;
        }
        .btn-primary:hover { background: ${YELLOW}; }
        .btn-secondary {
          background: ${PAPER}; color: ${INK}; border: 1.5px solid ${INK};
          font-family: 'VT323', monospace; font-size: 18px; letter-spacing: 1px;
          padding: 8px 18px; cursor: pointer; border-radius: 6px;
        }
        .btn-secondary:hover { background: ${YELLOW}; }
        .trope-card {
          background: ${PAPER}; border: 1.5px solid ${INK}; border-radius: 8px;
          padding: 14px; transition: all 0.15s ease; cursor: pointer;
        }
        .trope-card:hover { background: ${YELLOW}; }
        .trope-card.checked { background: ${YELLOW}; }
        .editable-output {
          background: transparent; color: ${INK}; border: none; outline: none;
          width: 100%; resize: vertical; font-family: 'VT323', monospace;
          font-size: 17px; letter-spacing: 0.5px; line-height: 1.6;
          padding: 14px 18px; min-height: 300px;
        }
        a { color: ${INK}; text-decoration: underline; text-underline-offset: 2px; }
        a:hover { background: ${YELLOW}; }
        .jump-pill {
          position: fixed; bottom: 18px; right: 18px; z-index: 50;
          background: ${INK}; color: ${CREAM}; border: 1.5px solid ${INK};
          font-family: 'VT323', monospace; font-size: 18px; letter-spacing: 1px;
          padding: 8px 18px; border-radius: 999px; cursor: pointer;
          box-shadow: 2px 2px 0 rgba(26,24,20,0.25);
        }
        .jump-pill:hover { background: ${YELLOW}; color: ${INK}; }
        /* On wide screens the bottom-right nav carries the count, so the pill hides */
        @media (min-width: 1100px) { .jump-pill { display: none; } }
        .section-nav { display: none; }
        @media (min-width: 1100px) {
          .section-nav {
            display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
            position: fixed; bottom: 24px; right: 28px; z-index: 50;
          }
        }
        .section-nav-header {
          font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 1px;
          text-transform: uppercase; color: ${INK}; opacity: 0.5; margin-bottom: 2px;
        }
        .nav-stop {
          display: flex; align-items: center; gap: 9px;
          background: none; border: none; cursor: pointer; padding: 2px 0;
          font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.5px;
          color: ${INK}; text-align: left;
        }
        .nav-stop:hover { opacity: 1 !important; }
        .nav-stop-dot {
          width: 12px; height: 12px; border-radius: 50%;
          border: 1.5px solid ${INK}; flex-shrink: 0; transition: background 0.1s ease;
        }
        .section-nav-count {
          font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.5px;
          color: ${INK}; opacity: 0.6; margin-left: 21px; padding: 1px 0;
        }
        .scroll-progress {
          position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 60;
          background: ${CORAL}; transform-origin: left; pointer-events: none;
        }
        @media (min-width: 1100px) { .scroll-progress { display: none; } }
        .paste-tab {
          font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 0.5px;
          padding: 3px 12px; border: 1.5px solid ${INK}; border-radius: 999px;
          background: ${PAPER}; color: ${INK}; cursor: pointer;
        }
        .paste-tab:hover { background: ${YELLOW}; }
        .paste-tab.active { background: ${INK}; color: ${CREAM}; }
      `}</style>

      <div className="grain min-h-screen">
        <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

        <nav className="section-nav" aria-label="Go to section">
          <span className="section-nav-header">go to</span>
          {NAV_ITEMS.map((item, i) => {
            const active = activeSection === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className="nav-stop"
                  style={{ opacity: active ? 1 : 0.5 }}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="nav-stop-dot" style={{ background: active ? item.color : 'transparent' }} />
                  <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
                </button>
                {i < NAV_ITEMS.length - 1 && <span className="section-nav-count">set: {changeCount}</span>}
              </React.Fragment>
            );
          })}
        </nav>

        {changeCount > 0 && !outputInView && (
          <button
            className="jump-pill"
            onClick={() => scrollToSection('output')}
            aria-label={`See your instructions. ${changeCount} counter-defaults set.`}
          >
            ✱ See your instructions ({changeCount})
          </button>
        )}

        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-10">

          {/* Header strip */}
          <div className="smono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${INK}`, paddingBottom: '8px', fontSize: '13px', opacity: 0.8, marginBottom: '28px' }}>
            <span>● by <a href="https://aixdesign.co" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>AIxDESIGN</a></span>
            <span>2026 / v1.0</span>
          </div>

          {/* Title */}
          <h1 className="display" style={{ fontSize: 'clamp(64px, 13vw, 124px)', lineHeight: 0.78, marginBottom: '24px' }}>
            Counter-<br/>
            <span style={{ color: CORAL_TEXT }}>Defaults</span><span style={{ fontSize: '0.22em', verticalAlign: '0.9em', marginLeft: '0.1em', color: INK, letterSpacing: 0 }}>v1.0</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: '17px', lineHeight: 1.5, marginBottom: '24px', maxWidth: '54ch' }}>
            Your LLM has default behaviors: agreeing with you, sounding sure, writing in your place. This tool writes the instructions that override them. Paste them into your settings once, and every conversation after follows your rules.
          </p>

          {/* Two callouts: WHY left, HOW right. Collapsed by default; the subtitle
              carries the core framing, these hold the deeper rationale + mechanism. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8" style={{ alignItems: 'start' }}>
            <div className="callout" style={{ background: PINK }}>
              <div className="callout-tab" style={{ background: GREEN }}>● WHY THIS EXISTS</div>
              <button onClick={() => setShowWhy(!showWhy)} aria-expanded={showWhy} className="callout-toggle">
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Why counter the defaults</span>
                <span className="mono" style={{ fontSize: '18px', lineHeight: 1 }}>{showWhy ? '–' : '+'}</span>
              </button>
              {showWhy && (
                <>
                  <p style={{ fontSize: '14px', lineHeight: 1.55, marginTop: '10px' }}>
                    Most LLMs default to agreeing with you, sounding sure, and writing for you. Useful when you want a confident assistant. Less useful when you want to stay the one doing the thinking. The gains and the costs come from the same capabilities. This is for keeping one while drawing limits on the other: your judgment, your voice, your attention stay yours.
                  </p>
                  <button onClick={() => setShowRefs(!showRefs)} className="mono" style={{ marginTop: '8px', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', opacity: 0.75 }}>
                    {showRefs ? '> hide note' : '> read more'}
                  </button>
                  {showRefs && (
                    <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.5, borderTop: `1px dashed ${INK}`, paddingTop: '10px', opacity: 0.85 }}>
                      <p style={{ marginBottom: '6px' }}><strong>On tools and capacity.</strong> Illich, <em>Tools for Conviviality</em> (1973): tools tip from extending capacity into substituting for it past a threshold he called <em>radical monopoly</em>.</p>
                      <p style={{ marginBottom: '6px' }}><strong>On cognitive surrender.</strong> Shaw &amp; Nave (Wharton, 2026): people adopt AI outputs even when wrong (+25 pts when AI right, −15 pts when wrong). Lee et al. (Microsoft Research, CHI '25, n=319): higher confidence in AI correlates with lower critical thinking effort.</p>
                      <p style={{ marginBottom: '6px' }}><strong>On sycophancy.</strong> Sharma, Tong, Korbak et al. (Anthropic, ICLR 2024): five AI assistants consistently exhibit sycophancy; partly traced to human preference data favoring sycophantic responses. Fanous et al. (Stanford, SycEval 2025): 58.19% sycophancy baseline across major models.</p>
                      <p style={{ marginBottom: '6px' }}><strong>On preference writing.</strong> Scott Waddell (Medium, 2025): the "behavioral spec" approach. Specifying behavior with contrast pairs (do X, not Y) works better than abstract requests for honesty or directness. This tool's preference outputs follow that pattern.</p>
                      <p><strong>On homogeneity.</strong> Wenger &amp; Kenett (Duke, PNAS Nexus 2026): individual LLM responses can be as creative as average human responses, but LLM responses cluster heavily together. Widespread use narrows the variety of thinking in circulation.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="callout" style={{ background: YELLOW }}>
              <div className="callout-tab" style={{ background: PAPER }}>▶ HOW THIS WORKS</div>
              <button onClick={() => setShowHow(!showHow)} aria-expanded={showHow} className="callout-toggle">
                <span style={{ fontSize: '14px', fontWeight: 600 }}>From sliders to settings</span>
                <span className="mono" style={{ fontSize: '18px', lineHeight: 1 }}>{showHow ? '–' : '+'}</span>
              </button>
              {showHow && (
                <>
                  <p style={{ fontSize: '14px', lineHeight: 1.55, marginTop: '10px' }}>
                    Each slider starts on the left, where LLMs already are. Drag right to swap that default for yours. Your choices become one block of custom instructions: paste it into your LLM's settings once, and it applies to every conversation from then on, in ChatGPT, Claude, Gemini, or anything else with a settings field.
                  </p>
                  <p style={{ fontSize: '14px', fontStyle: 'italic', marginTop: '6px' }}>Only sliders you've moved show up in your output.</p>
                </>
              )}
            </div>
          </div>

          {/* Shared-link banner: shown when the page opened from a shared config */}
          {fromShared && changeCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: LILAC, border: `1.5px solid ${INK}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', lineHeight: 1.5, flex: 1, minWidth: '200px' }}>
                ↩ You opened a shared setup, <strong>{changeCount} behaviors set</strong>. Tweak any slider to make it yours, or start over.
              </span>
              <button onClick={reset} className="btn-secondary" style={{ fontSize: '15px', padding: '5px 14px' }}>START FRESH</button>
              <button onClick={() => setFromShared(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px', color: INK }}>×</button>
            </div>
          )}

          {/* Presets */}
          <div className="smono" style={{ fontSize: '13px', marginBottom: '12px', opacity: 0.75 }}>▶ I WANT MY LLM TO… / pick a starting point</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => applyPreset(key)} className={`preset-btn ${activePreset === key ? 'active' : ''}`}>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>{preset.name}</p>
                <p style={{ fontStyle: 'italic', fontSize: '13px', opacity: 0.75, marginTop: '2px' }}>{preset.desc}</p>
              </button>
            ))}
          </div>

          {/* Preset confirmation: transient, names what was applied and points to the output */}
          {presetApplied && PRESETS[presetApplied] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: GREEN, border: `1.5px solid ${INK}`, borderRadius: '10px', padding: '10px 16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', lineHeight: 1.5, flex: 1, minWidth: '200px' }}>
                ✓ Applied <strong>{PRESETS[presetApplied].name}</strong>, {changeCount} behaviors set across the sliders below.
              </span>
              <button onClick={() => scrollToSection('output')} className="btn-secondary" style={{ fontSize: '15px', padding: '5px 14px', background: PAPER }}>SEE INSTRUCTIONS ↓</button>
            </div>
          )}

          {/* Sections */}
          {SECTIONS.map((section) => (
            <React.Fragment key={section.id}>
              <Divider />
              <section id={`sec-${section.id}`} style={{ marginBottom: '20px', scrollMarginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px', flexWrap: 'wrap' }}>
                  <span className="smono" style={{ width: '38px', height: '38px', borderRadius: '50%', background: section.color, border: `1.5px solid ${INK}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 'bold', color: section.color === COBALT ? '#FFFFFF' : 'inherit' }}>
                    {section.num}
                  </span>
                  <h2 className="display" style={{ fontSize: 'clamp(27px, 5vw, 42px)', lineHeight: 1, textTransform: 'uppercase' }}>
                    {section.title}
                  </h2>
                </div>

                {section.dims.map((dimKey) => {
                  const dim = DIMENSIONS[dimKey];
                  const value = state[dimKey];
                  const opt = dim.options[value];
                  const isAtDefault = value === 0;
                  const sectionExpanded = expandedSections[section.id];
                  if (dim.advanced && !sectionExpanded) return null;
                  return (
                    <div key={dimKey} style={{ marginBottom: '36px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                        <span style={{ marginRight: '6px' }}>{dim.emoji}</span>{dim.title}
                      </h3>
                      <p style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '14px', opacity: 0.82, maxWidth: '58ch' }}>
                        {renderInline(dim.why)}
                      </p>

                      {dim.caveat && (
                        <p style={{
                          fontSize: '12px',
                          fontStyle: 'italic',
                          opacity: 0.65,
                          marginTop: '-8px',
                          marginBottom: '14px',
                          padding: '6px 10px',
                          borderLeft: `2px solid ${INK}`,
                          lineHeight: 1.5,
                          maxWidth: '58ch',
                        }}>
                          <span className="smono" style={{ marginRight: '6px', fontStyle: 'normal', fontSize: '10px', letterSpacing: '0.5px' }}>NOTE</span>
                          {dim.caveat}
                        </p>
                      )}

                      {/* Slider frame */}
                      <div style={{ border: `1.5px solid ${INK}`, borderRadius: '10px', padding: '14px 20px 12px', background: PAPER }}>
                        <div className="smono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', opacity: 0.7, marginBottom: '10px', gap: '10px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '9px', letterSpacing: '0.5px', border: `1px solid ${INK}`, borderRadius: '3px', padding: '0 4px', whiteSpace: 'nowrap' }}>LLM DEFAULT</span>
                            {dim.poles[0]}
                          </span>
                          <span style={{ textAlign: 'right' }}>{dim.poles[1]}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={dim.options.length - 1}
                          value={value}
                          onChange={(e) => updateField(dimKey, parseInt(e.target.value))}
                          className={`cd-slider cd-slider-${dimKey}`}
                          aria-label={`${dim.title}: ${dim.poles[0]} to ${dim.poles[1]}. Currently: ${dim.options[value].label}`}
                          aria-valuetext={dim.options[value].label}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '4px', flexWrap: 'wrap' }}>
                          {dim.options.map((o, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => updateField(dimKey, i)}
                              className={`opt-label ${value === i ? 'selected' : ''}`}
                              aria-pressed={value === i}
                              aria-label={`${dim.title}: ${o.label}${i === 0 ? ' (LLM default)' : ''}`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Detail for the selected option. The label already shows as the
                          highlighted pill above, so the box carries only the description. */}
                      <div style={{ marginTop: '8px', background: `${DIM_COLORS[dimKey]}55`, border: `1.5px solid ${INK}`, borderRadius: '10px', padding: '12px 18px' }}>
                        <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
                          {isAtDefault && <span className="mono" style={{ fontSize: '12px', letterSpacing: '0.5px', opacity: 0.65, marginRight: '8px' }}>[ LLM DEFAULT ]</span>}
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {section.id === 'dims' && expandedSections[section.id] && (
                  <div style={{ marginBottom: '36px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ marginRight: '6px' }}>🚫</span>Patterns to avoid
                    </h3>
                    <p style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '14px', opacity: 0.82, maxWidth: '58ch' }}>
                      Common AI writing tropes you can ban outright. Check the ones you want excluded from any output.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TROPES.map((trope) => {
                        const checked = state.tropes.includes(trope.id);
                        return (
                          <label key={trope.id} className={`trope-card ${checked ? 'checked' : ''}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleTrope(trope.id)} style={{ marginTop: '3px', accentColor: PINK, transform: 'scale(1.15)' }} />
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px' }}>{trope.label}</p>
                              <p style={{ fontStyle: 'italic', fontSize: '12.5px', opacity: 0.75, marginTop: '2px', lineHeight: 1.5 }}>{trope.text}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const advancedDims = section.dims.filter(k => DIMENSIONS[k].advanced);
                  const hasPatterns = section.id === 'dims';
                  const items = [...advancedDims.map(k => DIMENSIONS[k].title)];
                  if (hasPatterns) items.push('Patterns to avoid');
                  if (items.length === 0) return null;
                  const activeCount = advancedDims.filter(k => state[k] > 0).length + (hasPatterns && state.tropes.length > 0 ? 1 : 0);
                  const expanded = expandedSections[section.id];
                  return (
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="smono"
                      style={{
                        background: 'transparent',
                        border: `1.5px dashed ${INK}`,
                        borderRadius: '10px',
                        padding: '12px 20px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: INK,
                        marginBottom: '36px',
                        marginTop: '-12px',
                        width: '100%',
                        textAlign: 'left',
                        opacity: 0.75,
                      }}
                    >
                      {expanded
                        ? `▾ Show fewer`
                        : `▸ ${items.length} more${activeCount > 0 ? ` (${activeCount} active)` : ''}: ${items.join(', ')}`}
                    </button>
                  );
                })()}
              </section>
            </React.Fragment>
          ))}

          {/* Output section */}
          <Divider />
          <section id="sec-output" ref={outputRef} style={{ marginBottom: '40px', scrollMarginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span className="smono" style={{ width: '38px', height: '38px', borderRadius: '50%', background: PURPLE, border: `1.5px solid ${INK}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 'bold' }}>02</span>
              <h2 className="display" style={{ fontSize: 'clamp(27px, 5vw, 42px)', lineHeight: 1, textTransform: 'uppercase' }}>Your instructions</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.75, maxWidth: '40ch' }}>
                Editable. Tweak the text directly before copying.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={preReset ? undoReset : reset} className="btn-secondary" style={{ background: preReset ? GREEN : PAPER }} aria-label={preReset ? 'Undo reset, restore previous settings' : 'Reset all settings'}>
                  {preReset ? '↩ UNDO' : 'RESET'}
                </button>
                <button onClick={shareConfig} className="btn-secondary" style={{ background: shared ? GREEN : PAPER }}>
                  {shared ? '✓ LINK COPIED' : 'SHARE'}
                </button>
                <button onClick={copyToClipboard} className="btn-primary" style={{ background: copied ? GREEN : PURPLE }}>
                  {copied ? '✓ COPIED' : 'COPY ▸'}
                </button>
              </div>
            </div>
            <div style={{ border: `1.5px solid ${INK}`, borderRadius: '10px', overflow: 'hidden', background: PAPER }}>
              <div className="mono" style={{ background: INK, color: CREAM, padding: '5px 14px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span>instructions.md {editedOutput !== null && <span style={{ opacity: 0.7 }}>● edited</span>}</span>
                <span style={{ opacity: 0.7 }}>● ● ●</span>
              </div>
              <textarea className="editable-output" value={displayOutput} onChange={(e) => setEditedOutput(e.target.value)} spellCheck={false} aria-label="Your generated LLM instructions, editable before copying" />
            </div>
            {changeCount > 0 && (
              <p className="smono" style={{ fontSize: '11px', opacity: 0.6, marginTop: '7px' }}>
                ≈ {outWords} words · {outChars.toLocaleString()} characters
                {outChars > 1500 && <span style={{ color: CORAL_TEXT, opacity: 1, fontWeight: 700 }}> · long, some settings fields cap input. Trim the behaviors you care about least.</span>}
              </p>
            )}

            <div className="callout" style={{ marginTop: '24px', background: BLUE }}>
              <div className="callout-tab" style={{ background: PAPER }}>▶ WHERE TO PASTE</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '10px' }}>
                {[
                  { id: 'claude', label: 'Claude' },
                  { id: 'chatgpt', label: 'ChatGPT' },
                  { id: 'gemini', label: 'Gemini' },
                  { id: 'other', label: 'Other / API' },
                ].map((t) => (
                  <button key={t.id} onClick={() => setPasteTab(t.id)} className={`paste-tab ${pasteTab === t.id ? 'active' : ''}`} aria-pressed={pasteTab === t.id}>
                    {t.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                {pasteTab === 'claude' && (
                  <>Open <a href="https://claude.ai/settings/profile" target="_blank" rel="noopener noreferrer">claude.ai/settings/profile</a> and paste into the personal preferences field. Applies to new chats.</>
                )}
                {pasteTab === 'chatgpt' && (
                  <>In ChatGPT, click your profile → Settings → Personalization → Custom instructions. Paste into "How would you like ChatGPT to respond?".</>
                )}
                {pasteTab === 'gemini' && (
                  <>Open <a href="https://gemini.google.com/saved-info" target="_blank" rel="noopener noreferrer">gemini.google.com/saved-info</a> and paste it there. Gemini calls this "Saved info".</>
                )}
                {pasteTab === 'other' && (
                  <>Look for 'Custom Instructions,' 'Personalization,' or 'Profile' in the settings. Using an LLM through an API? Paste it at the top of your system prompt.</>
                )}
              </p>
            </div>

            <div className="callout" style={{ marginTop: '24px', background: LILAC }}>
              <div className="callout-tab" style={{ background: PAPER }}>＋ ADD YOURSELF (after pasting)</div>
              <div style={{ fontSize: '14px', lineHeight: 1.6, marginTop: '4px' }}>
                {[
                  { tag: 'about you', text: `your role, your field, and how much you already know, so it stops over- or under-explaining.` },
                  { tag: 'your voice', text: `if you set Voice toward "sounds like me," paste a few lines you've written or describe your style. It can't match a voice it hasn't seen.`, flag: state.voice > 0 },
                  { tag: 'your work', text: `the projects, tools, and terms that come up a lot, so you're not re-explaining them every time.` },
                  { tag: 'your aspirations', text: `what you want to do, learn, or get better at, so it can remind you of them and steer you that way, not just answer what's in front of you.` },
                  { tag: 'working modes', text: `e.g. sparring mode vs drafting mode, and how to tell which you're in.` },
                ].map((item) => (
                  <p
                    key={item.tag}
                    style={{
                      marginBottom: '8px',
                      ...(item.flag ? { background: `${YELLOW}AA`, borderRadius: '6px', padding: '6px 10px', marginLeft: '-4px' } : {}),
                    }}
                  >
                    <span className="mono" style={{ background: item.flag ? CORAL : INK, color: item.flag ? INK : CREAM, padding: '1px 8px', fontSize: '12px', borderRadius: '3px', marginRight: '6px' }}>
                      {item.flag ? '★ ' : ''}{item.tag}
                    </span>
                    {item.text}
                    {item.flag && (
                      <em style={{ display: 'block', fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>
                        You moved Voice toward your own style, so this one matters for you.
                      </em>
                    )}
                  </p>
                ))}
              </div>
              <p style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.9, marginTop: '8px' }}>Keep it short. These ride along in every chat, so for each line ask: would cutting it change the answer?</p>
            </div>
          </section>

          {/* Footer */}
          <div style={{ borderTop: `1px dashed ${INK}`, paddingTop: '20px', opacity: 0.8 }}>
            <div className="smono" style={{ fontSize: '12px', marginBottom: '10px' }}>● COUNTER-DEFAULTS v1.0 / a prototype by <a href="https://aixdesign.co" target="_blank" rel="noopener noreferrer">AIxDESIGN</a></div>
            <details>
              <summary className="smono" style={{ fontSize: '12px', cursor: 'pointer' }}>▸ references</summary>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', listStyle: 'square', fontSize: '12.5px', lineHeight: 1.7 }}>
                <li><a href="https://dl.acm.org/doi/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer">Bender et al., Stochastic Parrots</a> (FAccT 2021)</li>
                <li>Escobar, <em>Designs for the Pluriverse</em> (Duke, 2018)</li>
                <li><a href="https://en.wikipedia.org/wiki/Tools_for_Conviviality" target="_blank" rel="noopener noreferrer">Illich, Tools for Conviviality</a> (1973)</li>
                <li><a href="https://link.springer.com/article/10.1007/s13347-020-00405-8" target="_blank" rel="noopener noreferrer">Mohamed, Png, Isaac, Decolonial AI</a> (2020)</li>
                <li><a href="https://arxiv.org/abs/2310.13548" target="_blank" rel="noopener noreferrer">Sharma et al., Sycophancy</a> (Anthropic, ICLR 2024)</li>
                <li>Shaw &amp; Nave, <em>Thinking, Fast, Slow, and Artificial</em> (Wharton, 2026)</li>
                <li><a href="https://arxiv.org/abs/2502.10844" target="_blank" rel="noopener noreferrer">Sun et al., Be Friendly Not Friends</a> (CHI 2026)</li>
              </ul>
            </details>
            <p style={{ marginTop: '12px', fontSize: '11px', opacity: 0.6 }}>grew out of Nadia Piet's experiments tweaking Claude, works with any LLM. use, fork, share. the output is yours.</p>
            <p style={{ marginTop: '4px', fontSize: '11px', opacity: 0.6 }}>your config lives in this page's URL. share the link, share the setup.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
