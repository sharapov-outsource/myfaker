/**
 * Italy.
 *
 * The codice fiscale is the person spelled out: three letters of the surname,
 * three of the name, the year, a letter for the month, the day — plus forty
 * for a woman — and the cadastral code of the comune of birth, closed by a
 * check letter. It is worked out here from the name, birth date and birthplace
 * this person actually has, so all of them agree. The address puts the number
 * after the street and the province's sigla after the town; the IBAN carries a
 * correct CIN as well as its own check digits; a business gets a partita IVA.
 */

import { pad, luhnDigit, ascii, iban, ibanFields } from '../parts.js';

const MALE = ('Francesco Alessandro Lorenzo Andrea Leonardo Matteo Gabriele Riccardo Tommaso Davide ' +
  'Giuseppe Marco Luca Giovanni Antonio Stefano Roberto Paolo Simone Federico Fabio Daniele Alberto ' +
  'Massimo Giorgio Mario Claudio Enrico Pietro Salvatore').split(' ');

const FEMALE = ('Sofia Giulia Aurora Alice Ginevra Emma Giorgia Beatrice Martina Chiara Francesca Sara ' +
  'Anna Elena Valentina Federica Alessandra Silvia Laura Paola Maria Giovanna Roberta Elisa Serena ' +
  'Ilaria Claudia Monica Rosa Lucia').split(' ');

const SURNAMES = ("Rossi|Russo|Ferrari|Esposito|Bianchi|Romano|Colombo|Ricci|Marino|Greco|Bruno|" +
  "Gallo|Conti|De Luca|Mancini|Costa|Giordano|Rizzo|Lombardi|Moretti|Barbieri|Fontana|Santoro|" +
  "Mariani|Rinaldi|Caruso|Ferrara|Galli|Martini|Leone|Longo|Gentile|Martinelli|Vitale|Lombardo|" +
  "Serra|Coppola|De Santis|D'Angelo|Marchetti").split('|');

/* belfiore is the cadastral code the codice fiscale carries for a birthplace. */
const CITIES = [
  { city: 'Roma', sigla: 'RM', region: 'Lazio', cap: [118, 199], prefix: '00', belfiore: 'H501' },
  { city: 'Milano', sigla: 'MI', region: 'Lombardia', cap: [121, 162], prefix: '20', belfiore: 'F205' },
  { city: 'Napoli', sigla: 'NA', region: 'Campania', cap: [121, 147], prefix: '80', belfiore: 'F839' },
  { city: 'Torino', sigla: 'TO', region: 'Piemonte', cap: [121, 156], prefix: '10', belfiore: 'L219' },
  { city: 'Palermo', sigla: 'PA', region: 'Sicilia', cap: [121, 151], prefix: '90', belfiore: 'G273' },
  { city: 'Genova', sigla: 'GE', region: 'Liguria', cap: [121, 167], prefix: '16', belfiore: 'D969' },
  { city: 'Bologna', sigla: 'BO', region: 'Emilia-Romagna', cap: [121, 141], prefix: '40', belfiore: 'A944' },
  { city: 'Firenze', sigla: 'FI', region: 'Toscana', cap: [121, 145], prefix: '50', belfiore: 'D612' },
  { city: 'Bari', sigla: 'BA', region: 'Puglia', cap: [121, 132], prefix: '70', belfiore: 'A662' },
  { city: 'Catania', sigla: 'CT', region: 'Sicilia', cap: [121, 131], prefix: '95', belfiore: 'C351' },
  { city: 'Venezia', sigla: 'VE', region: 'Veneto', cap: [121, 176], prefix: '30', belfiore: 'L736' },
  { city: 'Verona', sigla: 'VR', region: 'Veneto', cap: [121, 142], prefix: '37', belfiore: 'L781' },
];

const STREETS = ('Via Roma|Via Garibaldi|Via Mazzini|Via Cavour|Via Dante Alighieri|Via Vittorio Emanuele II|' +
  'Corso Italia|Via Marconi|Via Verdi|Via Matteotti|Piazza della Repubblica|Via XX Settembre|Viale Europa|' +
  'Via dei Mille|Via San Francesco|Via Leopardi|Via Manzoni|Via Gramsci|Corso Umberto I|Via Nazionale').split('|');

const BANKS = [
  { name: 'Intesa Sanpaolo', abi: '03069', bic: 'BCITITMMXXX' },
  { name: 'UniCredit', abi: '02008', bic: 'UNCRITMMXXX' },
  { name: 'Banco BPM', abi: '05034', bic: 'BAPPIT21XXX' },
  { name: 'Monte dei Paschi di Siena', abi: '01030', bic: 'PASCITMMXXX' },
  { name: 'FinecoBank', abi: '03015', bic: 'FEBIITM1XXX' },
];

const COMPANY_WORDS = 'Aurora Tirreno Adriatica Dolomiti Lago Verde Sole Mediterranea Etrusca Laguna Vesuvio Toscana'.split(' ');

/* ------------------------------------------------------------------ *
 * Codice fiscale
 * ------------------------------------------------------------------ */

const letters = text => ascii(text).toUpperCase().replace(/[^A-Z]/g, '');
const consonants = text => text.replace(/[AEIOU]/g, '');
const vowels = text => text.replace(/[^AEIOU]/g, '');

export function surnameCode(surname) {
  const text = letters(surname);
  return (consonants(text) + vowels(text) + 'XXX').slice(0, 3);
}

export function nameCode(given) {
  const text = letters(given);
  const cons = consonants(text);
  if (cons.length >= 4) return cons[0] + cons[2] + cons[3];
  return (cons + vowels(text) + 'XXX').slice(0, 3);
}

const MONTHS = 'ABCDEHLMPRST';

/* What a character weighs in an odd position, 0–9 and A–Z alike. */
const ODD = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
const position = ch => (/\d/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65);

/** The check letter of a codice fiscale — and, over ABI, CAB and account, the CIN of an IBAN. */
export function checkLetter(text) {
  let sum = 0;
  [...text].forEach((ch, i) => { sum += i % 2 === 0 ? ODD[position(ch)] : position(ch); });
  return String.fromCharCode(65 + (sum % 26));
}

export function codiceFiscale({ first, last, birth, female, belfiore }) {
  const body = surnameCode(last) + nameCode(first) + String(birth.getUTCFullYear()).slice(2) +
    MONTHS[birth.getUTCMonth()] + pad(birth.getUTCDate() + (female ? 40 : 0), 2) + belfiore;
  return body + checkLetter(body);
}

/* ------------------------------------------------------------------ */

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 200));
  const apartment = r.chance(0.35) ? `int. ${r.int(1, 30)}` : undefined;
  const postalCode = place.prefix + pad(r.int(...place.cap), 3);
  const lines = [`${street} ${building}${apartment ? `, ${apartment}` : ''}`, `${postalCode} ${place.city} ${place.sigla}`];
  return {
    street, building, apartment, city: place.city, region: place.region, regionCode: place.sigla,
    postalCode, lines, line: lines.join(', '),
  };
}

/* Mobiles open with 31–39; 30x has not been given to any network. */
function phone(r) {
  const prefix = '30' + r.digits(1);
  const rest = r.digits(7);
  const spaced = `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
  return { national: spaced, international: `+39 ${spaced}`, e164: `+39${prefix}${rest}`, range: 'unallocated' };
}

function documents(r, p) {
  const list = [{
    id: 'cf', name: 'Codice fiscale', kind: 'tax',
    value: codiceFiscale({
      first: p.name.first, last: p.name.last, birth: p.birth,
      female: p.gender === 'female', belfiore: p.birthPlace.belfiore,
    }),
  }];
  list.push({ id: 'cie', name: "Carta d'identità", kind: 'id-card', value: 'C' + r.from('ABCDEFGHJKLMNPRSTUVZ') + r.digits(5) + r.from('ABCDEFGHJKLMNPRSTUVZ', 2) });
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const bban = chosen.abi + r.digits(5) + r.digits(12);
  return { name: chosen.name, fields: ibanFields(iban('IT', checkLetter(bban) + bban), chosen.bic) };
}

function company(r) {
  const ten = r.digits(7) + pad(r.int(1, 100), 3);
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} S.r.l.`, 4], [`${r.pick(SURNAMES)} & C. S.n.c.`, 1], [`${r.pick(COMPANY_WORDS)} S.p.A.`, 1]]),
    documents: [{ id: 'piva', name: 'Partita IVA', kind: 'vat', value: ten + luhnDigit(ten) }],
  };
}

export default {
  id: 'it',
  locale: 'it-IT',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'mastercard', 'mastercard'],
  company,
};
