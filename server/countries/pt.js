/**
 * Portugal.
 *
 * One or two given names and two surnames, the mother's before the father's.
 * An address with the floor and side of the flat after the number and a
 * seven-digit postcode. A NIF in the range the tax authority gives to people,
 * a social security number (NISS) and a Cartão de Cidadão number, each with
 * its own check; an IBAN whose NIB check digits are right, which is what makes
 * every Portuguese IBAN read PT50; and for a business, a NIPC.
 */

import { weightedSum, charValue, iban, ibanFields } from '../parts.js';

const MALE = ('João Francisco Afonso Duarte Tomás Lourenço Martim Santiago Rodrigo Miguel Gonçalo Pedro ' +
  'Tiago Diogo Rafael Gabriel Guilherme Henrique Rui Nuno Paulo Ricardo Luís José António Manuel ' +
  'Carlos Jorge Bruno André').split(' ');

const FEMALE = ('Maria Leonor Matilde Beatriz Carolina Mariana Ana Inês Sofia Francisca Margarida Clara ' +
  'Benedita Alice Joana Catarina Rita Marta Sara Daniela Patrícia Sandra Cláudia Susana Teresa Isabel ' +
  'Helena Filipa Raquel Luísa').split(' ');

const SURNAMES = ('Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes ' +
  'Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes ' +
  'Nunes Soares Vieira Monteiro Cardoso Rocha Neves Coelho Cruz Cunha Pires Ramos Reis Simões Antunes Matos').split(' ');

const CITIES = [
  { city: 'Lisboa', district: 'Lisboa', postal: [1000, 1998] },
  { city: 'Porto', district: 'Porto', postal: [4000, 4369] },
  { city: 'Vila Nova de Gaia', district: 'Porto', postal: [4400, 4434] },
  { city: 'Amadora', district: 'Lisboa', postal: [2610, 2724] },
  { city: 'Braga', district: 'Braga', postal: [4700, 4719] },
  { city: 'Coimbra', district: 'Coimbra', postal: [3000, 3049] },
  { city: 'Funchal', district: 'Madeira', postal: [9000, 9064] },
  { city: 'Setúbal', district: 'Setúbal', postal: [2900, 2914] },
  { city: 'Aveiro', district: 'Aveiro', postal: [3800, 3814] },
  { city: 'Faro', district: 'Faro', postal: [8000, 8009] },
  { city: 'Évora', district: 'Évora', postal: [7000, 7008] },
  { city: 'Leiria', district: 'Leiria', postal: [2400, 2419] },
];

const STREETS = ('Rua Augusta|Rua da Liberdade|Avenida da República|Rua de Santa Catarina|Rua do Comércio|' +
  'Rua Direita|Avenida 25 de Abril|Rua 1.º de Maio|Rua da Igreja|Rua das Flores|Rua Luís de Camões|' +
  'Avenida dos Aliados|Travessa do Carmo|Largo do Rato|Rua Garrett|Rua do Ouro|Rua da Prata|' +
  'Rua de Cedofeita|Avenida da Boavista|Rua Dr. António José de Almeida').split('|');

const BANKS = [
  { name: 'Caixa Geral de Depósitos', code: '0035', bic: 'CGDIPTPLXXX' },
  { name: 'Millennium bcp', code: '0033', bic: 'BCOMPTPLXXX' },
  { name: 'BPI', code: '0010', bic: 'BBPIPTPLXXX' },
  { name: 'Santander Totta', code: '0018', bic: 'TOTAPTPLXXX' },
  { name: 'Novo Banco', code: '0007', bic: 'BESCPTPLXXX' },
];

const COMPANY_WORDS = 'Atlântico Lusitana Tejo Douro Algarve Mondego Marinha Alvorada Horizonte Oceano Estrela Ribeira'.split(' ');

/** NIF and NIPC: eight digits, weights 9 to 2, and eleven minus the remainder. */
export function nif(eight) {
  const check = 11 - (weightedSum(eight, [9, 8, 7, 6, 5, 4, 3, 2]) % 11);
  return eight + String(check >= 10 ? 0 : check);
}

/** NISS: ten digits weighted by the primes from 29 down, and nine minus the remainder. */
export function niss(ten) {
  return ten + String(9 - (weightedSum(ten, [29, 23, 19, 17, 13, 11, 7, 5, 3, 2]) % 10));
}

/** The last digit of a Cartão de Cidadão: Luhn over letters and digits read in base 36. */
export function ccCheck(payload) {
  let sum = 0;
  [...payload].reverse().forEach((ch, i) => {
    let value = charValue(ch);
    if (i % 2 === 0) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  });
  return String((10 - (sum % 10)) % 10);
}

/** The two NIB check digits, which leave every Portuguese IBAN with check digits 50. */
export function nibCheck(nineteen) {
  let rest = 0;
  for (const digit of nineteen + '00') rest = (rest * 10 + Number(digit)) % 97;
  return String(98 - rest).padStart(2, '0');
}

function name(r, gender) {
  const list = gender === 'female' ? FEMALE : MALE;
  let first = r.pick(list);
  if (r.chance(0.3)) {
    let second;
    do { second = r.pick(list); } while (second === first);
    first = `${first} ${second}`;
  }
  const last = `${r.pick(SURNAMES)} ${r.pick(SURNAMES)}`;
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 220));
  const apartment = r.chance(0.6) ? r.pick(['R/C', `${r.int(1, 8)}.º`]) + ' ' + r.pick(['Esq.', 'Dto.', 'Frt.']) : undefined;
  const postalCode = `${r.int(...place.postal)}-${String(r.int(1, 999)).padStart(3, '0')}`;
  const lines = [`${street}, ${building}${apartment ? `, ${apartment}` : ''}`, `${postalCode} ${place.city}`];
  return { street, building, apartment, city: place.city, region: place.district, postalCode, lines, line: lines.join(', ') };
}

function phone(r) {
  const number = r.pick(['91', '92', '93', '96']) + r.digits(7);
  const spaced = `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  return { national: spaced, international: `+351 ${spaced}`, e164: `+351${number}` };
}

function documents(r) {
  const taxNumber = nif(String(r.int(1, 3)) + r.digits(7));
  const civil = String(r.int(10000000, 39999999));
  const cc = civil + nif(civil).slice(-1) + r.pick(['ZZ', 'ZY', 'ZX']);
  const number = cc + ccCheck(cc);
  const social = niss('1' + r.digits(9));
  return [
    { id: 'nif', name: 'NIF', kind: 'tax', value: `${taxNumber.slice(0, 3)} ${taxNumber.slice(3, 6)} ${taxNumber.slice(6)}`, raw: taxNumber },
    { id: 'niss', name: 'NISS', kind: 'social', value: social },
    { id: 'cc', name: 'Cartão de Cidadão', kind: 'id-card', value: `${number.slice(0, 8)} ${number[8]} ${number.slice(9)}`, raw: number },
  ];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const nineteen = chosen.code + r.digits(4) + r.digits(11);
  return { name: chosen.name, fields: ibanFields(iban('PT', nineteen + nibCheck(nineteen)), chosen.bic) };
}

function company(r) {
  const nipc = nif('5' + r.digits(7));
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)}, Lda.`, 3], [`${r.pick(SURNAMES)} & Filhos, Lda.`, 1], [`${r.pick(COMPANY_WORDS)}, S.A.`, 1]]),
    documents: [{ id: 'nipc', name: 'NIPC', kind: 'tax', value: nipc }],
  };
}

export default {
  id: 'pt',
  locale: 'pt-PT',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'mastercard'],
  company,
};
