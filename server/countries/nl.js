/**
 * The Netherlands.
 *
 * Surnames with their tussenvoegsel — de Jong, van den Berg — kept lower case
 * after a given name, as Dutch writes them. A postcode of four digits and two
 * letters that never spells SA, SD or SS. A BSN that passes the eleven test,
 * an IBAN whose account number passes it too, and for a business, a KvK number
 * and a VAT id built on an RSIN.
 */

import { weightedSum, iban, ibanFields } from '../parts.js';

const MALE = ('Daan Sem Lucas Levi Finn Milan Bram Luuk Jesse Thijs Lars Ruben Tim Thomas Jeroen Bas ' +
  'Mark Sander Dennis Pieter Jan Kees Henk Willem Erik Martijn Joost Niels Stijn Koen').split(' ');

const FEMALE = ('Emma Julia Mila Tess Sophie Zoë Sara Anna Lotte Eva Fleur Lisa Sanne Femke Anouk ' +
  'Iris Linda Marieke Ingrid Annelies Esther Marloes Laura Noor Evi Lieke Maaike Inge Petra Saskia').split(' ');

const SURNAMES = ('de Jong|Jansen|de Vries|van den Berg|van Dijk|Bakker|Janssen|Visser|Smit|Meijer|' +
  'de Boer|Mulder|de Groot|Bos|Vos|Peters|Hendriks|van Leeuwen|Dekker|Brouwer|de Wit|Dijkstra|' +
  'Smits|de Graaf|van der Meer|van der Linden|Kok|Jacobs|de Haan|Vermeulen|van den Heuvel|' +
  'van der Veen|van den Broek|de Bruijn|van der Heijden|Schouten|van Beek|Willems|van Vliet').split('|');

const CITIES = [
  { city: 'Amsterdam', province: 'Noord-Holland', postal: [1011, 1109] },
  { city: 'Rotterdam', province: 'Zuid-Holland', postal: [3011, 3089] },
  { city: 'Den Haag', province: 'Zuid-Holland', postal: [2491, 2597] },
  { city: 'Utrecht', province: 'Utrecht', postal: [3511, 3585] },
  { city: 'Eindhoven', province: 'Noord-Brabant', postal: [5611, 5658] },
  { city: 'Groningen', province: 'Groningen', postal: [9711, 9747] },
  { city: 'Tilburg', province: 'Noord-Brabant', postal: [5011, 5049] },
  { city: 'Almere', province: 'Flevoland', postal: [1311, 1363] },
  { city: 'Breda', province: 'Noord-Brabant', postal: [4811, 4839] },
  { city: 'Nijmegen', province: 'Gelderland', postal: [6511, 6546] },
  { city: 'Haarlem', province: 'Noord-Holland', postal: [2011, 2036] },
  { city: 'Arnhem', province: 'Gelderland', postal: [6811, 6846] },
];

const STREETS = ('Kerkstraat Dorpsstraat Schoolstraat Molenstraat Stationsweg Julianastraat ' +
  'Wilhelminastraat Beatrixstraat Hoofdstraat Nieuwstraat Markt Lindelaan Eikenlaan Parallelweg ' +
  'Industrieweg Raadhuisstraat Kastanjelaan Emmastraat Oranjestraat Prinsengracht Keizersgracht').split(' ');

const BANKS = [
  { name: 'ABN AMRO', code: 'ABNA', bic: 'ABNANL2A' },
  { name: 'ING', code: 'INGB', bic: 'INGBNL2A' },
  { name: 'Rabobank', code: 'RABO', bic: 'RABONL2U' },
  { name: 'SNS', code: 'SNSB', bic: 'SNSBNL2A' },
  { name: 'ASN Bank', code: 'ASNB', bic: 'ASNBNL21' },
  { name: 'Triodos Bank', code: 'TRIO', bic: 'TRIONL2U' },
  { name: 'bunq', code: 'BUNQ', bic: 'BUNQNL2A' },
];

const COMPANY_WORDS = 'Polder Zeewind Tulp Duinzicht Lindeboom Waterland Molenaar Horizon Noorderlicht Delta Kade'.split(' ');

/* Letters a postcode is made of; the pairs SA, SD and SS are never issued. */
const POSTCODE_LETTERS = 'ABCDEGHJKLMNPRSTVWXZ';
const POSTCODE_BARRED = new Set(['SA', 'SD', 'SS']);

/**
 * The eleven test: nine digits weighted 9 down to 2, the last one by −1, must
 * add up to a multiple of eleven. BSN and RSIN alike. Null when no last digit
 * can make it work.
 */
export function elevenDigit(eight) {
  const last = weightedSum(eight, [9, 8, 7, 6, 5, 4, 3, 2]) % 11;
  return last < 10 ? String(last) : null;
}

export function elevenProof(r) {
  for (;;) {
    const eight = String(r.int(1, 9)) + r.digits(7);
    const last = elevenDigit(eight);
    if (last !== null) return eight + last;
  }
}

/** A ten-digit account number whose digits, weighted 10 down to 1, add up to a multiple of eleven. */
function account(r) {
  for (;;) {
    const nine = r.digits(9);
    const last = (11 - (weightedSum(nine, [10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11)) % 11;
    if (last < 10) return nine + last;
  }
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 250)) + (r.chance(0.15) ? r.pick([' A', ' B', '-1', '-2', '-3']) : '');
  let letters;
  do { letters = r.from(POSTCODE_LETTERS, 2); } while (POSTCODE_BARRED.has(letters));
  const postalCode = `${r.int(...place.postal)} ${letters}`;
  const lines = [`${street} ${building}`, `${postalCode} ${place.city}`];
  return { street, building, city: place.city, region: place.province, postalCode, lines, line: lines.join(', ') };
}

/* Mobiles are 06 1… to 06 5… and 06 8…; 06 0…, 06 7… and 06 9… are allocated to nobody. */
function phone(r) {
  const rest = r.from('079') + r.digits(7);
  return { national: `06 ${rest}`, international: `+31 6 ${rest}`, e164: `+316${rest}`, range: 'unallocated' };
}

function documents(r) {
  const bsn = elevenProof(r);
  return [{ id: 'bsn', name: 'BSN', kind: 'national-id', value: `${bsn.slice(0, 4)}.${bsn.slice(4, 6)}.${bsn.slice(6)}`, raw: bsn }];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('NL', chosen.code + account(r)), chosen.bic) };
}

function company(r) {
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} B.V.`, 3], [`${r.pick(SURNAMES).replace(/^./, ch => ch.toUpperCase())} B.V.`, 2], [`${r.pick(COMPANY_WORDS)} Holding B.V.`, 1]]),
    documents: [
      { id: 'kvk', name: 'KvK-nummer', kind: 'company-reg', value: String(r.int(10000000, 99999999)) },
      { id: 'btw', name: 'Btw-id', kind: 'vat', value: `NL${elevenProof(r)}B01` },
    ],
  };
}

export default {
  id: 'nl',
  locale: 'nl-NL',
  dateFormat: 'DD-MM-YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'mastercard'],
  company,
};
