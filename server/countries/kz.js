/**
 * Kazakhstan.
 *
 * Kazakh names for most people and Russian ones for some, as the country has
 * both, with a patronymic either way and a Latin spelling for the passport.
 * Addresses in Russian, the language most forms are filled in, with the
 * six-digit index. The ИИН is the birth date, a digit that holds the century
 * and the sex, a serial number and a check digit that falls back to a second
 * set of weights when the first gives ten. An ID card issued from sixteen, an
 * IBAN at a real bank, and for a business a БИН built the same way as an ИИН.
 */

import { pad, weightedSum, formatDate, addYears, dayBetween, iban, ibanFields } from '../parts.js';
import { latinKk } from '../translit.js';
import { RUSSIAN, feminine } from './ru.js';

const MALE = ('Нурлан Ерлан Асхат Арман Данияр Ержан Бауыржан Айдос Алибек Мадияр Нурсултан Дамир Тимур ' +
  'Санжар Әлихан Ербол Жандос Ғалым Қайрат Серік Мұрат Бекзат Азамат').split(' ');

const FEMALE = ('Айгерим Асель Динара Жанар Гүлнар Айжан Мадина Алия Дана Аружан Камила Әсел Жансая ' +
  'Томирис Сабина Аяулым Индира Сауле Гульмира Назерке Айнур Дильназ').split(' ');

const SURNAMES = ('Ахметов Омаров Абдрахманов Жумабаев Сулейменов Искаков Нурпеисов Касымов Тулегенов ' +
  'Мухамедов Сагинтаев Каримов Исмаилов Байжанов Есенов Кенжебаев Нургалиев Садыков Бекмуханов ' +
  'Жакупов Утегенов Мусин Ибраев Султанов Темирбаев').split(' ');

const PATRONYMICS = ('Нурланович:Нурлановна Ерланович:Ерлановна Арманович:Армановна Асхатович:Асхатовна ' +
  'Серикович:Сериковна Бауыржанович:Бауыржановна Кайратович:Кайратовна Маратович:Маратовна ' +
  'Талгатович:Талгатовна Болатович:Болатовна Ерболович:Ерболовна Даниярович:Данияровна ' +
  'Ержанович:Ержановна Муратович:Муратовна Бахытович:Бахытовна Жанатович:Жанатовна')
  .split(' ').map(pair => pair.split(':'));

const CITIES = [
  { city: 'Алматы', postal: [50000, 50063] },
  { city: 'Астана', postal: [10000, 10017] },
  { city: 'Шымкент', postal: [160000, 160050] },
  { city: 'Караганда', region: 'Карагандинская обл.', postal: [100000, 100029] },
  { city: 'Актобе', region: 'Актюбинская обл.', postal: [30000, 30020] },
  { city: 'Тараз', region: 'Жамбылская обл.', postal: [80000, 80019] },
  { city: 'Павлодар', region: 'Павлодарская обл.', postal: [140000, 140017] },
  { city: 'Усть-Каменогорск', region: 'Восточно-Казахстанская обл.', postal: [70000, 70019] },
  { city: 'Атырау', region: 'Атырауская обл.', postal: [60000, 60011] },
  { city: 'Костанай', region: 'Костанайская обл.', postal: [110000, 110018] },
];

const STREETS = ('пр. Абая|ул. Абая|пр. Достык|ул. Толе би|ул. Кабанбай батыра|ул. Сатпаева|ул. Жибек жолы|' +
  'ул. Байтурсынова|ул. Ауэзова|ул. Пушкина|ул. Гоголя|ул. Желтоксан|ул. Казыбек би|ул. Айтеке би|' +
  'ул. Наурызбай батыра|ул. Жандосова|ул. Манаса|пр. Республики|ул. Кенесары').split('|');

const BANKS = [
  { name: 'Kaspi Bank', code: '722', bic: 'CASPKZKA' },
  { name: 'Halyk Bank', code: '601', bic: 'HSBKKZKX' },
  { name: 'Банк ЦентрКредит', code: '856', bic: 'KCJBKZKX' },
  { name: 'ForteBank', code: '965', bic: 'IRTYKZKA' },
  { name: 'Jusan Bank', code: '998', bic: 'TSESKZKA' },
];

const COMPANY_WORDS = 'Алтын Самал Тулпар Береке Арман Шанырак Достык Жулдыз Кокжиек Сункар Байтерек Алатау'.split(' ');

/** The check digit shared by ИИН and БИН, or null for the numbers that have none. */
export function iinDigit(eleven) {
  let check = weightedSum(eleven, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) % 11;
  if (check === 10) check = weightedSum(eleven, [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]) % 11;
  return check === 10 ? null : String(check);
}

/* The seventh digit: the century of birth and the sex together. */
const CENTURY = { 18: [1, 2], 19: [3, 4], 20: [5, 6] };

export function iin(birth, female, r) {
  const centuryDigit = CENTURY[Math.floor(birth.getUTCFullYear() / 100)][female ? 1 : 0];
  for (;;) {
    const eleven = formatDate(birth, 'YYMMDD') + centuryDigit + r.digits(4);
    const check = iinDigit(eleven);
    if (check !== null) return eleven + check;
  }
}

function name(r, gender) {
  const russian = r.chance(0.3);
  const lists = russian ? RUSSIAN : { MALE, FEMALE, SURNAMES, PATRONYMICS };
  const surname = r.pick(lists.SURNAMES);
  const last = gender === 'female' ? feminine(surname) : surname;
  const first = r.pick(gender === 'female' ? lists.FEMALE : lists.MALE);
  const middle = r.pick(lists.PATRONYMICS)[gender === 'female' ? 1 : 0];
  const latin = { first: latinKk(first), middle: latinKk(middle), last: latinKk(last) };
  return {
    first, middle, last, middleKind: 'patronymic',
    full: `${last} ${first} ${middle}`,
    latin: { ...latin, full: `${latin.first} ${latin.last}` },
  };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 200));
  const apartment = r.chance(0.8) ? String(r.int(1, 250)) : undefined;
  const postalCode = pad(r.int(...place.postal), 6);
  const first = `${street}, д. ${building}${apartment ? `, кв. ${apartment}` : ''}`;
  const lines = [first, `г. ${place.city}`, place.region, postalCode].filter(Boolean);
  return {
    street, building, apartment, city: place.city, region: place.region, postalCode, lines,
    line: [postalCode, place.region, `г. ${place.city}`, first].filter(Boolean).join(', '),
  };
}

const MOBILE = ['700', '701', '702', '705', '707', '708', '747', '771', '775', '776', '777', '778'];

function phone(r) {
  const code = r.pick(MOBILE);
  const rest = r.digits(7);
  const tail = `${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5)}`;
  return { national: `8 (${code}) ${tail}`, international: `+7 ${code} ${tail}`, e164: `+7${code}${rest}` };
}

function documents(r, p) {
  const list = [{ id: 'iin', name: 'ИИН', kind: 'national-id', value: iin(p.birth, p.gender === 'female', r) }];
  if (p.age >= 16) {
    const issued = dayBetween(r, addYears(p.today, -10) > addYears(p.birth, 16) ? addYears(p.today, -10) : addYears(p.birth, 16), p.today);
    list.push({
      id: 'id-card', name: 'Удостоверение личности', kind: 'id-card', value: '0' + r.digits(8),
      details: [
        { id: 'issued', name: 'Дата выдачи', value: formatDate(issued, 'DD.MM.YYYY') },
        { id: 'issuer', name: 'Кем выдано', value: 'МВД РК' },
        { id: 'expires', name: 'Действительно до', value: formatDate(addYears(issued, 10), 'DD.MM.YYYY') },
      ],
    });
  }
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('KZ', chosen.code + r.digits(13)), chosen.bic) };
}

function company(r, p) {
  const registered = dayBetween(r, new Date(Date.UTC(2005, 0, 1)), p.today);
  let bin;
  do {
    const eleven = formatDate(registered, 'YYMM') + '40' + r.digits(5);
    const check = iinDigit(eleven);
    bin = check === null ? null : eleven + check;
  } while (!bin);
  return {
    name: `ТОО «${r.pick(COMPANY_WORDS)}»`,
    documents: [{ id: 'bin', name: 'БИН', kind: 'company-reg', value: bin }],
  };
}

export default {
  id: 'kz',
  locale: 'ru-KZ',
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
