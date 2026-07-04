# LLM Counter-Defaults

Your LLM has default behaviors: agreeing with you, sounding sure, writing in your place. LLM Counter-Defaults writes the custom instructions that override them. Paste them into your LLM's settings once, and every conversation after follows your rules. Built by [AIxDESIGN](https://aixdesign.co).

14 behaviors to counter, from how hard the model pushes back to how much it discloses uncertainty or protects your writing voice. Six load to start; add the rest as you go, plus a "Ban writing patterns" set. Each fader starts where the LLM already is; push it to swap that default for yours. Only the faders you move appear in the generated instructions.

## Run it

```
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

No backend, no auth, no analytics, no tracking. State lives in localStorage and in the URL hash, so any configuration is shareable as a link (for example `#s=33222330213120&t=emdash.fillers`).

## Structure

```
src/
  studio/       CounterDefaultsStudio.jsx + studioData (the live mixing-desk UI)
  data/         dimensions, tropes, presets (the content)
  components/   CounterDefaults.jsx (earlier slider version, kept for reference)
  utils/        generateMarkdown, urlState, color constants
  styles/       fonts.css (self-hosted), index.css (reset + utilities)
public/fonts/   self-hosted font files
docs/           handoff doc, research notes, original single-file component
```

## Fonts

All fonts are self-hosted (no CDN calls) and OFL-licensed: Jersey 25 (display), Inter, Darker Grotesque, Space Mono, and VT323, all as latin subsets from Google Fonts.

## Companion research

[docs/counter_defaults_research.md](docs/counter_defaults_research.md) holds the per-dimension research notes: what people in prompt engineering, writing, and AI ethics communities actually do, with verified sources.
