#!/usr/bin/env python3
"""
A second opinion on every number the generator makes.

The unit tests check each algorithm against published examples. This goes the
other way round: it makes thousands of people with the real generator and hands
every number to code that has nothing to do with it —

  · python-stdnum for the documents it knows, with its check digits, dates and
    components;
  · Google's libphonenumber for every phone number, which must be valid, of a
    mobile type, and the same number in all three of its spellings;
  · for what stdnum has no module for, implementations written here, apart from
    the ones in server/, from the published descriptions;
  · and for numbers that encode their holder, that the birth date, sex and
    birthplace inside them are the person's.

Not part of `npm test`: it needs Python.

    pip install python-stdnum phonenumbers
    python3 scripts/cross-check.py [people per country, default 200] [country…]
"""

import collections
import datetime
import json
import os
import re
import subprocess
import sys

try:
    import phonenumbers
    from phonenumbers import PhoneNumberType
    from stdnum import iban, luhn
    from stdnum.br import cnpj, cpf
    from stdnum.cn import ric, uscc
    from stdnum.de import idnr, vat as de_vat
    from stdnum.es import cif, dni
    from stdnum.fr import nif as fr_nif, nir, siren, siret, tva
    from stdnum.gb import nhs, vat as gb_vat
    from stdnum.in_ import aadhaar, gstin, pan
    from stdnum.it import codicefiscale, iva
    from stdnum.jp import cn as jp_cn, in_ as jp_in
    from stdnum.mx import curp, rfc
    from stdnum.nl import bsn, btw
    from stdnum.pl import nip, pesel, regon
    from stdnum.pt import cc as pt_cc, nif as pt_nif
    from stdnum.ru import inn, ogrn
    from stdnum.tr import tckimlik, vkn
    from stdnum.ua import edrpou, rntrc
    from stdnum.us import ein, rtn, ssn
except ImportError as missing:
    sys.exit(f'{missing}: pip install python-stdnum phonenumbers')

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TODAY = datetime.date.today()


def strict_rfc(number):
    return rfc.validate(number, validate_check_digits=True)


# (country, document id) → validator; company documents are prefixed with "company."
STDNUM = {
    ('br', 'cpf'): cpf.validate, ('br', 'company.cnpj'): cnpj.validate,
    ('cn', 'ric'): ric.validate, ('cn', 'company.uscc'): uscc.validate,
    ('de', 'idnr'): idnr.validate, ('de', 'company.vat'): de_vat.validate,
    ('es', 'dni'): dni.validate, ('es', 'company.cif'): cif.validate,
    ('fr', 'nir'): nir.validate, ('fr', 'nif'): fr_nif.validate, ('fr', 'company.siren'): siren.validate,
    ('fr', 'company.siret'): siret.validate, ('fr', 'company.tva'): tva.validate,
    ('gb', 'health'): nhs.validate, ('gb', 'company.vat'): gb_vat.validate,
    ('in', 'aadhaar'): aadhaar.validate, ('in', 'pan'): pan.validate,
    ('in', 'company.gstin'): gstin.validate, ('in', 'company.pan'): pan.validate,
    ('it', 'cf'): codicefiscale.validate, ('it', 'company.piva'): iva.validate,
    ('jp', 'mynumber'): jp_in.validate, ('jp', 'company.corporate'): jp_cn.validate,
    ('mx', 'curp'): curp.validate, ('mx', 'rfc'): strict_rfc, ('mx', 'company.rfc'): strict_rfc,
    ('nl', 'bsn'): bsn.validate, ('nl', 'company.btw'): btw.validate,
    ('pl', 'pesel'): pesel.validate, ('pl', 'company.nip'): nip.validate, ('pl', 'company.regon'): regon.validate,
    ('pt', 'nif'): pt_nif.validate, ('pt', 'cc'): pt_cc.validate, ('pt', 'company.nipc'): pt_nif.validate,
    ('ru', 'inn'): inn.validate, ('ru', 'company.inn'): inn.validate, ('ru', 'company.ogrn'): ogrn.validate,
    ('tr', 'tckn'): tckimlik.validate, ('tr', 'company.vkn'): vkn.validate,
    ('ua', 'rntrc'): rntrc.validate, ('ua', 'company.edrpou'): edrpou.validate,
    ('us', 'ssn'): ssn.validate, ('us', 'company.ein'): ein.validate,
}

# ------------------------------------------------------------------ #
# What stdnum does not cover, written from the published descriptions
# ------------------------------------------------------------------ #

def wsum(text, weights):
    return sum(int(d) * weights[i % len(weights)] for i, d in enumerate(text))


def snils(n):
    s = wsum(n[:9], [9, 8, 7, 6, 5, 4, 3, 2, 1])
    if s > 101:
        s %= 101
    return int(n[9:]) == (0 if s in (100, 101) else s)


def iin(n):
    c = wsum(n[:11], list(range(1, 12))) % 11
    if c == 10:
        c = wsum(n[:11], [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]) % 11
    return c != 10 and c == int(n[11])


def german_social(n):
    digits = n[:8] + '%02d' % (ord(n[8]) - 64) + n[9:11]
    total = sum(p // 10 + p % 10 for p in (int(d) * w for d, w in zip(digits, [2, 1, 2, 5, 7, 1, 2, 1, 2, 1, 2, 1])))
    return total % 10 == int(n[11])


def unzr(v):
    d = v.replace('-', '')
    return len(d) == 13 and wsum(d[:12], [7, 3, 1]) % 10 == int(d[12])


def niss(n):
    return 9 - wsum(n[:10], [29, 23, 19, 17, 13, 11, 7, 5, 3, 2]) % 10 == int(n[10])


def dowod(v):
    v = v.replace(' ', '')
    letters = [int(c, 36) for c in v[:3]]
    return (letters[0] * 7 + letters[1] * 3 + letters[2] + wsum(v[4:], [7, 3, 1, 7, 3])) % 10 == int(v[3])


def pis(n):
    c = 11 - wsum(n[:10], [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11
    return (0 if c >= 10 else c) == int(n[10])


def rg_sp(n):
    c = 11 - wsum(n[:8], [2, 3, 4, 5, 6, 7, 8, 9]) % 11
    return n[8] == ('X' if c == 10 else '0' if c == 11 else str(c))


def nino(v):
    v = v.replace(' ', '')
    return (re.fullmatch(r'[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]', v) is not None
            and v[:2] not in {'BG', 'GB', 'KN', 'NK', 'NT', 'TN', 'ZZ'})


def russian_account(bik, account):
    return wsum(bik[-3:] + account, [7, 1, 3]) % 10 == 0


def russian_corr(bik, account):
    return wsum('0' + bik[4:6] + account, [7, 1, 3]) % 10 == 0


def clabe(n):
    total = sum((int(d) * [3, 7, 1][i % 3]) % 10 for i, d in enumerate(n[:17]))
    return (10 - total % 10) % 10 == int(n[17])


def polish_sort_code(value):
    sort = value.replace(' ', '')[4:12]
    return (10 - wsum(sort[:7], [3, 9, 7, 1, 3, 9, 7]) % 10) % 10 == int(sort[7])


# ------------------------------------------------------------------ #

class Tally:
    def __init__(self):
        self.ok = collections.Counter()
        self.failed = collections.Counter()
        self.example = {}

    def __call__(self, condition, key, value=''):
        if condition:
            self.ok[key] += 1
        else:
            self.failed[key] += 1
            self.example.setdefault(key, value)


def people(country, count):
    """Two runs per country: working age, and everyone from newborn to a hundred."""
    for seed, age in (('cross-check-a', '18-75'), ('cross-check-b', '0-100')):
        out = subprocess.run(
            ['node', os.path.join(ROOT, 'scripts', 'fake-cli.js'), country, str(min(count, 100)),
             f'--seed={seed}', f'--age={age}', '--json'],
            capture_output=True, text=True, check=True)
        yield from json.loads(out.stdout)['people']
        # The CLI caps a run at a hundred; more people come from more seeds.
        for extra in range(1, (count - 1) // 100 + 1):
            out = subprocess.run(
                ['node', os.path.join(ROOT, 'scripts', 'fake-cli.js'), country, '100',
                 f'--seed={seed}-{extra}', f'--age={age}', '--json'],
                capture_output=True, text=True, check=True)
            yield from json.loads(out.stdout)['people']


def validate(stdnum_check, value):
    try:
        stdnum_check(value)
        return True
    except Exception:
        return False


def check_person(c, p, tally):
    docs = {d['id']: d for d in p['documents']}
    raw = lambda d: d.get('raw', d['value'])
    birth = datetime.date.fromisoformat(p['birth']['date'])
    female = p['gender'] == 'female'

    # Phone: valid, mobile, one number in three spellings.
    number = phonenumbers.parse(p['phone']['e164'])
    tally(phonenumbers.is_valid_number(number) and phonenumbers.number_type(number) in
          (PhoneNumberType.MOBILE, PhoneNumberType.FIXED_LINE_OR_MOBILE), f'{c}.phone', p['phone']['e164'])
    tally(phonenumbers.parse(p['phone']['national'], c.upper()) == number and
          phonenumbers.parse(p['phone']['international']) == number, f'{c}.phone.spellings', p['phone'])
    tally(re.fullmatch(r'[a-z0-9._]+@example\.(com|net|org)', p['email']) is not None, f'{c}.email', p['email'])
    age = TODAY.year - birth.year - ((TODAY.month, TODAY.day) < (birth.month, birth.day))
    tally(p['birth']['age'] == age, f'{c}.age', p['birth'])

    for d in p['documents']:
        check = STDNUM.get((c, d['id']))
        if check:
            tally(validate(check, raw(d)), f"{c}.{d['id']}", raw(d))
    for d in (p.get('company') or {}).get('documents', []):
        check = STDNUM.get((c, 'company.' + d['id']))
        if check:
            tally(validate(check, raw(d)), f"{c}.company.{d['id']}", raw(d))

    if p.get('card'):
        tally(luhn.is_valid(p['card']['raw']), f'{c}.card', p['card']['raw'])
    fields = {f['id']: f.get('raw', f['value']) for f in (p.get('bank') or {}).get('fields', [])}
    if 'iban' in fields:
        tally(validate(iban.validate, fields['iban']), f'{c}.iban', fields['iban'])

    # Country by country: what stdnum lacks, and whether a number is its holder's.
    if c == 'ru':
        tally(snils(raw(docs['snils'])), 'ru.snils', raw(docs['snils']))
        if 'passport' in docs:
            details = {x['id']: x['value'] for x in docs['passport']['details']}
            issued = datetime.datetime.strptime(details['issued'], '%d.%m.%Y').date()
            tally(raw(docs['passport'])[2:4] == str(issued.year)[2:], 'ru.passport.year', docs['passport'])
            tally(issued <= TODAY and (issued - birth).days >= 14 * 365, 'ru.passport.age', details)
        if fields:
            tally(russian_account(fields['bik'], fields['account']), 'ru.account', fields)
            tally(russian_corr(fields['bik'], fields['corr']), 'ru.corr', fields)
    if c == 'gb':
        tally(nino(docs['nino']['value']), 'gb.nino', docs['nino']['value'])
        if docs['health']['name'] == 'CHI number':
            h = raw(docs['health'])
            tally(h[:6] == birth.strftime('%d%m%y') and int(h[8]) % 2 == (0 if female else 1), 'gb.chi', h)
        if 'driving' in docs:
            v = docs['driving']['value']
            month = birth.month + (50 if female else 0)
            tally(v[5] == str(birth.year)[2] and v[6:8] == '%02d' % month and v[8:10] == '%02d' % birth.day
                  and v[10] == str(birth.year)[3], 'gb.driving', v)
    if c == 'de':
        v = raw(docs['svnr'])
        tally(german_social(v) and v[2:8] == birth.strftime('%d%m%y') and (int(v[9:11]) >= 50) == female,
              'de.svnr', v)
    if c == 'es':
        v = raw(docs['nuss'])
        tally(int(v[:10]) % 97 == int(v[10:]), 'es.nuss', v)
    if c == 'kz':
        v = docs['iin']['value']
        century = {(19, False): '3', (19, True): '4', (20, False): '5', (20, True): '6'}[(birth.year // 100, female)]
        tally(iin(v) and v[:6] == birth.strftime('%y%m%d') and v[6] == century, 'kz.iin', v)
        if p.get('company'):
            tally(iin(p['company']['documents'][0]['value']), 'kz.bin', p['company']['documents'][0]['value'])
    if c == 'ua':
        v = docs['rntrc']['value']
        tally((birth - datetime.date(1899, 12, 31)).days == int(v[:5]) and int(v[8]) % 2 == (0 if female else 1),
              'ua.rntrc.person', v)
        if 'id-card' in docs:
            details = {x['id']: x['value'] for x in docs['id-card']['details']}
            tally(unzr(details['unzr']) and details['unzr'][:8] == birth.strftime('%Y%m%d'), 'ua.unzr', details['unzr'])
    if c == 'pt':
        tally(niss(docs['niss']['value']), 'pt.niss', docs['niss']['value'])
    if c == 'pl':
        tally(dowod(docs['dowod']['value']), 'pl.dowod', docs['dowod']['value'])
        v = docs['pesel']['value']
        tally(pesel.get_birth_date(v) == birth and pesel.get_gender(v) == ('F' if female else 'M'), 'pl.pesel.person', v)
        if 'iban' in fields:
            tally(polish_sort_code(fields['iban']), 'pl.sortcode', fields['iban'])
    if c == 'br':
        tally(pis(raw(docs['pis'])), 'br.pis', raw(docs['pis']))
        if 'rg' in docs:
            tally(rg_sp(raw(docs['rg'])), 'br.rg', raw(docs['rg']))
    if c == 'mx':
        v = docs['curp']['value']
        tally(curp.get_birth_date(v) == birth and curp.get_gender(v) == ('F' if female else 'M'), 'mx.curp.person', v)
        tally(docs['rfc']['value'][4:10] == v[4:10], 'mx.rfc.person', docs['rfc']['value'])
        if 'nss' in docs:
            tally(luhn.is_valid(docs['nss']['value']), 'mx.nss', docs['nss']['value'])
        if 'clabe' in fields:
            tally(clabe(fields['clabe']), 'mx.clabe', fields['clabe'])
    if c == 'cn':
        v = docs['ric']['value']
        tally(ric.get_birth_date(v) == birth and int(v[16]) % 2 == (0 if female else 1), 'cn.ric.person', v)
    if c == 'it' and birth.year < 2000:
        # A codice fiscale carries a two-digit year; stdnum guesses the century.
        v = docs['cf']['value']
        tally(codicefiscale.get_birth_date(v) == birth and codicefiscale.get_gender(v) == ('F' if female else 'M'),
              'it.cf.person', v)
    if c == 'fr':
        v = raw(docs['nir'])
        tally(v[0] == ('2' if female else '1') and v[1:3] == birth.strftime('%y') and v[3:5] == birth.strftime('%m'),
              'fr.nir.person', v)
    if c == 'sa':
        v = docs['national-id']['value']
        tally(luhn.is_valid(v) and v[0] == '1' and len(v) == 10, 'sa.national-id', v)
    if c == 'us' and 'routing' in fields:
        tally(validate(rtn.validate, fields['routing']), 'us.routing', fields['routing'])


def main():
    args = sys.argv[1:]
    count = int(args[0]) if args and args[0].isdigit() else 200
    wanted = [a for a in args if not a.isdigit()]
    countries = wanted or json.loads(subprocess.run(
        ['node', '-e', "import('./server/generate.js').then(m => console.log(JSON.stringify(m.COUNTRY_IDS)))"],
        cwd=ROOT, capture_output=True, text=True, check=True).stdout)

    tally = Tally()
    for country in countries:
        for person in people(country, count):
            check_person(country, person, tally)

    total = sum(tally.ok.values()) + sum(tally.failed.values())
    print(f'{len(countries)} countries, {total} checks over {len(tally.ok.keys() | tally.failed.keys())} kinds of number')
    if tally.failed:
        print('FAILED:')
        for key, n in tally.failed.most_common():
            print(f'  {key}: {n}, e.g. {tally.example[key]}')
        sys.exit(1)
    print('all passed')


if __name__ == '__main__':
    main()
