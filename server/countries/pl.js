/**
 * Poland.
 *
 * Surnames that agree with the gender — Kowalski, Kowalska. An address with
 * the flat after a slash and a postcode that belongs to the city. A PESEL that
 * is the person's birth date, with the century folded into the month, a digit
 * that is odd for men and even for women, and its check digit. An identity
 * card series whose check digit sits in the middle of it. An IBAN at a real
 * bank whose eight-digit sort code carries its own check, and for a business
 * a NIP, a REGON and a KRS number.
 */

import { pad, weightedSum, charValue, iban, ibanFields } from '../parts.js';

const MALE = ('Antoni Jan Aleksander Franciszek Jakub Szymon Filip Mikołaj Wojciech Kacper Adam Piotr ' +
  'Krzysztof Andrzej Tomasz Paweł Marcin Michał Łukasz Grzegorz Mateusz Dawid Bartosz Marek Rafał ' +
  'Kamil Robert Maciej Dariusz Sebastian').split(' ');

const FEMALE = ('Zuzanna Julia Zofia Hanna Maja Lena Alicja Maria Oliwia Amelia Anna Katarzyna Małgorzata ' +
  'Agnieszka Barbara Ewa Krystyna Magdalena Elżbieta Joanna Aleksandra Monika Natalia Karolina ' +
  'Justyna Paulina Marta Dorota Beata Weronika').split(' ');

const SURNAMES = ('Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański ' +
  'Woźniak Dąbrowski Kozłowski Jankowski Mazur Wojciechowski Kwiatkowski Krawczyk Kaczmarek ' +
  'Piotrowski Grabowski Zając Pawłowski Michalski Król Wieczorek Jabłoński Wróbel Nowakowski ' +
  'Majewski Olszewski Stępień Malinowski Jaworski Adamczyk Dudek Nowicki Pawlak Górski Witkowski Walczak').split(' ');

/** Kowalski → Kowalska, Zawadzki → Zawadzka; Nowak stays Nowak. */
export const feminine = surname => surname.replace(/(sk|ck|dzk)i$/, '$1a');

const CITIES = [
  { city: 'Warszawa', province: 'mazowieckie', postal: [0, 4] },
  { city: 'Kraków', province: 'małopolskie', postal: [30, 31] },
  { city: 'Łódź', province: 'łódzkie', postal: [90, 94] },
  { city: 'Wrocław', province: 'dolnośląskie', postal: [50, 54] },
  { city: 'Poznań', province: 'wielkopolskie', postal: [60, 61] },
  { city: 'Gdańsk', province: 'pomorskie', postal: [80, 80] },
  { city: 'Szczecin', province: 'zachodniopomorskie', postal: [70, 71] },
  { city: 'Bydgoszcz', province: 'kujawsko-pomorskie', postal: [85, 85] },
  { city: 'Lublin', province: 'lubelskie', postal: [20, 20] },
  { city: 'Białystok', province: 'podlaskie', postal: [15, 15] },
  { city: 'Katowice', province: 'śląskie', postal: [40, 40] },
  { city: 'Gdynia', province: 'pomorskie', postal: [81, 81] },
];

const STREETS = ('ul. Polna|ul. Leśna|ul. Słoneczna|ul. Krótka|ul. Szkolna|ul. Ogrodowa|ul. Lipowa|' +
  'ul. Brzozowa|ul. Łąkowa|ul. Kwiatowa|ul. Kościuszki|ul. Mickiewicza|ul. Sienkiewicza|ul. Słowackiego|' +
  'ul. Kolejowa|ul. Jana Pawła II|ul. Piłsudskiego|ul. Długa|ul. Główna|al. Niepodległości|ul. 3 Maja|' +
  'ul. Wolności|ul. Kopernika|pl. Wolności').split('|');

/* The first three digits of a sort code name the bank. */
const BANKS = [
  { name: 'PKO Bank Polski', code: '102', bic: 'BPKOPLPW' },
  { name: 'Bank Pekao', code: '124', bic: 'PKOPPLPW' },
  { name: 'Santander Bank Polska', code: '109', bic: 'WBKPPLPP' },
  { name: 'mBank', code: '114', bic: 'BREXPLPW' },
  { name: 'ING Bank Śląski', code: '105', bic: 'INGBPLPW' },
  { name: 'Bank Millennium', code: '116', bic: 'BIGBPLPW' },
  { name: 'Alior Bank', code: '249', bic: 'ALBPPLPW' },
];

const COMPANY_WORDS = 'Wisła Bałtyk Tatry Mazowsze Orzeł Bursztyn Sokół Kasztan Promień Horyzont Jantar Lech'.split(' ');

/* The century a PESEL month is shifted by: 1800s +80, 1900s +0, 2000s +20, 2100s +40. */
const CENTURY = { 18: 80, 19: 0, 20: 20, 21: 40 };

export const peselCheck = ten => String((10 - (weightedSum(ten, [1, 3, 7, 9]) % 10)) % 10);

export function pesel(birth, female, r) {
  const year = birth.getUTCFullYear();
  const month = birth.getUTCMonth() + 1 + CENTURY[Math.floor(year / 100)];
  const sex = female ? r.pick([0, 2, 4, 6, 8]) : r.pick([1, 3, 5, 7, 9]);
  const ten = String(year).slice(2) + pad(month, 2) + pad(birth.getUTCDate(), 2) + r.digits(3) + sex;
  return ten + peselCheck(ten);
}

/** The digit that sits between the letters and the digits of an identity card series. */
export function idCardCheck(letters, digits) {
  const sum = [...letters].reduce((total, ch, i) => total + charValue(ch) * [7, 3, 1][i], 0) +
    weightedSum(digits, [7, 3, 1, 7, 3]);
  return String(sum % 10);
}

export function idCard(r) {
  const letters = r.from('ABCDEFGHIJKLMNPRSTUVWXYZ', 3);
  const digits = r.digits(5);
  return letters + idCardCheck(letters, digits) + digits;
}

/** NIP: a remainder of 10 has no check digit, and such a number is never issued. */
export function nipCheck(nine) {
  const check = weightedSum(nine, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
  return check < 10 ? String(check) : null;
}

export function nip(r) {
  for (;;) {
    const nine = String(r.int(101, 999)) + r.digits(6);
    const check = nipCheck(nine);
    if (check !== null) return nine + check;
  }
}

export function regon(eight) {
  return eight + String((weightedSum(eight, [8, 9, 2, 3, 4, 5, 6, 7]) % 11) % 10);
}

/** A sort code: bank, branch, and a check digit weighted 3, 9, 7, 1. */
export function sortCode(seven) {
  return seven + String((10 - (weightedSum(seven, [3, 9, 7, 1, 3, 9, 7]) % 10)) % 10);
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const surname = r.pick(SURNAMES);
  const last = gender === 'female' ? feminine(surname) : surname;
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 160));
  const apartment = r.chance(0.6) ? String(r.int(1, 90)) : undefined;
  const postalCode = `${pad(r.int(...place.postal), 2)}-${pad(r.int(1, 999), 3)}`;
  const lines = [`${street} ${building}${apartment ? `/${apartment}` : ''}`, `${postalCode} ${place.city}`];
  return { street, building, apartment, city: place.city, region: place.province, postalCode, lines, line: lines.join(', ') };
}

const MOBILE = ('501 502 503 504 505 506 507 508 510 511 512 513 514 515 516 517 600 601 602 603 604 605 ' +
  '660 661 662 663 664 665 666 667 668 669 690 691 692 693 694 695 696 697 698 721 722 723 724 725 726 ' +
  '727 728 729 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 880 881 ' +
  '882 883 884 885 886 887 888 889').split(' ');

function phone(r) {
  const prefix = r.pick(MOBILE);
  const rest = r.digits(6);
  const spaced = `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
  return { national: spaced, international: `+48 ${spaced}`, e164: `+48${prefix}${rest}` };
}

function documents(r, p) {
  const list = [{ id: 'pesel', name: 'PESEL', kind: 'national-id', value: pesel(p.birth, p.gender === 'female', r) }];
  const card = idCard(r);
  list.push({ id: 'dowod', name: 'Dowód osobisty', kind: 'id-card', value: `${card.slice(0, 3)} ${card.slice(3)}`, raw: card });
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return {
    name: chosen.name,
    fields: ibanFields(iban('PL', sortCode(chosen.code + r.digits(4)) + r.digits(16)), chosen.bic),
  };
}

function company(r) {
  const number = nip(r);
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} sp. z o.o.`, 4], [`${r.pick(SURNAMES)} i Wspólnicy sp.j.`, 1], [`${r.pick(COMPANY_WORDS)} S.A.`, 1]]),
    documents: [
      { id: 'nip', name: 'NIP', kind: 'tax', value: `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6, 8)}-${number.slice(8)}`, raw: number },
      { id: 'regon', name: 'REGON', kind: 'company-reg', value: regon(String(r.int(1, 9)) + r.digits(7)) },
      { id: 'krs', name: 'KRS', kind: 'company-reg', value: pad(r.int(1, 999999), 10) },
    ],
  };
}

export default {
  id: 'pl',
  locale: 'pl-PL',
  dateFormat: 'DD.MM.YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard'],
  company,
};
