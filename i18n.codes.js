/**
 * Every code this service can put in a report.
 *
 * Document kinds and phone ranges are read out of the country modules, so a
 * new one cannot be added without its words. Genders and errors are short
 * closed lists, written out here.
 */

import path from 'node:path';
import { readdirSync } from 'node:fs';
import { codesFrom } from '@sharapov/service-kit/check-i18n';

export default function codes(root) {
  const countries = path.join(root, 'server', 'countries');
  const files = readdirSync(countries).filter(file => file.endsWith('.js')).map(file => path.join(countries, file));
  const from = pattern => files.flatMap(file => codesFrom(file, pattern));

  return {
    kind: from(/kind: '([a-z-]+)'/g),
    range: from(/range: '([a-z-]+)'/g),
    gender: ['any', 'female', 'male'],
    err: [
      /* the shell's own */
      'invalid-host', 'busy', 'bad-output', 'network', 'bad-response', 'timeout', 'scan-failed',
      /* this service's */
      'unknown-country', 'bad-count', 'unknown-gender', 'bad-age', 'bad-seed',
    ],
  };
}
