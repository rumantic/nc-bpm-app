import NCRenderer from './ncRenderer';
import NCPalette from './ncPalette';
export default {
  __init__: ['ncRenderer', 'ncPalette'],
  ncRenderer: ['type', NCRenderer],
  ncPalette: ['type', NCPalette],
};