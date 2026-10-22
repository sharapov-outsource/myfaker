/**
 * Mexico.
 *
 * A given name and the father's and mother's surnames. An address with the
 * colonia on a line of its own and the state abbreviated after the town, and a
 * ten-digit phone number under the city's area code. The CURP and the RFC are
 * worked out from this person's own names, birth date, sex and state of birth,
 * with the substitutions RENAPO and the SAT make for awkward words; the
 * homoclave of an RFC is assigned by the SAT and is invented here, its check
 * digit is not. An IMSS number with its Luhn digit, a CLABE with its own check
 * digit, and for a business an RFC of a legal person.
 */

import { pad, luhnDigit, formatDate, ascii, dayBetween } from '../parts.js';

const MALE = ('José Juan Luis Carlos Jorge Miguel Francisco Alejandro Fernando Ricardo Eduardo Javier ' +
  'Roberto Daniel Sergio Raúl Arturo Manuel Pedro Diego Santiago Mateo Sebastián Leonardo Emiliano ' +
  'Héctor Gerardo Óscar Rodrigo Iván').split(' ');

const FEMALE = ('María Guadalupe Ana Sofía Valentina Regina Camila Ximena Fernanda Daniela Mariana Andrea ' +
  'Gabriela Alejandra Verónica Patricia Leticia Adriana Claudia Rosa Laura Elena Isabel Lucía Paola ' +
  'Karla Diana Mónica Teresa Luz').split(' ');

const SURNAMES = ('Hernández García Martínez López González Pérez Rodríguez Sánchez Ramírez Cruz Flores ' +
  'Gómez Morales Vázquez Reyes Jiménez Torres Díaz Gutiérrez Ruiz Mendoza Aguilar Ortiz Moreno Castillo ' +
  'Romero Álvarez Méndez Chávez Rivera Juárez Ramos Domínguez Herrera Medina Castro Vargas Guzmán ' +
  'Velázquez Rojas').split(' ');

/* curp — the two letters a CURP gives the state of birth. */
const CITIES = [
  { city: 'Ciudad de México', state: 'Ciudad de México', abbr: 'CDMX', curp: 'DF', cp: [1000, 16999], area: '55' },
  { city: 'Guadalajara', state: 'Jalisco', abbr: 'Jal.', curp: 'JC', cp: [44100, 44990], area: '33' },
  { city: 'Monterrey', state: 'Nuevo León', abbr: 'N.L.', curp: 'NL', cp: [64000, 64999], area: '81' },
  { city: 'Puebla', state: 'Puebla', abbr: 'Pue.', curp: 'PL', cp: [72000, 72599], area: '222' },
  { city: 'Tijuana', state: 'Baja California', abbr: 'B.C.', curp: 'BC', cp: [22000, 22699], area: '664' },
  { city: 'León', state: 'Guanajuato', abbr: 'Gto.', curp: 'GT', cp: [37000, 37699], area: '477' },
  { city: 'Querétaro', state: 'Querétaro', abbr: 'Qro.', curp: 'QT', cp: [76000, 76246], area: '442' },
  { city: 'Mérida', state: 'Yucatán', abbr: 'Yuc.', curp: 'YN', cp: [97000, 97399], area: '999' },
  { city: 'Cancún', state: 'Quintana Roo', abbr: 'Q.R.', curp: 'QR', cp: [77500, 77599], area: '998' },
  { city: 'Toluca', state: 'Estado de México', abbr: 'Méx.', curp: 'MC', cp: [50000, 50299], area: '722' },
  { city: 'San Luis Potosí', state: 'San Luis Potosí', abbr: 'S.L.P.', curp: 'SP', cp: [78000, 78499], area: '444' },
  { city: 'Aguascalientes', state: 'Aguascalientes', abbr: 'Ags.', curp: 'AS', cp: [20000, 20399], area: '449' },
];

const COLONIAS = 'Centro|Del Valle|Jardines del Valle|Las Américas|Reforma|Lomas Verdes|San Miguel|Moderna|Industrial|Insurgentes|Juárez|Obrera|Hidalgo|Benito Juárez|Santa María'.split('|');

const STREETS = ('Av. Reforma|Av. Insurgentes|Calle Hidalgo|Calle Juárez|Calle Morelos|Av. Benito Juárez|' +
  'Calle 5 de Mayo|Calle 16 de Septiembre|Av. Revolución|Calle Allende|Calle Zaragoza|Calle Guerrero|' +
  'Calle Madero|Av. Constitución|Calle Independencia|Calle Aldama|Calle Matamoros|Av. Universidad|' +
  'Calle Niños Héroes').split('|');

const BANKS = [
  { name: 'BBVA México', code: '012' },
  { name: 'Banamex', code: '002' },
  { name: 'Santander', code: '014' },
  { name: 'Banorte', code: '072' },
  { name: 'HSBC', code: '021' },
  { name: 'Scotiabank', code: '044' },
];

const COMPANY_WORDS = 'Azteca Maya Sierra Pacífico Golfo Jaguar Nopal Mezquite Sol Quetzal Ébano Laguna'.split(' ');

/* ------------------------------------------------------------------ *
 * CURP and RFC
 * ------------------------------------------------------------------ */

/* Four-letter words RENAPO will not print: the second letter becomes X. */
const CURP_BARRED = new Set(('BACA BAKA BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COGI COJA COJE COJI ' +
  'COJO COLA CULO FALO FETO GETA GUEI GUEY JETA JOTO KACA KACO KAGA KAGO KAKA KAKO KOGE KOGI KOJA KOJE ' +
  'KOJI KOJO KOLA KULO LILO LOCA LOCO LOKA LOKO MAME MAMO MEAR MEAS MEON MIAR MION MOCO MOKO MULA MULO ' +
  'NACA NACO PEDA PEDO PENE PIPI PITO POPO PUTA PUTO QULO RATA ROBA ROBE ROBO RUIN SENO TETA VACA VAGA ' +
  'VAGO VAKA VUEI VUEY WUEI WUEY').split(' '));

/* The SAT's own list for the RFC, where the last letter becomes X. */
const RFC_BARRED = new Set(('BUEI BUEY CACA CACO CAGA CAGO CAKA CAKO COGE COJA COJE COJI COJO CULO FETO ' +
  'GUEY JOTO KACA KACO KAGA KAGO KAKA KOGE KOJO KULO MAME MAMO MEAR MEAS MEON MION MOCO MULA PEDA PEDO ' +
  'PENE PUTA PUTO QULO RATA RUIN').split(' '));

const letters = text => ascii(String(text).replace(/ñ/gi, 'X')).toUpperCase().replace(/[^A-Z]/g, '');
const firstInner = (text, pattern) => (text.slice(1).match(pattern) || ['X'])[0];

/** The four letters both documents open with: surname, its first inner vowel, second surname, name. */
export function nameKey({ first, last, second }) {
  const paternal = letters(last);
  return paternal[0] + firstInner(paternal, /[AEIOU]/) + (letters(second || '')[0] || 'X') + letters(first)[0];
}

const CURP_ALPHABET = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export function curpDigit(seventeen) {
  const sum = [...seventeen].reduce((total, ch, i) => total + CURP_ALPHABET.indexOf(ch) * (18 - i), 0);
  return String((10 - (sum % 10)) % 10);
}

export function curp({ first, last, second, birth, female, state, r }) {
  let key = nameKey({ first, last, second });
  if (CURP_BARRED.has(key)) key = key[0] + 'X' + key.slice(2);
  const consonants = [letters(last), letters(second || 'X'), letters(first)]
    .map(text => firstInner(text, /[B-DF-HJ-NP-TV-Z]/)).join('');
  const differentiator = birth.getUTCFullYear() < 2000 ? r.digits(1) : r.from('ABCDEFGHIJKLMNPQRSTUVWXYZ');
  const seventeen = key + formatDate(birth, 'YYMMDD') + (female ? 'M' : 'H') + state + consonants + differentiator;
  return seventeen + curpDigit(seventeen);
}

const RFC_ALPHABET = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';

/** The RFC check digit; a legal person's eleven characters are padded with a space to twelve. */
export function rfcDigit(body) {
  const twelve = body.padStart(12, ' ');
  const sum = [...twelve].reduce((total, ch, i) => total + RFC_ALPHABET.indexOf(ch) * (13 - i), 0);
  return RFC_ALPHABET[(11 - (sum % 11)) % 11];
}

const homoclave = r => r.from('123456789ABCDEFGHIJKLMNPQRSTUV') + r.from('123456789ABCDEFGHIJKLMNPQRSTUVWXYZ');

export function rfcPerson({ first, last, second, birth }, r) {
  let key = nameKey({ first, last, second });
  if (RFC_BARRED.has(key)) key = key.slice(0, 3) + 'X';
  const body = key + formatDate(birth, 'YYMMDD') + homoclave(r);
  return body + rfcDigit(body);
}

/** CLABE: bank, plaza, account and a check digit over 3-7-1 weights, each product modulo 10. */
export function clabe(seventeen) {
  const weights = [3, 7, 1];
  const sum = [...seventeen].reduce((total, digit, i) => total + ((Number(digit) * weights[i % 3]) % 10), 0);
  return seventeen + ((10 - (sum % 10)) % 10);
}

/* ------------------------------------------------------------------ */

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  const second = r.pick(SURNAMES);
  return { first, last, second, full: `${first} ${last} ${second}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 2500));
  const apartment = r.chance(0.35) ? String(r.int(1, 40)) : undefined;
  const district = `Col. ${r.pick(COLONIAS)}`;
  const postalCode = pad(r.int(...place.cp), 5);
  const lines = [
    `${street} ${building}${apartment ? `, Int. ${apartment}` : ''}`,
    district,
    `${postalCode} ${place.city}, ${place.abbr}`,
  ];
  return {
    street, building, apartment, district, city: place.city, region: place.state, regionCode: place.abbr,
    postalCode, lines, line: lines.join(', '),
  };
}

function phone(r, place) {
  const rest = r.from('23456789') + r.digits(9 - place.area.length);
  const local = place.area.length === 2
    ? `${place.area} ${rest.slice(0, 4)} ${rest.slice(4)}`
    : `${place.area} ${rest.slice(0, 3)} ${rest.slice(3)}`;
  return { national: local, international: `+52 ${local}`, e164: `+52${place.area}${rest}` };
}

function documents(r, p) {
  const person = { first: p.name.first, last: p.name.last, second: p.name.second, birth: p.birth };
  const year = p.birth.getUTCFullYear();
  const registered = Math.min(p.today.getUTCFullYear(), year + r.int(16, 25));
  const nssTen = pad(r.int(1, 99), 2) + String(registered).slice(2) + String(year).slice(2) + r.digits(4);
  const list = [
    { id: 'curp', name: 'CURP', kind: 'national-id', value: curp({ ...person, female: p.gender === 'female', state: p.birthPlace.curp, r }) },
    { id: 'rfc', name: 'RFC', kind: 'tax', value: rfcPerson(person, r) },
  ];
  if (p.age >= 16) list.push({ id: 'nss', name: 'NSS (IMSS)', kind: 'social', value: nssTen + luhnDigit(nssTen) });
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const number = clabe(chosen.code + r.digits(3) + r.digits(11));
  return {
    name: chosen.name,
    fields: [{ id: 'clabe', name: 'CLABE', value: `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 17)} ${number.slice(17)}`, raw: number }],
  };
}

function company(r, p) {
  const word = r.pick(COMPANY_WORDS);
  const founded = dayBetween(r, new Date(Date.UTC(1990, 0, 1)), p.today);
  /* A one-word name gives its first three letters. */
  const body = (letters(word) + 'XX').slice(0, 3) + formatDate(founded, 'YYMMDD') + homoclave(r);
  return {
    name: r.weighted([[`${word} S.A. de C.V.`, 3], [`${word} S. de R.L. de C.V.`, 1], [`${r.pick(SURNAMES)} y Asociados, S.C.`, 1]]),
    documents: [{ id: 'rfc', name: 'RFC', kind: 'tax', value: body + rfcDigit(body) }],
  };
}

export default {
  id: 'mx',
  locale: 'es-MX',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard', 'mastercard', 'amex'],
  company,
};
