/**
 * Turkey.
 *
 * An address the way it is written there: neighbourhood, street and door
 * number first, then the postcode and district/province. A T.C. Kimlik No
 * whose tenth and eleventh digits are worked out from the first nine as the
 * population register does. A card on TROY now and then, an IBAN at a real
 * bank, and for a business a tax number (VKN) with its check digit and the tax
 * office it is registered with.
 */

import { iban, ibanFields } from '../parts.js';

const MALE = ('Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim İsmail Osman Yusuf Murat Ömer Ramazan ' +
  'Halil Süleyman Abdullah Emre Burak Can Mert Kerem Eren Yiğit Emir Arda Berk Onur Serkan Volkan Kemal').split(' ');

const FEMALE = ('Fatma Ayşe Emine Hatice Zeynep Elif Meryem Şerife Zehra Sultan Hanife Merve Özlem Esra ' +
  'Büşra Ebru Derya Selin Defne Ecrin Nehir Azra Gizem Tuğba Sibel Aylin Burcu Ceren Damla Pınar').split(' ');

const SURNAMES = ('Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç ' +
  'Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Özer Korkmaz Erdoğan Yavuz Can Acar Şen Aktaş Güler ' +
  'Yalçın Güneş Bozkurt Bulut Keskin Ünal Turan Gül Özcan Tekin').split(' ');

/* One record per district: the province, the district and its postcode. */
const CITIES = [
  ['İstanbul', 'Kadıköy', '34710'], ['İstanbul', 'Beşiktaş', '34330'], ['İstanbul', 'Şişli', '34360'],
  ['İstanbul', 'Üsküdar', '34660'], ['İstanbul', 'Bakırköy', '34142'], ['İstanbul', 'Fatih', '34080'],
  ['İstanbul', 'Beyoğlu', '34430'], ['İstanbul', 'Ataşehir', '34750'],
  ['Ankara', 'Çankaya', '06690'], ['Ankara', 'Keçiören', '06280'], ['Ankara', 'Yenimahalle', '06170'],
  ['İzmir', 'Konak', '35250'], ['İzmir', 'Karşıyaka', '35540'], ['İzmir', 'Bornova', '35040'],
  ['Bursa', 'Osmangazi', '16040'], ['Bursa', 'Nilüfer', '16110'],
  ['Antalya', 'Muratpaşa', '07100'], ['Antalya', 'Konyaaltı', '07070'],
  ['Adana', 'Seyhan', '01060'], ['Konya', 'Selçuklu', '42060'], ['Gaziantep', 'Şahinbey', '27010'],
  ['Eskişehir', 'Tepebaşı', '26010'],
].map(([province, district, postal]) => ({ city: province, province, district, postal }));

const NEIGHBOURHOODS = ('Cumhuriyet Atatürk Fatih Barbaros Bahçelievler Yeşilyurt Merkez Gazi Zafer Kültür ' +
  'İstiklal Esentepe Çamlık Yenidoğan Hürriyet').split(' ');

const STREETS = ('Atatürk Cad.|Cumhuriyet Cad.|İstiklal Cad.|İnönü Cad.|Fevzi Çakmak Cad.|Menderes Cad.|' +
  'Hürriyet Cad.|Millet Cad.|Zübeyde Hanım Cad.|Bağdat Cad.|Lale Sok.|Gül Sok.|Menekşe Sok.|Papatya Sok.|' +
  'Çınar Sok.|Yıldız Sok.|Barış Sok.|Kardelen Sok.|Akasya Sok.|Ihlamur Sok.').split('|');

const BANKS = [
  { name: 'Ziraat Bankası', code: '00010', bic: 'TCZBTR2AXXX' },
  { name: 'Garanti BBVA', code: '00062', bic: 'TGBATRISXXX' },
  { name: 'İş Bankası', code: '00064', bic: 'ISBKTRISXXX' },
  { name: 'Akbank', code: '00046', bic: 'AKBKTRISXXX' },
  { name: 'Yapı Kredi', code: '00067', bic: 'YAPITRISXXX' },
  { name: 'VakıfBank', code: '00015', bic: 'TVBATR2AXXX' },
  { name: 'Halkbank', code: '00012', bic: 'TRHBTR2AXXX' },
];

const COMPANY_WORDS = 'Anadolu Marmara Ege Akdeniz Yıldız Kartal Güneş Atlas Zirve Umut Başak Ufuk Pınar'.split(' ');

/** T.C. Kimlik No: nine digits, the first not 0, and two check digits worked out from them. */
export function tckn(nine) {
  const d = [...nine].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = (d.reduce((a, b) => a + b, 0) + tenth) % 10;
  return nine + tenth + eleventh;
}

/** VKN: nine digits and a check digit computed from each digit's position. */
export function vkn(nine) {
  let sum = 0;
  [...nine].reverse().forEach((ch, index) => {
    const i = index + 1;
    const c1 = (Number(ch) + i) % 10;
    if (c1) sum += (c1 * 2 ** i) % 9 || 9;
  });
  return nine + ((10 - (sum % 10)) % 10);
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const neighbourhood = `${r.pick(NEIGHBOURHOODS)} Mah.`;
  const street = r.pick(STREETS);
  const building = String(r.int(1, 180));
  const apartment = r.chance(0.7) ? String(r.int(1, 30)) : undefined;
  const lines = [
    `${neighbourhood} ${street} No: ${building}${apartment ? ` D: ${apartment}` : ''}`,
    `${place.postal} ${place.district}/${place.province}`,
  ];
  return {
    street, building, apartment, district: place.district, city: place.district, region: place.province,
    postalCode: place.postal, lines, line: lines.join(', '),
  };
}

const MOBILE = ['501', '505', '506', '507', '530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '541', '542', '543', '544', '545', '546', '547', '548', '549', '551', '552', '553', '554', '555', '559'];

function phone(r) {
  const code = r.pick(MOBILE);
  const rest = r.digits(7);
  const tail = `${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5)}`;
  return { national: `0${code} ${tail}`, international: `+90 ${code} ${tail}`, e164: `+90${code}${rest}` };
}

function documents(r) {
  return [{ id: 'tckn', name: 'T.C. Kimlik No', kind: 'national-id', value: tckn(String(r.int(1, 9)) + r.digits(8)) }];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return { name: chosen.name, fields: ibanFields(iban('TR', chosen.code + '0' + r.digits(16)), chosen.bic) };
}

function company(r, p) {
  return {
    name: r.weighted([
      [`${r.pick(COMPANY_WORDS)} Ticaret A.Ş.`, 2], [`${r.pick(SURNAMES)} İnşaat Ltd. Şti.`, 2],
      [`${r.pick(COMPANY_WORDS)} Gıda San. ve Tic. Ltd. Şti.`, 1],
    ]),
    documents: [{
      id: 'vkn', name: 'Vergi Kimlik No', kind: 'tax', value: vkn(r.digits(9)),
      details: [{ id: 'office', name: 'Vergi dairesi', value: `${p.place.district} Vergi Dairesi` }],
    }],
  };
}

export default {
  id: 'tr',
  locale: 'tr-TR',
  dateFormat: 'DD.MM.YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['troy', 'visa', 'visa', 'mastercard', 'mastercard'],
  company,
};
