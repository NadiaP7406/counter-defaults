# Counter-Defaults

A workbook for setting your own LLM defaults, instead of the model's. Move some sliders, copy what comes out, paste it into your LLM's settings. Built by [AIxDESIGN](https://aixdesign.co).

13 dimensions across 5 sections (Thinking, Perspective, Relating, Boundaries, Writing). Each slider starts where the LLM already is; drag right to swap that default for yours. Only moved sliders appear in the generated Markdown.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

No backend, no auth, no analytics, no tracking. State lives in localStorage and in the URL hash, so any configuration is shareable as a link (for example `#s=3322233021312&t=emdash.fillers`).

## Structure

```
src/
  data/         dimensions, sections, tropes, presets (the content)
  components/   CounterDefaults.jsx (the whole UI)
  hooks/        usePersistedState (localStorage + URL hash sync)
  utils/        generateMarkdown, urlState, color constants
  styles/       fonts.css (self-hosted), index.css (reset + utilities)
public/fonts/   self-hosted font files
docs/           handoff doc, research notes, original single-file component
```

## Fonts

All fonts are self-hosted (no CDN calls) and OFL-licensed: Jersey 25 (display), Inter, Darker Grotesque, Space Mono, and VT323, all as latin subsets from Google Fonts.

## Companion research

[docs/counter_defaults_research.md](docs/counter_defaults_research.md) holds the per-dimension research notes: what people in prompt engineering, writing, and AI ethics communities actually do, with verified sources.
