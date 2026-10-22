/**
 * The generator as a whole: what a seed promises, what the options mean, and
 * what every person of every country has to carry.
 *
 * Check digits are tested against published numbers in checks.test.js; the
 * HTTP layer in scripts/smoke.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { generate, parseCountry, parseOptions, COUNTRY_IDS, MAX_COUNT } from '../server/generate.js';
import { COUNTRIES } from '../server/countries/index.js';
import { luhnValid, ibanValid, yearsBetween, addYears } from '../server/parts.js';
import { latinRu, latinUk, latinKk } from '../server/translit.js';
import { feminine as feminineRu } from '../server/countries/ru.js';
import { feminine as feminineUk } from '../server/countries/ua.js';
import { feminine as femininePl } from '../server/countries/pl.js';
import { toCsv } from '../server/csv.js';

const TODAY = new Date(Date.UTC(2026, 9, 22));
const target = (country, extra = {}) => ({
  country, seed: 'test', count: 1, gender: 'any', age: { min: 18, max: 75 }, ...extra,
});
const people = (country, extra) => generate(target(country, extra), { today: TODAY }).people;

/* ------------------------------------------------------------------ *
 * What was asked for
 * ------------------------------------------------------------------ */

test('a country is two letters, in any case, or a locale that names one', () => {
  assert.deepEqual(parseCountry('ru'), { country: 'ru' });
  assert.deepEqual(parseCountry(' DE '), { country: 'de' });
  assert.deepEqual(parseCountry('pt-BR'), { country: 'br' });
  assert.deepEqual(parseCountry('en_GB'), { country: 'gb' });
  assert.deepEqual(parseCountry('uk'), { country: 'gb' });
  assert.equal(parseCountry('zz').error, 'unknown-country');
  assert.equal(parseCountry('wp-login.php').error, 'invalid-host');
  assert.equal(parseCountry('').error, 'invalid-host');
});

test('options are checked, not quietly replaced', () => {
  const defaults = parseOptions({});
  assert.equal(defaults.count, 1);
  assert.equal(defaults.gender, 'any');
  assert.deepEqual(defaults.age, { min: 18, max: 75 });
  assert.match(defaults.seed, /^[a-z0-9]{8}$/);

  assert.deepEqual(parseOptions({ count: '10', gender: 'F', age: '25-35', seed: 'abc' }),
    { count: 10, gender: 'female', age: { min: 25, max: 35 }, seed: 'abc' });
  assert.deepEqual(parseOptions({ age: '40' }).age, { min: 40, max: 40 });
  assert.deepEqual(parseOptions({ age: '0..5' }).age, { min: 0, max: 5 });

  assert.equal(parseOptions({ count: '0' }).error, 'bad-count');
  assert.equal(parseOptions({ count: String(MAX_COUNT + 1) }).error, 'bad-count');
  assert.equal(parseOptions({ count: 'ten' }).error, 'bad-count');
  assert.equal(parseOptions({ gender: 'other' }).error, 'unknown-gender');
  /* Names every object literal inherits are not genders either. */
  for (const inherited of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(parseOptions({ gender: inherited }).error, 'unknown-gender', inherited);
  }
  assert.equal(parseOptions({ age: '40-30' }).error, 'bad-age');
  assert.equal(parseOptions({ age: '18-120' }).error, 'bad-age');
  assert.equal(parseOptions({ seed: 'a b' }).error, 'bad-seed');
  assert.equal(parseOptions({ seed: 'x'.repeat(65) }).error, 'bad-seed');
});

/* ------------------------------------------------------------------ *
 * The seed
 * ------------------------------------------------------------------ */

test('the same seed gives the same people; another seed gives others', () => {
  for (const country of COUNTRY_IDS) {
    assert.deepEqual(people(country, { count: 3 }), people(country, { count: 3 }), country);
    assert.notDeepEqual(people(country), people(country, { seed: 'other' }), country);
  }
});

test('the third person of ten is the third person of five', () => {
  assert.deepEqual(people('ru', { count: 10 })[2], people('ru', { count: 5 })[2]);
});

test('a seed keeps a birthday all year long', () => {
  const spring = generate(target('de'), { today: new Date(Date.UTC(2026, 2, 1)) }).people[0];
  const autumn = generate(target('de'), { today: new Date(Date.UTC(2026, 10, 1)) }).people[0];
  assert.equal(spring.birth.date, autumn.birth.date);
  assert.equal(spring.name.full, autumn.name.full);
});

/* ------------------------------------------------------------------ *
 * Age and gender
 * ------------------------------------------------------------------ */

test('every age falls in the range asked for, an exact age included', () => {
  for (const age of [{ min: 18, max: 75 }, { min: 0, max: 13 }, { min: 30, max: 30 }, { min: 99, max: 100 }]) {
    for (const person of people('pl', { count: 100, age })) {
      const years = yearsBetween(new Date(person.birth.date), TODAY);
      assert.ok(years >= age.min && years <= age.max, `${person.birth.date} for ${JSON.stringify(age)}`);
      assert.equal(person.birth.age, years);
    }
  }
});

test('a gender asked for is the gender given, and names agree with it', () => {
  for (const person of people('ru', { count: 50, gender: 'female' })) {
    assert.equal(person.gender, 'female');
    assert.match(person.name.middle, /на$/);
  }
  for (const person of people('ru', { count: 50, gender: 'male' })) {
    assert.match(person.name.middle, /(ич|ыч)$/);
  }
  const mixed = people('us', { count: 100 }).map(person => person.gender);
  assert.ok(mixed.includes('female') && mixed.includes('male'));
});

test('a leap-day birthday is reached on 1 March, by both date helpers', () => {
  const born = new Date(Date.UTC(2008, 1, 29));
  assert.equal(addYears(born, 18).toISOString().slice(0, 10), '2026-03-01');
  assert.equal(yearsBetween(born, new Date(Date.UTC(2026, 1, 28))), 17);
  assert.equal(yearsBetween(born, new Date(Date.UTC(2026, 2, 1))), 18);
});

test('an identity document a person holds today has not expired', () => {
  const parse = value => new Date(Date.UTC(...value.split('.').reverse().map((part, i) => Number(part) - (i === 1 ? 1 : 0))));
  for (const country of ['ua', 'kz']) {
    for (const person of people(country, { count: 100, age: { min: 14, max: 90 } })) {
      const card = person.documents.find(doc => doc.id === 'id-card');
      if (!card) continue;
      const expires = card.details.find(detail => detail.id === 'expires').value;
      assert.ok(parse(expires) >= TODAY, `${country}: ${expires}`);
    }
  }
});

test('children get no card, no company and no documents they are too young for', () => {
  for (const person of people('ru', { count: 30, age: { min: 5, max: 10 } })) {
    assert.equal(person.card, undefined);
    assert.equal(person.company, undefined);
    assert.ok(!person.documents.some(doc => doc.id === 'passport'));
  }
});

/* ------------------------------------------------------------------ *
 * Every country
 * ------------------------------------------------------------------ */

test('every person of every country has what a form asks for', () => {
  for (const country of COUNTRY_IDS) {
    for (const person of people(country, { count: 40, age: { min: 18, max: 90 } })) {
      const where = `${country} #${person.index}`;
      assert.ok(person.name.full && person.name.first && person.name.last, where);
      if (/[^\p{Script=Latin}\s'’-]/u.test(person.name.full)) assert.ok(person.name.latin?.full, `${where}: Latin name`);
      assert.ok(person.address.lines.length >= 2 && person.address.line && person.address.city && person.address.postalCode, where);
      assert.match(person.phone.e164, /^\+\d{8,15}$/, where);
      assert.ok(person.phone.national && person.phone.international, where);
      assert.match(person.email, /^[a-z0-9._]+@example\.(com|net|org)$/, where);
      assert.match(person.username, /^[a-z0-9._]+$/, where);
      assert.match(person.password, /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z].{13}$/, where);
      assert.ok(person.documents.length >= 1, where);
      for (const doc of person.documents) {
        assert.ok(doc.id && doc.name && doc.kind && doc.value, `${where}: ${JSON.stringify(doc)}`);
        assert.notEqual(doc.raw, doc.value, where);
      }
      assert.ok(luhnValid(person.card.raw), `${where}: card`);
      assert.match(person.card.expiry, /^(0[1-9]|1[0-2])\/\d\d$/, where);
      assert.match(person.card.holder, /^[A-Z][A-Z '-]+$/, where);
      for (const field of person.bank?.fields || []) {
        if (field.id === 'iban') assert.ok(ibanValid(field.raw), `${where}: ${field.value}`);
      }
      assert.ok(person.company?.name && person.company.documents.length, where);
    }
  }
});

test('the page and the server know the same countries', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const listed = JSON.parse(/const COUNTRIES = (\[[^\]]+\]);/.exec(app)[1].replace(/'/g, '"'));
  assert.deepEqual(listed, COUNTRY_IDS);
  assert.deepEqual(Object.keys(COUNTRIES).sort(), COUNTRY_IDS);
});

/* ------------------------------------------------------------------ *
 * Names
 * ------------------------------------------------------------------ */

test('transliteration follows each country’s passports', () => {
  assert.equal(latinRu('Юлия Фёдорова'), 'Iuliia Fedorova');
  assert.equal(latinRu('Щербаков Подъячев'), 'Shcherbakov Podieiachev');
  assert.equal(latinUk('Юлія Ярослав'), 'Yuliia Yaroslav');
  assert.equal(latinUk('Олексійович Згурський'), 'Oleksiiovych Zghurskyi');
  assert.equal(latinUk('Мар’яна Їжак'), 'Mariana Yizhak');
  assert.equal(latinKk('Нұрлан Әсел Қайрат'), 'Nurlan Asel Kairat');
});

test('surnames agree with the gender where the language makes them', () => {
  assert.equal(feminineRu('Иванов'), 'Иванова');
  assert.equal(feminineRu('Высоцкий'), 'Высоцкая');
  assert.equal(feminineRu('Толстой'), 'Толстая');
  assert.equal(feminineRu('Шевченко'), 'Шевченко');
  assert.equal(feminineUk('Яворський'), 'Яворська');
  assert.equal(feminineUk('Білий'), 'Біла');
  assert.equal(feminineUk('Мельник'), 'Мельник');
  assert.equal(femininePl('Kowalski'), 'Kowalska');
  assert.equal(femininePl('Nowak'), 'Nowak');
});

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

test('CSV: one header, one line per person, quoted where it has to be', () => {
  const report = generate(target('ru', { count: 3 }), { today: TODAY });
  const csv = toCsv(report);
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines.length, 4);
  const header = lines[0].split(',');
  for (const column of ['n', 'full_name', 'birth_date', 'phone_e164', 'email', 'inn', 'snils', 'card_number']) {
    assert.ok(header.includes(column), column);
  }
  /* The one-line address has commas in it, so it arrives quoted. */
  assert.ok(lines[1].includes(`"${report.people[0].address.line}"`));
  /* Long numbers as written, with their spaces: a spreadsheet keeps them as text. */
  assert.ok(lines[1].includes(`,${report.people[0].card.number},`));
  assert.match(report.people[0].card.number, / /);
  assert.ok(csv.endsWith('\r\n'));
});
