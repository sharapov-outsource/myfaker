/**
 * Every code this service can put in a report.
 *
 * Document kinds are read out of the country modules, so a new kind cannot be
 * added without its words. Genders and errors are short closed lists, written
 * out here.
 */

import path from 'node:path';
import { readdirSync } from 'node:fs';
import { codesFrom } from '@sharapov/service-kit/check-i18n';

export default function codes(root) {
  const countries = path.join(root, 'server', 'countries');
  const kinds = readdirSync(countries)
    .filter(file => file.endsWith('.js'))
    .flatMap(file => codesFrom(path.join(countries, file), /kind: '([a-z-]+)'/g));

  return {
    kind: kinds,
    gender: ['any', 'female', 'male'],
    err: [
      /* the shell's own */
      'invalid-host', 'busy', 'bad-output', 'network', 'bad-response', 'timeout', 'scan-failed',
      /* this service's */
      'unknown-country', 'bad-count', 'unknown-gender', 'bad-age', 'bad-seed',
    ],
  };
}
