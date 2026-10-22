/**
 * Russia.
 *
 * Name, patronymic and surname, the surname agreeing with the gender. An
 * address in the order the Post asks for it, and a single line in the order
 * forms do — index first. A passport whose series carries the region and the
 * year it was issued, issued at 14, 20 or 45 as the law has it, by the body
 * that issued passports that year. ИНН and СНИЛС with their check digits, a
 * card on Мир more often than not, and a current account that passes the
 * key check against its bank's БИК.
 */

import { pad, weightedSum, formatDate, addYears, addDays, dayBetween } from '../parts.js';
import { latinRu } from '../translit.js';

const MALE = ('Александр Дмитрий Максим Сергей Андрей Алексей Артём Илья Кирилл Михаил Никита ' +
  'Матвей Роман Егор Арсений Иван Денис Евгений Даниил Тимофей Владислав Игорь Владимир Павел ' +
  'Руслан Марк Константин Николай Олег Виктор Антон Григорий Фёдор Степан Юрий').split(' ');

const FEMALE = ('Анастасия Мария Анна Виктория Екатерина Наталья Марина Полина Елена Дарья Алина ' +
  'Ирина Ольга Татьяна Юлия Ксения Светлана Алёна Валерия Елизавета Софья Вероника Кристина ' +
  'Надежда Людмила Евгения Галина Александра Яна Варвара Ульяна Маргарита').split(' ');

/* Patronymics come from a father's name, so they are listed in pairs. */
const PATRONYMICS = ('Александрович:Александровна Алексеевич:Алексеевна Андреевич:Андреевна ' +
  'Анатольевич:Анатольевна Борисович:Борисовна Валерьевич:Валерьевна Васильевич:Васильевна ' +
  'Викторович:Викторовна Владимирович:Владимировна Геннадьевич:Геннадьевна Григорьевич:Григорьевна ' +
  'Дмитриевич:Дмитриевна Евгеньевич:Евгеньевна Иванович:Ивановна Игоревич:Игоревна Ильич:Ильинична ' +
  'Константинович:Константиновна Михайлович:Михайловна Николаевич:Николаевна Олегович:Олеговна ' +
  'Павлович:Павловна Петрович:Петровна Сергеевич:Сергеевна Юрьевич:Юрьевна Фёдорович:Фёдоровна ' +
  'Романович:Романовна Максимович:Максимовна Денисович:Денисовна Антонович:Антоновна ' +
  'Вячеславович:Вячеславовна Станиславович:Станиславовна Леонидович:Леонидовна Степанович:Степановна')
  .split(' ').map(pair => pair.split(':'));

const SURNAMES = ('Иванов Смирнов Кузнецов Попов Васильев Петров Соколов Михайлов Новиков Фёдоров ' +
  'Морозов Волков Алексеев Лебедев Семёнов Егоров Павлов Козлов Степанов Николаев Орлов Андреев ' +
  'Макаров Никитин Захаров Зайцев Соловьёв Борисов Яковлев Григорьев Романов Воробьёв Сергеев ' +
  'Кузьмин Фролов Александров Дмитриев Королёв Гусев Киселёв Ильин Максимов Поляков Сорокин ' +
  'Виноградов Ковалёв Белов Медведев Антонов Тарасов Жуков Баранов Филиппов Комаров Давыдов ' +
  'Беляев Герасимов Богданов Осипов Сидоров Матвеев Титов Марков Миронов Крылов Куликов Карпов ' +
  'Власов Мельников Денисов Гаврилов Тихонов Казаков Афанасьев Данилов Савельев Тимофеев Фомин ' +
  'Чернов Абрамов Мартынов Ефимов Щербаков Назаров Калинин Исаев Быков Маслов Родионов Коновалов ' +
  'Лазарев Воронин Климов Филатов Голубев Кудрявцев Прохоров Наумов Леонов Соболев Ермаков ' +
  'Колесников Гончаров Емельянов Котов Громов Кириллов Малышев Панов Моисеев Румянцев Акимов ' +
  'Высоцкий Покровский Успенский Островский Шевченко Ким Толстой').split(' ');

/** Иванов → Иванова, Высоцкий → Высоцкая, Толстой → Толстая; Шевченко and Ким stay as they are. */
export function feminine(surname) {
  if (/(ов|ев|ёв|ин|ын)$/.test(surname)) return surname + 'а';
  if (/ий$/.test(surname)) return surname.slice(0, -2) + 'ая';
  if (/ой$/.test(surname)) return surname.slice(0, -2) + 'ая';
  return surname;
}

/*
 * okato — the first two digits of a passport series;
 * subject — the region's number, which opens an ИНН, an ОГРН and the code of
 *   the office that issued the passport;
 * mvd — who has issued passports since the migration service was folded into
 *   the police in 2016, and ufms — who did before.
 */
const CITIES = [
  { city: 'Москва', okato: '45', subject: '77', postal: [101000, 129347], mvd: 'ГУ МВД России по г. Москве', ufms: 'Отделом УФМС России по гор. Москве' },
  { city: 'Санкт-Петербург', okato: '40', subject: '78', postal: [190000, 199406], mvd: 'ГУ МВД России по г. Санкт-Петербургу и Ленинградской области', ufms: 'Отделом УФМС России по Санкт-Петербургу и Ленинградской обл.' },
  { city: 'Новосибирск', region: 'Новосибирская обл.', okato: '50', subject: '54', postal: [630000, 630133], mvd: 'ГУ МВД России по Новосибирской области', ufms: 'Отделом УФМС России по Новосибирской обл.' },
  { city: 'Екатеринбург', region: 'Свердловская обл.', okato: '65', subject: '66', postal: [620000, 620149], mvd: 'ГУ МВД России по Свердловской области', ufms: 'Отделом УФМС России по Свердловской обл.' },
  { city: 'Казань', region: 'Республика Татарстан', okato: '92', subject: '16', postal: [420000, 420140], mvd: 'МВД по Республике Татарстан', ufms: 'Отделом УФМС России по Республике Татарстан' },
  { city: 'Нижний Новгород', region: 'Нижегородская обл.', okato: '22', subject: '52', postal: [603000, 603163], mvd: 'ГУ МВД России по Нижегородской области', ufms: 'Отделом УФМС России по Нижегородской обл.' },
  { city: 'Челябинск', region: 'Челябинская обл.', okato: '75', subject: '74', postal: [454000, 454139], mvd: 'ГУ МВД России по Челябинской области', ufms: 'Отделом УФМС России по Челябинской обл.' },
  { city: 'Самара', region: 'Самарская обл.', okato: '36', subject: '63', postal: [443000, 443125], mvd: 'ГУ МВД России по Самарской области', ufms: 'Отделом УФМС России по Самарской обл.' },
  { city: 'Ростов-на-Дону', region: 'Ростовская обл.', okato: '60', subject: '61', postal: [344000, 344113], mvd: 'ГУ МВД России по Ростовской области', ufms: 'Отделом УФМС России по Ростовской обл.' },
  { city: 'Уфа', region: 'Республика Башкортостан', okato: '80', subject: '02', postal: [450000, 450112], mvd: 'МВД по Республике Башкортостан', ufms: 'Отделом УФМС России по Республике Башкортостан' },
  { city: 'Красноярск', region: 'Красноярский край', okato: '04', subject: '24', postal: [660000, 660135], mvd: 'ГУ МВД России по Красноярскому краю', ufms: 'Отделом УФМС России по Красноярскому краю' },
  { city: 'Воронеж', region: 'Воронежская обл.', okato: '20', subject: '36', postal: [394000, 394095], mvd: 'ГУ МВД России по Воронежской области', ufms: 'Отделом УФМС России по Воронежской обл.' },
  { city: 'Пермь', region: 'Пермский край', okato: '57', subject: '59', postal: [614000, 614113], mvd: 'ГУ МВД России по Пермскому краю', ufms: 'Отделом УФМС России по Пермскому краю' },
  { city: 'Краснодар', region: 'Краснодарский край', okato: '03', subject: '23', postal: [350000, 350091], mvd: 'ГУ МВД России по Краснодарскому краю', ufms: 'Отделом УФМС России по Краснодарскому краю' },
  { city: 'Омск', region: 'Омская обл.', okato: '52', subject: '55', postal: [644000, 644123], mvd: 'УМВД России по Омской области', ufms: 'Отделом УФМС России по Омской обл.' },
  { city: 'Волгоград', region: 'Волгоградская обл.', okato: '18', subject: '34', postal: [400000, 400138], mvd: 'ГУ МВД России по Волгоградской области', ufms: 'Отделом УФМС России по Волгоградской обл.' },
];

const STREETS = ('ул. Ленина|ул. Гагарина|ул. Пушкина|ул. Советская|ул. Мира|ул. Молодёжная|' +
  'ул. Центральная|ул. Школьная|ул. Садовая|ул. Лесная|ул. Набережная|ул. Октябрьская|' +
  'ул. Комсомольская|ул. Первомайская|ул. Зелёная|ул. Кирова|ул. Чехова|ул. Лермонтова|ул. Горького|' +
  'ул. Строителей|пр-т Победы|пр-т Мира|Комсомольский пр-т|пер. Почтовый|б-р Строителей|ш. Энтузиастов')
  .split('|');

/* The big four, with the correspondent account each one's БИК points at. */
const BANKS = [
  { name: 'ПАО Сбербанк', bik: '044525225', corr: '30101810400000000225' },
  { name: 'Банк ВТБ (ПАО)', bik: '044525187', corr: '30101810700000000187' },
  { name: 'АО «Альфа-Банк»', bik: '044525593', corr: '30101810200000000593' },
  { name: 'АО «ТБанк»', bik: '044525974', corr: '30101810145250000974' },
];

const COMPANY_WORDS = ('Вектор Гранит Меридиан Альянс Прогресс Сфера Ромашка Эталон Восход Горизонт ' +
  'Импульс Спектр Феникс Атлант Квант Орбита Стимул Ресурс Парус Северный ветер').split(' ');

/* ------------------------------------------------------------------ *
 * Check digits
 * ------------------------------------------------------------------ */

const mod11mod10 = (text, weights) => String((weightedSum(text, weights) % 11) % 10);

/** ИНН of a person: ten digits and two check digits. */
export function innPerson(ten) {
  const eleven = ten + mod11mod10(ten, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
  return eleven + mod11mod10(eleven, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
}

/** ИНН of a company: nine digits and one check digit. */
export const innCompany = nine => nine + mod11mod10(nine, [2, 4, 10, 3, 5, 9, 4, 6, 8]);

/** СНИЛС: nine digits and a two-digit checksum. */
export function snils(nine) {
  let sum = weightedSum(nine, [9, 8, 7, 6, 5, 4, 3, 2, 1]);
  if (sum > 101) sum %= 101;
  if (sum === 100 || sum === 101) sum = 0;
  return nine + pad(sum, 2);
}

/** ОГРН: twelve digits and their remainder modulo 11, kept to one digit. */
export function ogrn(twelve) {
  let rest = 0;
  for (const digit of twelve) rest = (rest * 10 + Number(digit)) % 11;
  return twelve + String(rest % 10);
}

/**
 * The key digit of a bank account, checked against the last three digits of
 * the bank's БИК. The same weights check a correspondent account against
 * 0 and the fifth and sixth digits of the БИК.
 */
export function accountKeyValid(prefix, account) {
  return weightedSum(prefix + account, [7, 1, 3]) % 10 === 0;
}

export function account(bik, balance, body11) {
  const draft = balance + '810' + '0' + body11;
  const sum = weightedSum(bik.slice(-3) + draft, [7, 1, 3]);
  const key = ((10 - (sum % 10)) * 7) % 10;
  return balance + '810' + key + body11;
}

/* ------------------------------------------------------------------ *
 * The person
 * ------------------------------------------------------------------ */

function name(r, gender) {
  const surname = r.pick(SURNAMES);
  const last = gender === 'female' ? feminine(surname) : surname;
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const middle = r.pick(PATRONYMICS)[gender === 'female' ? 1 : 0];
  const latin = { first: latinRu(first), middle: latinRu(middle), last: latinRu(last) };
  return {
    first, middle, last, middleKind: 'patronymic',
    full: `${last} ${first} ${middle}`,
    latin: { ...latin, full: `${latin.first} ${latin.last}` },
  };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 150)) + (r.chance(0.12) ? r.pick(['А', 'Б', 'В']) : '');
  const apartment = r.chance(0.85) ? String(r.int(1, 320)) : undefined;
  const postalCode = String(r.int(...place.postal));
  const first = `${street}, д. ${building}${apartment ? `, кв. ${apartment}` : ''}`;
  const lines = [first, `г. ${place.city}`, place.region, postalCode].filter(Boolean);
  return {
    street, building, apartment, city: place.city, region: place.region, postalCode,
    lines,
    line: [postalCode, place.region, `г. ${place.city}`, first].filter(Boolean).join(', '),
  };
}

/*
 * Russia keeps no block for fiction, and the numbering plan opens every 9xx
 * code to mobile networks: a number written as a Russian mobile may belong to
 * somebody, and the report says so.
 */
function phone(r) {
  const code = String(r.int(900, 999));
  const rest = r.digits(7);
  const tail = `${rest.slice(0, 3)}-${rest.slice(3, 5)}-${rest.slice(5)}`;
  return {
    national: `8 (${code}) ${tail}`,
    international: `+7 ${code} ${tail}`,
    e164: `+7${code}${rest}`,
    range: 'in-service',
  };
}

/**
 * The passport a person holds today: issued at 14, replaced at 20 and at 45.
 * Anyone whose last birthday of the three came before the 1997 passport was
 * introduced holds one from the exchange that followed it.
 */
function passportIssued(r, p) {
  for (const age of [45, 20, 14]) {
    const due = addYears(p.birth, age);
    const issued = addDays(due, r.int(3, 40));
    if (issued > p.today) continue;
    if (issued < new Date(Date.UTC(1997, 9, 1))) {
      return dayBetween(r, new Date(Date.UTC(2000, 0, 10)), new Date(Date.UTC(2004, 5, 30)));
    }
    return issued;
  }
  return null;
}

function documents(r, p) {
  const { place } = p;
  const list = [];

  list.push({
    id: 'inn', name: 'ИНН', kind: 'tax',
    raw: innPerson(place.subject + pad(r.int(1, 40), 2) + r.digits(6)),
  });

  let nine;
  do { nine = r.digits(9); } while (Number(nine) <= 1001998);
  const number = snils(nine);
  list.push({
    id: 'snils', name: 'СНИЛС', kind: 'social',
    value: `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6, 9)} ${number.slice(9)}`,
    raw: number,
  });

  const issued = passportIssued(r, p);
  if (issued) {
    const series = place.okato + String(issued.getUTCFullYear()).slice(2);
    const passportNumber = pad(r.int(1, 999999), 6);
    list.push({
      id: 'passport', name: 'Паспорт', kind: 'id-card',
      value: `${series.slice(0, 2)} ${series.slice(2)} ${passportNumber}`,
      raw: series + passportNumber,
      details: [
        { id: 'issued', name: 'Дата выдачи', value: formatDate(issued, 'DD.MM.YYYY') },
        { id: 'issuer', name: 'Кем выдан', value: issued >= new Date(Date.UTC(2016, 5, 1)) ? place.mvd : place.ufms },
        { id: 'division', name: 'Код подразделения', value: `${place.subject}${r.pick(['0', '2', '3'])}-${pad(r.int(1, 99), 3)}` },
      ],
    });
  }
  return list;
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const number = account(chosen.bik, '40817', r.digits(11));
  return {
    name: chosen.name,
    fields: [
      { id: 'account', name: 'Счёт', value: number },
      { id: 'bik', name: 'БИК', value: chosen.bik },
      { id: 'corr', name: 'Корр. счёт', value: chosen.corr },
    ],
  };
}

function company(r, p) {
  const office = p.place.subject + pad(r.int(1, 40), 2);
  const year = String(r.int(2003, p.today.getUTCFullYear() - 1)).slice(2);
  const inn = innCompany(office + r.digits(5));
  const form = r.weighted([['ООО', 8], ['АО', 2]]);
  return {
    name: `${form} «${r.pick(COMPANY_WORDS)}»`,
    documents: [
      { id: 'inn', name: 'ИНН', kind: 'tax', raw: inn },
      { id: 'kpp', name: 'КПП', kind: 'tax', raw: `${office}01001` },
      { id: 'ogrn', name: 'ОГРН', kind: 'company-reg', raw: ogrn('1' + year + office + r.digits(5)) },
    ],
  };
}

/* Kazakhstan borrows these: a good part of its people have Russian names. */
export const RUSSIAN = { MALE, FEMALE, SURNAMES, PATRONYMICS };

export default {
  id: 'ru',
  locale: 'ru-RU',
  dateFormat: 'DD.MM.YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['mir', 'mir', 'visa', 'mastercard'],
  company,
};
