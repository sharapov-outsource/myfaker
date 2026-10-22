/**
 * The pieces every country is assembled from: check digits, IBANs, dates,
 * cards, and the few string chores that come up everywhere.
 *
 * A check digit is the whole difference between test data and a string of
 * random digits. A form that validates its input rejects the second at the
 * first keystroke, and a test that fills it in never gets past the field. The
 * algorithms that more than one country uses live here; the ones that belong to
 * a single document live with that country.
 */

export const pad = (value, width) => String(value).padStart(width, '0');

/** `group('9123456789', [3, 3, 2, 2])` → '912 345 67 89'. */
export function group(text, sizes, separator = ' ') {
  const parts = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= text.length) break;
    parts.push(text.slice(at, at + size));
    at += size;
  }
  if (at < text.length) parts.push(text.slice(at));
  return parts.join(separator);
}

const digitsOf = text => [...String(text)].map(Number);

/** Σ digit × weight, the first step of most national check digits. */
export function weightedSum(text, weights) {
  return digitsOf(text).reduce((sum, digit, i) => sum + digit * weights[i % weights.length], 0);
}

/* ------------------------------------------------------------------ *
 * Check digits used across borders
 * ------------------------------------------------------------------ */

/** The Luhn digit that makes `payload + digit` valid. */
export function luhnDigit(payload) {
  let sum = 0;
  const digits = digitsOf(payload).reverse();
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return String((10 - (sum % 10)) % 10);
}

export const luhnValid = number => luhnDigit(String(number).slice(0, -1)) === String(number).slice(-1);

/** ISO 7064 MOD 11,10 — the German tax number and VAT id. */
export function mod11_10(payload) {
  let product = 10;
  for (const digit of digitsOf(payload)) {
    let sum = (digit + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  return String((11 - product) % 10);
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** The Verhoeff digit — Aadhaar. */
export function verhoeffDigit(payload) {
  let c = 0;
  const digits = digitsOf(payload).reverse();
  for (let i = 0; i < digits.length; i++) c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  return String(VERHOEFF_INV[c]);
}

/** 0–9 as themselves, A–Z as 10–35: how most alphanumeric checks read a letter. */
export const charValue = ch => parseInt(ch, 36);

/* ------------------------------------------------------------------ *
 * IBAN
 * ------------------------------------------------------------------ */

/** A big number as a string, modulo 97, without BigInt. */
function mod97(numeric) {
  let rest = 0;
  for (const ch of numeric) rest = (rest * 10 + Number(ch)) % 97;
  return rest;
}

const ibanNumeric = text => [...text].map(ch => (/[A-Z]/.test(ch) ? String(charValue(ch)) : ch)).join('');

/** The full IBAN for a country and a national account number (BBAN). */
export function iban(country, bban) {
  const check = 98 - mod97(ibanNumeric(bban + country + '00'));
  return country + pad(check, 2) + bban;
}

export const ibanValid = value => mod97(ibanNumeric(value.slice(4) + value.slice(0, 4))) === 1;

/** In groups of four, the way it is printed on a statement. */
const formatIban = value => value.replace(/(.{4})(?=.)/g, '$1 ');

/** IBAN and BIC as the list of fields a bank block shows. */
export function ibanFields(value, bic) {
  const fields = [{ id: 'iban', name: 'IBAN', value: formatIban(value), raw: value }];
  if (bic) fields.push({ id: 'bic', name: 'BIC', value: bic });
  return fields;
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

/** Midnight UTC of a date, so that a day is a day whatever the time zone. */
export const utcDay = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const isoDate = date => date.toISOString().slice(0, 10);

/** `DD.MM.YYYY`, `MM/DD/YYYY`, `YYYY年MM月DD日` — the tokens are DD, MM, YYYY and YY. */
export function formatDate(date, pattern) {
  const year = String(date.getUTCFullYear());
  return pattern
    .replace('YYYY', year)
    .replace('YY', year.slice(2))
    .replace('MM', pad(date.getUTCMonth() + 1, 2))
    .replace('DD', pad(date.getUTCDate(), 2));
}

export function addYears(date, years) {
  const out = new Date(date);
  // 29 February plus a year rolls over to 1 March, the day yearsBetween
  // counts a leap-day birthday as reached.
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}

export const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

/** Full years between two dates. */
export function yearsBetween(from, to) {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  if (to.getUTCMonth() < from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate())) years--;
  return years;
}

/** A day in [from, to], both ends included. */
export function dayBetween(r, from, to) {
  const days = Math.round((to - from) / 86400000);
  return addDays(from, r.int(0, Math.max(0, days)));
}

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

const SPECIAL = { ß: 'ss', ẞ: 'SS', ł: 'l', Ł: 'L', ø: 'o', Ø: 'O', æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', đ: 'd', Đ: 'D', ı: 'i', ð: 'd', þ: 'th' };

/** Latin letters without their marks: what an e-mail address can carry. */
export function ascii(text) {
  return String(text)
    .replace(/[ßẞłŁøØæÆœŒđĐıðþ]/g, ch => SPECIAL[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** A name as a passport or a card prints it: Latin capitals, no marks. */
export const upperLatin = text => ascii(text).toUpperCase();

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/**
 * Payment networks by the prefixes they own. A card number is the prefix,
 * random digits and a Luhn digit: it passes every check a form can make
 * offline and belongs to no account.
 */
const NETWORKS = {
  visa: { name: 'Visa', prefixes: ['4'], length: 16 },
  mastercard: { name: 'Mastercard', prefixes: [...range(51, 55), ...range(2221, 2720)], length: 16 },
  mir: { name: 'Mir', prefixes: range(2200, 2204), length: 16 },
  unionpay: { name: 'UnionPay', prefixes: ['62'], length: 16 },
  jcb: { name: 'JCB', prefixes: range(3528, 3589), length: 16 },
  rupay: { name: 'RuPay', prefixes: ['6521', '6522', '6070', '6081', '508'], length: 16 },
  troy: { name: 'TROY', prefixes: ['9792'], length: 16 },
  amex: { name: 'American Express', prefixes: ['34', '37'], length: 15 },
  discover: { name: 'Discover', prefixes: ['6011', '65'], length: 16 },
};

const CARD_GROUPS = { 15: [4, 6, 5], 16: [4, 4, 4, 4], 19: [4, 4, 4, 4, 3] };

function formatCard(number) {
  return group(number, CARD_GROUPS[number.length] || [4, 4, 4, 4, 4]);
}

/**
 * @param {object} r        the random source
 * @param {string} network  a key of NETWORKS
 * @param {object} options  holder (Latin), today, and optionally a bank's own
 *                          prefix and length, which win over the network's
 */
export function card(r, network, { holder, today, prefix, length, bank } = {}) {
  const spec = NETWORKS[network];
  const start = prefix || r.pick(spec.prefixes);
  const size = length || spec.length;
  const body = start + r.digits(size - start.length - 1);
  const number = body + luhnDigit(body);
  const expires = new Date(Date.UTC(today.getUTCFullYear() + r.int(1, 5), r.int(0, 11), 1));
  return {
    network,
    networkName: spec.name,
    bank,
    number: formatCard(number),
    raw: number,
    expiry: formatDate(expires, 'MM/YY'),
    cvv: r.digits(network === 'amex' ? 4 : 3),
    holder,
  };
}
