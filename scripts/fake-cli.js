#!/usr/bin/env node
/**
 * The generator without the web server, for when a terminal is enough:
 *
 *   npm run fake -- ru
 *   npm run fake -- de 10 --gender=female --age=25-35 --seed=demo
 *   npm run fake -- br 50 --csv > people.csv
 *   npm run fake -- jp --json
 */

import { generate, parseCountry, parseOptions, COUNTRY_IDS } from '../server/generate.js';
import { toCsv } from '../server/csv.js';

const args = process.argv.slice(2);
const positional = args.filter(argument => !argument.startsWith('--'));
const flag = name => args.find(argument => argument.startsWith(`--${name}=`))?.slice(name.length + 3);

if (!positional[0]) {
  console.error(`usage: npm run fake -- <country> [count] [--gender=female|male] [--age=18-25] [--seed=x] [--json|--csv]`);
  console.error(`countries: ${COUNTRY_IDS.join(' ')}`);
  process.exit(2);
}

const country = parseCountry(positional[0]);
const options = parseOptions({ count: positional[1], gender: flag('gender'), age: flag('age'), seed: flag('seed') });
const error = country.error || options.error;
if (error) {
  console.error(`${positional.join(' ')}: ${error}`);
  process.exit(2);
}

const report = generate({ ...country, ...options });

if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else if (args.includes('--csv')) {
  process.stdout.write(toCsv(report));
} else {
  console.log(`${report.country} · seed ${report.seed} · ${report.count} ${report.count === 1 ? 'person' : 'people'}\n`);
  for (const person of report.people) {
    console.log(`${person.name.full}${person.name.latin ? `  (${person.name.latin.full})` : ''}`);
    console.log(`  ${person.gender}, born ${person.birth.local} in ${person.birth.place}, ${person.birth.age}`);
    console.log(`  ${person.address.line}`);
    console.log(`  ${person.phone.international} · ${person.email}`);
    for (const doc of person.documents) console.log(`  ${doc.name}: ${doc.value}`);
    if (person.card) console.log(`  ${person.card.networkName} ${person.card.number} ${person.card.expiry} ${person.card.cvv}`);
    console.log('');
  }
}
