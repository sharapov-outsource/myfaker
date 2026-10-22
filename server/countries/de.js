/**
 * Germany.
 *
 * Street before number, postcode before town. A Steuer-ID that keeps the rule
 * the Federal Central Tax Office issues them by — one digit repeated, the rest
 * once each — and carries the ISO 7064 check digit. A social insurance number
 * built from the birth date, the initial of the birth name and the gender, with
 * its own check digit. An IBAN at a real bank's sort code, and for a business,
 * a Handelsregister entry at the right Amtsgericht and a VAT id.
 */

import { pad, mod11_10, iban, ibanFields } from '../parts.js';

const MALE = ('Lukas Leon Finn Jonas Paul Felix Elias Maximilian Noah Ben Luca Tim Jan Niklas Moritz ' +
  'Julian Alexander Thomas Michael Andreas Stefan Christian Markus Daniel Sebastian Tobias Florian ' +
  'Matthias Martin Peter Wolfgang Klaus Jürgen Frank').split(' ');

const FEMALE = ('Anna Lena Hannah Lea Emma Mia Sophie Marie Laura Julia Sarah Lisa Katharina Johanna ' +
  'Clara Charlotte Emilia Leonie Sabine Petra Claudia Andrea Stefanie Nicole Susanne Birgit Monika ' +
  'Ursula Ingrid Heike Jana Franziska').split(' ');

const SURNAMES = ('Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer ' +
  'Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann ' +
  'Lange Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König ' +
  'Walter Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn Vogel').split(' ');

const CITIES = [
  { city: 'Berlin', state: 'Berlin', plz: [10115, 14199], court: 'Charlottenburg' },
  { city: 'Hamburg', state: 'Hamburg', plz: [20095, 22769] },
  { city: 'München', state: 'Bayern', plz: [80331, 81929] },
  { city: 'Köln', state: 'Nordrhein-Westfalen', plz: [50667, 51149] },
  { city: 'Frankfurt am Main', state: 'Hessen', plz: [60306, 60599] },
  { city: 'Stuttgart', state: 'Baden-Württemberg', plz: [70173, 70629] },
  { city: 'Düsseldorf', state: 'Nordrhein-Westfalen', plz: [40210, 40629] },
  { city: 'Leipzig', state: 'Sachsen', plz: [4103, 4357] },
  { city: 'Dortmund', state: 'Nordrhein-Westfalen', plz: [44135, 44388] },
  { city: 'Essen', state: 'Nordrhein-Westfalen', plz: [45127, 45359] },
  { city: 'Bremen', state: 'Bremen', plz: [28195, 28779] },
  { city: 'Dresden', state: 'Sachsen', plz: [1067, 1328] },
  { city: 'Hannover', state: 'Niedersachsen', plz: [30159, 30669] },
  { city: 'Nürnberg', state: 'Bayern', plz: [90402, 90491] },
];

const STREETS = ('Hauptstraße Schulstraße Gartenstraße Bahnhofstraße Dorfstraße Bergstraße Birkenweg ' +
  'Lindenstraße Kirchstraße Waldstraße Ringstraße Schillerstraße Goethestraße Mühlenweg Wiesenweg ' +
  'Feldstraße Rosenstraße Lessingstraße Friedrichstraße Kantstraße Mozartstraße Beethovenstraße ' +
  'Sonnenstraße Parkstraße Ahornweg Eichenweg Talstraße').split(' ');

const BANKS = [
  { name: 'Deutsche Bank', blz: '10070000', bic: 'DEUTDEBBXXX' },
  { name: 'Commerzbank', blz: '37040044', bic: 'COBADEFFXXX' },
  { name: 'ING', blz: '50010517', bic: 'INGDDEFFXXX' },
  { name: 'DKB', blz: '12030000', bic: 'BYLADEM1001' },
  { name: 'Berliner Sparkasse', blz: '10050000', bic: 'BELADEBEXXX' },
  { name: 'Hamburger Sparkasse', blz: '20050550', bic: 'HASPDEHHXXX' },
  { name: 'Stadtsparkasse München', blz: '70150000', bic: 'SSKMDEMMXXX' },
  { name: 'GLS Bank', blz: '43060967', bic: 'GENODEM1GLS' },
];

const COMPANY_WORDS = ('Nordwind Alpina Rheinland Hanse Elbtal Bergland Lindenhof Kronberg Weitblick ' +
  'Grünfeld Seeblick Sonnental Isartal').split(' ');

/* Areas of the pension insurance that open a social insurance number. */
const SV_AREAS = ['12', '13', '15', '23', '24', '25', '26', '28', '29', '38', '39', '40', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '58', '60', '61', '62', '63', '64', '65', '66'];

/**
 * The Steuer-ID: ten digits in which exactly one digit appears twice and the
 * others at most once, never starting with 0, then the MOD 11,10 check digit.
 */
export function steuerId(r) {
  for (;;) {
    const digits = r.shuffle('0123456789'.split('')).slice(0, 9);
    digits.push(r.pick(digits));
    const ten = r.shuffle(digits).join('');
    if (ten[0] === '0' || /(\d)\1\1/.test(ten)) continue;
    return ten + mod11_10(ten);
  }
}

/** The check digit of a social insurance number: letters as 01–26, cross sums of weighted digits. */
export function svCheck(eleven) {
  const digits = eleven.slice(0, 8) + pad(eleven.charCodeAt(8) - 64, 2) + eleven.slice(9);
  const weights = [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1];
  let sum = 0;
  [...digits].forEach((digit, i) => {
    const product = Number(digit) * weights[i];
    sum += Math.floor(product / 10) + (product % 10);
  });
  return String(sum % 10);
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 180)) + (r.chance(0.1) ? r.pick(['a', 'b', 'c']) : '');
  const postalCode = pad(r.int(...place.plz), 5);
  const lines = [`${street} ${building}`, `${postalCode} ${place.city}`];
  return { street, building, city: place.city, region: place.state, postalCode, lines, line: lines.join(', ') };
}

/* 0154: a mobile prefix of the 015x series that no network has been given. */
function phone(r) {
  const rest = r.digits(8);
  return { national: `0154 ${rest}`, international: `+49 154 ${rest}`, e164: `+49154${rest}`, range: 'unallocated' };
}

function documents(r, p) {
  const id = steuerId(r);
  const birthName = p.name.last.toUpperCase()[0].replace(/[ÄÖÜ]/, ch => ({ Ä: 'A', Ö: 'O', Ü: 'U' }[ch]));
  const serial = pad(p.gender === 'female' ? r.int(50, 99) : r.int(0, 49), 2);
  const birth = pad(p.birth.getUTCDate(), 2) + pad(p.birth.getUTCMonth() + 1, 2) + String(p.birth.getUTCFullYear()).slice(2);
  const eleven = r.pick(SV_AREAS) + birth + birthName + serial;
  const sv = eleven + svCheck(eleven);
  const list = [
    { id: 'idnr', name: 'Steuer-ID', kind: 'tax', value: `${id.slice(0, 2)} ${id.slice(2, 5)} ${id.slice(5, 8)} ${id.slice(8)}`, raw: id },
    { id: 'svnr', name: 'Sozialversicherungsnummer', kind: 'social', value: `${sv.slice(0, 2)} ${sv.slice(2, 8)} ${sv[8]} ${sv.slice(9)}`, raw: sv },
  ];
  if (p.age >= 16) {
    list.push({ id: 'ausweis', name: 'Personalausweis', kind: 'id-card', value: r.from('LMNPRTVWXY') + r.from('CFGHJKLMNPRTVWXYZ0123456789', 8) });
  }
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('DE', chosen.blz + r.digits(10)), chosen.bic) };
}

function company(r, p) {
  const vat = String(r.int(1, 9)) + r.digits(7);
  return {
    name: r.weighted([
      [`${r.pick(SURNAMES)} GmbH`, 4], [`${r.pick(SURNAMES)} & ${r.pick(SURNAMES)} GmbH & Co. KG`, 2],
      [`${r.pick(COMPANY_WORDS)} AG`, 1], [`${r.pick(COMPANY_WORDS)} Consulting GmbH`, 2],
    ]),
    documents: [
      {
        id: 'hrb', name: 'Handelsregister', kind: 'company-reg', value: `HRB ${r.int(1000, 299999)}`,
        details: [{ id: 'court', name: 'Registergericht', value: `Amtsgericht ${p.place.court || p.place.city}` }],
      },
      { id: 'vat', name: 'USt-IdNr.', kind: 'vat', value: `DE${vat}${mod11_10(vat)}` },
    ],
  };
}

export default {
  id: 'de',
  locale: 'de-DE',
  dateFormat: 'DD.MM.YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'mastercard', 'mastercard'],
  company,
};
