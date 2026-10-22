/**
 * Verifies the dictionaries. The checks live in the service kit; the list of
 * codes this service can emit at runtime comes from i18n.codes.js next door.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkTranslations } from '@sharapov/service-kit/check-i18n';

import codes from '../i18n.codes.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { problems, notes, languages, keys, translated } = checkTranslations({
  root, codes: codes(root),
});

if (problems.length) {
  console.error('Translation problems found:');
  problems.forEach(problem => console.error('  · ' + problem));
  process.exit(1);
}

notes.forEach(note => console.log('  note: ' + note));
console.log(`Translations are consistent: ${languages} languages x ${keys} keys ` +
  `(service vocabulary translated in ${translated}).`);
