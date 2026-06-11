import { DIMENSIONS } from '../data/dimensions.js';
import { TROPES } from '../data/tropes.js';

export function generateMarkdown(state) {
  const lines = [];
  lines.push('# My LLM Preferences');
  lines.push('');
  lines.push('*Generated with Counter-Defaults by AIxDESIGN. A starting point, not a final answer. Edit freely.*');
  lines.push('');
  const movedDims = Object.keys(DIMENSIONS).filter((key) => state[key] !== 0);
  const hasContent = movedDims.length > 0 || state.tropes.length > 0;
  if (!hasContent) {
    lines.push('*No counter-defaults set yet. Move the sliders above to specify how you want the LLM to behave differently from default. Only the dimensions you change appear here.*');
    return lines.join('\n');
  }
  if (movedDims.length > 0) {
    lines.push('## How I Want You to Work With Me');
    lines.push('');
    movedDims.forEach((key) => {
      const dim = DIMENSIONS[key];
      const opt = dim.options[state[key]];
      lines.push(`**${dim.title}.** ${opt.pref}`);
      lines.push('');
    });
  }
  if (state.tropes.length > 0) {
    lines.push('## Behavior Rules');
    lines.push('');
    state.tropes.forEach((tropeId) => {
      const trope = TROPES.find((t) => t.id === tropeId);
      if (trope) lines.push(`- ${trope.text}`);
    });
    lines.push('');
  }
  return lines.join('\n');
}
