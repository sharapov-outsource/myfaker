/**
 * The United Kingdom.
 *
 * An address the way Royal Mail wants it: the post town in capitals on a line
 * of its own and a postcode whose outward half belongs to that town. A mobile
 * number from 07700 900000–900999, the block Ofcom keeps for drama. A National
 * Insurance number that avoids the prefixes HMRC never issues; an NHS number —
 * or, in Scotland, a CHI number built from the birth date, and in Northern
 * Ireland a Health and Care number — with its modulus 11 check; and a driving
 * licence number spelled out from the holder's surname, birth date and initials.
 */

import { pad, weightedSum, formatDate, iban, ibanFields } from '../parts.js';

const MALE = ('Oliver George Harry Jack Charlie Thomas James William Jacob Alfie Noah Oscar Leo ' +
  'Henry Arthur Freddie Archie Theo Joshua Daniel Samuel Benjamin Edward Alexander Matthew Luke ' +
  'Adam Callum Ryan Liam').split(' ');

const FEMALE = ('Olivia Amelia Isla Ava Emily Sophie Grace Mia Poppy Ella Lily Evie Isabella ' +
  'Charlotte Jessica Freya Ruby Florence Chloe Sophia Alice Daisy Phoebe Lucy Hannah Emma Sarah ' +
  'Rebecca Laura Katie').split(' ');

const SURNAMES = ('Smith Jones Williams Taylor Brown Davies Evans Wilson Thomas Johnson Roberts ' +
  'Robinson Thompson Wright Walker White Edwards Hughes Green Hall Lewis Harris Clarke Patel ' +
  'Jackson Wood Turner Martin Cooper Hill Ward Morris Moore Clark Lee King Baker Harrison Morgan ' +
  'Allen James Scott Phillips Watson Davis Parker Price Bennett Young Griffiths MacDonald').split(' ');

const CITIES = [
  { city: 'London', nation: 'england', outward: ['E1', 'E2', 'E14', 'EC1V', 'N1', 'N7', 'NW1', 'NW3', 'SE1', 'SE10', 'SW4', 'SW11', 'SW1V', 'W2', 'W8', 'W1T', 'WC1H', 'WC2N'] },
  { city: 'Manchester', nation: 'england', outward: ['M1', 'M2', 'M3', 'M4', 'M13', 'M14', 'M15', 'M20'] },
  { city: 'Birmingham', nation: 'england', outward: ['B1', 'B2', 'B3', 'B5', 'B15', 'B16', 'B29'] },
  { city: 'Leeds', nation: 'england', outward: ['LS1', 'LS2', 'LS6', 'LS7', 'LS11'] },
  { city: 'Liverpool', nation: 'england', outward: ['L1', 'L2', 'L3', 'L8', 'L17'] },
  { city: 'Bristol', nation: 'england', outward: ['BS1', 'BS2', 'BS6', 'BS8'] },
  { city: 'Sheffield', nation: 'england', outward: ['S1', 'S2', 'S10', 'S11'] },
  { city: 'Newcastle upon Tyne', nation: 'england', outward: ['NE1', 'NE2', 'NE4', 'NE6'] },
  { city: 'Nottingham', nation: 'england', outward: ['NG1', 'NG2', 'NG7'] },
  { city: 'Cardiff', nation: 'wales', outward: ['CF10', 'CF11', 'CF14', 'CF24'] },
  { city: 'Glasgow', nation: 'scotland', outward: ['G1', 'G2', 'G3', 'G11', 'G12', 'G41'] },
  { city: 'Edinburgh', nation: 'scotland', outward: ['EH1', 'EH2', 'EH3', 'EH6', 'EH10'] },
  { city: 'Belfast', nation: 'northern-ireland', outward: ['BT1', 'BT7', 'BT9'] },
];

const STREETS = ('High Street|Station Road|Church Lane|Victoria Road|Green Lane|Manor Road|Park Road|' +
  'Church Street|Queens Road|Kings Road|New Road|Grange Road|Mill Lane|School Lane|The Avenue|' +
  'North Street|London Road|York Road|Albert Road|Springfield Road|Windsor Road|Highfield Road|' +
  'Main Street|Chester Road|Elm Grove|Oak Close|Beech Avenue|Cedar Drive').split('|');

const BANKS = [
  { name: 'NatWest', code: 'NWBK', bic: 'NWBKGB2L', sort: '60' },
  { name: 'Barclays', code: 'BARC', bic: 'BARCGB22', sort: '20' },
  { name: 'Lloyds Bank', code: 'LOYD', bic: 'LOYDGB2L', sort: '30' },
  { name: 'HSBC UK', code: 'HBUK', bic: 'HBUKGB4B', sort: '40' },
];

const COMPANY_WORDS = ('Albion Pennine Thames Highgate Kingsway Oakridge Riverside Northgate Bramley ' +
  'Ashford Wessex Brightwater Fernhill Holloway Stonebridge').split(' ');

/* Letters that never open a National Insurance number, and pairs never issued. */
const NINO_FIRST = 'ABCEGHJKLMNOPRSTWXYZ';
const NINO_SECOND = 'ABCEGHJKLMNPRSTWXYZ';
const NINO_BARRED = new Set(['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ']);

export function nino(r) {
  let prefix;
  do { prefix = r.from(NINO_FIRST) + r.from(NINO_SECOND); } while (NINO_BARRED.has(prefix));
  return prefix + r.digits(6) + r.from('ABCD');
}

/** Modulus 11 over nine digits, weights 10 to 2 — NHS, CHI and H&C numbers alike. */
export function mod11Digit(nine) {
  const check = 11 - (weightedSum(nine, [10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11);
  if (check === 10) return null;
  return String(check === 11 ? 0 : check);
}

function healthNumber(r, p) {
  for (;;) {
    let nine;
    if (p.place.nation === 'scotland') {
      /* CHI: the birth date, two digits, and a ninth that is odd for men. */
      const parity = p.gender === 'male' ? r.pick([1, 3, 5, 7, 9]) : r.pick([0, 2, 4, 6, 8]);
      nine = formatDate(p.birth, 'DDMMYY') + r.digits(2) + parity;
    } else if (p.place.nation === 'northern-ireland') {
      nine = String(r.int(320, 399)) + r.digits(6);
    } else {
      nine = String(r.int(400, 499)) + r.digits(6);
    }
    const check = mod11Digit(nine);
    if (check !== null) return nine + check;
  }
}

const HEALTH_NAMES = { scotland: 'CHI number', 'northern-ireland': 'H&C number' };

/**
 * The DVLA number: five letters of the surname, the decade, the month (plus 50
 * for a woman), the day, the year, two initials, a 9 and two check letters.
 */
export function drivingLicence(r, p) {
  const surname = p.name.last.toUpperCase().replace(/^MAC/, 'MC').replace(/[^A-Z]/g, '');
  const year = String(p.birth.getUTCFullYear());
  const month = p.birth.getUTCMonth() + 1 + (p.gender === 'female' ? 50 : 0);
  const initials = (p.name.first[0] + (p.name.middle ? p.name.middle[0] : '9')).toUpperCase();
  return surname.slice(0, 5).padEnd(5, '9') + year[2] + pad(month, 2) +
    pad(p.birth.getUTCDate(), 2) + year[3] + initials + '9' + r.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 2);
}

/** A VAT number under the 9755 scheme HMRC has issued since 2010. */
export function vatNumber(seven) {
  const sum = weightedSum(seven, [8, 7, 6, 5, 4, 3, 2]);
  return seven + pad((97 - ((sum + 55) % 97)) % 97, 2);
}

function name(r, gender) {
  const list = gender === 'female' ? FEMALE : MALE;
  const first = r.pick(list);
  let middle;
  if (r.chance(0.45)) {
    do { middle = r.pick(list); } while (middle === first);
  }
  const last = r.pick(SURNAMES);
  return { first, middle, last, middleKind: middle ? 'middle' : undefined, full: [first, middle, last].filter(Boolean).join(' ') };
}

function address(r, place) {
  const building = String(r.int(1, 240));
  const street = r.pick(STREETS);
  const apartment = r.chance(0.3) ? String(r.int(1, 24)) : undefined;
  const postalCode = `${r.pick(place.outward)} ${r.int(1, 9)}${r.from('ABDEFGHJLNPQRSTUWXYZ', 2)}`;
  const lines = [apartment ? `Flat ${apartment}` : null, `${building} ${street}`, place.city.toUpperCase(), postalCode]
    .filter(Boolean);
  return { street, building, apartment, city: place.city, postalCode, lines, line: lines.join(', ') };
}

function phone(r) {
  const tail = r.digits(3);
  return {
    national: `07700 900${tail}`,
    international: `+44 7700 900${tail}`,
    e164: `+447700900${tail}`,
    range: 'fiction',
  };
}

function documents(r, p) {
  const ni = nino(r);
  const health = healthNumber(r, p);
  const list = [
    { id: 'nino', name: 'National Insurance number', kind: 'social', value: ni.replace(/^(..)(..)(..)(..)(.)$/, '$1 $2 $3 $4 $5'), raw: ni },
    { id: 'health', name: HEALTH_NAMES[p.place.nation] || 'NHS number', kind: 'health', value: `${health.slice(0, 3)} ${health.slice(3, 6)} ${health.slice(6)}`, raw: health },
  ];
  if (p.age >= 17) list.push({ id: 'driving', name: 'Driving licence number', kind: 'driving', value: drivingLicence(r, p) });
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const sort = chosen.sort + r.digits(4);
  const account = r.digits(8);
  return {
    name: chosen.name,
    fields: [
      { id: 'sort', name: 'Sort code', value: sort.replace(/(..)(..)(..)/, '$1-$2-$3'), raw: sort },
      { id: 'account', name: 'Account number', value: account },
      ...ibanFields(iban('GB', chosen.code + sort + account), chosen.bic),
    ],
  };
}

function company(r, p) {
  const number = { scotland: 'SC', 'northern-ireland': 'NI' }[p.place.nation];
  const vat = vatNumber(String(r.int(1, 9)) + r.digits(6));
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} Ltd`, 4], [`${r.pick(SURNAMES)} & Sons Ltd`, 1], [`${r.pick(COMPANY_WORDS)} plc`, 1]]),
    documents: [
      { id: 'crn', name: 'Company number', kind: 'company-reg', value: number ? number + r.digits(6) : r.pick(['0', '1']) + r.digits(7) },
      { id: 'vat', name: 'VAT number', kind: 'vat', value: `GB ${vat.slice(0, 3)} ${vat.slice(3, 7)} ${vat.slice(7)}`, raw: 'GB' + vat },
    ],
  };
}

export default {
  id: 'gb',
  locale: 'en-GB',
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
