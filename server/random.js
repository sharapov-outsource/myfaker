/**
 * Randomness that can be asked for twice.
 *
 * Test data is only half useful when it cannot be had again: a failing test
 * wants the same person back, and a colleague sent a link wants to see what
 * the sender saw. So nothing here touches Math.random. Every draw comes from a
 * small generator seeded with a string — the seed in the URL — and the same
 * seed gives the same numbers on any machine and any version of Node.
 *
 * A person is not drawn from one long stream either. Each part of them — the
 * name, the address, the documents — gets a generator of its own, seeded with
 * the seed, the country, the person's position and the part's name. Adding a
 * field to the address then changes the address and nothing else, and the
 * third person of ten is the same person as the third of five.
 */

import { randomBytes } from 'node:crypto';

/** What a seed may look like: short, and safe in a URL without escaping. */
export const SEED_PATTERN = /^[a-z0-9_-]{1,64}$/i;

const SEED_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/** A fresh seed, for a request that did not bring one. */
export function newSeed(length = 8) {
  const bytes = randomBytes(length);
  let seed = '';
  for (const byte of bytes) seed += SEED_ALPHABET[byte % SEED_ALPHABET.length];
  return seed;
}

/** cyrb128: four 32-bit words from a string, enough to seed sfc32. */
function hash(text) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: small, fast, and good enough to make up a phone number. */
function sfc32(a, b, c, d) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * @param {string} seed
 * @returns {object} draws: float, int, pick, chance, digits, from, weighted, shuffle
 */
export function createRandom(seed) {
  const next = sfc32(...hash(String(seed)));
  // The first few outputs of a freshly seeded sfc32 are poorly mixed.
  for (let i = 0; i < 12; i++) next();

  const random = {
    float: next,

    /** An integer in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },

    pick(list) {
      return list[Math.floor(next() * list.length)];
    },

    chance(probability) {
      return next() < probability;
    },

    /** `count` decimal digits, leading zeros allowed. */
    digits(count) {
      let out = '';
      for (let i = 0; i < count; i++) out += Math.floor(next() * 10);
      return out;
    },

    /** `count` characters drawn from an alphabet. */
    from(alphabet, count = 1) {
      let out = '';
      for (let i = 0; i < count; i++) out += alphabet[Math.floor(next() * alphabet.length)];
      return out;
    },

    /** One value from [[value, weight], …]. */
    weighted(entries) {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
      }
      return entries[entries.length - 1][0];
    },

    shuffle(list) {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
  return random;
}
