/**
 * Draws myfaker's icons. The glyph is an identity card without the card: a
 * head and shoulders, and three lines of particulars beside them, the last
 * one in the accent — the part that was made up.
 *
 *   node scripts/make-icons.js
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeIcons, segment } from '@sharapov/service-kit/make-icons';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Coordinates are the same 1024-unit grid public/icon.svg is drawn on. */
const HEAD = { x: 380, y: 420, r: 100 };
const SHOULDERS = { x: 380, y: 720, r: 180 };
const LINES = [
  [620, 820, 400, 'paper'],
  [620, 820, 520, 'paper'],
  [620, 740, 640, 'accent'],
];
const LINE = 32;                      // half the stroke width

function glyph(at, x, y) {
  if (Math.hypot(x - at(HEAD.x), y - at(HEAD.y)) <= at(HEAD.r)) return 'paper';
  if (y <= at(SHOULDERS.y) && Math.hypot(x - at(SHOULDERS.x), y - at(SHOULDERS.y)) <= at(SHOULDERS.r)) return 'paper';
  for (const [x1, x2, ly, kind] of LINES) {
    if (segment(x, y, at(x1), at(ly), at(x2), at(ly)) <= at(LINE)) return kind;
  }
  return null;
}

export { glyph, HEAD, SHOULDERS, LINES };

makeIcons({ publicDir: PUBLIC_DIR, glyph });
