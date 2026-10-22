/**
 * China.
 *
 * Family name first, written without a space, with its pinyin for anything
 * that wants Latin letters. An address from the province down — district,
 * road, number, building, entrance and flat — under a six-digit postcode. The
 * resident identity number is the person written down: the code of the
 * district they were registered in at birth (every code here is a real one), the
 * birth date, a sequence whose last digit is odd for men and even for women, and
 * the ISO 7064 check character. A UnionPay card from a real bank's range, and
 * for a business a unified social credit code with both of its check characters.
 */

import { weightedSum, charValue, card } from '../parts.js';

/* [characters, pinyin] */
const SURNAMES = ('王 Wang|李 Li|张 Zhang|刘 Liu|陈 Chen|杨 Yang|黄 Huang|赵 Zhao|吴 Wu|周 Zhou|徐 Xu|' +
  '孙 Sun|马 Ma|朱 Zhu|胡 Hu|郭 Guo|何 He|高 Gao|林 Lin|罗 Luo|郑 Zheng|梁 Liang|谢 Xie|宋 Song|唐 Tang|' +
  '韩 Han|冯 Feng|邓 Deng|曹 Cao|许 Xu').split('|').map(pair => pair.split(' '));

const MALE = ('伟 Wei|强 Qiang|磊 Lei|军 Jun|洋 Yang|勇 Yong|杰 Jie|涛 Tao|明 Ming|超 Chao|浩然 Haoran|' +
  '子轩 Zixuan|宇轩 Yuxuan|俊杰 Junjie|志强 Zhiqiang|建华 Jianhua|晓东 Xiaodong|文博 Wenbo|天佑 Tianyou|' +
  '家豪 Jiahao|嘉伟 Jiawei|博文 Bowen|国强 Guoqiang|鹏飞 Pengfei|一鸣 Yiming').split('|').map(pair => pair.split(' '));

const FEMALE = ('芳 Fang|娜 Na|敏 Min|静 Jing|丽 Li|艳 Yan|婷 Ting|雪 Xue|慧 Hui|琳 Lin|秀英 Xiuying|' +
  '桂英 Guiying|欣怡 Xinyi|梓涵 Zihan|诗涵 Shihan|雨桐 Yutong|佳怡 Jiayi|思琪 Siqi|晓燕 Xiaoyan|' +
  '丽娟 Lijuan|美玲 Meiling|若曦 Ruoxi|婉婷 Wanting|雅琴 Yaqin|春梅 Chunmei|海燕 Haiyan').split('|').map(pair => pair.split(' '));

/*
 * code — the district's administrative division code, the first six digits of
 * an ID number; since — the year the code came into use. An ID number carries
 * the code of where its holder was registered at birth, so someone born in 1960
 * cannot have one that only exists since 1983.
 */
const CITIES = [
  ['110101', '北京市', '东城区', '100010'], ['110105', '北京市', '朝阳区', '100020'], ['110108', '北京市', '海淀区', '100080'],
  ['310101', '上海市', '黄浦区', '200001'], ['310104', '上海市', '徐汇区', '200030'], ['310115', '上海市', '浦东新区', '200120', 1992],
  ['120101', '天津市', '和平区', '300041'], ['500103', '重庆市', '渝中区', '400010', 1997],
  ['440104', '广东省广州市', '越秀区', '510030', 1983], ['440106', '广东省广州市', '天河区', '510620', 1985],
  ['440304', '广东省深圳市', '福田区', '518000', 1990], ['440305', '广东省深圳市', '南山区', '518052', 1990],
  ['510104', '四川省成都市', '锦江区', '610021', 1990], ['510107', '四川省成都市', '武侯区', '610041', 1990],
  ['330106', '浙江省杭州市', '西湖区', '310013', 1983], ['420106', '湖北省武汉市', '武昌区', '430061', 1983],
  ['320102', '江苏省南京市', '玄武区', '210018', 1983], ['610113', '陕西省西安市', '雁塔区', '710061', 1983],
].map(([code, prefix, district, postal, since = 0]) => {
  const [, province, city] = /^(.+?[省])?(.+市)$/.exec(prefix);
  return { code, province: province || city, city, district, postal, prefix, since, label: prefix + district };
});

const STREETS = '人民路 解放路 中山路 建设路 和平路 新华路 胜利路 文化路 健康路 东风路 朝阳路 幸福路 光明路 青年路 学院路 北京路 滨江路 花园路 长江路 黄河路'.split(' ');

const BANKS = [
  { name: '中国工商银行', prefix: '622202', length: 19 },
  { name: '中国农业银行', prefix: '622848', length: 19 },
  { name: '中国建设银行', prefix: '621700', length: 19 },
  { name: '招商银行', prefix: '622588', length: 16 },
];

const COMPANY_WORDS = '华信 宏达 恒通 金鼎 天成 中科 瑞丰 新元 东方 永安 盛世 长青'.split(' ');
const INDUSTRIES = '科技 贸易 实业 信息技术 电子 网络科技 文化传媒 物流'.split(' ');

/** ISO 7064 MOD 11-2, the check character of an identity number. */
export function ricCheck(seventeen) {
  const sum = weightedSum(seventeen, [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]);
  return '10X98765432'[sum % 11];
}

/** The check character of an organisation code (GB 11714). */
export function orgCheck(eight) {
  const sum = [...eight].reduce((total, ch, i) => total + charValue(ch) * [3, 7, 9, 10, 5, 8, 4, 2][i], 0);
  const check = 11 - (sum % 11);
  return check === 10 ? 'X' : String(check === 11 ? 0 : check);
}

const USCC_ALPHABET = '0123456789ABCDEFGHJKLMNPQRTUWXY';

/** The last character of a unified social credit code (GB 32100). */
export function usccCheck(seventeen) {
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
  const sum = [...seventeen].reduce((total, ch, i) => total + USCC_ALPHABET.indexOf(ch) * weights[i], 0);
  return USCC_ALPHABET[(31 - (sum % 31)) % 31];
}

function name(r, gender) {
  const [last, lastLatin] = r.pick(SURNAMES);
  const [first, firstLatin] = r.pick(gender === 'female' ? FEMALE : MALE);
  return {
    first, last, full: last + first,
    latin: { first: firstLatin, last: lastLatin, full: `${lastLatin} ${firstLatin}` },
  };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 999));
  const apartment = `${r.int(1, 30)}栋${r.int(1, 6)}单元${r.int(1, 33)}0${r.int(1, 4)}室`;
  const lines = [place.postal, `${place.prefix}${place.district}${street}${building}号`, apartment];
  return {
    street, building, apartment, district: place.district, city: place.city, region: place.province,
    postalCode: place.postal, lines, line: `${place.prefix}${place.district}${street}${building}号${apartment}`,
  };
}

/* Mobile prefixes no operator has been given: written like a 138, ringing nowhere. */
const UNALLOCATED = ['154', '160', '163', '164', '168', '169', '179'];

function phone(r) {
  const prefix = r.pick(UNALLOCATED);
  const rest = r.digits(8);
  const spaced = `${prefix} ${rest.slice(0, 4)} ${rest.slice(4)}`;
  return { national: spaced, international: `+86 ${spaced}`, e164: `+86${prefix}${rest}`, range: 'unallocated' };
}

function documents(r, p) {
  const sex = p.gender === 'female' ? r.pick([0, 2, 4, 6, 8]) : r.pick([1, 3, 5, 7, 9]);
  const seventeen = p.birthPlace.code + p.birth.toISOString().slice(0, 10).replace(/-/g, '') + r.digits(2) + sex;
  return [{ id: 'ric', name: '居民身份证', kind: 'national-id', value: seventeen + ricCheck(seventeen) }];
}

function company(r, p) {
  const org = r.digits(8);
  const seventeen = '91' + p.place.code + org + orgCheck(org);
  return {
    name: `${p.place.city.replace(/市$/, '')}${r.pick(COMPANY_WORDS)}${r.pick(INDUSTRIES)}有限公司`,
    documents: [{ id: 'uscc', name: '统一社会信用代码', kind: 'company-reg', value: seventeen + usccCheck(seventeen) }],
  };
}

export default {
  id: 'cn',
  locale: 'zh-CN',
  dateFormat: 'YYYY-MM-DD',
  familyFirst: true,
  place: r => r.pick(CITIES),
  birthPlace: (r, birth) => r.pick(CITIES.filter(place => place.since <= birth.getUTCFullYear())),
  name,
  address,
  phone,
  documents,
  card: (r, p) => {
    const bank = r.pick(BANKS);
    return card(r, 'unionpay', { holder: p.holder, today: p.today, prefix: bank.prefix, length: bank.length, bank: bank.name });
  },
  company,
};
