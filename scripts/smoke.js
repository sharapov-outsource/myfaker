/**
 * Smoke test: boots the service and exercises it end to end.
 *
 * Nothing here leaves the machine — the service makes people up without
 * asking anyone — so this is the whole HTTP surface against one local process:
 * the page, the data in all three formats and the stream, every country, the
 * seed's promise made over HTTP, and every refusal with its reason.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ibanValid, luhnValid } from '../server/parts.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3405;
const base = `http://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    TRUST_PROXY: 'false',
    LOG_LEVEL: 'warn',
    RATE_MAX: '1000',
    RATE_SCAN_MAX: '1000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.output = '';
server.stdout.on('data', chunk => { server.output += chunk; });
server.stderr.on('data', chunk => { server.output += chunk; });

const failures = [];
let checks = 0;

function check(name, condition, detail) {
  checks++;
  if (condition) return;
  failures.push(detail ? `${name} — ${detail}` : name);
}

async function waitFor(attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`${base}/healthz`);
      if (response.ok) return;
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`server never answered /healthz\n${server.output}`);
}

const asCurl = { 'user-agent': 'curl/8.7.1' };
const asBrowser = { accept: 'text/html', 'user-agent': 'Mozilla/5.0' };
const json = async (url, headers = asCurl) => (await fetch(url, { headers })).json();

async function run() {
  await waitFor();

  /* ---------------- service routes ---------------- */
  const health = await json(`${base}/healthz`);
  check('healthz: status', health.status === 'ok');
  check('healthz: names itself', health.service === 'myfaker');
  check('healthz: twelve languages', health.languages?.length === 12, `got ${health.languages?.length}`);
  check('healthz: lists the countries', health.countries?.length === 19 && health.countries.includes('ru'),
    JSON.stringify(health.countries));

  const robots = await fetch(`${base}/robots.txt`);
  check('robots.txt', robots.ok && (await robots.text()).includes('Sitemap:'));
  check('sitemap.xml', (await fetch(`${base}/sitemap.xml`)).ok);
  const favicon = await fetch(`${base}/favicon.ico`);
  check('favicon.ico: is an icon', (favicon.headers.get('content-type') || '').includes('icon'));
  for (const file of ['icon.svg', 'site.webmanifest', 'og-image.png', 'app.js', 'i18n.js', 'styles.css', 'kit/base.css', 'kit/i18n-common.js']) {
    check(`static: ${file}`, (await fetch(`${base}/static/${file}`)).ok);
  }
  check('static: the page template is not served raw', (await fetch(`${base}/static/index.html`)).status === 404);

  /* ---------------- the page ---------------- */
  const page = await fetch(`${base}/ru?seed=smoke`, { headers: asBrowser });
  const html = await page.text();
  check('html: status', page.status === 200, `status ${page.status}`);
  check('html: links app.js', html.includes('/static/app.js'));
  check('html: links the shared dictionary first',
    html.indexOf('/static/kit/i18n-common.js') > 0 &&
    html.indexOf('/static/kit/i18n-common.js') < html.indexOf('/static/i18n.js'));
  check('html: no placeholders left',
    !/%(ORIGIN|URL|ROBOTS|LANG|DIR|TITLE|DESCRIPTION|LOCALE|SERVICES|ANALYTICS)%/.test(html),
    (html.match(/%[A-Z]+%/) || [])[0]);
  check('html: canonical is the country page', html.includes(`<link rel="canonical" href="${base}/ru"`));
  check('html: country pages are not indexed', html.includes('content="noindex, follow"'));
  check('html: siblings are linked', html.includes('https://myredirectchecker.sharapov.biz/'));
  const policy = page.headers.get('content-security-policy') || '';
  check('html: a closed policy', policy.includes("script-src 'self'") && !policy.includes('unsafe-inline'), policy);

  const russian = await (await fetch(`${base}/`, { headers: { ...asBrowser, 'accept-language': 'ru-RU,ru;q=0.9' } })).text();
  check('html: honours accept-language', russian.includes('<html lang="ru"'));
  check('html: translated title', /<title>Фейковые данные/.test(russian), russian.match(/<title>[^<]*/)?.[0]);
  const arabic = await (await fetch(`${base}/`, { headers: { ...asBrowser, 'accept-language': 'ar' } })).text();
  check('html: right-to-left for arabic', arabic.includes('<html lang="ar" dir="rtl"'));
  check('html: home page is indexed', arabic.includes('content="index, follow"'));
  check('html: junk is a 404', (await fetch(`${base}/wp-login.php`, { headers: asBrowser })).status === 404);

  /* ---------------- console clients ---------------- */
  const usage = await json(`${base}/`);
  check('usage: explains the options', ['count', 'gender', 'age', 'seed', 'csv'].every(key => usage.usage?.[key]),
    JSON.stringify(usage.usage));
  check('usage: lists the countries', usage.countries?.length === 19);
  check('usage: lists the family', usage.family?.some(entry => entry.slug === 'myheaders'));

  const viaPath = await json(`${base}/de?seed=smoke`);
  check('console: a country page is data', viaPath.country === 'de' && viaPath.people?.length === 1);

  /* ---------------- every country ---------------- */
  for (const country of health.countries || []) {
    const report = await json(`${base}/api/${country}?count=5&seed=smoke&age=18-80`);
    const people = report.people || [];
    check(`${country}: five people`, people.length === 5, JSON.stringify(report).slice(0, 200));
    check(`${country}: cards pass Luhn`, people.every(person => luhnValid(person.card.raw)));
    check(`${country}: IBANs are valid`, people.every(person =>
      (person.bank?.fields || []).filter(field => field.id === 'iban').every(field => ibanValid(field.raw))));
    check(`${country}: labelled`, typeof report.countryName === 'string' &&
      people.every(person => person.genderLabel && person.phone.rangeLabel && person.documents.every(doc => doc.kindLabel)));
  }

  /* ---------------- the seed ---------------- */
  const first = await json(`${base}/api/fr?seed=same&count=3`);
  const second = await json(`${base}/api/fr?seed=same&count=3&refresh=1`);
  check('seed: the same people again', JSON.stringify(first.people) === JSON.stringify(second.people));
  const unseeded = await json(`${base}/api/fr`);
  const another = await json(`${base}/api/fr`);
  check('seed: without one, a fresh seed every time', unseeded.seed && another.seed && unseeded.seed !== another.seed);
  check('seed: the report says which', first.seed === 'same');

  /* ---------------- options ---------------- */
  const women = await json(`${base}/api/pl?count=20&gender=female&age=30`);
  check('options: gender', women.people?.every(person => person.gender === 'female'));
  check('options: exact age', women.people?.every(person => person.birth.age === 30));
  const labelled = await json(`${base}/api/ru?lang=ru&seed=smoke`);
  check('options: labels in the language asked for', labelled.countryName === 'Россия' &&
    labelled.people[0].documents.find(doc => doc.id === 'inn')?.kindLabel === 'налоговый номер',
    `${labelled.countryName} ${labelled.people?.[0]?.documents?.[0]?.kindLabel}`);

  /* ---------------- formats ---------------- */
  const yaml = await fetch(`${base}/api/jp?output=yaml&seed=smoke`, { headers: asCurl });
  check('yaml: content type', (yaml.headers.get('content-type') || '').includes('yaml'));
  check('yaml: carries the people', (await yaml.text()).includes('people:'));

  const csv = await fetch(`${base}/api/ru?output=csv&count=4&seed=smoke`, { headers: asCurl });
  const table = await csv.text();
  check('csv: content type', (csv.headers.get('content-type') || '').startsWith('text/csv'));
  check('csv: a header and a line per person', table.trimEnd().split('\r\n').length === 5);
  check('csv: columns for the documents', table.split('\r\n')[0].includes(',snils,'), table.split('\r\n')[0]);
  check('csv: the same people as the JSON',
    table.includes((await json(`${base}/api/ru?count=4&seed=smoke`)).people[0].email));
  const download = await fetch(`${base}/api/br?output=csv&download=1&seed=smoke`, { headers: asCurl });
  check('csv: download names the file',
    (download.headers.get('content-disposition') || '').includes('myfaker-br-smoke.csv'),
    download.headers.get('content-disposition'));
  /* Bytes, not text: a decoder drops the mark it is being asked about. */
  const opensWithBom = async response => {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  };
  check('csv: a download opens in Excel as UTF-8', await opensWithBom(download));
  check('csv: what a script fetches has no byte order mark',
    !(await opensWithBom(await fetch(`${base}/api/ru?output=csv&seed=smoke`, { headers: asCurl }))));
  const csvPage = await fetch(`${base}/us?output=csv&seed=smoke`, { headers: asBrowser });
  check('csv: from the pretty route too', (csvPage.headers.get('content-type') || '').startsWith('text/csv'));
  const csvLimited = await fetch(`${base}/api/us?output=csv`, { headers: asCurl });
  check('csv: counted against the rate limit', csvLimited.headers.has('x-ratelimit-remaining'));

  /* ---------------- the stream ---------------- */
  const stream = await fetch(`${base}/api/stream/tr?seed=smoke`);
  const events = await stream.text();
  check('stream: content type', (stream.headers.get('content-type') || '').includes('text/event-stream'));
  check('stream: ends with the report', events.includes('event: report') && events.includes('"country":"tr"'));

  /* ---------------- refusals ---------------- */
  for (const [query, code, route = 'api/ru'] of [
    ['', 'unknown-country', 'api/zz'], ['?count=0', 'bad-count'], ['?count=101', 'bad-count'],
    ['?gender=x', 'unknown-gender'], ['?age=50-20', 'bad-age'], ['?seed=a%20b', 'bad-seed'],
    ['?output=csv', 'unknown-country', 'api/zz'], ['?output=csv', 'invalid-host', 'api/12'],
    ['?gender=constructor', 'unknown-gender'],
  ]) {
    const refused = await fetch(`${base}/${route}${query}`, { headers: asCurl });
    const body = await refused.json();
    check(`refused: ${route}${query}`, refused.status === 400 && body.error === code && body.message,
      `${refused.status} ${JSON.stringify(body)}`);
  }
  check('refused: an unknown format', (await fetch(`${base}/api/ru?output=xml`, { headers: asCurl })).status === 400);
}

try {
  await run();
} catch (err) {
  failures.push(`crashed: ${err.stack || err.message}`);
} finally {
  server.kill();
}

if (failures.length) {
  console.error(`Smoke test: ${failures.length} of ${checks} checks failed:`);
  failures.forEach(failure => console.error('  · ' + failure));
  if (server.output.trim()) console.error('\nserver output:\n' + server.output);
  process.exit(1);
}
console.log(`Smoke test passed: ${checks} checks.`);
