import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CHANNELS, DEFAULTS, CORE, PRESETS, levelsToState } from './studioData.js';
import { TROPES } from '../data/tropes.js';
import { generateMarkdown } from '../utils/generateMarkdown.js';
import { encodeState, decodeState, isDefaultState } from '../utils/urlState.js';

// ---- light "risograph" tokens ----
const BG = '#FFFCF4', WARM = '#fbf7ec', WHITE = '#ffffff', TRACK = '#efe9da';
const INK = '#15130d', BODY = '#4a4636', LABEL = '#6a6452', DEEMPH = '#6a6452', FAINT = '#6a6452';
const MONO = '#3a352a', RLINE = '#d8cfb8', CORAL = '#FC6653', COBALT = '#3C69FD';
const CX = 230, CY = 242, R = 150, INNER = 0.16;
const sm = "'Space Mono', monospace";
const N_CH = CHANNELS.length;

const clamp = (v) => Math.max(0, Math.min(3, v));
const KEYS = CHANNELS.map((c) => c.key);
const STORE_KEY = 'counter-defaults-state';

// Darken a channel hue until it reads at >=4.5:1 on the warm output bg, so the
// color-coded titles stay legible (the raw neons are far too light on cream).
function darkenForText(hex, bg = '#fbf7ec') {
  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const bl = lum(toRGB(bg));
  let rgb = toRGB(hex);
  const ratio = () => { const l = lum(rgb); const [a, b] = [l, bl].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
  let guard = 0;
  while (ratio() < 4.5 && guard++ < 60) rgb = rgb.map((v) => Math.max(0, Math.round(v * 0.9)));
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}
// title (e.g. "Cognitive sovereignty") -> readable color
const TITLE_COLOR = {};
const TITLE_BG = {};
CHANNELS.forEach((c) => { TITLE_COLOR[c.name] = darkenForText(c.color); TITLE_BG[c.name] = c.color; });

// Dark or white text, whichever actually contrasts better on a given fill.
function idealText(hex) {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const cInk = (L + 0.05) / (0.0055 + 0.05);  // contrast vs #15130d
  const cWhite = 1.05 / (L + 0.05);            // contrast vs #ffffff
  return cWhite > cInk ? '#ffffff' : '#15130d';
}

// Loaded channels = the 6 core, plus any channel that's been pushed above 0.
function deriveLoaded(lvls) {
  const ld = [...CORE];
  lvls.forEach((v, i) => { if (v > 0 && ld.indexOf(i) < 0) ld.push(i); });
  return ld;
}

// One-time restore: shared URL hash wins, else localStorage, else all-zero.
function readInit() {
  let st = null, shared = false;
  try { const u = decodeState(window.location.hash); if (u) { st = u; shared = true; } } catch (e) { /* ignore */ }
  if (!st) { try { const s = localStorage.getItem(STORE_KEY); if (s) st = JSON.parse(s); } catch (e) { /* ignore */ } }
  const levels = CHANNELS.map((c) => { const v = st && Number.isInteger(st[c.key]) ? st[c.key] : 0; return v >= 0 && v < 4 ? v : 0; });
  const tropes = st && Array.isArray(st.tropes) ? st.tropes.filter((id) => TROPES.some((t) => t.id === id)) : [];
  return { levels, tropes, loaded: deriveLoaded(levels), patternsLoaded: tropes.length > 0, fromShared: shared && (levels.some((v) => v > 0) || tropes.length > 0) };
}

// Render our why-text markdown ([link](url) + *italic*) inline.
function renderInline(text) {
  const parts = []; let last = 0; const re = /\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g;
  let m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<a key={'l' + key++} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>{m[1]}</a>);
    else if (m[3]) parts.push(<em key={'i' + key++}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function CounterDefaultsStudio() {
  const initRef = useRef(null);
  if (!initRef.current) initRef.current = readInit();
  const [levels, setLevels] = useState(initRef.current.levels);
  const [tropes, setTropes] = useState(initRef.current.tropes);
  const [loaded, setLoaded] = useState(initRef.current.loaded);
  const [patternsLoaded, setPatternsLoaded] = useState(initRef.current.patternsLoaded);
  const [fromShared, setFromShared] = useState(initRef.current.fromShared);
  const [focused, setFocused] = useState(initRef.current.loaded[0] ?? CORE[0]);
  const [infoOpen, setInfoOpen] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [addYouOpen, setAddYouOpen] = useState(false);
  const [cockpitOpen, setCockpitOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestMsg, setGuestMsg] = useState('');
  const [guestHp, setGuestHp] = useState(''); // honeypot, must stay empty
  const [guestState, setGuestState] = useState('idle'); // idle | sending | ok | err
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [preReset, setPreReset] = useState(null);
  const undoT = useRef(null);
  const linkT = useRef(null);
  // Below this width the desk stops being a locked one-screen console and
  // becomes a normally-scrolling stacked page (see notes at end of file).
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 880 : false));
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 880);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const drag = useRef({ kind: null, index: null });
  const tracks = useRef({});
  const svgEl = useRef(null);
  const curAxes = useRef([]);
  const curDirs = useRef([]);
  const copyT = useRef(null);
  const infoAutoShown = useRef(false); // auto-open the info card only on the very first fader move

  // Any manual edit means you're no longer just viewing a shared link.
  const touched = () => setFromShared(false);
  const setLevel = (i, lvl) => {
    lvl = clamp(lvl);
    setLevels((prev) => (prev[i] === lvl ? prev : prev.map((v, k) => (k === i ? lvl : v))));
    touched();
  };

  const toggleLoaded = (i) => {
    touched();
    setLoaded((prevLd) => {
      if (prevLd.indexOf(i) >= 0) {
        const ld = prevLd.filter((x) => x !== i);
        setLevels((lv) => lv.map((v, k) => (k === i ? 0 : v)));
        setFocused((f) => (f === i ? (ld.length ? ld[0] : null) : f));
        return ld;
      }
      // Load at level 0 (off) — the user pushes the fader to engage it.
      setFocused(i);
      return [...prevLd, i];
    });
  };

  const toggleTrope = (id) => { touched(); setTropes((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id])); };
  const togglePatterns = () => { touched(); setPatternsLoaded((v) => { if (v) setTropes([]); return !v; }); };
  const onReset = () => {
    if (levels.some((v) => v > 0) || tropes.length > 0) {
      setPreReset({ levels: levels.slice(), tropes: tropes.slice(), loaded: loaded.slice() });
      clearTimeout(undoT.current);
      undoT.current = setTimeout(() => setPreReset(null), 7000);
    }
    setLevels(DEFAULTS.slice()); setTropes([]); setPatternsLoaded(false); setLoaded(CORE.slice()); setFocused(CORE[0]); setInfoOpen(null); touched();
  };
  const undoReset = () => {
    clearTimeout(undoT.current);
    if (preReset) { setLevels(preReset.levels); setTropes(preReset.tropes); setLoaded(preReset.loaded); setFocused(preReset.loaded[0] ?? CORE[0]); }
    setPreReset(null);
  };
  const applyPreset = (p) => {
    touched();
    const lv = p.levels.slice();
    const ld = [...CORE];
    lv.forEach((v, i) => { if (v > 0 && ld.indexOf(i) < 0) ld.push(i); });
    setLevels(lv); setTropes((p.tropes || []).slice()); setPatternsLoaded((p.tropes || []).length > 0); setLoaded(ld); setFocused(ld[0]);
  };

  // Output text = OUR generateMarkdown over the current levels (byte-identical to
  // the live tool: same headings, vetted pref sentences, writing rules, attribution).
  const text = useMemo(() => generateMarkdown(levelsToState(levels, tropes)), [levels, tropes]);
  const onCopy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
    setCopied(true);
    clearTimeout(copyT.current);
    copyT.current = setTimeout(() => setCopied(false), 1600);
  };
  const onShare = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(window.location.href); } catch (e) { /* ignore */ }
    setLinkCopied(true);
    clearTimeout(linkT.current);
    linkT.current = setTimeout(() => setLinkCopied(false), 1800);
  };
  const submitGuestbook = async () => {
    if (guestState === 'sending') return;
    if (!guestMsg.trim()) { setGuestState('empty'); return; }
    setGuestState('sending');
    try {
      const res = await fetch('/.netlify/functions/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName, message: guestMsg, website: guestHp }),
      });
      if (!res.ok) throw new Error('bad status');
      setGuestState('ok');
      setGuestName(''); setGuestMsg('');
    } catch (e) {
      setGuestState('failed');
    }
  };

  // Render the signature radar + caption to a downloadable PNG.
  const saveImage = async () => {
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    const S = 1080, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = BG; g.fillRect(0, 0, S, S);
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(22, 22, S - 44, S - 44);
    g.textAlign = 'center';
    g.fillStyle = INK; g.font = "54px 'Jersey 25', sans-serif"; g.fillText('MY LLM COUNTER-DEFAULTS', S / 2, 122);
    g.fillStyle = LABEL; g.font = "19px 'Space Mono', monospace"; g.fillText("the AI defaults I've overridden", S / 2, 156);
    const axes = loaded, N = axes.length;
    const cx = S / 2, cy = 544, RR = 238, inner = 0.16;
    const dirs = axes.map((bi, k) => { const a = (-90 + 360 * k / (N || 1)) * Math.PI / 180; return { ux: Math.cos(a), uy: Math.sin(a) }; });
    const rad = (lv) => RR * (inner + (1 - inner) * lv / 3);
    const pt = (k, lv) => { const d = dirs[k]; const r = rad(lv); return [cx + d.ux * r, cy + d.uy * r]; };
    g.strokeStyle = RLINE; g.lineWidth = 1.5;
    [1, 2, 3].forEach((lv) => { g.beginPath(); axes.forEach((bi, k) => { const [px, py] = pt(k, lv); k ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.stroke(); });
    dirs.forEach((d, k) => { const [px, py] = pt(k, 3); g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke(); });
    g.beginPath(); axes.forEach((bi, k) => { const [px, py] = pt(k, levels[bi]); k ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
    g.fillStyle = 'rgba(252,102,83,0.18)'; g.fill(); g.strokeStyle = CORAL; g.lineWidth = 4; g.stroke();
    axes.forEach((bi, k) => { const [px, py] = pt(k, levels[bi]); g.beginPath(); g.arc(px, py, 9, 0, Math.PI * 2); g.fillStyle = CHANNELS[bi].color; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); });
    dirs.forEach((d, k) => {
      const bi = axes[k], lr = RR + 42, lx = cx + d.ux * lr, ly = cy + d.uy * lr;
      g.fillStyle = INK; g.font = "700 21px 'Space Mono', monospace"; g.fillText(CHANNELS[bi].short, lx, ly);
      // Trim the one playfully long label so it doesn't crowd the canvas edge.
      const capLabel = CHANNELS[bi].labels[levels[bi]].replace('Dare say "I don\'t know"', 'Says "I don\'t know"');
      g.fillStyle = CHANNELS[bi].color; g.font = "17px 'Space Mono', monospace"; g.fillText(capLabel, lx, ly + 23);
    });
    g.fillStyle = INK; g.font = "700 25px 'Space Mono', monospace";
    g.fillText(`${engaged}/${N_CH} defaults countered · ${pushWord}`, S / 2, 906);
    g.fillStyle = LABEL; g.font = "18px 'Space Mono', monospace"; g.fillText('set your own at', S / 2, 968);
    g.fillStyle = COBALT; g.font = "24px 'Space Mono', monospace"; g.fillText('counterdefaults.netlify.app', S / 2, 1000);
    g.fillStyle = LABEL; g.font = "16px 'Space Mono', monospace"; g.fillText('LLM Counter-Defaults · by AIxDESIGN', S / 2, 1034);
    cv.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-llm-signature.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
  };

  // Persist to localStorage + reflect state in the URL hash (shareable link).
  useEffect(() => {
    const st = levelsToState(levels, tropes);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
    const url = isDefaultState(st) ? window.location.pathname + window.location.search : '#' + encodeState(st);
    window.history.replaceState(null, '', url);
  }, [levels, tropes]);
  useEffect(() => () => { clearTimeout(undoT.current); clearTimeout(linkT.current); }, []);

  useEffect(() => {
    const onMove = (e) => {
      const { kind, index } = drag.current;
      if (kind === 'faderH') {
        const el = tracks.current[index]; if (!el) return;
        const r = el.getBoundingClientRect();
        let rel = (e.clientX - r.left) / r.width; rel = Math.max(0, Math.min(1, rel));
        setLevel(index, Math.round(rel * 3));
      } else if (kind === 'axis') {
        const svg = svgEl.current; if (!svg) return;
        const k = curAxes.current.indexOf(index); if (k < 0) return;
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const mtx = svg.getScreenCTM(); if (!mtx) return;
        const p = pt.matrixTransform(mtx.inverse());
        const d = curDirs.current[k];
        const proj = (p.x - CX) * d.ux + (p.y - CY) * d.uy;
        setLevel(index, Math.round((proj / R - INNER) / (1 - INNER) * 3));
      }
    };
    const onUp = () => { if (drag.current.kind) drag.current = { kind: null, index: null }; };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); clearTimeout(copyT.current); };
  }, []);

  const engaged = levels.filter((v) => v > 0).length;
  const empty = engaged === 0 && tropes.length === 0;
  const sum = levels.reduce((a, v) => a + v, 0);
  const lit = Math.min(15, Math.ceil(sum / 2));
  let pushWord = 'dormant', pushColor = FAINT;
  if (sum > 0 && sum <= 4) { pushWord = 'gentle'; pushColor = '#16793f'; }
  else if (sum > 4 && sum <= 10) { pushWord = 'moderate'; pushColor = '#8a6800'; }
  else if (sum > 10 && sum <= 18) { pushWord = 'firm'; pushColor = '#b8531a'; }
  else if (sum > 18) { pushWord = 'aggressive'; pushColor = '#c63a26'; }
  const words = text.replace(/[#*]/g, '').split(/\s+/).filter(Boolean).length;

  const radar = (size, big, editable) => {
    const axes = loaded, N = axes.length;
    const cx = big ? CX : size / 2, cy = big ? CY : size / 2, rr = big ? R : size * 0.4;
    const dirs = axes.map((bi, k) => { const a = (-90 + 360 * k / (N || 1)) * Math.PI / 180; return { ux: Math.cos(a), uy: Math.sin(a) }; });
    const rad = (lv) => rr * (INNER + (1 - INNER) * lv / 3);
    const pt = (k, lv) => { const d = dirs[k]; const r = rad(lv); return [Math.round((cx + d.ux * r) * 10) / 10, Math.round((cy + d.uy * r) * 10) / 10]; };
    if (big) { curAxes.current = axes.slice(); curDirs.current = dirs; }
    const kids = [];
    [1, 2, 3].forEach((lv, i) => kids.push(<polygon key={'r' + i} points={axes.map((bi, k) => pt(k, lv).join(',')).join(' ')} fill="none" stroke={RLINE} strokeWidth="1" />));
    dirs.forEach((d, k) => { const [x, y] = pt(k, 3); kids.push(<line key={'l' + k} x1={cx} y1={cy} x2={x} y2={y} stroke={RLINE} strokeWidth="1" />); });
    const allZero = sum === 0;
    const prof = axes.map((bi, k) => pt(k, levels[bi]).join(',')).join(' ');
    if (!allZero) {
      if (N >= 3) kids.push(<polygon key="p" points={prof} fill="rgba(252,102,83,0.18)" stroke={CORAL} strokeWidth={big ? 2.5 : 2} strokeLinejoin="round" />);
      else if (N > 0) kids.push(<polyline key="p" points={prof} fill="none" stroke={CORAL} strokeWidth={big ? 2.5 : 2} />);
    }
    if (big) {
      const lsize = N <= 8 ? 12 : 10.5, vsize = N <= 8 ? 9.5 : 8.5;
      dirs.forEach((d, k) => {
        const bi = axes[k], lr = R + 24;
        const x = Math.round(cx + d.ux * lr), y = Math.round(cy + d.uy * lr + (d.uy < -0.5 ? -1 : 5));
        let anchor = 'middle'; if (d.ux > 0.25) anchor = 'start'; else if (d.ux < -0.25) anchor = 'end';
        kids.push(
          <text key={'lb' + k} x={x} y={y} textAnchor={anchor} fontFamily={sm} fontSize={vsize} fontWeight="400" fill={LABEL}>
            {CHANNELS[bi].short}
            <tspan x={x} dy="16" fontSize={lsize} fontWeight="700" fill={TITLE_COLOR[CHANNELS[bi].name] || INK}>{CHANNELS[bi].labels[levels[bi]]}</tspan>
          </text>
        );
      });
    }
    // Empty state: the small thumbnail shows a clean faint radar (just an origin
    // dot) rather than a cluster of nodes piled at the centre, inviting the first
    // drag. The big editable view keeps its nodes as drag handles.
    if (allZero && !big) {
      kids.push(<circle key="origin" cx={cx} cy={cy} r={2.5} fill={RLINE} />);
    } else {
      axes.forEach((bi, k) => {
        const [x, y] = pt(k, levels[bi]);
        kids.push(<circle key={'n' + k} cx={x} cy={y} r={big ? 8 : 3} fill={CHANNELS[bi].color} stroke={INK} strokeWidth={big ? 2 : 1}
          style={big && editable ? { cursor: 'grab' } : undefined}
          onPointerDown={big && editable ? (e) => { e.preventDefault(); drag.current = { kind: 'axis', index: bi }; } : undefined} />);
      });
    }
    if (big) return <svg ref={svgEl} viewBox="-44 0 548 500" style={{ width: '100%', maxWidth: '560px', height: 'auto', touchAction: 'none', display: 'block' }}>{kids}</svg>;
    return <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, overflow: 'visible', display: 'block' }}>{kids}</svg>;
  };

  const lines = text.split('\n').map((ln, idx) => {
    let color = MONO, content = ln, bold = null, italic = false;
    if (ln.startsWith('# ')) color = FAINT;
    else if (ln.startsWith('Last set:')) color = FAINT;
    else if (ln.startsWith('## ')) color = '#0f7a43';
    else if (ln.startsWith('<!--')) color = '#b6ad97';
    else if (ln.startsWith('**')) {
      const mm = ln.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (mm) { bold = mm[1]; content = ' ' + mm[2]; }
    }
    else if (ln.startsWith('*')) { color = LABEL; italic = true; content = ln.replace(/^\*|\*$/g, ''); }
    return { idx, color, content, bold, italic };
  });

  return (
    <div style={{ height: narrow ? 'auto' : '100vh', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: narrow ? 'visible' : 'hidden', background: BG, color: INK, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes cdblink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        .cd-hov { transition: filter .12s ease, background .12s ease, color .12s ease; }
        .cd-pill:hover { filter: brightness(0.96); }
        .cd-inv:hover { background:${INK} !important; color:${BG} !important; }
        .cd-bright:hover { filter: brightness(1.04); }
        .cdstudio ::selection { background:${CORAL}; color:#fff; }
        .cdstudio { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
        .cd-scroll::-webkit-scrollbar { width:9px; }
        .cd-scroll::-webkit-scrollbar-thumb { background:#d8cfb8; border-radius:9px; }
        [role="slider"]:focus-visible, button:focus-visible { outline: 2px solid ${COBALT}; outline-offset: 2px; }
        [role="slider"]:focus { outline: none; }
        [role="slider"]:focus-visible { outline: 2px solid ${COBALT}; outline-offset: 2px; }
      `}</style>

      <div className="cdstudio" style={{ height: narrow ? 'auto' : '100vh', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: narrow ? 'visible' : 'hidden' }}>
        {/* HEADER */}
        <div style={{ flex: 'none', height: 42, background: BG, borderBottom: `1.5px solid ${INK}`, padding: narrow ? '0 16px' : '0 26px', display: 'flex', alignItems: 'center', gap: 8, position: narrow ? 'sticky' : 'static', top: 0, zIndex: 40 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#68FF9E', boxShadow: '0 0 6px #68FF9E', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Jersey 25','Darker Grotesque',sans-serif", fontSize: narrow ? 18 : 22, letterSpacing: '0.01em', color: INK, whiteSpace: 'nowrap' }}>LLM COUNTER-DEFAULTS</span>
          <span style={{ fontFamily: sm, fontSize: 10, color: LABEL, flexShrink: 0 }}>v1.0</span>
          <span style={{ flex: 1 }} />
          <a href="https://aixdesign.co" target="_blank" rel="noopener noreferrer" aria-label="AIxDESIGN, opens in a new tab" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: sm, fontSize: 10, color: LABEL }}>by</span>
            <img src="/aixdesign-logo.png" alt="AIxDESIGN" style={{ height: narrow ? 13 : 15, width: 'auto', display: 'block' }} />
          </a>
        </div>

        {/* STAGE */}
        <div style={{ flex: narrow ? 'none' : 1, position: 'relative', background: BG, padding: narrow ? '14px 16px 88px' : '16px 26px 18px', display: 'flex', flexDirection: 'column', overflow: narrow ? 'visible' : 'hidden' }}>
          {fromShared && (
            <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(165,166,246,0.3)', border: `1.5px solid ${INK}`, borderRadius: 9, padding: '9px 14px', marginBottom: 11 }}>
              <span style={{ fontSize: 12, flex: 1, minWidth: 180 }}>↩ You opened a shared mix, <strong>{engaged} dimension{engaged === 1 ? '' : 's'} set</strong>. Drag any fader to make it yours, or start over.</span>
              <button className="cd-inv cd-hov" onClick={onReset} style={{ fontFamily: sm, fontSize: 10, background: 'transparent', color: INK, border: `1.5px solid ${INK}`, borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>START FRESH</button>
              <button onClick={() => setFromShared(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: INK, padding: '0 4px' }}>×</button>
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 16, minHeight: 0 }}>
            {/* LEFT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ flex: 'none', marginBottom: 11 }}>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: BODY, maxWidth: 720, margin: 0 }}>
              Your LLM ships with default behaviours. It agrees with you, sounds sure, and writes in your place. Each channel below is one of those defaults. Push a fader to override it, then paste the result into your LLM once. Every chat after follows your rules.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="cd-pill cd-hov" onClick={() => setWhyOpen((v) => !v)} style={pillStyle('#F0C8C8')}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: CORAL, display: 'inline-block' }} /> Why counter the defaults <span style={{ color: '#6a6452' }}>{whyOpen ? '–' : '+'}</span>
              </button>
              <button className="cd-pill cd-hov" onClick={() => setHowOpen((v) => !v)} style={pillStyle('#F5FF6E')}>
                <span>▸</span> How this works <span style={{ color: '#6a6452' }}>{howOpen ? '–' : '+'}</span>
              </button>
              <button className="cd-pill cd-hov" onClick={() => setPresetOpen((v) => !v)} style={pillStyle('#80F2FF')}>
                <span>◆</span> Start from a preset <span style={{ color: '#6a6452' }}>{presetOpen ? '–' : '+'}</span>
              </button>
            </div>
            {whyOpen && (
              <ExplainerCard tint="rgba(240,200,200,0.4)">
                Most LLMs default to agreeing with you, sounding sure, and writing for you. Useful when you want a confident assistant; less useful when you want to stay the one doing the thinking. The gains and the costs come from the same capabilities. This is for keeping one while drawing limits on the other: your judgment, your voice, your attention stay yours.
                <button onClick={() => setSourcesOpen((v) => !v)} style={{ display: 'block', marginTop: 8, fontFamily: sm, fontSize: 10, color: LABEL, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>{sourcesOpen ? '▾ hide sources' : '▸ sources'}</button>
                {sourcesOpen && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${INK}`, fontSize: 11, lineHeight: 1.5, color: BODY }}>
                    <p style={{ margin: '0 0 6px' }}><strong>Cognitive surrender.</strong> Shaw &amp; Nave (Wharton, 2026); Lee et al. (Microsoft Research, CHI '25, n=319): higher confidence in AI correlates with lower critical-thinking effort.</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Sycophancy.</strong> Sharma, Tong, Korbak et al. (Anthropic, ICLR 2024); Fanous et al. (Stanford, SycEval 2025): 58% sycophancy baseline across major models.</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Homogeneity.</strong> Wenger &amp; Kenett (Duke, PNAS Nexus 2026): LLM outputs cluster tightly, narrowing the variety of thinking in circulation.</p>
                    <p style={{ margin: '0 0 6px' }}><strong>Preference writing.</strong> Waddell (Medium, 2025): behavioural specs (do X, not Y) beat abstract requests, the pattern this tool's output follows.</p>
                    <div style={{ fontFamily: sm, fontSize: 9, letterSpacing: '0.08em', color: LABEL, margin: '2px 0 5px' }}>FURTHER READING</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, lineHeight: 1.65, color: BODY }}>
                      <li><a href="https://maggieappleton.com/ai-enlightenment" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Appleton, A Treatise on AI Chatbots Undermining the Enlightenment</a> (2025)</li>
                      <li><a href="https://dl.acm.org/doi/10.1145/3442188.3445922" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Bender et al., Stochastic Parrots</a> (FAccT 2021)</li>
                      <li>Escobar, <em>Designs for the Pluriverse</em> (Duke, 2018)</li>
                      <li><a href="https://en.wikipedia.org/wiki/Tools_for_Conviviality" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Illich, Tools for Conviviality</a> (1973)</li>
                      <li><a href="https://link.springer.com/article/10.1007/s13347-020-00405-8" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Mohamed, Png, Isaac, Decolonial AI</a> (2020)</li>
                      <li><a href="https://aclanthology.org/2025.findings-acl.1125/" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Poddar et al., Brevity is the soul of sustainability</a> (Findings of ACL 2025)</li>
                      <li><a href="https://arxiv.org/abs/2310.13548" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Sharma et al., Sycophancy</a> (Anthropic, ICLR 2024)</li>
                      <li>Shaw &amp; Nave, <em>Thinking, Fast, Slow, and Artificial</em> (Wharton, 2026)</li>
                      <li><a href="https://arxiv.org/abs/2502.10844" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>Sun et al., Be Friendly Not Friends</a> (CHI 2026)</li>
                    </ul>
                  </div>
                )}
              </ExplainerCard>
            )}
            {howOpen && <ExplainerCard tint="rgba(245,255,110,0.4)">Each fader starts on the left, where the LLM already is. Push it right to swap that default for yours. Your choices are written live into an <span style={{ fontFamily: sm, color: COBALT }}>instructions.md</span> panel. Paste it into your LLM's settings once, and it applies to every conversation from then on, in ChatGPT, Claude, Gemini, or anything with a settings field.</ExplainerCard>}
            {presetOpen && (
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <button key={p.name} className="cd-inv cd-hov" onClick={() => applyPreset(p)} style={{ fontFamily: sm, fontSize: 10, textAlign: 'left', background: WARM, color: INK, border: `1.5px solid ${INK}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ color: LABEL, marginTop: 2 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            )}
              </div>
              <div style={{ flex: 'none', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 20, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: sm }}>
                  <span style={{ fontSize: 11, color: LABEL, letterSpacing: '0.1em' }}>{engaged}/{N_CH} counters set</span>
                  <button className={preReset ? 'cd-bright cd-hov' : 'cd-inv cd-hov'} onClick={preReset ? undoReset : onReset} aria-label={preReset ? 'Undo reset' : 'Reset everything and start over'} style={{ fontFamily: sm, fontSize: 10, color: INK, background: preReset ? '#68FF9E' : 'transparent', border: `1.5px solid ${INK}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>{preReset ? '↩ UNDO' : 'RESET'}</button>
                </div>
              </div>

              <div className="cd-scroll" style={{ flex: 1, overflowY: narrow ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, paddingRight: narrow ? 0 : 4 }}>
                {loaded.map((bi) => {
                  const b = CHANNELS[bi], level = levels[bi], on = level > 0, isFocus = bi === focused;
                  return (
                    <div key={bi}>
                      {(() => {
                        const labelEl = (
                          <button onClick={(e) => { e.stopPropagation(); setFocused(bi); setInfoOpen((p) => (p === bi ? null : bi)); }} aria-label={`${b.name} info`} style={{ width: narrow ? 'auto' : 128, flex: narrow ? 1 : 'none', flexShrink: 0, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                            <div style={{ fontFamily: sm, fontSize: 11, textTransform: 'uppercase', color: on ? INK : '#6a6452' }}><span style={{ marginRight: 4 }}>{b.emoji}</span>{b.short}</div>
                            <div style={{ fontSize: 8, color: LABEL, marginTop: 2 }}>{b.poles[0]} → {b.poles[1]}</div>
                          </button>
                        );
                        const trackEl = (
                          <div ref={(el) => { tracks.current[bi] = el; }}
                            role="slider" tabIndex={0}
                            aria-label={`${b.name}: ${b.poles[0]} to ${b.poles[1]}`}
                            aria-valuemin={0} aria-valuemax={3} aria-valuenow={level} aria-valuetext={b.labels[level]}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setLevel(bi, level + 1); }
                              else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setLevel(bi, level - 1); }
                              else if (e.key === 'Home') { e.preventDefault(); setLevel(bi, 0); }
                              else if (e.key === 'End') { e.preventDefault(); setLevel(bi, 3); }
                            }}
                            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.focus({ preventScroll: true }); setFocused(bi); if (!infoAutoShown.current) { infoAutoShown.current = true; setInfoOpen(bi); } drag.current = { kind: 'faderH', index: bi }; const r = e.currentTarget.getBoundingClientRect(); setLevel(bi, Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 3)); }}
                            style={{ flex: narrow ? 'none' : 1, width: narrow ? '100%' : 'auto', position: 'relative', height: 30, borderRadius: 7, background: TRACK, border: `1.5px solid ${INK}`, cursor: 'grab', touchAction: 'none' }}>
                            <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', transform: 'translateY(-50%)', height: 3, background: 'repeating-linear-gradient(90deg,#cabfa0 0 2px,transparent 2px 11px)' }} />
                            {[0, 1, 2, 3].map((t) => (<div key={t} style={{ position: 'absolute', top: '50%', left: `calc(8px + (100% - 16px) * ${t / 3})`, transform: 'translate(-50%,-50%)', width: 2, height: 14, background: '#b3a888' }} />))}
                            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: `calc((100% - 16px) * ${level / 3})`, height: 3, background: b.color, opacity: on ? 1 : 0.35 }} />
                            <div style={{ position: 'absolute', top: '50%', left: `calc(8px + (100% - 16px) * ${level / 3})`, transform: 'translate(-50%,-50%)', width: 15, height: 22, borderRadius: 4, background: INK, boxShadow: `0 1px 3px rgba(21,19,13,0.35), 0 0 0 2px ${b.color}`, cursor: 'grab' }} />
                          </div>
                        );
                        const pillEl = <div style={{ width: narrow ? 'auto' : 96, minWidth: narrow ? 80 : 0, flexShrink: 0, textAlign: 'center', fontFamily: sm, fontSize: 9, borderRadius: 3, padding: '4px 8px', background: on ? b.color : TRACK, color: on ? idealText(b.color) : '#6a6452' }}>{b.labels[level]}</div>;
                        const infoEl = <button className="cd-inv cd-hov" onClick={(e) => { e.stopPropagation(); setInfoOpen((p) => (p === bi ? null : bi)); }} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${INK}`, background: 'transparent', color: INK, fontStyle: 'italic', fontFamily: sm, fontSize: 12, cursor: 'pointer' }}>i</button>;
                        const card = { padding: narrow ? '11px 13px' : '10px 14px', borderRadius: 9, cursor: 'pointer', background: isFocus ? WHITE : WARM, border: isFocus ? `1.5px solid ${b.color}` : '1.5px solid rgba(21,19,13,0.5)' };
                        if (narrow) return (
                          <div onClick={() => setFocused(bi)} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 9 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{labelEl}{pillEl}{infoEl}</div>
                            {trackEl}
                          </div>
                        );
                        return (
                          <div onClick={() => setFocused(bi)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
                            {labelEl}{trackEl}{pillEl}{infoEl}
                          </div>
                        );
                      })()}

                      {infoOpen === bi && (
                        <div style={{ background: BG, border: `2px solid ${b.color}`, borderRadius: 9, padding: '13px 15px', marginTop: 6 }}>
                          {/* header: name + close (emoji omitted; the fader label above already shows it) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                            <span style={{ fontFamily: sm, fontSize: 11, textTransform: 'uppercase', color: INK, flex: 1 }}>{b.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); setInfoOpen(null); }} aria-label="Close" style={{ fontFamily: sm, fontSize: 14, color: LABEL, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                          </div>
                          {/* why, on top */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontFamily: sm, fontSize: 9, letterSpacing: '0.5px', color: LABEL, flexShrink: 0, marginTop: 2 }}>WHY</span>
                            <span style={{ fontSize: 11.5, lineHeight: 1.45, color: BODY }}>{renderInline(b.why)}</span>
                          </div>
                          {/* four level cells, below */}
                          <div style={{ display: 'flex', flexWrap: narrow ? 'wrap' : 'nowrap', gap: 8 }}>
                            {[0, 1, 2, 3].map((idx) => {
                              const sel = idx === level;
                              return (
                                <div key={idx} onClick={(e) => { e.stopPropagation(); setLevel(bi, idx); }} style={{ flex: narrow ? '1 1 calc(50% - 4px)' : 1, cursor: 'pointer', borderRadius: 7, padding: '8px 10px', border: `2px solid ${sel ? b.color : 'rgba(21,19,13,0.15)'}`, background: sel ? WHITE : 'transparent' }}>
                                  <div style={{ fontFamily: sm, fontSize: 8, color: sel ? INK : FAINT }}>LV {idx} · {b.labels[idx]}{idx === 0 ? ' (default)' : ''}</div>
                                  <div style={{ fontSize: 10.5, marginTop: 3, color: sel ? INK : '#6a6452' }}>{b.descs[idx]}</div>
                                </div>
                              );
                            })}
                          </div>
                          {b.caveat && (
                            <p style={{ fontSize: 10.5, fontStyle: 'italic', color: LABEL, margin: '8px 0 0', paddingLeft: 9, borderLeft: `2px solid ${b.color}`, lineHeight: 1.45 }}>
                              <span style={{ fontFamily: sm, fontStyle: 'normal', fontSize: 9, letterSpacing: '0.5px', marginRight: 6 }}>NOTE</span>{b.caveat}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add more dimensions: unloaded channels + the optional "ban writing patterns" dimension, as preview chips */}
                {(loaded.length < N_CH || !patternsLoaded) && (
                  <div style={{ marginTop: 8, border: '1.5px dashed rgba(21,19,13,0.5)', borderRadius: 9, padding: '12px 14px', background: WARM }}>
                    <div style={{ fontFamily: sm, fontSize: 10, letterSpacing: '0.08em', color: LABEL, marginBottom: 9 }}>＋ ADD MORE DIMENSIONS · {(N_CH - loaded.length) + (patternsLoaded ? 0 : 1)} available · tap to add</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CHANNELS.map((c, i) => (loaded.indexOf(i) >= 0 ? null : (
                        <button key={c.key} onClick={() => toggleLoaded(i)} title={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sm, fontSize: 10, cursor: 'pointer', borderRadius: 999, padding: '5px 11px', color: DEEMPH, background: 'transparent', border: '1px solid rgba(21,19,13,0.35)' }}>
                          <span style={{ flexShrink: 0 }}>{c.emoji}</span>{c.short}
                        </button>
                      )))}
                      {!patternsLoaded && (
                        <button onClick={togglePatterns} title="Ban specific AI writing tics (em-dashes, filler, negative parallelism, etc.)" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sm, fontSize: 10, cursor: 'pointer', borderRadius: 999, padding: '5px 11px', color: DEEMPH, background: 'transparent', border: '1px solid rgba(21,19,13,0.35)' }}>
                          <span style={{ flexShrink: 0 }}>🚫</span>Ban writing patterns
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* "Ban writing patterns" dimension — only when chosen; solid border to match the dimension cards */}
                {patternsLoaded && (
                  <div style={{ marginTop: 8, border: `1.5px solid ${INK}`, borderRadius: 9, padding: '12px 14px', background: WARM }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9, gap: 8 }}>
                      <span style={{ fontFamily: sm, fontSize: 10, letterSpacing: '0.08em', color: INK }}>🚫 BAN WRITING PATTERNS{tropes.length > 0 ? ` · ${tropes.length} on` : ''}</span>
                      <button className="cd-inv cd-hov" onClick={togglePatterns} aria-label="Remove the writing-patterns dimension" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${INK}`, background: 'transparent', color: INK, fontFamily: sm, fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {TROPES.map((tp) => {
                        const on = tropes.includes(tp.id);
                        return (
                          <button key={tp.id} onClick={() => toggleTrope(tp.id)} title={tp.text} style={{ fontFamily: sm, fontSize: 10, cursor: 'pointer', borderRadius: 999, padding: '5px 11px', color: on ? INK : DEEMPH, background: on ? '#F5FF6E' : 'transparent', border: `1.5px solid ${on ? INK : 'rgba(21,19,13,0.35)'}` }}>
                            {on ? '✕ ' : ''}{tp.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ width: narrow ? '100%' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
              <div className="cd-hov" onClick={() => setCockpitOpen(true)} style={{ flex: 'none', cursor: 'pointer', background: WARM, border: `2px solid ${INK}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ filter: 'drop-shadow(0 0 5px rgba(252,102,83,0.18))', flexShrink: 0 }}>{radar(104, false)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: sm, fontSize: 9.5, letterSpacing: '0.12em', color: INK }}>◉ SIGNATURE</span>
                    <span style={{ fontFamily: sm, fontSize: 9, color: LABEL }}>⤢ {narrow ? 'VIEW' : 'EDIT'}</span>
                  </div>
                  <p style={{ fontSize: 10.5, lineHeight: 1.4, color: BODY, margin: '6px 0 0' }}>Edit the shape of your settings. Each spoke is a dimension. <span style={{ color: LABEL }}>Tap to open →</span></p>
                </div>
              </div>

              <div style={{ flex: narrow ? 'none' : 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: BG, border: `2px solid ${INK}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: sm, fontSize: 11, letterSpacing: '0.1em', color: INK }}>YOUR INSTRUCTIONS</span>
                  <span style={{ fontFamily: sm, fontSize: 9, color: LABEL }}>~ {words} words · {text.length} characters{text.length > 1500 && <span style={{ color: '#c63a26', fontWeight: 700 }}> · over ChatGPT's 1,500 limit, trim or split</span>}</span>
                </div>
                <div className="cd-scroll" tabIndex={0} role="group" aria-label="Generated instructions (read-only)" style={{ flex: narrow ? 'none' : 1, overflowY: 'auto', background: WARM, border: `1.5px solid ${INK}`, borderRadius: 7, padding: 13, fontFamily: sm, fontSize: 11, lineHeight: 1.55, minHeight: narrow ? 180 : 0, maxHeight: narrow ? '48vh' : 'none' }}>
                  {lines.map((l) => (
                    <div key={l.idx} style={{ color: l.color, whiteSpace: 'pre-wrap', fontStyle: l.italic ? 'italic' : 'normal' }}>
                      {l.bold ? (() => { const nm = l.bold.replace(/\.$/, ''); const bg = TITLE_BG[nm]; return <><strong style={bg ? { background: bg, color: idealText(bg), padding: '1px 6px', borderRadius: 4, fontWeight: 700 } : { color: INK }}>{nm}</strong><span style={{ color: MONO }}>{l.bold.endsWith('.') ? '.' : ''}{l.content}</span></>; })() : (l.content || ' ')}
                    </div>
                  ))}
                  <span style={{ display: 'inline-block', width: 7, height: 13, background: INK, animation: 'cdblink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                </div>

                <div style={{ margin: '12px 0 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: sm, fontSize: 9, color: LABEL }}>DEVIATION FROM THE DEFAULT</span>
                    <span style={{ fontFamily: sm, fontSize: 9, color: pushColor }}>{pushWord}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: 15 }, (_, i) => (
                      <div key={i} style={{ flex: 1, height: 12, borderRadius: 2, background: i < lit ? (i < 7 ? '#68FF9E' : i < 12 ? '#F5FF6E' : CORAL) : '#e2dccc' }} />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={empty ? '' : 'cd-bright cd-hov'} onClick={onCopy} disabled={empty} style={{ flex: 1, background: empty ? TRACK : '#68FF9E', color: empty ? '#6a6452' : INK, border: `2px solid ${empty ? '#cdc6b2' : INK}`, fontFamily: sm, fontSize: 13, fontWeight: 700, borderRadius: 7, padding: 13, cursor: empty ? 'not-allowed' : 'pointer' }}>{copied ? 'COPIED ✓' : empty ? 'NOTHING TO COPY YET' : 'COPY INSTRUCTIONS'}</button>
                  <button className={empty ? '' : 'cd-bright cd-hov'} onClick={onShare} disabled={empty} aria-label="Copy a shareable link to this mix" style={{ flexShrink: 0, background: linkCopied ? '#68FF9E' : 'transparent', color: empty ? '#6a6452' : INK, border: `2px solid ${empty ? '#cdc6b2' : INK}`, fontFamily: sm, fontSize: 13, fontWeight: 700, borderRadius: 7, padding: '13px 14px', cursor: empty ? 'not-allowed' : 'pointer' }}>{linkCopied ? '✓ LINK' : 'SHARE'}</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setPasteOpen((v) => !v); setAddYouOpen(false); }} style={{ fontFamily: sm, fontSize: 10, color: pasteOpen ? INK : LABEL, background: 'none', border: 'none', cursor: 'pointer' }}>⤓ Where do I paste this?</button>
                  <button onClick={() => { setAddYouOpen((v) => !v); setPasteOpen(false); }} style={{ fontFamily: sm, fontSize: 10, color: addYouOpen ? INK : LABEL, background: 'none', border: 'none', cursor: 'pointer' }}>＋ Add yourself</button>
                  <button onClick={() => { setGuestOpen(true); setGuestState('idle'); }} style={{ fontFamily: sm, fontSize: 10, color: LABEL, background: 'none', border: 'none', cursor: 'pointer' }}>✍ Guestbook</button>
                </div>
                {pasteOpen && (
                  <div className="cd-scroll" style={{ marginTop: 8, background: 'rgba(128,242,255,0.35)', border: `1.5px solid ${INK}`, borderRadius: 8, padding: 12, fontSize: 11, color: INK, lineHeight: 1.6, maxHeight: narrow ? 'none' : '30vh', overflowY: 'auto', flexShrink: 0 }}>
                    <div><strong style={{ color: INK }}>Claude</strong> → <a href="https://claude.ai/settings/profile" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>claude.ai/settings/profile</a></div>
                    <div><strong style={{ color: INK }}>ChatGPT</strong> → Settings → Personalization → Custom instructions</div>
                    <div><strong style={{ color: INK }}>Gemini</strong> → <a href="https://gemini.google.com/saved-info" target="_blank" rel="noopener noreferrer" style={{ color: COBALT }}>gemini.google.com/saved-info</a></div>
                    <div><strong style={{ color: INK }}>Other / API</strong> → system prompt</div>
                  </div>
                )}
                {addYouOpen && (
                  <div className="cd-scroll" style={{ marginTop: 8, background: 'rgba(165,166,246,0.28)', border: `1.5px solid ${INK}`, borderRadius: 8, padding: 12, fontSize: 11, color: INK, lineHeight: 1.55, maxHeight: narrow ? 'none' : '34vh', overflowY: 'auto', flexShrink: 0 }}>
                    <div style={{ marginBottom: 6 }}>The configurator can't guess these, so add them after pasting:</div>
                    {[
                      { tag: 'about you', text: `your role, your field, and how much you already know.` },
                      { tag: 'your voice', text: `if you pushed Voice, paste a few lines you've written so it can match you.`, flag: levels[KEYS.indexOf('voice')] > 0 },
                      { tag: 'your work', text: `the projects, tools, and terms that come up a lot.` },
                      { tag: 'your aspirations', text: `what you want to do, learn, or get better at, so it can steer you there.` },
                      { tag: 'working modes', text: `e.g. sparring vs drafting, and how to tell which you're in.` },
                    ].map((it) => (
                      <div key={it.tag} style={{ marginBottom: 4, ...(it.flag ? { background: '#F5FF6E', borderRadius: 5, padding: '4px 6px' } : {}) }}>
                        <span className="smono" style={{ fontFamily: sm, fontSize: 9, background: it.flag ? CORAL : INK, color: it.flag ? INK : BG, padding: '1px 6px', borderRadius: 3, marginRight: 6 }}>{it.flag ? '★ ' : ''}{it.tag}</span>{it.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {guestOpen && (
            <div onClick={() => setGuestOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(20,19,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? 12 : 30 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: '100%', background: WARM, border: `2px solid ${INK}`, borderRadius: 16, padding: '20px 22px 22px', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: sm, fontSize: 11, letterSpacing: '0.08em', color: INK }}>✍ GUESTBOOK</div>
                    <div style={{ fontSize: 12, color: LABEL, marginTop: 3, lineHeight: 1.45 }}>Leave feedback or a thought. It goes straight to us at AIxDESIGN.</div>
                  </div>
                  <button onClick={() => setGuestOpen(false)} className="cd-hov" aria-label="Close" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${INK}`, background: 'transparent', color: INK, cursor: 'pointer' }}>✕</button>
                </div>
                {guestState === 'ok' ? (
                  <div style={{ padding: '16px 4px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>🪞</div>
                    <div style={{ fontSize: 14, color: INK, fontWeight: 700 }}>Thank you.</div>
                    <div style={{ fontSize: 12, color: LABEL, marginTop: 4 }}>We read every one.</div>
                    <button onClick={() => setGuestOpen(false)} className="cd-bright cd-hov" style={{ marginTop: 16, fontFamily: sm, fontSize: 12, fontWeight: 700, color: INK, background: '#68FF9E', border: `2px solid ${INK}`, borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}>Done</button>
                  </div>
                ) : (
                  <>
                    <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Name (optional)" maxLength={80} style={{ width: '100%', boxSizing: 'border-box', fontFamily: sm, fontSize: 12, color: INK, background: BG, border: `1.5px solid ${INK}`, borderRadius: 8, padding: '9px 11px', marginBottom: 8 }} />
                    <textarea value={guestMsg} onChange={(e) => { setGuestMsg(e.target.value); if (guestState === 'empty' || guestState === 'failed') setGuestState('idle'); }} placeholder="Your feedback or thoughts…" maxLength={2000} rows={4} style={{ width: '100%', boxSizing: 'border-box', fontFamily: sm, fontSize: 12, color: INK, background: BG, border: `1.5px solid ${INK}`, borderRadius: 8, padding: '9px 11px', resize: 'vertical', lineHeight: 1.5 }} />
                    <input value={guestHp} onChange={(e) => setGuestHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 }}>
                      <span style={{ fontFamily: sm, fontSize: 9.5, color: (guestState === 'empty' || guestState === 'failed') ? '#c63a26' : LABEL }}>{guestState === 'empty' ? 'Add a message first.' : guestState === 'failed' ? "Couldn't send, please try again." : `${guestMsg.length}/2000`}</span>
                      <button onClick={submitGuestbook} disabled={guestState === 'sending'} className="cd-bright cd-hov" style={{ fontFamily: sm, fontSize: 12, fontWeight: 700, color: INK, background: '#68FF9E', border: `2px solid ${INK}`, borderRadius: 8, padding: '9px 22px', cursor: guestState === 'sending' ? 'wait' : 'pointer' }}>{guestState === 'sending' ? 'Sending…' : 'Send'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {cockpitOpen && (
            <div onClick={() => setCockpitOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,19,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? 12 : 30 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '100%', background: WARM, border: `2px solid ${INK}`, borderRadius: 16, padding: '20px 24px 22px', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontFamily: sm, fontSize: 11, color: INK }}>◉ SIGNATURE{narrow ? '' : ' · EDIT MODE'}</div>
                    <div style={{ fontSize: 12, color: LABEL, marginTop: 3, lineHeight: 1.45 }}>{narrow ? 'Each spoke is one dimension. The centre is the LLM’s default; the edge is your full counter. Open on a desktop to drag the shape; here, tune with the faders above.' : 'Each spoke is one dimension. The centre is the LLM’s default; drag a node outward to push your counter further.'}</div>
                  </div>
                  <button onClick={() => setCockpitOpen(false)} className="cd-hov" style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${INK}`, background: 'transparent', color: INK, cursor: 'pointer' }}>✕</button>
                </div>
                {radar(0, true, !narrow)}
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center', margin: '6px 0 14px', fontFamily: sm, fontSize: 9.5, color: LABEL }}>
                  <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', border: '1px solid #b9b2a0', verticalAlign: 'middle', marginRight: 5 }} />centre = factory default</span>
                  <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: CORAL, verticalAlign: 'middle', marginRight: 5 }} />outer = your counter</span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={saveImage} className="cd-bright cd-hov" style={{ fontFamily: sm, fontSize: 11, fontWeight: 700, color: INK, background: '#68FF9E', border: `1.5px solid ${INK}`, borderRadius: 7, padding: '9px 18px', cursor: 'pointer' }}>↓ SAVE IMAGE</button>
                  <button onClick={() => setCockpitOpen(false)} className="cd-hov" style={{ fontFamily: sm, fontSize: 11, fontWeight: 700, color: INK, background: 'transparent', border: `1.5px solid ${INK}`, borderRadius: 7, padding: '9px 22px', cursor: 'pointer' }}>DONE</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky copy bar — mobile only, so the output is always one tap away */}
        {narrow && (
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 55, background: BG, borderTop: `1.5px solid ${INK}`, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: sm, fontSize: 9.5, color: LABEL, lineHeight: 1.25, flexShrink: 0 }}>{engaged}/{N_CH} set<br />{words}w · {text.length}c</div>
            <button className={empty ? '' : 'cd-bright cd-hov'} onClick={onCopy} disabled={empty} style={{ flex: 1, background: empty ? TRACK : '#68FF9E', color: empty ? '#6a6452' : INK, border: `2px solid ${empty ? '#cdc6b2' : INK}`, fontFamily: sm, fontSize: 13, fontWeight: 700, borderRadius: 8, padding: 12, cursor: empty ? 'not-allowed' : 'pointer' }}>{copied ? 'COPIED ✓' : empty ? 'NOTHING TO COPY YET' : 'COPY INSTRUCTIONS'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function pillStyle(fill) {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sm, fontSize: 10, background: fill, color: INK, border: `1.5px solid ${INK}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer' };
}

function ExplainerCard({ tint, children }) {
  return <div style={{ maxWidth: 780, marginTop: 9, padding: '13px 15px', borderRadius: 9, fontSize: 12, lineHeight: 1.55, color: INK, border: `1.5px solid ${INK}`, background: tint }}>{children}</div>;
}
