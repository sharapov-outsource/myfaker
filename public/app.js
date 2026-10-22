/**
 * myfaker client.
 *
 * The page asks the API for people and draws one of them across the cards,
 * every value a button that copies itself — the whole point is to paste it
 * into some other form a moment later. With more than one person a table
 * lists them all and a row picks who the cards show.
 *
 * The seed goes into the address bar as soon as the visitor asks for anything,
 * so a reload or a link sent to a colleague brings back the same people.
 * Switching language repaints from the report in memory: the people stay who
 * they are, only the labels around them change.
 */
'use strict';

const byId = id => document.getElementById(id);

/* ================================================================== *
 * Language
 * ================================================================== */

const I18N = window.I18N;
const RTL = new Set(window.RTL_LANGS || []);
const STORAGE_KEY = 'myfaker-lang';

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && I18N[saved]) return saved;
  } catch { /* localStorage may be unavailable */ }

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const raw of candidates) {
    const tag = String(raw).toLowerCase();
    if (I18N[tag]) return tag;
    const base = tag.split('-')[0];
    if (I18N[base]) return base;
  }
  return 'en';
}

let LANG = detectLang();

function t(key, vars) {
  const dict = I18N[LANG] || I18N.en;
  let value = dict[key] ?? I18N.en[key] ?? key;
  if (vars) for (const [name, replacement] of Object.entries(vars)) {
    value = value.split('{' + name + '}').join(replacement);
  }
  return value;
}

/** Translation for a dashed code such as "id-card", or the code itself. */
function tCode(prefix, code) {
  if (!code && code !== 0) return undefined;
  const key = prefix + '_' + String(code).replace(/[-.]/g, '_');
  const dict = I18N[LANG] || I18N.en;
  return dict[key] ?? I18N.en[key] ?? String(code).replace(/-/g, ' ');
}

const locale = () => window.LANG_LOCALES?.[LANG] || LANG;

/* One formatter per language, not one per name: the country menu alone asks for nineteen. */
const regionNames = new Map();

/** A country's name in the interface language, from the browser's own ICU data. */
function countryName(code) {
  const tag = locale();
  try {
    if (!regionNames.has(tag)) regionNames.set(tag, new Intl.DisplayNames([tag], { type: 'region' }));
    return regionNames.get(tag).of(code.toUpperCase());
  } catch {
    return code.toUpperCase();
  }
}

/* ================================================================== *
 * What can be asked for
 * ================================================================== */

/* The same list the server has; the smoke test keeps the two in step. */
const COUNTRIES = ['br', 'cn', 'de', 'es', 'fr', 'gb', 'in', 'it', 'jp', 'kz', 'mx', 'nl', 'pl', 'pt', 'ru', 'sa', 'tr', 'ua', 'us'];
const GENDERS = ['any', 'female', 'male'];
const AGES = ['18-75', '18-25', '26-40', '41-60', '61-90', '14-17', '0-13'];
const COUNTS = [1, 5, 10, 25, 50, 100];
const DEFAULTS = { gender: 'any', age: '18-75', count: 1 };

/* Where a visitor's language points when their locale names no country. */
const LANG_COUNTRY = { en: 'us', ru: 'ru', es: 'es', zh: 'cn', hi: 'in', ar: 'sa', pt: 'br', fr: 'fr', de: 'de', ja: 'jp', tr: 'tr', uk: 'ua' };

function defaultCountry() {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  for (const tag of tags) {
    const region = /-([a-z]{2})$/i.exec(tag)?.[1]?.toLowerCase();
    if (region && COUNTRIES.includes(region)) return region;
  }
  return LANG_COUNTRY[LANG] || 'us';
}

/* ================================================================== *
 * State
 * ================================================================== */

let REPORT = null;
let LAST_ERROR = null;
let SELECTED = 0;
let OPTIONS = { country: null, ...DEFAULTS, seed: null };
/* On the home page nothing goes into the address bar until the visitor asks
   for something: `/` stays the page a search engine knows. */
let PINNED = false;
let REQUEST = 0;

function optionsQuery(options = OPTIONS) {
  const query = new URLSearchParams();
  if (options.seed) query.set('seed', options.seed);
  if (options.count !== DEFAULTS.count) query.set('count', String(options.count));
  if (options.gender !== DEFAULTS.gender) query.set('gender', options.gender);
  if (options.age !== DEFAULTS.age) query.set('age', options.age);
  return query;
}

function pagePath(options = OPTIONS) {
  const query = optionsQuery(options).toString();
  return `/${options.country}${query ? '?' + query : ''}`;
}

const apiPath = extra => {
  const query = optionsQuery();
  for (const [name, value] of Object.entries(extra || {})) query.set(name, value);
  return `/api/${OPTIONS.country}?${query}`;
};

/** The options a report was made with — what the people on screen came from. */
function reportOptions(report) {
  const { min, max } = report.age;
  return {
    country: report.country, seed: report.seed, count: report.count, gender: report.gender,
    age: min === max ? String(min) : `${min}-${max}`,
  };
}

/**
 * The country the path names. On arrival the server has already read it —
 * `pt-BR`, `en_GB` and `uk` included — and says which country it found in the
 * canonical link, so the page keeps no second parser of its own; the paths
 * the page pushes itself are plain codes.
 */
function countryFromPath(segment, arrival) {
  if (!segment) return { country: defaultCountry() };
  if (COUNTRIES.includes(segment)) return { country: segment };
  if (arrival) {
    const resolved = new URL(byId('link-canonical').href).pathname.slice(1);
    if (COUNTRIES.includes(resolved)) return { country: resolved };
  }
  return { country: defaultCountry(), error: 'unknown-country' };
}

/** Reads the address bar into OPTIONS; returns the error code when it names no country. */
function fromLocation({ arrival = false } = {}) {
  const segment = decodeURIComponent(location.pathname.replace(/^\//, '').split('/')[0] || '').toLowerCase();
  const query = new URLSearchParams(location.search);
  const { country, error } = countryFromPath(segment, arrival);
  const count = Number(query.get('count'));
  const gender = String(query.get('gender') || '').toLowerCase();
  const age = String(query.get('age') || '').replace('–', '-');
  OPTIONS = {
    country,
    gender: GENDERS.includes(gender) ? gender : DEFAULTS.gender,
    /* An age typed into the URL that is not one of the presets still works:
       the server takes any range, the menu just gains an entry for it. */
    age: /^\d{1,3}(-\d{1,3})?$/.test(age) ? age : DEFAULTS.age,
    count: Number.isInteger(count) && count >= 1 && count <= 100 ? count : DEFAULTS.count,
    seed: query.get('seed') || null,
  };
  PINNED = Boolean(segment);
  return error;
}

/* ================================================================== *
 * Helpers
 * ================================================================== */

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(message) {
  const element = byId('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => element.classList.remove('show'), 1900);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('toast_copied'));
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.className = 'offscreen';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); toast(t('toast_copied')); }
    catch { toast(t('toast_copy_fail')); }
    area.remove();
  }
}

function newSeed() {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('');
}

const blank = value => value === undefined || value === null || value === '';

/* 18–75 stays 18–75 in a right-to-left line: the marks keep the dash between
   the numbers from taking the paragraph's direction and swapping them. */
const range = (min, max) => (String(min) === String(max) ? String(min) : `${min}\u200e–\u200e${max}`);

/**
 * A label and a value that copies itself when pressed. `raw` is the same value
 * without its spaces and dashes — what a field with an input mask wants — and
 * gets a smaller button of its own.
 */
function row(label, value, { raw, hint, big, sub } = {}) {
  if (blank(value)) return '';
  const alt = !blank(raw) && raw !== value
    ? `<button type="button" class="alt" data-copy="${esc(raw)}" title="${esc(t('hint_raw'))}">${esc(raw)}</button>`
    : '';
  return `<div class="row${sub ? ' sub' : ''}"><span class="k">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span>` +
    `<span class="v${big ? ' big' : ''}"><button type="button" class="value" data-copy="${esc(value)}">${esc(value)}</button>${alt}</span></div>`;
}

/** Several lines that copy as one, the way an address goes into a single box. */
function block(lines, dir) {
  if (!lines?.length) return '';
  return `<button type="button" class="block"${dir ? ` dir="${dir}"` : ''} data-copy="${esc(lines.join('\n'))}">` +
    `${lines.map(esc).join('<br>')}</button>`;
}

function documentRows(list) {
  return (list || []).map(doc =>
    row(doc.name, doc.value, { raw: doc.raw, hint: tCode('kind', doc.kind) }) +
    (doc.details || []).map(detail => row(detail.name, detail.value, { raw: detail.raw, sub: true })).join('')).join('');
}

/* ================================================================== *
 * Fetching
 * ================================================================== */

function busy(on) {
  byId('btn-generate').disabled = on;
  byId('btn-rescan').disabled = on;
  byId('report').classList.toggle('loading', on);
}

async function load() {
  const request = ++REQUEST;
  LAST_ERROR = null;
  busy(true);
  try {
    const response = await fetch(apiPath({ lang: LANG }), { headers: { accept: 'application/json' } });
    const body = await response.json();
    if (request !== REQUEST) return;
    if (!response.ok || !Array.isArray(body.people)) {
      LAST_ERROR = body?.error ? body : { error: 'bad-response' };
      REPORT = null;
    } else {
      REPORT = body;
      SELECTED = Math.min(SELECTED, body.people.length - 1);
      OPTIONS.seed = body.seed;
      if (PINNED) history.replaceState({}, '', pagePath());
    }
  } catch {
    if (request !== REQUEST) return;
    LAST_ERROR = { error: 'network' };
    REPORT = null;
  }
  busy(false);
  render();
}

/** Asks for people with the options in the form. A new seed unless told to keep it. */
function go({ keepSeed = false } = {}) {
  OPTIONS = {
    country: byId('opt-country').value,
    gender: byId('opt-gender').value,
    age: byId('opt-age').value,
    count: Number(byId('opt-count').value),
    seed: keepSeed ? OPTIONS.seed : newSeed(),
  };
  SELECTED = 0;
  PINNED = true;
  history.pushState({}, '', pagePath());
  load();
}

/* ================================================================== *
 * Rendering
 * ================================================================== */

const MIDDLE_LABEL = { patronymic: 'k_patronymic', father: 'k_father_name', middle: 'k_middle_name' };

function renderHero(report, person) {
  const badge = byId('country-badge');
  badge.className = 'grade-badge country';
  badge.textContent = report.country.toUpperCase();
  byId('country-caption').textContent = countryName(report.country);
  byId('hero-name').textContent = person.name.full;

  const meta = byId('hero-meta');
  const age = range(report.age.min, report.age.max);
  meta.innerHTML = [
    `<span class="chip">${esc(report.locale)}</span>`,
    `<span class="chip">${esc(t('chip_age', { age }))}</span>`,
    report.gender !== 'any' ? `<span class="chip">${esc(tCode('gender', report.gender))}</span>` : '',
    report.count > 1 ? `<span class="chip">${esc(t('chip_people', { n: report.count }))}</span>` : '',
    `<button type="button" class="chip seed" data-copy="${esc(report.seed)}" title="${esc(t('hint_seed'))}">${esc(t('chip_seed', { seed: report.seed }))}</button>`,
    `<button type="button" class="chip link" id="btn-copy-link">${esc(t('btn_copy_link'))}</button>`,
  ].join('');
}

function renderPerson(person) {
  const { name, birth } = person;
  byId('person-rows').innerHTML = [
    row(t('k_full_name'), name.full, { big: true }),
    row(t('k_last_name'), name.last),
    row(t('k_first_name'), name.first),
    row(t(MIDDLE_LABEL[name.middleKind] || 'k_middle_name'), name.middle),
    row(t('k_second_surname'), name.second),
    row(t('k_latin'), name.latin?.full),
    row(t('k_kana'), name.kana?.full),
    row(t('k_gender'), tCode('gender', person.gender)),
    row(t('k_birth_date'), birth.local, { raw: birth.date }),
    row(t('k_age'), String(birth.age)),
    row(t('k_birth_place'), birth.place),
  ].join('');
}

function renderAddress(report, person) {
  const address = person.address;
  const latin = address.latin;
  byId('address-rows').innerHTML = [
    block(address.lines),
    latin ? block(latin.lines, 'ltr') : '',
    row(t('k_address_line'), address.line),
    row(t('k_street'), address.street),
    row(t('k_building'), address.building),
    row(t('k_apartment'), address.apartment),
    row(t('k_district'), address.district),
    row(t('k_city'), address.city),
    row(t('k_region'), address.region, { raw: address.regionCode }),
    row(t('k_postal_code'), address.postalCode),
    row(t('k_additional_number'), address.additionalNumber),
    row(t('k_country'), countryName(report.country), { raw: report.country.toUpperCase() }),
  ].join('');
}

function renderContacts(person) {
  const phone = person.phone;
  byId('contact-rows').innerHTML = [
    row(t('k_phone'), phone.national, { raw: phone.e164, big: true }),
    row(t('k_phone_intl'), phone.international),
    row(t('k_email'), person.email),
    row(t('k_username'), person.username),
    row(t('k_password'), person.password),
  ].join('');
}

function renderDocuments(person) {
  byId('document-rows').innerHTML = documentRows(person.documents) ||
    `<div class="empty-note">${esc(t('v_none'))}</div>`;
}

function renderMoney(person) {
  const card = person.card;
  const bank = person.bank;
  byId('money-card').hidden = !card && !bank;
  byId('money-rows').innerHTML = [
    card ? row(t('k_card_number'), card.number, { raw: card.raw, hint: card.networkName, big: true }) : '',
    card ? row(t('k_card_expiry'), card.expiry) : '',
    card ? row(t('k_card_cvv'), card.cvv) : '',
    card ? row(t('k_card_holder'), card.holder) : '',
    card?.bank ? row(t('k_bank'), card.bank) : '',
    bank?.name ? row(t('k_bank'), bank.name) : '',
    ...(bank?.fields || []).map(field => row(field.name, field.value, { raw: field.raw })),
  ].join('');
}

function renderCompany(person) {
  const company = person.company;
  byId('company-card').hidden = !company;
  if (!company) return;
  byId('company-rows').innerHTML =
    row(t('k_company_name'), company.name, { big: true }) +
    row(t('k_latin'), company.nameLatin) +
    documentRows(company.documents);
}

function renderPeople(report) {
  const card = byId('people-card');
  card.hidden = report.people.length < 2;
  if (card.hidden) return;
  const labels = [t('th_name'), t('th_birth'), t('th_phone'), t('th_email'), t('th_city')];
  byId('people-rows').innerHTML = report.people.map((person, i) =>
    `<tr data-index="${i}" tabindex="0"${i === SELECTED ? ' class="selected" aria-selected="true"' : ''}>` +
    `<td class="num">${i + 1}</td>` +
    `<td data-label="${esc(labels[0])}">${esc(person.name.full)}</td>` +
    `<td class="mono" data-label="${esc(labels[1])}">${esc(person.birth.local)}</td>` +
    `<td class="mono" data-label="${esc(labels[2])}">${esc(person.phone.national)}</td>` +
    `<td class="mono" data-label="${esc(labels[3])}">${esc(person.email)}</td>` +
    `<td data-label="${esc(labels[4])}">${esc(person.address.city)}</td></tr>`).join('');
  byId('btn-save-csv').href = apiPath({ output: 'csv', download: '1' });
}

function renderError() {
  byId('report').hidden = true;
  const box = byId('alerts');
  const code = LAST_ERROR.error || 'scan-failed';
  /* The message the server sent is in the language it was asked in, which may
     not be the one on screen now; the code is translated here instead. */
  box.innerHTML = `<div class="alert bad"><div class="alert-body"><div class="alert-title">${esc(tCode('err', code))}</div></div></div>`;
  const badge = byId('country-badge');
  badge.className = 'grade-badge g-unknown';
  badge.textContent = '!';
  byId('hero-name').textContent = '…';
  byId('hero-meta').innerHTML = '';
}

function render() {
  applyStaticText();
  byId('alerts').innerHTML = '';
  if (LAST_ERROR) { renderError(); return; }
  if (!REPORT) return;

  const person = REPORT.people[SELECTED] || REPORT.people[0];
  byId('report').hidden = false;
  renderHero(REPORT, person);
  renderPerson(person);
  renderAddress(REPORT, person);
  renderContacts(person);
  renderDocuments(person);
  renderMoney(person);
  renderCompany(person);
  renderPeople(REPORT);
  byId('raw-json').textContent = JSON.stringify(REPORT, null, 2);
  updateSeoMeta();
}

/** The person on the cards as plain lines, for a ticket or a chat. */
function personText(person) {
  const pairs = [
    [t('k_full_name'), person.name.full],
    [t('k_latin'), person.name.latin?.full],
    [t('k_birth_date'), person.birth.local],
    [t('k_address'), person.address.line],
    [t('k_phone'), person.phone.international],
    [t('k_email'), person.email],
    [t('k_username'), person.username],
    [t('k_password'), person.password],
    ...person.documents.flatMap(doc => [[doc.name, doc.value], ...(doc.details || []).map(detail => [detail.name, detail.value])]),
    [t('k_card_number'), person.card?.number],
    [t('k_card_expiry'), person.card?.expiry],
    [t('k_card_cvv'), person.card?.cvv],
  ];
  return pairs.filter(([, value]) => !blank(value)).map(([label, value]) => `${label}: ${value}`).join('\n');
}

/* ================================================================== *
 * Static text, language switching, SEO
 * ================================================================== */

function fill(select, entries, current) {
  select.innerHTML = '';
  for (const [value, label] of entries) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
  select.value = String(current);
}

/* The menus are rebuilt when the language or a choice in them changes, not on
   every repaint — picking a row of the table repaints the whole report. */
let BUILT = '';

function buildOptions() {
  const built = [LANG, OPTIONS.country, OPTIONS.gender, OPTIONS.age, OPTIONS.count].join('|');
  if (built === BUILT) return;
  BUILT = built;
  const collator = new Intl.Collator(locale());
  const countries = COUNTRIES.map(code => [code, countryName(code)]).sort((a, b) => collator.compare(a[1], b[1]));
  fill(byId('opt-country'), countries, OPTIONS.country);
  fill(byId('opt-gender'), GENDERS.map(gender => [gender, tCode('gender', gender)]), OPTIONS.gender);
  const ages = AGES.includes(OPTIONS.age) ? AGES : [...AGES, OPTIONS.age];
  fill(byId('opt-age'), ages.map(age => {
    const [min, max = min] = age.split('-');
    return [age, range(min, max)];
  }), OPTIONS.age);
  const counts = COUNTS.includes(OPTIONS.count) ? COUNTS : [...COUNTS, OPTIONS.count].sort((a, b) => a - b);
  fill(byId('opt-count'), counts.map(count => [count, String(count)]), OPTIONS.count);
}

function applyStaticText() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = RTL.has(LANG) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  byId('lang').setAttribute('aria-label', t('lang_aria'));
  byId('api-hint').innerHTML = t('api_hint', { origin: location.origin, example: 'de' });
  buildOptions();
}

function updateSeoMeta() {
  const label = PINNED && REPORT ? countryName(REPORT.country) : '';
  const title = label ? `${label} — ${t('title_short')}` : t('title');
  document.title = title;
  for (const [id, value] of [
    ['meta-description', t('subtitle')], ['og-title', title], ['twitter-title', title],
    ['og-description', t('subtitle')], ['twitter-description', t('subtitle')],
  ]) {
    const node = byId(id);
    if (node) node.setAttribute('content', value);
  }
  const canonical = byId('link-canonical');
  if (canonical) canonical.href = location.origin + (PINNED && REPORT ? '/' + REPORT.country : '/');
}

function buildLanguageSelect() {
  const select = byId('lang');
  select.innerHTML = '';
  for (const code of Object.keys(I18N)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = window.LANG_NAMES?.[code] || code;
    if (code === LANG) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    LANG = select.value;
    try { localStorage.setItem(STORAGE_KEY, LANG); } catch { /* private mode */ }
    render();
  });
}

/* ================================================================== *
 * Wiring
 * ================================================================== */

byId('gen-form').addEventListener('submit', event => {
  event.preventDefault();
  go();
});

/* Changing an option is asking for different people: no need to press anything. */
for (const id of ['opt-country', 'opt-gender', 'opt-age', 'opt-count']) {
  byId(id).addEventListener('change', () => go());
}

byId('btn-rescan').addEventListener('click', () => go());

byId('btn-copy-json').addEventListener('click', () => {
  if (REPORT) copyText(JSON.stringify(REPORT, null, 2));
});

byId('btn-save-json').addEventListener('click', () => {
  if (!REPORT) return;
  const blob = new Blob([JSON.stringify(REPORT, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `myfaker-${REPORT.country}-${REPORT.seed}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

byId('btn-copy-person').addEventListener('click', () => {
  if (REPORT) copyText(personText(REPORT.people[SELECTED]));
});

byId('btn-copy-csv').addEventListener('click', async () => {
  try {
    const response = await fetch(apiPath({ output: 'csv' }));
    if (!response.ok) throw new Error(String(response.status));
    copyText(await response.text());
  } catch {
    toast(t('toast_copy_fail'));
  }
});

/* One listener for every value on the page: anything with data-copy copies it. */
document.addEventListener('click', event => {
  const target = event.target.closest('[data-copy]');
  if (target) {
    copyText(target.dataset.copy);
    return;
  }
  /* From the report, not from the form: while new people are on their way the
     form already holds their options, and the link is to the people on screen. */
  if (event.target.closest('#btn-copy-link') && REPORT) {
    copyText(location.origin + pagePath(reportOptions(REPORT)));
    return;
  }
  const choice = event.target.closest('#people-rows tr[data-index]');
  if (choice && REPORT) {
    SELECTED = Number(choice.dataset.index);
    render();
    byId('hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* A row can be picked from the keyboard too. */
byId('people-rows').addEventListener('keydown', event => {
  const choice = event.target.closest('tr[data-index]');
  if (!choice || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  choice.click();
});

window.addEventListener('popstate', () => {
  const error = fromLocation();
  SELECTED = 0;
  if (error) {
    LAST_ERROR = { error };
    REPORT = null;
    render();
  } else {
    load();
  }
});

const arrivalError = fromLocation({ arrival: true });
buildLanguageSelect();
applyStaticText();
if (arrivalError) {
  LAST_ERROR = { error: arrivalError };
  render();
} else {
  load();
}
