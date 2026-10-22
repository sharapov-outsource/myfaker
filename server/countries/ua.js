/**
 * Ukraine.
 *
 * Surname, name and patronymic in Ukrainian, and in Latin letters by the 2010
 * national transliteration that passports use. An address as Ukrposhta writes
 * it, the five-digit index last. The taxpayer number (РНОКПП) is the person
 * written down: the first five digits count the days from 31 December 1899 to
 * the birth date and the ninth is odd for men and even for women, before the
 * check digit. An ID card with the record number of the demographic register
 * (УНЗР) that comes with it, an IBAN at a real bank, and for a business, an
 * ЄДРПОУ code with its check digit.
 */

import { pad, weightedSum, formatDate, addYears, addDays, dayBetween, iban, ibanFields } from '../parts.js';
import { latinUk } from '../translit.js';

const MALE = ('Олександр Андрій Сергій Дмитро Володимир Максим Іван Михайло Віталій Юрій Олег Богдан ' +
  'Тарас Микола Василь Артем Денис Ігор Роман Євген Назар Остап Ярослав Павло Віктор Степан Антон Петро').split(' ');

const FEMALE = ('Олена Наталія Тетяна Ірина Оксана Юлія Світлана Ольга Марія Анна Катерина Вікторія ' +
  'Людмила Галина Софія Анастасія Дарина Христина Соломія Ганна Леся Зоряна Мирослава Надія ' +
  'Валентина Яна Олеся').split(' ');

const PATRONYMICS = ('Олександрович:Олександрівна Андрійович:Андріївна Сергійович:Сергіївна ' +
  'Дмитрович:Дмитрівна Володимирович:Володимирівна Іванович:Іванівна Михайлович:Михайлівна ' +
  'Миколайович:Миколаївна Васильович:Василівна Петрович:Петрівна Юрійович:Юріївна Олегович:Олегівна ' +
  'Вікторович:Вікторівна Богданович:Богданівна Степанович:Степанівна Григорович:Григорівна ' +
  'Анатолійович:Анатоліївна Павлович:Павлівна Ігорович:Ігорівна Романович:Романівна ' +
  'Тарасович:Тарасівна Ярославович:Ярославівна Валерійович:Валеріївна Леонідович:Леонідівна')
  .split(' ').map(pair => pair.split(':'));

const SURNAMES = ('Мельник Шевченко Бойко Коваленко Бондаренко Ткаченко Кравченко Ковальчук Коваль ' +
  'Олійник Шевчук Поліщук Бондар Ткачук Марченко Руденко Савченко Мороз Лисенко Петренко Клименко ' +
  'Кравчук Павленко Савчук Іваненко Левченко Харченко Карпенко Гончаренко Литвиненко Мельничук ' +
  'Кушнір Гаврилюк Романюк Остапенко Сидоренко Захарченко Яковенко Кузьменко Яворський Вишневський ' +
  'Козловський Білий').split(' ');

/** Яворський → Яворська, Білий → Біла; Шевченко and Мельник stay as they are. */
export function feminine(surname) {
  return /ий$/.test(surname) ? surname.slice(0, -2) + 'а' : surname;
}

const CITIES = [
  { city: 'Київ', postal: [1001, 4214] },
  { city: 'Харків', region: 'Харківська обл.', postal: [61001, 61204] },
  { city: 'Одеса', region: 'Одеська обл.', postal: [65001, 65125] },
  { city: 'Дніпро', region: 'Дніпропетровська обл.', postal: [49000, 49130] },
  { city: 'Львів', region: 'Львівська обл.', postal: [79000, 79071] },
  { city: 'Запоріжжя', region: 'Запорізька обл.', postal: [69000, 69124] },
  { city: 'Вінниця', region: 'Вінницька обл.', postal: [21001, 21100] },
  { city: 'Полтава', region: 'Полтавська обл.', postal: [36000, 36043] },
  { city: 'Чернігів', region: 'Чернігівська обл.', postal: [14000, 14039] },
  { city: 'Івано-Франківськ', region: 'Івано-Франківська обл.', postal: [76000, 76025] },
  { city: 'Ужгород', region: 'Закарпатська обл.', postal: [88000, 88021] },
  { city: 'Житомир', region: 'Житомирська обл.', postal: [10001, 10031] },
];

const STREETS = ('вул. Шевченка|вул. Франка|вул. Лесі Українки|вул. Грушевського|вул. Соборна|вул. Садова|' +
  'вул. Центральна|вул. Миру|вул. Незалежності|вул. Шкільна|вул. Зелена|вул. Козацька|' +
  'вул. Богдана Хмельницького|вул. Січових Стрільців|просп. Свободи|просп. Перемоги|бульв. Шевченка|' +
  'вул. Набережна|вул. Ярослава Мудрого|вул. Героїв Майдану|вул. Гетьмана Мазепи|вул. Київська|' +
  'вул. Лисенка|вул. Сковороди').split('|');

/* МФО — the six-digit bank code a Ukrainian IBAN opens with. */
const BANKS = [
  { name: 'ПриватБанк', mfo: '305299' },
  { name: 'monobank (Універсал Банк)', mfo: '322001' },
  { name: 'Ощадбанк', mfo: '300465' },
  { name: 'Райффайзен Банк', mfo: '380805' },
  { name: 'ПУМБ', mfo: '334851' },
  { name: 'Укргазбанк', mfo: '320478' },
];

const COMPANY_WORDS = ('Вектор Граніт Меридіан Альянс Прогрес Сфера Еталон Горизонт Імпульс Спектр ' +
  'Фенікс Атлант Квант Орбіта Ресурс Світанок Злагода Добробут Калина Вітрило').split(' ');

export function rntrcCheck(nine) {
  const sum = weightedSum(nine, [-1, 5, 7, 9, 4, 6, 10, 5, 7]);
  return String((((sum % 11) + 11) % 11) % 10);
}

/** РНОКПП: days since 31.12.1899, three digits, the sex digit, the check digit. */
export function rntrc(birth, female, r) {
  const days = Math.round((birth - Date.UTC(1899, 11, 31)) / 86400000);
  const sex = female ? r.pick([0, 2, 4, 6, 8]) : r.pick([1, 3, 5, 7, 9]);
  const nine = pad(days, 5) + r.digits(3) + sex;
  return nine + rntrcCheck(nine);
}

/** ЄДРПОУ: seven digits and a check digit, weighted 1–7 or 7, 1–6 depending on the range. */
export function edrpou(seven) {
  const middle = seven[0] >= '3' && seven[0] <= '5';
  const weights = middle ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
  let check = weightedSum(seven, weights) % 11;
  if (check === 10) check = (weightedSum(seven, weights.map(w => w + 2)) % 11) % 10;
  return seven + check;
}

/** УНЗР: the birth date, four digits (the last odd for men), and a 7-3-1 check digit. */
export function unzr(birth, female, r) {
  const sex = female ? r.pick([0, 2, 4, 6, 8]) : r.pick([1, 3, 5, 7, 9]);
  const twelve = formatDate(birth, 'YYYYMMDD') + r.digits(3) + sex;
  return `${twelve.slice(0, 8)}-${twelve.slice(8)}${weightedSum(twelve, [7, 3, 1]) % 10}`;
}

function name(r, gender) {
  const surname = r.pick(SURNAMES);
  const last = gender === 'female' ? feminine(surname) : surname;
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const middle = r.pick(PATRONYMICS)[gender === 'female' ? 1 : 0];
  const latin = { first: latinUk(first), middle: latinUk(middle), last: latinUk(last) };
  return {
    first, middle, last, middleKind: 'patronymic',
    full: `${last} ${first} ${middle}`,
    latin: { ...latin, full: `${latin.first} ${latin.last}` },
  };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 150));
  const apartment = r.chance(0.8) ? String(r.int(1, 300)) : undefined;
  const postalCode = pad(r.int(...place.postal), 5);
  const first = `${street}, буд. ${building}${apartment ? `, кв. ${apartment}` : ''}`;
  const lines = [first, `м. ${place.city}`, place.region, postalCode].filter(Boolean);
  return { street, building, apartment, city: place.city, region: place.region, postalCode, lines, line: lines.join(', ') };
}

const MOBILE = ['50', '63', '66', '67', '68', '73', '93', '95', '96', '97', '98', '99'];

function phone(r) {
  const code = r.pick(MOBILE);
  const rest = r.digits(7);
  const tail = `${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5)}`;
  return { national: `0${code} ${tail}`, international: `+380 ${code} ${tail}`, e164: `+380${code}${rest}` };
}

function documents(r, p) {
  const female = p.gender === 'female';
  const list = [{ id: 'rntrc', name: 'РНОКПП', kind: 'tax', value: rntrc(p.birth, female, r) }];
  if (p.age >= 14) {
    /* ID cards replaced the passport booklet in 2016. A card issued before 18
       is valid for four years and one issued after for ten, and the card a
       person holds today has not run out yet. */
    const latest = (...dates) => new Date(Math.max(...dates));
    const from = latest(addYears(p.birth, 14), Date.UTC(2016, 0, 11), addDays(addYears(p.today, -10), 1));
    let issued = dayBetween(r, from, p.today);
    if (issued < addYears(p.birth, 18)) issued = dayBetween(r, latest(from, addDays(addYears(p.today, -4), 1)), p.today);
    const expires = addYears(issued, issued < addYears(p.birth, 18) ? 4 : 10);
    list.push({
      id: 'id-card', name: 'ID-картка', kind: 'id-card', value: pad(r.int(1, 999999999), 9),
      details: [
        { id: 'unzr', name: 'УНЗР', value: unzr(p.birth, female, r) },
        { id: 'authority', name: 'Орган, що видав', value: pad(r.int(1, 9999), 4) },
        { id: 'issued', name: 'Дата видачі', value: formatDate(issued, 'DD.MM.YYYY') },
        { id: 'expires', name: 'Дійсний до', value: formatDate(expires, 'DD.MM.YYYY') },
      ],
    });
  }
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('UA', chosen.mfo + '00000' + '2620' + r.digits(10))) };
}

function company(r) {
  const code = edrpou(String(r.int(1, 4)) + r.digits(6));
  return {
    name: `ТОВ «${r.pick(COMPANY_WORDS)}»`,
    documents: [{ id: 'edrpou', name: 'ЄДРПОУ', kind: 'company-reg', value: code }],
  };
}

export default {
  id: 'ua',
  locale: 'uk-UA',
  dateFormat: 'DD.MM.YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard', 'mastercard'],
  company,
};
