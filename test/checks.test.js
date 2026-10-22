/**
 * Every check digit, against numbers somebody else published.
 *
 * A check-digit routine tested only against numbers it produced itself proves
 * nothing: a wrong weight makes wrong numbers and accepts them just as happily.
 * So each algorithm here is given the body of a number that is valid by an
 * authority other than this code — the examples documented in python-stdnum,
 * a regulator's own sample, the number on a real bank's letterhead — and has
 * to arrive at the same check digit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { luhnDigit, luhnValid, mod11_10, verhoeffDigit, iban, ibanValid } from '../server/parts.js';
import { innPerson, innCompany, snils, ogrn, accountKeyValid, account } from '../server/countries/ru.js';
import { rntrcCheck, edrpou } from '../server/countries/ua.js';
import { iinDigit } from '../server/countries/kz.js';
import { steuerId, svCheck } from '../server/countries/de.js';
import { nirKey, taxNumber, ribKey, siren, tvaKey } from '../server/countries/fr.js';
import { mod11Digit, vatNumber, nino } from '../server/countries/gb.js';
import { dniLetter, cccDigit, cifDigit } from '../server/countries/es.js';
import { codiceFiscale, checkLetter, surnameCode, nameCode } from '../server/countries/it.js';
import { nif, ccCheck, nibCheck, niss } from '../server/countries/pt.js';
import { elevenDigit } from '../server/countries/nl.js';
import { peselCheck, idCardCheck, nipCheck, regon, sortCode } from '../server/countries/pl.js';
import { tckn, vkn } from '../server/countries/tr.js';
import { cpf, cnpj, pis, rgSp } from '../server/countries/br.js';
import { curpDigit, rfcDigit, nameKey, clabe } from '../server/countries/mx.js';
import { aadhaar, gstinCheck } from '../server/countries/in.js';
import { ricCheck, orgCheck, usccCheck } from '../server/countries/cn.js';
import { myNumberDigit, corporateNumber } from '../server/countries/jp.js';
import { routingNumber, ssn } from '../server/countries/us.js';
import { createRandom } from '../server/random.js';

/* ------------------------------------------------------------------ *
 * Shared algorithms
 * ------------------------------------------------------------------ */

test('Luhn, Verhoeff and MOD 11,10', () => {
  assert.equal(luhnDigit('7992739871'), '3');                  // the textbook example
  assert.ok(luhnValid('4111111111111111'));
  assert.ok(!luhnValid('4111111111111112'));
  assert.equal(verhoeffDigit('236'), '3');                     // Verhoeff's own example
  assert.equal(mod11_10('3657426180'), '9');                   // Steuer-ID 36 574 261 809
});

test('IBAN check digits', () => {
  assert.equal(iban('GB', 'WEST12345698765432'), 'GB82WEST12345698765432');
  assert.equal(iban('DE', '370400440532013000'), 'DE89370400440532013000');
  assert.ok(ibanValid('FR7630006000011234567890189'));
  assert.ok(!ibanValid('FR7630006000011234567890188'));
});

/* ------------------------------------------------------------------ *
 * Country by country
 * ------------------------------------------------------------------ */

test('Russia: ИНН, СНИЛС, ОГРН and the account key', () => {
  assert.equal(innPerson('1234567890'), '123456789047');
  assert.equal(innCompany('123456789'), '1234567894');
  assert.equal(innCompany('770708389'), '7707083893');         // Sberbank
  assert.equal(snils('112233445'), '11223344595');              // the canonical sample
  assert.equal(ogrn('102220052581'), '1022200525819');
  assert.equal(ogrn('102770013219'), '1027700132195');          // Sberbank
  /* Sberbank's correspondent account against its БИК 044525225. */
  assert.ok(accountKeyValid('0' + '25', '30101810400000000225'));
  assert.ok(!accountKeyValid('0' + '25', '30101810400000000226'));
  const generated = account('044525225', '40817', '12345678901');
  assert.ok(accountKeyValid('225', generated));
  assert.match(generated, /^40817810\d{12}$/);
});

test('Ukraine, Kazakhstan', () => {
  assert.equal(rntrcCheck('175901377'), '6');
  assert.equal(edrpou('3285596'), '32855961');
  /* Worked by hand: 9·1 + 1·4 + 1·6 + 3·7 + 1·10 + 2·11 = 72, and 72 mod 11 is 6. */
  assert.equal(iinDigit('90010130012'), '6');
  /* The first weights give 1·10 = 10, so the second set decides: 1·1 = 1. */
  assert.equal(iinDigit('00000000010'), '1');
});

test('Germany: Steuer-ID, social insurance number, VAT id', () => {
  assert.equal(svCheck('15070649C10'), '3');                    // 15 070649 C 103, the published sample
  assert.equal(mod11_10('13669597'), '6');                      // DE136695976
  const r = createRandom('steuer');
  for (let i = 0; i < 200; i++) {
    const id = steuerId(r);
    assert.equal(id.length, 11);
    assert.notEqual(id[0], '0');
    const counts = Object.values([...id.slice(0, 10)].reduce((c, d) => ({ ...c, [d]: (c[d] || 0) + 1 }), {}));
    assert.equal(counts.filter(n => n === 2).length, 1, id);
    assert.equal(mod11_10(id.slice(0, 10)), id[10]);
  }
});

test('France: NIR, numéro fiscal, RIB key, SIREN and VAT', () => {
  assert.equal(nirKey('2951099126111'), '93');
  assert.equal(taxNumber('3023217600'), '3023217600053');
  assert.equal(ribKey('30006', '00001', '12345678901'), '89');    // FR76 3000 6000 0112 3456 7890 189
  assert.equal(siren('40483304'), '404833048');
  assert.ok(luhnValid('73282932000074'));                         // a SIRET
  assert.equal(tvaKey('334175221'), '23');
});

test('United Kingdom: NHS, VAT, National Insurance', () => {
  assert.equal(mod11Digit('943476587'), '0');                     // 943 476 5870
  const vat = vatNumber('1234567');
  const sum = [8, 7, 6, 5, 4, 3, 2].reduce((total, w, i) => total + w * Number(vat[i]), 0);
  assert.equal((sum + 55 + Number(vat.slice(7))) % 97, 0);
  const r = createRandom('nino');
  for (let i = 0; i < 300; i++) {
    const number = nino(r);
    assert.match(number, /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/);
    assert.ok(!['BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ'].includes(number.slice(0, 2)));
  }
});

test('Spain: DNI, CCC and CIF', () => {
  assert.equal(dniLetter('54362315'), 'K');
  assert.equal(cccDigit('0012341234') + cccDigit('1234567890'), '16');   // 1234-1234-16-1234567890
  assert.equal(cifDigit('9921658'), '2');                              // J99216582
});

test('Italy: codice fiscale, CIN and partita IVA', () => {
  assert.equal(codiceFiscale({
    first: 'Mario', last: 'Rossi', birth: new Date(Date.UTC(1980, 0, 1)), female: false, belfiore: 'H501',
  }), 'RSSMRA80A01H501U');
  assert.equal(checkLetter('RCCMNL83S18D969'), 'H');
  assert.equal(nameCode('Gianfranco'), 'GFR');                  // four consonants: first, third, fourth
  assert.equal(surnameCode('Fo'), 'FOX');
  assert.equal(surnameCode("D'Angelo"), 'DNG');
  assert.equal(checkLetter('05428' + '11101' + '000000123456'), 'X');   // IT60 X054 2811 1010 0000 0123 456
  assert.ok(luhnValid('00743110157'));
});

test('Portugal: NIF, Cartão de Cidadão, NIB', () => {
  assert.equal(nif('50196484'), '501964843');
  assert.equal(ccCheck('000000000ZZ'), '4');
  const bban = '0035' + '0001' + '00000000000';
  assert.ok(ibanValid(iban('PT', bban + nibCheck(bban))));
  assert.ok(iban('PT', bban + nibCheck(bban)).startsWith('PT50'));
  assert.match(niss('1' + '234567890'), /^1\d{10}$/);
});

test('Netherlands and Poland', () => {
  assert.equal(elevenDigit('11122233'), '3');                   // BSN 1112.22.333
  assert.equal(elevenDigit('00449544'), '5');                   // the RSIN in NL004495445B01
  assert.equal(peselCheck('4405140135'), '9');
  assert.equal(idCardCheck('ABA', '00000'), '3');               // ABA300000
  assert.equal(nipCheck('856734621'), '5');
  assert.equal(regon('19259818'), '192598184');
  assert.equal(sortCode('1020102'), '10201026');                // PKO BP, 102 0102 6
});

test('Turkey and Brazil', () => {
  assert.equal(tckn('172917160'), '17291716060');
  assert.equal(vkn('454053692'), '4540536920');
  assert.equal(cpf('390533447'), '39053344705');
  assert.equal(cnpj('167272300001'), '16727230000197');
  assert.match(pis('1234567890'), /^\d{11}$/);
  assert.match(rgSp('12345678'), /^\d{8}[\dX]$/);
});

test('Mexico: CURP, RFC, CLABE', () => {
  assert.equal(curpDigit('BOXW310820HNERXN0'), '9');
  assert.equal(rfcDigit('GODE561231GR'), '8');
  assert.equal(rfcDigit('MAB9307148T'), '4');                   // a legal person: padded to twelve
  assert.equal(nameKey({ first: 'Juan', last: 'Pérez', second: 'Núñez' }), 'PENJ');
  assert.equal(nameKey({ first: 'Ana', last: 'Ñúñez' }), 'XUXA');
  assert.equal(clabe('03218000011835971'), '032180000118359719');   // Banxico's sample CLABE
});

test('India, China, Japan', () => {
  assert.equal(aadhaar('23412341234'), '234123412346');
  assert.equal(gstinCheck('27AAPFU0939F1Z'), 'V');
  assert.equal(ricCheck('36042619910101007'), '1');
  assert.equal(orgCheck('60003734'), '1');
  assert.equal(usccCheck('91110000600037341'), 'L');
  assert.equal(myNumberDigit('62149832025'), '7');
  assert.equal(corporateNumber('835678256246'), '5835678256246');
});

test('United States: routing number and Social Security rules', () => {
  assert.equal(routingNumber('11100002'), '111000025');
  const r = createRandom('ssn');
  for (let i = 0; i < 2000; i++) {
    const number = ssn(r);
    const area = Number(number.slice(0, 3));
    assert.ok(area > 0 && area < 900 && area !== 666, number);
    assert.notEqual(number.slice(3, 5), '00');
    assert.notEqual(number.slice(5), '0000');
  }
});
