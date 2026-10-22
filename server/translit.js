/**
 * Cyrillic names in Latin letters, the way the documents of each country
 * write them.
 *
 * There is no single transliteration, and the difference shows: Юлия is Iuliia
 * in a Russian passport, Yuliia in a Ukrainian one, and Yulia almost everywhere
 * else. A test that checks a name against a passport scan needs the passport's
 * spelling, so each country gets its own table:
 *
 *   · Russia — ICAO Doc 9303, used in passports since 2013 (ё is e, ъ is ie);
 *   · Ukraine — the 2010 national system, in which some letters spell
 *     differently at the start of a word (Юлія → Yuliia, Ярослав → Yaroslav);
 *   · Kazakhstan — the Russian table plus the Kazakh letters.
 */

const RU = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: 'ie', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia',
};

const UK = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
  "'": '', '’': '',
};
/* At the start of a word these five are spelled with a y. */
const UK_INITIAL = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };

const KK = { ...RU, ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i' };

function convert(text, table, initial = {}) {
  let out = '';
  let wordStart = true;
  const source = String(text);
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const lower = ch.toLowerCase();
    let mapped = (wordStart ? initial[lower] : undefined) ?? table[lower];
    /* Ukrainian зг is zgh, so that it does not read as the zh of ж. */
    if (table === UK && lower === 'г' && source[i - 1]?.toLowerCase() === 'з') mapped = 'gh';
    if (mapped === undefined) {
      out += ch;
    } else if (ch !== lower && mapped) {
      out += mapped[0].toUpperCase() + mapped.slice(1);
    } else {
      out += mapped;
    }
    wordStart = !/[\p{L}'’]/u.test(ch);
  }
  return out;
}

export const latinRu = text => convert(text, RU);
export const latinUk = text => convert(text, UK, UK_INITIAL);
export const latinKk = text => convert(text, KK);
