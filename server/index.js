/**
 * myfaker — the HTTP layer.
 *
 *   GET /                         the page
 *   GET /<country>                page for a country (JSON for console clients)
 *   GET /api/<country>            always data
 *   GET /api/stream/<country>     the same as server-sent events
 *   GET /healthz                  liveness probe
 *
 *   ?count=10                     more people, up to 100
 *   ?gender=female|male           only one gender
 *   ?age=30, ?age=18-25           an age or a range
 *   ?seed=anything                the same people again
 *   ?output=json|yaml|csv
 *
 * Every other service in the family checks something that exists — a host, a
 * certificate, a link. This one makes things up, which turns two of the shell's
 * habits around. A report is cheap to produce, so the limits are loosened: a
 * tester presses "generate" far more often than anyone re-checks a domain. And
 * the same request does not have to give the same answer — unless it brings a
 * seed, in which case it must, and the cache key carries the seed so that it
 * does.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createService, localizeReport, sendData } from '@sharapov/service-kit';

import { generate, parseCountry, parseOptions, COUNTRY_IDS, MAX_COUNT, DEFAULT_AGE } from './generate.js';
import { toCsv } from './csv.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* A request without a seed never repeats, so a report is kept only for the
   minute a seeded link is likely to be opened twice in, and only a few of
   them. Making people up is cheap; the limit on doing it can be generous. */
process.env.CACHE_TTL_MS ??= String(60 * 1000);
process.env.CACHE_MAX ??= '50';
process.env.RATE_SCAN_MAX ??= '120';

function parse(raw, req) {
  const country = parseCountry(raw);
  if (country.error) return country;
  const options = parseOptions(req?.query || {});
  if (options.error) return options;
  return { host: country.country, country: country.country, ...options };
}

const cacheKey = target =>
  [target.country, target.seed, target.count, target.gender, `${target.age.min}-${target.age.max}`].join('|');

const ERRORS = ['unknown-country', 'bad-count', 'unknown-gender', 'bad-age', 'bad-seed'];

/* Country names come from ICU rather than the dictionary: twelve languages
   times nineteen countries is a table nobody should maintain by hand. */
const regionNames = new Map();
function countryName(code, locale) {
  try {
    if (!regionNames.has(locale)) regionNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    return regionNames.get(locale).of(code.toUpperCase());
  } catch {
    return code.toUpperCase();
  }
}

const service = await createService({
  slug: 'myfaker',
  name: 'Fake Data',
  domain: 'myfaker.sharapov.biz',
  port: 3031,
  root: ROOT,
  stages: ['generate'],

  parse,
  pathFor: target => target.country,
  cacheKey,
  run: async target => generate(target),

  errors: ERRORS,

  examples: ['ru', 'us?count=5', 'de?gender=female&age=25-35', 'br?count=20&output=csv'],

  usage: {
    usage: {
      scan: 'GET /<country>              — one person (JSON for console clients); a two-letter code',
      count: `add ?count=10 for more people, up to ${MAX_COUNT}`,
      gender: 'add ?gender=female or ?gender=male',
      age: `add ?age=30 or ?age=18-25 (default ${DEFAULT_AGE.min}-${DEFAULT_AGE.max})`,
      seed: 'add ?seed=anything to get the same people again',
      csv: 'add ?output=csv for a table',
    },
    countries: COUNTRY_IDS,
    limits: { count: MAX_COUNT },
  },

  health: () => ({ countries: COUNTRY_IDS }),

  localize: (report, lang) => localizeReport(report, service.i18n, lang, (out, language) => {
    const { tCode, LANG_LOCALES } = service.i18n;
    out.countryName = countryName(out.country, LANG_LOCALES[language] || language);
    for (const person of out.people || []) {
      person.genderLabel = tCode(language, 'gender', person.gender);
      for (const doc of [...(person.documents || []), ...(person.company?.documents || [])]) {
        doc.kindLabel = tCode(language, 'kind', doc.kind);
      }
    }
  }),
});

/*
 * CSV is not a format the shell knows, so it is answered here, before the
 * route's handler would refuse it. A preHandler rather than an onRequest hook:
 * by now the route's rate limit has been counted, and a table of a hundred
 * people is not to be had for free any more than the JSON is.
 */
const CSV_ROUTES = new Set(['/:target', '/api/:target']);

service.app.addHook('preHandler', async (req, reply) => {
  if (!CSV_ROUTES.has(req.routeOptions?.url)) return;
  const wanted = String(req.query?.output ?? req.query?.format ?? '').toLowerCase();
  if (wanted !== 'csv') return;

  const lang = service.pickLang(req);
  const target = parse(req.params.target, req);
  if (target.error) {
    const status = target.error === 'invalid-host' ? 404 : 400;
    return sendData(reply, 'json', {
      statusCode: status, error: target.error, message: service.t(lang, `err_${target.error.replace(/-/g, '_')}`),
    }, { status });
  }

  const report = generate(target);
  const download = req.query?.download === '1' || req.query?.download === 'true';
  if (download) reply.header('content-disposition', `attachment; filename="myfaker-${target.country}-${target.seed}.csv"`);
  return reply
    .type('text/csv; charset=utf-8')
    .header('cache-control', 'no-store')
    .send(toCsv(report));
});

await service.start();

export { service };
