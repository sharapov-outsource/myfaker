/**
 * The United States.
 *
 * First, middle and last name. A street address with the city, the state and a
 * ZIP code that belongs to that city, and a phone number with that city's area
 * code — from 555-0100 to 555-0199, the block the numbering plan sets aside for
 * fiction, so a test that dials or texts it reaches nobody. A Social Security
 * number that respects the rules of the scheme, an ABA routing number with its
 * check digit, and for a business, an EIN with a prefix the IRS actually uses.
 */

import { pad, weightedSum } from '../parts.js';

const MALE = ('James John Robert Michael William David Richard Joseph Thomas Christopher Charles ' +
  'Daniel Matthew Anthony Mark Donald Steven Andrew Paul Joshua Kenneth Kevin Brian George ' +
  'Timothy Ryan Jacob Jason Ethan Noah Liam Benjamin').split(' ');

const FEMALE = ('Mary Patricia Jennifer Linda Elizabeth Barbara Susan Jessica Sarah Karen Lisa ' +
  'Nancy Betty Sandra Ashley Emily Michelle Amanda Melissa Stephanie Rebecca Laura Emma Olivia ' +
  'Sophia Ava Isabella Mia Abigail Madison Hannah Grace').split(' ');

const SURNAMES = ('Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez ' +
  'Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Perez Thompson ' +
  'White Harris Sanchez Clark Ramirez Lewis Robinson Walker Young Allen King Wright Scott Torres ' +
  'Nguyen Hill Flores Green Adams Nelson Baker Hall Rivera Campbell Mitchell Carter Roberts').split(' ');

const CITIES = [
  { city: 'New York', state: 'New York', code: 'NY', zip: [10001, 10282], area: ['212', '646', '917', '332'] },
  { city: 'Los Angeles', state: 'California', code: 'CA', zip: [90001, 90089], area: ['213', '323', '310'] },
  { city: 'Chicago', state: 'Illinois', code: 'IL', zip: [60601, 60661], area: ['312', '773', '872'] },
  { city: 'Houston', state: 'Texas', code: 'TX', zip: [77001, 77099], area: ['713', '281', '832'] },
  { city: 'Phoenix', state: 'Arizona', code: 'AZ', zip: [85001, 85099], area: ['602', '480', '623'] },
  { city: 'Philadelphia', state: 'Pennsylvania', code: 'PA', zip: [19102, 19154], area: ['215', '267'] },
  { city: 'San Antonio', state: 'Texas', code: 'TX', zip: [78201, 78266], area: ['210'] },
  { city: 'San Diego', state: 'California', code: 'CA', zip: [92101, 92199], area: ['619', '858'] },
  { city: 'Dallas', state: 'Texas', code: 'TX', zip: [75201, 75398], area: ['214', '469', '972'] },
  { city: 'Austin', state: 'Texas', code: 'TX', zip: [78701, 78759], area: ['512', '737'] },
  { city: 'San Francisco', state: 'California', code: 'CA', zip: [94102, 94134], area: ['415', '628'] },
  { city: 'Seattle', state: 'Washington', code: 'WA', zip: [98101, 98199], area: ['206'] },
  { city: 'Denver', state: 'Colorado', code: 'CO', zip: [80202, 80299], area: ['303', '720'] },
  { city: 'Boston', state: 'Massachusetts', code: 'MA', zip: [2108, 2137], area: ['617', '857'] },
  { city: 'Miami', state: 'Florida', code: 'FL', zip: [33101, 33199], area: ['305', '786'] },
  { city: 'Atlanta', state: 'Georgia', code: 'GA', zip: [30301, 30399], area: ['404', '678', '470'] },
  { city: 'Portland', state: 'Oregon', code: 'OR', zip: [97201, 97299], area: ['503', '971'] },
  { city: 'Minneapolis', state: 'Minnesota', code: 'MN', zip: [55401, 55488], area: ['612'] },
  { city: 'Nashville', state: 'Tennessee', code: 'TN', zip: [37201, 37250], area: ['615'] },
  { city: 'Springfield', state: 'Illinois', code: 'IL', zip: [62701, 62796], area: ['217'] },
];

const STREET_NAMES = ('Main Oak Pine Maple Cedar Elm Washington Lake Hill Park Walnut Sunset Lincoln ' +
  'Jackson Church River Highland Ridge Spring Willow Chestnut Franklin Madison Jefferson Adams ' +
  'Center Mill Forest Meadow Valley').split(' ');
const STREET_TYPES = ['St', 'St', 'Ave', 'Ave', 'Rd', 'Dr', 'Ln', 'Blvd', 'Ct', 'Pl', 'Way'];

const COMPANY_WORDS = ('Summit Pioneer Horizon Liberty Apex Evergreen Keystone Bluewater Ironwood ' +
  'Northstar Silverline Brightpath Redwood Lakeside Crescent').split(' ');

/* Prefixes the IRS assigns, by the campus that assigns them. */
const EIN_PREFIXES = ('01 02 03 04 05 06 10 11 12 13 14 15 16 20 21 22 23 24 25 26 27 30 32 33 34 35 ' +
  '36 37 38 39 40 41 42 43 44 45 46 47 48 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 ' +
  '71 72 73 74 75 76 77 80 81 82 83 84 85 86 87 88 90 91 92 93 94 95 98 99').split(' ');

/** An ABA routing number: eight digits and a 3-7-1 check digit. */
export function routingNumber(eight) {
  const sum = weightedSum(eight, [3, 7, 1]);
  return eight + String((10 - (sum % 10)) % 10);
}

/**
 * A Social Security number the scheme could issue: no area 000, 666 or
 * 900–999, no group 00, no serial 0000.
 */
export function ssn(r) {
  let area;
  do { area = r.int(1, 899); } while (area === 666);
  return pad(area, 3) + pad(r.int(1, 99), 2) + pad(r.int(1, 9999), 4);
}

function name(r, gender) {
  const list = gender === 'female' ? FEMALE : MALE;
  const first = r.pick(list);
  let middle;
  do { middle = r.pick(list); } while (middle === first);
  const last = r.pick(SURNAMES);
  return { first, middle, last, middleKind: 'middle', full: `${first} ${middle} ${last}` };
}

function address(r, place) {
  const number = String(r.int(1, 9899));
  const street = `${r.pick(STREET_NAMES)} ${r.pick(STREET_TYPES)}`;
  const apartment = r.chance(0.3)
    ? r.pick(['Apt ', 'Apt ', 'Unit ', '#']) + r.int(1, 40) + (r.chance(0.4) ? r.pick(['A', 'B', 'C', 'D']) : '')
    : undefined;
  const postalCode = pad(r.int(...place.zip), 5);
  const first = `${number} ${street}${apartment ? `, ${apartment}` : ''}`;
  const second = `${place.city}, ${place.code} ${postalCode}`;
  return {
    street, building: number, apartment, city: place.city, region: place.state, regionCode: place.code,
    postalCode, lines: [first, second], line: `${first}, ${second}`,
  };
}

function phone(r, place) {
  const area = r.pick(place.area);
  const line = '01' + r.digits(2);
  return {
    national: `(${area}) 555-${line}`,
    international: `+1 ${area}-555-${line}`,
    e164: `+1${area}555${line}`,
    fictional: true,
  };
}

function documents(r) {
  const number = ssn(r);
  return [{
    id: 'ssn', name: 'SSN', kind: 'social',
    value: `${number.slice(0, 3)}-${number.slice(3, 5)}-${number.slice(5)}`, raw: number,
  }];
}

function bank(r) {
  /* The first two digits name a Federal Reserve district, 01–12. */
  const routing = routingNumber(pad(r.int(1, 12), 2) + r.digits(6));
  return {
    fields: [
      { id: 'routing', name: 'Routing number', value: routing },
      { id: 'account', name: 'Account number', value: String(r.int(1, 9)) + r.digits(r.int(9, 11)) },
    ],
  };
}

function company(r) {
  const word = r.pick(COMPANY_WORDS);
  const ein = r.pick(EIN_PREFIXES) + r.digits(7);
  return {
    name: r.weighted([[`${word} LLC`, 3], [`${word} Inc.`, 2], [`${r.pick(SURNAMES)} & ${r.pick(SURNAMES)} LLP`, 1]]),
    documents: [{ id: 'ein', name: 'EIN', kind: 'tax', value: `${ein.slice(0, 2)}-${ein.slice(2)}`, raw: ein }],
  };
}

export default {
  id: 'us',
  locale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard', 'mastercard', 'amex', 'discover'],
  company,
};
