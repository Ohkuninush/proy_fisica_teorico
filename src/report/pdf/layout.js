export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const MARGIN = 15;
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

export const COLORS = {
  navy: [11, 18, 32],
  navyAccent: [44, 22, 78],
  ink: [28, 36, 56],
  muted: [107, 118, 148],
  line: [226, 231, 242],
  panel: [246, 248, 252],
  cyan: [27, 154, 196],
  pink: [214, 36, 110],
  lime: [93, 161, 15],
  amber: [224, 138, 0],
  violet: [123, 92, 214],
  white: [255, 255, 255],
};

export const STATUS_STYLE = {
  collided: { label: 'COLISIÓN', color: COLORS.pink },
  finished: { label: 'FINALIZADO', color: COLORS.violet },
};

export const DAMAGE_COLORS = [[93, 161, 15], [160, 168, 20], [224, 138, 0], [222, 82, 40], [214, 36, 110]];

export const mix = (from, to, amount) => from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount));
