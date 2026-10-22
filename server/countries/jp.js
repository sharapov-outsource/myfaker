/**
 * Japan.
 *
 * Family name first, in kanji, with its reading in katakana — the フリガナ
 * every Japanese form asks for alongside the name — and in Latin letters,
 * family name first as the government has recommended since 2020. An address
 * that starts from the postcode and the prefecture and ends at the building
 * and room. A mobile number on 070 or 090, in the part of the series that is
 * never issued. A My Number with its check
 * digit, a bank account given the way a transfer form wants it — bank code,
 * branch, type, number — a JCB card more often than not, and for a business,
 * a corporate number whose check digit comes first.
 */

import { pad, weightedSum } from '../parts.js';

/* [kanji, katakana, romaji] */
const triples = text => text.split('|').map(entry => entry.split(' '));

const SURNAMES = triples('佐藤 サトウ Sato|鈴木 スズキ Suzuki|高橋 タカハシ Takahashi|田中 タナカ Tanaka|' +
  '伊藤 イトウ Ito|渡辺 ワタナベ Watanabe|山本 ヤマモト Yamamoto|中村 ナカムラ Nakamura|小林 コバヤシ Kobayashi|' +
  '加藤 カトウ Kato|吉田 ヨシダ Yoshida|山田 ヤマダ Yamada|佐々木 ササキ Sasaki|山口 ヤマグチ Yamaguchi|' +
  '松本 マツモト Matsumoto|井上 イノウエ Inoue|木村 キムラ Kimura|林 ハヤシ Hayashi|斎藤 サイトウ Saito|' +
  '清水 シミズ Shimizu|山崎 ヤマザキ Yamazaki|森 モリ Mori|池田 イケダ Ikeda|橋本 ハシモト Hashimoto|' +
  '阿部 アベ Abe|石川 イシカワ Ishikawa|山下 ヤマシタ Yamashita|中島 ナカジマ Nakajima|石井 イシイ Ishii|小川 オガワ Ogawa');

const MALE = triples('翔太 ショウタ Shota|大輔 ダイスケ Daisuke|健太 ケンタ Kenta|拓也 タクヤ Takuya|' +
  '直樹 ナオキ Naoki|浩 ヒロシ Hiroshi|誠 マコト Makoto|隆 タカシ Takashi|健一 ケンイチ Kenichi|' +
  '達也 タツヤ Tatsuya|蓮 レン Ren|陽翔 ハルト Haruto|悠真 ユウマ Yuma|大翔 ヒロト Hiroto|和也 カズヤ Kazuya|' +
  '亮 リョウ Ryo|翔 ショウ Sho|剛 ツヨシ Tsuyoshi|拓海 タクミ Takumi|優斗 ユウト Yuto');

const FEMALE = triples('陽子 ヨウコ Yoko|恵子 ケイコ Keiko|美咲 ミサキ Misaki|さくら サクラ Sakura|愛 アイ Ai|' +
  '結衣 ユイ Yui|葵 アオイ Aoi|陽菜 ヒナ Hina|真由美 マユミ Mayumi|由美子 ユミコ Yumiko|花子 ハナコ Hanako|' +
  '麻衣 マイ Mai|優子 ユウコ Yuko|彩 アヤ Aya|智子 トモコ Tomoko|美穂 ミホ Miho|千尋 チヒロ Chihiro|' +
  '七海 ナナミ Nanami|芽依 メイ Mei|真央 マオ Mao');

/* postal — the first three digits of the postcode for that ward. */
const CITIES = [
  ['東京都', '千代田区', '100', '丸の内 大手町 有楽町 九段南 神田神保町'],
  ['東京都', '新宿区', '160', '西新宿 歌舞伎町 新宿 四谷'],
  ['東京都', '渋谷区', '150', '渋谷 恵比寿 神宮前 代々木'],
  ['東京都', '世田谷区', '154', '三軒茶屋 太子堂 池尻 駒沢'],
  ['大阪府', '大阪市北区', '530', '梅田 曽根崎 天神橋 中崎'],
  ['大阪府', '大阪市中央区', '542', '心斎橋筋 難波 島之内 東心斎橋'],
  ['神奈川県', '横浜市中区', '231', '山下町 元町 本町 日本大通'],
  ['愛知県', '名古屋市中区', '460', '栄 錦 丸の内 大須'],
  ['北海道', '札幌市中央区', '060', '北一条西 大通西 南一条西 宮の森'],
  ['福岡県', '福岡市中央区', '810', '天神 大名 警固 赤坂'],
  ['兵庫県', '神戸市中央区', '650', '三宮町 元町通 栄町通 中山手通'],
  ['宮城県', '仙台市青葉区', '980', '一番町 中央 国分町 本町'],
  ['広島県', '広島市中区', '730', '紙屋町 八丁堀 大手町 本通'],
].map(([prefecture, city, postal, towns]) => ({ prefecture, city, postal, towns: towns.split(' '), label: prefecture + city }));

const BUILDINGS = 'グリーンハイツ サンハイツ コーポ桜 メゾン・ド・ソレイユ パークサイド グランドメゾン シティハイツ レジデンス若葉 ハイツ緑 ライオンズマンション'.split(' ');

const BANKS = [
  { name: 'みずほ銀行', code: '0001' },
  { name: '三菱UFJ銀行', code: '0005' },
  { name: '三井住友銀行', code: '0009' },
  { name: 'りそな銀行', code: '0010' },
  { name: '楽天銀行', code: '0036' },
  { name: '住信SBIネット銀行', code: '0038' },
];

const COMPANY_KINDS = '商事 工業 製作所 物産 電機 建設 システムズ 技研'.split(' ');

/** My Number: eleven digits, weighted from the right 2–7 then 2–6, and the remainder's complement. */
export function myNumberDigit(eleven) {
  const reversed = [...eleven].reverse().join('');
  const sum = weightedSum(reversed, [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6]);
  const rest = sum % 11;
  return String(rest <= 1 ? 0 : 11 - rest);
}

/** A corporate number: twelve digits and a check digit that goes in front of them. */
export function corporateNumber(twelve) {
  const reversed = [...twelve].reverse().join('');
  return String(9 - (weightedSum(reversed, [1, 2]) % 9)) + twelve;
}

function name(r, gender) {
  const [last, lastKana, lastLatin] = r.pick(SURNAMES);
  const [first, firstKana, firstLatin] = r.pick(gender === 'female' ? FEMALE : MALE);
  return {
    first, last, full: `${last}　${first}`,
    kana: { first: firstKana, last: lastKana, full: `${lastKana}　${firstKana}` },
    latin: { first: firstLatin, last: lastLatin, full: `${lastLatin} ${firstLatin}` },
  };
}

function address(r, place) {
  const town = r.pick(place.towns);
  const street = `${town}${r.int(1, 5)}丁目`;
  const building = `${r.int(1, 20)}-${r.int(1, 30)}`;
  const apartment = r.chance(0.6) ? `${r.pick(BUILDINGS)} ${r.int(1, 12)}0${r.int(1, 9)}号室` : undefined;
  const postalCode = `${place.postal}-${pad(r.int(1, 9999), 4)}`;
  const first = `${place.prefecture}${place.city}${street}${building}`;
  const lines = [`〒${postalCode}`, first, apartment].filter(Boolean);
  return {
    street, building, apartment, city: place.city, region: place.prefecture, postalCode, lines,
    line: `〒${postalCode} ${first}${apartment ? ` ${apartment}` : ''}`,
  };
}

/* 070-0xxx and 090-0xxx: the 0 after the prefix is never issued (0800 is toll-free). */
function phone(r) {
  const prefix = r.pick(['70', '90']);
  const rest = '0' + r.digits(7);
  const local = `${prefix}-${rest.slice(0, 4)}-${rest.slice(4)}`;
  return { national: `0${local}`, international: `+81 ${local}`, e164: `+81${prefix}${rest}`, range: 'unallocated' };
}

function documents(r) {
  const eleven = String(r.int(1, 9)) + r.digits(10);
  const number = eleven + myNumberDigit(eleven);
  return [{ id: 'mynumber', name: 'マイナンバー', kind: 'national-id', value: `${number.slice(0, 4)} ${number.slice(4, 8)} ${number.slice(8)}`, raw: number }];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return {
    name: chosen.name,
    fields: [
      { id: 'bank-code', name: '金融機関コード', value: chosen.code },
      { id: 'branch', name: '支店番号', value: pad(r.int(1, 999), 3) },
      { id: 'type', name: '預金種目', value: '普通' },
      { id: 'account', name: '口座番号', value: r.digits(7) },
    ],
  };
}

function company(r) {
  const [surname] = r.pick(SURNAMES);
  const core = surname + r.pick(COMPANY_KINDS);
  return {
    name: r.chance(0.6) ? `株式会社${core}` : `${core}株式会社`,
    documents: [{ id: 'corporate', name: '法人番号', kind: 'company-reg', value: corporateNumber(r.digits(12)) }],
  };
}

export default {
  id: 'jp',
  locale: 'ja-JP',
  dateFormat: 'YYYY/MM/DD',
  familyFirst: true,
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['jcb', 'jcb', 'visa', 'mastercard'],
  company,
};
