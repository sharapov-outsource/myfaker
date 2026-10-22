/**
 * Spain.
 *
 * A given name and two surnames, the father's and the mother's, which forms ask
 * for separately. An address with the floor and door after the number, and a
 * postcode that opens with the province's code. A DNI with its control letter,
 * a social security number whose two control digits are worked out from the
 * province and the number, an IBAN whose own control digits (the DC of the old
 * CCC) are right as well, and for a business a CIF.
 */

import { pad, weightedSum, iban, ibanFields } from '../parts.js';

const MALE = ('Antonio José Manuel Francisco David Juan Javier Daniel Carlos Jesús Alejandro Miguel ' +
  'Rafael Pablo Sergio Fernando Jorge Luis Alberto Álvaro Adrián Diego Raúl Iván Rubén Óscar Hugo ' +
  'Mario Marcos Lucas').split(' ');

const FEMALE = ('María Carmen Ana Isabel Laura Lucía Cristina Marta Elena Sara Paula Raquel Pilar ' +
  'Rosa Beatriz Silvia Patricia Andrea Irene Alba Nuria Julia Claudia Sofía Martina Teresa Mercedes ' +
  'Rocío Natalia Eva').split(' ');

const SURNAMES = ('García Rodríguez González Fernández López Martínez Sánchez Pérez Gómez Martín ' +
  'Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez ' +
  'Vázquez Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez Ortega Delgado Castro Ortiz Rubio ' +
  'Marín Sanz Núñez Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero Cano Prieto').split(' ');

/* The province's two-digit code opens the postcode and the social security number. */
const CITIES = [
  { city: 'Madrid', province: 'Madrid', code: '28', postal: [1, 55] },
  { city: 'Barcelona', province: 'Barcelona', code: '08', postal: [1, 42] },
  { city: 'Valencia', province: 'Valencia', code: '46', postal: [1, 26] },
  { city: 'Sevilla', province: 'Sevilla', code: '41', postal: [1, 20] },
  { city: 'Zaragoza', province: 'Zaragoza', code: '50', postal: [1, 21] },
  { city: 'Málaga', province: 'Málaga', code: '29', postal: [1, 18] },
  { city: 'Murcia', province: 'Murcia', code: '30', postal: [1, 12] },
  { city: 'Palma', province: 'Illes Balears', code: '07', postal: [1, 15] },
  { city: 'Las Palmas de Gran Canaria', province: 'Las Palmas', code: '35', postal: [1, 19] },
  { city: 'Bilbao', province: 'Bizkaia', code: '48', postal: [1, 15] },
  { city: 'Alicante', province: 'Alicante', code: '03', postal: [1, 16] },
  { city: 'Córdoba', province: 'Córdoba', code: '14', postal: [1, 14] },
  { city: 'Valladolid', province: 'Valladolid', code: '47', postal: [1, 16] },
  { city: 'Vigo', province: 'Pontevedra', code: '36', postal: [201, 216] },
];

const STREETS = ('Calle Mayor|Calle Real|Calle de Alcalá|Gran Vía|Calle Nueva|Avenida de la Constitución|' +
  'Plaza de España|Calle del Sol|Calle de la Iglesia|Calle Cervantes|Avenida de Andalucía|' +
  'Calle San José|Calle de la Paz|Calle Libertad|Calle Goya|Avenida del Puerto|Calle Colón|' +
  'Calle Miguel de Unamuno|Calle Velázquez|Paseo de la Estación').split('|');

const BANKS = [
  { name: 'Banco Santander', code: '0049', bic: 'BSCHESMMXXX' },
  { name: 'BBVA', code: '0182', bic: 'BBVAESMMXXX' },
  { name: 'CaixaBank', code: '2100', bic: 'CAIXESBBXXX' },
  { name: 'Banco Sabadell', code: '0081', bic: 'BSABESBBXXX' },
  { name: 'Bankinter', code: '0128', bic: 'BKBKESMMXXX' },
  { name: 'ING', code: '1465', bic: 'INGDESMMXXX' },
];

const COMPANY_WORDS = 'Iberia Mediterráneo Sierra Levante Atlántico Castilla Aurora Solana Alameda Brisa Horizonte Olivo'.split(' ');

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export const dniLetter = number => DNI_LETTERS[Number(number) % 23];

/** One control digit of a Spanish account number (CCC). */
export function cccDigit(ten) {
  const check = 11 - (weightedSum(ten, [1, 2, 4, 8, 5, 10, 9, 7, 3, 6]) % 11);
  return String(check === 11 ? 0 : check === 10 ? 1 : check);
}

/** The control digit of a CIF whose organisation letter takes a digit (A, B…). */
export function cifDigit(seven) {
  let sum = 0;
  [...seven].forEach((ch, i) => {
    const digit = Number(ch);
    if (i % 2 === 1) sum += digit;
    else sum += Math.floor((digit * 2) / 10) + ((digit * 2) % 10);
  });
  return String((10 - (sum % 10)) % 10);
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  const second = r.pick(SURNAMES);
  return { first, last, second, full: `${first} ${last} ${second}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 150));
  const apartment = r.chance(0.75)
    ? `${r.int(1, 9)}.º ${r.pick(['A', 'B', 'C', 'D', 'izda.', 'dcha.'])}`
    : undefined;
  const postalCode = place.code + pad(r.int(...place.postal), 3);
  const lines = [
    `${street}, ${building}${apartment ? `, ${apartment}` : ''}`,
    `${postalCode} ${place.city}`,
    place.province !== place.city ? place.province : null,
  ].filter(Boolean);
  return { street, building, apartment, city: place.city, region: place.province, postalCode, lines, line: lines.join(', ') };
}

function phone(r) {
  const number = '6' + r.digits(8);
  const spaced = `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  return { national: spaced, international: `+34 ${spaced}`, e164: `+34${number}` };
}

function documents(r, p) {
  const dni = pad(r.int(1000000, 79999999), 8);
  /* With an eight-digit number that does not start with 0, the control digits
     are simply the province and the number, read as one, modulo 97. */
  const ssNumber = String(r.int(10000000, 99999999));
  const ss = p.place.code + ssNumber + pad(Number(BigInt(p.place.code + ssNumber) % 97n), 2);
  return [
    { id: 'dni', name: 'DNI', kind: 'id-card', value: dni + dniLetter(dni) },
    { id: 'nuss', name: 'Nº de la Seguridad Social', kind: 'social', value: `${ss.slice(0, 2)} ${ss.slice(2, 10)} ${ss.slice(10)}`, raw: ss },
  ];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const office = r.digits(4);
  const account = r.digits(10);
  const dc = cccDigit('00' + chosen.code + office) + cccDigit(account);
  return { name: chosen.name, fields: ibanFields(iban('ES', chosen.code + office + dc + account), chosen.bic) };
}

function company(r, p) {
  const seven = p.place.code + r.digits(5);
  const letter = r.weighted([['B', 4], ['A', 1]]);
  return {
    name: letter === 'A'
      ? `${r.pick(COMPANY_WORDS)}, S.A.`
      : r.weighted([[`${r.pick(COMPANY_WORDS)} Servicios, S.L.`, 2], [`${r.pick(SURNAMES)} y Asociados, S.L.`, 1]]),
    documents: [{ id: 'cif', name: 'NIF', kind: 'tax', value: letter + seven + cifDigit(seven) }],
  };
}

export default {
  id: 'es',
  locale: 'es-ES',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard'],
  company,
};
