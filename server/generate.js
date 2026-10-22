/**
 * From a country and a seed to a list of people.
 *
 * The country modules know their own rules — what a name looks like, how an
 * address is written, which check digit a document carries. What is the same
 * everywhere lives here: how old somebody is, what their e-mail address and
 * password look like, the card in their wallet, and the shape of the report
 * that comes out.
 *
 * Nothing a person is made of comes from Math.random. See random.js for why,
 * and for why each part of a person draws from a generator of its own.
 */

import { readFileSync } from 'node:fs';

import { createRandom, newSeed, SEED_PATTERN } from './random.js';
import {
  utcDay, isoDate, formatDate, addYears, addDays, yearsBetween, ascii, upperLatin, card,
} from './parts.js';
import { COUNTRIES, COUNTRY_IDS } from './countries/index.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

export const MAX_COUNT = 100;
export const DEFAULT_AGE = { min: 18, max: 75 };
export const GENDERS = ['female', 'male'];

/* Documents that need a person to be old enough to hold them say so in the
   country module; these two apply everywhere. */
const CARD_AGE = 14;
const COMPANY_AGE = 18;

/* ------------------------------------------------------------------ *
 * What was asked for
 * ------------------------------------------------------------------ */

/* Names people type for a country that are not its ISO code. */
const ALIASES = { uk: 'gb' };

/**
 * `ru`, `RU`, `ru-RU`, `pt_BR` → the country. Anything that is not a pair of
 * letters is not a country at all, and the shell answers that with a 404.
 */
export function parseCountry(raw) {
  let value = String(raw ?? '').trim().toLowerCase();
  const locale = /^[a-z]{2,3}[-_]([a-z]{2})$/.exec(value);
  if (locale) value = locale[1];
  if (!/^[a-z]{2}$/.test(value)) return { error: 'invalid-host' };
  value = ALIASES[value] || value;
  if (!COUNTRIES[value]) return { error: 'unknown-country' };
  return { country: value };
}

const GENDER_ALIASES = { any: 'any', '': 'any', female: 'female', f: 'female', w: 'female', male: 'male', m: 'male' };

/**
 * The options in a query string, checked. A value that is there but makes no
 * sense is refused with a reason rather than quietly replaced: a test that
 * asked for ten people and got one would fail somewhere far less obvious.
 */
export function parseOptions(query = {}) {
  const one = value => (Array.isArray(value) ? value[0] : value);

  let count = 1;
  const rawCount = one(query.count);
  if (rawCount !== undefined && rawCount !== '') {
    if (!/^\d{1,3}$/.test(String(rawCount))) return { error: 'bad-count' };
    count = Number(rawCount);
    if (count < 1 || count > MAX_COUNT) return { error: 'bad-count' };
  }

  const gender = GENDER_ALIASES[String(one(query.gender) ?? '').trim().toLowerCase()];
  if (!gender) return { error: 'unknown-gender' };

  let age = DEFAULT_AGE;
  const rawAge = one(query.age);
  if (rawAge !== undefined && rawAge !== '') {
    const match = /^(\d{1,3})(?:\s*(?:-|–|\.\.)\s*(\d{1,3}))?$/.exec(String(rawAge).trim());
    if (!match) return { error: 'bad-age' };
    const min = Number(match[1]);
    const max = match[2] === undefined ? min : Number(match[2]);
    if (min > max || max > 100) return { error: 'bad-age' };
    age = { min, max };
  }

  let seed = one(query.seed);
  if (seed === undefined || seed === '') seed = newSeed();
  else if (!SEED_PATTERN.test(String(seed))) return { error: 'bad-seed' };

  return { count, gender, age, seed: String(seed) };
}

/* ------------------------------------------------------------------ *
 * Age
 * ------------------------------------------------------------------ */

/**
 * A birth date whose age today falls in [min, max].
 *
 * The year is counted back from the current year rather than from today, so a
 * seed gives the same birthday all year long and its people simply grow older
 * with everybody else. Only an exact age has to be counted from today.
 */
function birthDate(r, { min, max }, today) {
  if (min === max) {
    const latest = addYears(today, -min);
    const earliest = addDays(addYears(today, -min - 1), 1);
    return addDays(earliest, r.int(0, Math.round((latest - earliest) / 86400000)));
  }
  const year = today.getUTCFullYear() - r.int(min, max - 1) - 1;
  const days = Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000);
  return new Date(Date.UTC(year, 0, 1 + r.int(0, days - 1)));
}

/* ------------------------------------------------------------------ *
 * Online
 * ------------------------------------------------------------------ */

/* Reserved by RFC 2606: mail sent to them goes nowhere, whoever sends it. */
const MAIL_DOMAINS = ['example.com', 'example.com', 'example.net', 'example.org'];

const slug = text => ascii(text).toLowerCase().replace(/[^a-z0-9]+/g, '');

function online(r, latin, birth) {
  const first = slug(latin.first) || 'user';
  const last = slug(latin.last) || 'test';
  const yy = String(birth.getUTCFullYear()).slice(2);
  const local = r.weighted([
    [`${first}.${last}`, 3], [`${first}.${last}${yy}`, 2], [`${first[0]}${last}`, 2],
    [`${first}_${last}`, 1], [`${last}.${first}`, 1], [`${first}${last}${r.int(1, 99)}`, 1],
  ]);
  const username = r.weighted([
    [`${first}${last[0]}${r.int(10, 99)}`, 2], [`${first}_${last}`, 2], [`${last}${yy}`, 1],
    [`${first}.${last}`, 1], [`${first[0]}${last}${r.int(1, 999)}`, 1],
  ]);
  return { email: `${local}@${r.pick(MAIL_DOMAINS)}`, username, password: password(r) };
}

/* No 0/O, 1/l/I: a password read off a screen has to survive being retyped. */
const PASSWORD_SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!#$%&*+-=?@^_'];

/** Fourteen characters with every class a password policy asks for. */
export function password(r, length = 14) {
  const chars = PASSWORD_SETS.map(set => r.from(set));
  const all = PASSWORD_SETS.join('');
  while (chars.length < length) chars.push(r.from(all));
  return r.shuffle(chars).join('');
}

/* ------------------------------------------------------------------ *
 * A person
 * ------------------------------------------------------------------ */

/** `value` is what a person would write; `raw` is the same without spaces or dashes, when that differs. */
function tidy(items) {
  if (!items) return items;
  return items.map(item => {
    const out = { ...item };
    if (out.value === undefined) out.value = out.raw;
    if (out.raw === out.value) delete out.raw;
    if (out.details) out.details = tidy(out.details);
    return out;
  });
}

function person(country, options, index, today) {
  const random = part => createRandom(`${options.seed}|${country.id}|${index}|${part}`);

  const r = random('person');
  const gender = options.gender === 'any' ? (r.chance(0.5) ? 'female' : 'male') : options.gender;
  const birth = birthDate(r, options.age, today);
  const age = yearsBetween(birth, today);

  const place = country.place(random('place'));
  /* Where a document records the birthplace, it has to be a place that existed then. */
  const birthPlace = country.birthPlace
    ? country.birthPlace(random('birthplace'), birth)
    : country.place(random('birthplace'));
  const name = country.name(random('name'), gender);
  const latin = name.latin || name;

  /* What the documents are worked out from. */
  const p = { gender, birth, age, today, name, latin, place, birthPlace };

  const out = {
    index,
    gender,
    name,
    birth: {
      date: isoDate(birth),
      local: formatDate(birth, country.dateFormat),
      age,
      place: birthPlace.label || birthPlace.city,
    },
    address: country.address(random('address'), place),
    phone: country.phone(random('phone'), place),
    ...online(random('online'), latin, birth),
    documents: tidy(country.documents(random('documents'), p)),
  };

  if (age >= CARD_AGE) {
    const holder = upperLatin(country.familyFirst ? `${latin.last} ${latin.first}` : `${latin.first} ${latin.last}`);
    const cr = random('card');
    out.card = country.card
      ? country.card(cr, { ...p, holder })
      : card(cr, cr.pick(country.cards || ['visa', 'mastercard']), { holder, today });
    if (country.bank) {
      const bank = country.bank(random('bank'), p);
      out.bank = { ...bank, fields: tidy(bank.fields) };
    }
  }

  if (age >= COMPANY_AGE && country.company) {
    const company = country.company(random('company'), p);
    out.company = { ...company, documents: tidy(company.documents) };
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * The report
 * ------------------------------------------------------------------ */

/**
 * @param {object} target   country, seed, count, gender, age — as parse() leaves them
 * @param {object} [context]
 * @param {Date} [context.today]  the day ages are counted to; tests pin it
 */
export function generate(target, { today = new Date() } = {}) {
  const country = COUNTRIES[target.country];
  const day = utcDay(today);
  const options = {
    seed: target.seed,
    gender: target.gender || 'any',
    age: target.age || DEFAULT_AGE,
  };
  const count = target.count || 1;

  const people = [];
  for (let i = 0; i < count; i++) people.push(person(country, options, i, day));

  return {
    country: country.id,
    locale: country.locale,
    seed: options.seed,
    count,
    gender: options.gender,
    age: options.age,
    people,
    meta: { generatedAt: new Date().toISOString(), version: VERSION },
  };
}

export { COUNTRY_IDS };
