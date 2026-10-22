/**
 * Saudi Arabia.
 *
 * A given name, the father's name and the family name, in Arabic and in the
 * Latin spelling a passport would use. A national address as Saudi Post issues
 * it — building number, street, district, city, postcode and additional number
 * — in both scripts, because forms there ask in either. A national ID that
 * starts with 1, as a citizen's does, and passes its Luhn check; an IBAN at a
 * real bank; and for a business a commercial registration number under the
 * city's prefix and a fifteen-digit VAT number.
 */

import { luhnDigit, iban, ibanFields } from '../parts.js';

/* [Arabic, Latin] */
const pairs = text => text.split('|').map(entry => entry.split(':'));

const MALE = pairs('محمد:Mohammed|أحمد:Ahmed|عبدالله:Abdullah|عبدالرحمن:Abdulrahman|خالد:Khalid|فهد:Fahad|' +
  'سعد:Saad|سلطان:Sultan|فيصل:Faisal|عمر:Omar|علي:Ali|يوسف:Yousef|إبراهيم:Ibrahim|ناصر:Nasser|تركي:Turki|' +
  'بندر:Bandar|ماجد:Majed|سعود:Saud|نايف:Naif|عبدالعزيز:Abdulaziz|حمد:Hamad|ياسر:Yasser|طلال:Talal|مشعل:Mishal');

const FEMALE = pairs('نورة:Noura|فاطمة:Fatimah|سارة:Sarah|مريم:Maryam|عائشة:Aisha|ريم:Reem|هند:Hind|' +
  'لطيفة:Latifa|منيرة:Munira|العنود:Alanoud|جواهر:Jawaher|دانة:Dana|لمى:Lama|شهد:Shahad|رهف:Rahaf|' +
  'غادة:Ghada|أمل:Amal|هيفاء:Haifa|نوف:Nouf|حصة:Hessa');

const FAMILIES = pairs('القحطاني:Al-Qahtani|العتيبي:Al-Otaibi|الشمري:Al-Shammari|الدوسري:Al-Dosari|' +
  'الغامدي:Al-Ghamdi|الزهراني:Al-Zahrani|الحربي:Al-Harbi|المطيري:Al-Mutairi|العنزي:Al-Anazi|' +
  'السبيعي:Al-Subaie|الشهري:Al-Shehri|القرشي:Al-Qurashi|العمري:Al-Omari|السلمي:Al-Sulami|المالكي:Al-Malki|' +
  'الرشيد:Al-Rasheed|التميمي:Al-Tamimi|الخالدي:Al-Khalidi|الجهني:Al-Juhani|الأحمد:Al-Ahmad');

/* cr — the prefix of commercial registration numbers issued in the city. */
const CITIES = [
  { city: 'الرياض', latin: 'Riyadh', postal: [11000, 14999], cr: '1010' },
  { city: 'جدة', latin: 'Jeddah', postal: [21000, 23999], cr: '4030' },
  { city: 'مكة المكرمة', latin: 'Makkah', postal: [24000, 24999], cr: '4031' },
  { city: 'المدينة المنورة', latin: 'Madinah', postal: [42000, 42999], cr: '4650' },
  { city: 'الدمام', latin: 'Dammam', postal: [32000, 34999], cr: '2050' },
  { city: 'الخبر', latin: 'Khobar', postal: [34000, 34999], cr: '2051' },
  { city: 'الطائف', latin: 'Taif', postal: [26000, 26999], cr: '4032' },
  { city: 'تبوك', latin: 'Tabuk', postal: [47000, 47999], cr: '3550' },
  { city: 'بريدة', latin: 'Buraydah', postal: [51000, 52999], cr: '1131' },
  { city: 'أبها', latin: 'Abha', postal: [62000, 62999], cr: '5850' },
];

const DISTRICTS = pairs('العليا:Al Olaya|الملز:Al Malaz|النخيل:Al Nakheel|الروضة:Al Rawdah|السلامة:Al Salamah|' +
  'الحمراء:Al Hamra|الشاطئ:Al Shati|الفيصلية:Al Faisaliyah|النسيم:Al Naseem|الربوة:Al Rabwah|المروج:Al Muruj|' +
  'الياسمين:Al Yasmin|الصفا:Al Safa|الزهراء:Al Zahra|العزيزية:Al Aziziyah');

const STREETS = pairs('طريق الملك فهد:King Fahd Road|طريق الملك عبدالعزيز:King Abdulaziz Road|' +
  'شارع التحلية:Tahlia Street|شارع الأمير سلطان:Prince Sultan Street|طريق الملك عبدالله:King Abdullah Road|' +
  'شارع العليا:Olaya Street|شارع الستين:Al Sitteen Street|شارع فلسطين:Palestine Street|' +
  'طريق المدينة:Madinah Road|شارع عثمان بن عفان:Othman Bin Affan Street|شارع الإمام سعود:Imam Saud Street');

const BANKS = [
  { name: 'Al Rajhi Bank', code: '80', bic: 'RJHISARI' },
  { name: 'Saudi National Bank', code: '10', bic: 'NCBKSAJE' },
  { name: 'Riyad Bank', code: '20', bic: 'RIBLSARI' },
  { name: 'SAB', code: '45', bic: 'SABBSARI' },
  { name: 'Alinma Bank', code: '05', bic: 'INMASARI' },
];

const COMPANY_WORDS = pairs('الأفق:Al Ufuq|النخبة:Al Nukhba|الريادة:Al Riyada|الوفاء:Al Wafa|الصفوة:Al Safwa|' +
  'الأمل:Al Amal|البيان:Al Bayan|الإتقان:Al Itqan|الرواد:Al Rowad|المستقبل:Al Mustaqbal');
const COMPANY_KINDS = pairs('للتجارة:Trading|للمقاولات:Contracting|للتقنية:Technology');

function name(r, gender) {
  const [first, firstLatin] = r.pick(gender === 'female' ? FEMALE : MALE);
  const [middle, middleLatin] = r.pick(MALE);
  const [last, lastLatin] = r.pick(FAMILIES);
  return {
    first, middle, last, middleKind: 'father',
    full: `${first} ${middle} ${last}`,
    latin: { first: firstLatin, middle: middleLatin, last: lastLatin, full: `${firstLatin} ${middleLatin} ${lastLatin}` },
  };
}

function address(r, place) {
  const building = String(r.int(1000, 9999));
  const [street, streetLatin] = r.pick(STREETS);
  const [district, districtLatin] = r.pick(DISTRICTS);
  const postalCode = String(r.int(...place.postal));
  const extra = String(r.int(1000, 9999));
  const lines = [`${building} ${street}، حي ${district}`, `${place.city} ${postalCode} - ${extra}`];
  const latin = [`${building} ${streetLatin}, ${districtLatin} Dist.`, `${place.latin} ${postalCode} - ${extra}`];
  return {
    street, building, district, city: place.city, postalCode, additionalNumber: extra,
    lines, line: lines.join('، '),
    latin: { street: streetLatin, district: districtLatin, city: place.latin, lines: latin, line: latin.join(', ') },
  };
}

const MOBILE = ['50', '53', '54', '55', '56', '58', '59'];

function phone(r) {
  const code = r.pick(MOBILE);
  const rest = r.digits(7);
  const tail = `${rest.slice(0, 3)} ${rest.slice(3)}`;
  return { national: `0${code} ${tail}`, international: `+966 ${code} ${tail}`, e164: `+966${code}${rest}` };
}

function documents(r) {
  const nine = '1' + r.digits(8);
  return [{ id: 'national-id', name: 'الهوية الوطنية', kind: 'national-id', value: nine + luhnDigit(nine) }];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('SA', chosen.code + r.digits(18)), chosen.bic) };
}

function company(r, p) {
  const [word, wordLatin] = r.pick(COMPANY_WORDS);
  const [kind, kindLatin] = r.pick(COMPANY_KINDS);
  return {
    name: `شركة ${word} ${kind}`,
    nameLatin: `${wordLatin} ${kindLatin} Co.`,
    documents: [
      { id: 'cr', name: 'السجل التجاري', kind: 'company-reg', value: p.place.cr + r.digits(6) },
      { id: 'vat', name: 'الرقم الضريبي', kind: 'vat', value: '3' + r.digits(9) + '00003' },
    ],
  };
}

export default {
  id: 'sa',
  locale: 'ar-SA',
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
