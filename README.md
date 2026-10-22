# myfaker

**Русская версия — [ниже](#русская-версия).**

**[myfaker.sharapov.biz](https://myfaker.sharapov.biz)** — test people for filling
in forms: names, addresses, phone numbers and documents the way each country
writes them, with check digits that pass validation.

No ads, no registration, no accounts. Nothing is stored. MIT licensed, twelve
languages, one `docker run` to host your own.

```bash
curl myfaker.sharapov.biz/ru
```

---

## Why another faker

A form that validates its input rejects `123456789012` in the ИНН field before the
cursor leaves it, and a test that types random digits never gets past the field.
General-purpose fakers know the shape of a name and an address; they rarely know
that a Russian passport series opens with the region's code and the year it was
issued, that a French social security number is the person's sex, birth month and
birthplace written out, or which phone numbers are written exactly like real ones
and still belong to nobody.

So each country here is written by its own rules:

- **Names** as the country has them: a patronymic in Russia, Ukraine and
  Kazakhstan, two surnames in Spain and Mexico, a father's name in Saudi Arabia,
  family name first in China and Japan. A surname that agrees with the gender
  where the language makes it agree — Иванова, Kowalska, Яворська. A Latin
  spelling where the script is not Latin, by the system that country's passports
  use: ICAO 9303 in Russia (Юлия → Iuliia), the 2010 national system in Ukraine
  (Юлія → Yuliia). Japanese names come with their reading in katakana, the
  フリガナ every Japanese form asks for.
- **Addresses** in the country's order, with a postcode that belongs to the city:
  the post town in capitals on its own line in the UK, the colonia on a line of its
  own in Mexico, the floor and door after the number in Spain, the national address
  with its building and additional numbers in Saudi Arabia, in Arabic and in Latin
  letters. Each address also comes as a single line, in the order a form's one
  address field wants.
- **Phone numbers** written exactly as the country writes them, in national,
  international and E.164 form, and belonging to nobody — see below for how, and
  for the two countries where that cannot be done.
- **Documents** built the way the issuing authority builds them. Where a number
  encodes the person, it encodes this person: the birth date and sex inside a
  PESEL, a CURP, a Chinese resident ID, a Ukrainian РНОКПП, a Kazakh ИИН; the
  birthplace inside a codice fiscale, a NIR, a CURP, a Chinese ID — and a Chinese
  district code that existed in the year of birth. Every check digit is computed
  by the document's own algorithm.
- **A card and a bank account** — the card on a network the country uses (Мир in
  Russia, JCB in Japan, RuPay in India, TROY in Turkey, UnionPay from a real bank's
  range in China), the account the way that country's transfer form asks for it: an
  IBAN whose national check digits are right as well (the RIB key in France, the CIN
  in Italy, the DC in Spain, the NIB in Portugal), a current account that passes the
  key check against its bank's БИК in Russia, a CLABE in Mexico, a routing number in
  the US, an IFSC in India.
- **A company** for anyone over eighteen, with the registration and tax numbers a
  B2B form asks for: ИНН, КПП and ОГРН; SIREN, SIRET and the VAT number derived
  from them; a GSTIN that carries the company's PAN; a CNPJ; a unified social
  credit code with both of its check characters.

## Countries

| | Personal documents | Money | Company |
|---|---|---|---|
| **br** Brazil | CPF (its ninth digit the state's fiscal region), PIS/PASEP, RG in São Paulo state | card | CNPJ |
| **cn** China | resident identity number | UnionPay card at a real bank | unified social credit code |
| **de** Germany | Steuer-ID, social insurance number, Personalausweis | IBAN | Handelsregister entry and court, USt-IdNr. |
| **es** Spain | DNI, social security number | IBAN with a correct CCC | NIF of a company |
| **fr** France | NIR, numéro fiscal | IBAN with a correct RIB key | SIREN, SIRET, VAT number |
| **gb** United Kingdom | National Insurance number, NHS number (CHI in Scotland, H&C in Northern Ireland), driving licence number | sort code, account, IBAN | Companies House number, VAT number |
| **in** India | Aadhaar, PAN | account and IFSC | GSTIN, PAN, CIN |
| **it** Italy | codice fiscale, carta d'identità | IBAN with a correct CIN | partita IVA |
| **jp** Japan | My Number | bank code, branch, account | corporate number |
| **kz** Kazakhstan | ИИН, identity card | IBAN | БИН |
| **mx** Mexico | CURP, RFC, NSS | CLABE | RFC of a legal person |
| **nl** Netherlands | BSN | IBAN whose account passes the eleven test | KvK number, VAT id |
| **pl** Poland | PESEL, dowód osobisty | IBAN with a correct sort code | NIP, REGON, KRS |
| **pt** Portugal | NIF, NISS, Cartão de Cidadão | IBAN with a correct NIB | NIPC |
| **ru** Russia | ИНН, СНИЛС, passport with issue date, issuing office and division code | account, БИК, correspondent account | ИНН, КПП, ОГРН |
| **sa** Saudi Arabia | national ID | IBAN | commercial registration, VAT number |
| **tr** Turkey | T.C. Kimlik No | IBAN | VKN and tax office |
| **ua** Ukraine | РНОКПП, ID card with its УНЗР | IBAN | ЄДРПОУ |
| **us** United States | SSN | routing number and account | EIN |

Documents a person is too young for are left out: no Russian passport before
fourteen, no card before fourteen, no company before eighteen.

## What is real and what is not

- **Document numbers** pass every check a form can make offline. None of them was
  issued to anyone, and no registry will confirm one. The homoclave of a Mexican
  RFC and the two check letters of a UK driving licence number are assigned by
  the authority by rules it does not publish, so those characters are invented;
  everything around them is not.
- **E-mail addresses** are at `example.com`, `example.net` and `example.org`,
  reserved by RFC 2606: mail sent there goes nowhere, whatever the system under
  test does with it.
- **Phone numbers** are written exactly as each country writes them and belong to
  nobody. In the United States they come from 555-0100–0199, in the United
  Kingdom from 07700 900000–900999 and in France from 06 39 98 — the blocks kept
  for fiction. Elsewhere they come from blocks the numbering plan has given to no
  network: 0154 in Germany, 090-0… in Japan, 052 in Saudi Arabia, an area code
  that does not exist in Brazil and Mexico, and so on. The price: libphonenumber,
  which most sites check a phone field with, knows these blocks are empty and
  refuses every one of them except the American, so a form that validates the
  number will not take it. **Russia and India** keep no such block — every mobile
  prefix there is in service — so their numbers come from real ranges and **may
  belong to somebody**: do not call them or text them. Every phone says which it
  is in `range`: `fiction`, `unallocated` or `in-service`. "Given to no network"
  is true of the plan as libphonenumber's metadata knows it today; a regulator
  can still open a block later.
- **Card numbers** carry a real network prefix and pass the Luhn check; they belong
  to no account and no payment will go through. For a payment provider's test
  mode, use the test cards it publishes.

## The seed

Nothing a person is made of comes from `Math.random`. Every draw comes from a
small generator seeded with a string, and each part of a person — name, address,
documents — gets a generator of its own, seeded with the seed, the country, the
person's position and the part's name. So:

- the same seed, country and options give the same people, on any machine;
- the third person of ten is the third person of five;
- adding a field to the address in a later version changes the address and
  nothing else.

A request without a seed gets a fresh one, and the report says which. The page
puts it in the address bar as soon as you ask for anything, so a reload or a
link sent to a colleague brings back the same people. Birth dates are counted from
the current year rather than from today: a seed keeps its birthdays all year,
and its people grow older along with everybody else.

## API

```bash
curl myfaker.sharapov.biz/ru                                   # one person, JSON
curl "myfaker.sharapov.biz/api/de?count=10&gender=female&age=25-35"
curl "myfaker.sharapov.biz/api/us?seed=my-fixture&count=5"     # the same five every time
curl "myfaker.sharapov.biz/api/br?count=50&output=csv" > people.csv
curl "myfaker.sharapov.biz/api/jp?output=yaml"
```

| Option | | |
|---|---|---|
| `count` | `1`–`100` | how many people; default 1 |
| `gender` | `female`, `male` | default either |
| `age` | `30`, `18-25` | an age or a range from 0 to 100; default 18–75 |
| `seed` | up to 64 letters, digits, `-`, `_` | the same people again |
| `output` | `json`, `yaml`, `csv` | `?download=1` adds a file name |
| `lang` | `ru`, `de`, … | labels in another language; the people stay as they are |

The country is its ISO code, in any case; `ru-RU` and `pt_BR` work too, and so
does `uk` for the United Kingdom. A value that makes no sense is refused with a
reason — `unknown-country`, `bad-count`, `unknown-gender`, `bad-age`,
`bad-seed` — rather than quietly replaced.

Every document carries a stable `id`, its `name` as the country writes it, a
`kind` (`tax`, `social`, `national-id`, `id-card`, `health`, `driving`,
`company-reg`, `vat`) and a `value` as a person would type it; where that has
spaces or dashes, `raw` has the bare characters an input mask wants.

```bash
curl -s "myfaker.sharapov.biz/api/ru?count=3" | jq '.people[] | [.name.full, (.documents[] | select(.id=="snils") | .value)]'
```

The CSV has a column for every field the people in it have, documents by their
`id` — `inn`, `snils`, `passport_issued` — and a line per person. Values are
written as a person would type them, card numbers with their spaces, so a
spreadsheet keeps them as text. With `?download=1` the file opens with a byte
order mark, which is what makes Excel read it as UTF-8; a spreadsheet still
guesses each column's type, so import the phone columns, which start with `+`,
as text.

There is no cache: a hundred people take a few milliseconds to make up.

## Running your own

```bash
docker run -d --name myfaker -p 127.0.0.1:3031:3031 ghcr.io/sharapov-outsource/myfaker:latest
```

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3031` | listen port |
| `TRUST_PROXY` | `true` | read the client address from proxy headers. Turn **off** when facing the internet directly |
| `RATE_SCAN_MAX` | `120` | requests for people per minute per client — generous, because a tester presses "generate" far more often than anyone re-checks a domain |
| `RATE_MAX` | `120` | all requests per minute per client |
| `METRIKA_ID` | — | analytics counter; omitted, no analytics and a tighter policy |
| `HSTS` | — | set to `true` behind TLS |

The container is read-only, unprivileged and writes nothing.

## Development

```bash
npm install
npm start
npm test                                        # syntax, translations, unit tests, smoke
npm run fake -- ru                              # the generator without the web server
npm run fake -- de 10 --gender=female --age=25-35 --seed=demo
npm run fake -- br 50 --csv > people.csv
```

Every check-digit routine is tested against numbers somebody else published —
the examples documented in [python-stdnum](https://github.com/arthurdejong/python-stdnum),
the sample IBANs banks print, Banxico's sample CLABE, the INN and OGRN on
Sberbank's letterhead — never only against numbers it produced itself, which
proves nothing: a wrong weight makes wrong numbers and accepts them just as
happily. A second, independent opinion is one command away:

```bash
pip install python-stdnum phonenumbers
python3 scripts/cross-check.py                  # thousands of people, every number re-validated
```

It generates people for every country and validates every document with
python-stdnum and every phone number with libphonenumber — one from a fiction
or an unallocated block has to be the right length and unknown to it — and checks what
stdnum has no module for — СНИЛС, ИИН, УНЗР, the German social insurance number,
the Polish identity card — against implementations of its own, written
separately from the ones in `server/`. It also checks that the birth date, sex
and birthplace inside a number are the person's.

To add a country, write `server/countries/<code>.js` — the shape is described in
`server/countries/index.js` — register it there, add it to `COUNTRIES` in
`public/app.js`, and give its document kinds words in `public/i18n.js`;
`npm test` points at whatever was missed.

The shared package is a git dependency, so `npm install` needs `git`. After
changing its version, rewrite the lockfile's URLs as the
[service-kit README](https://github.com/sharapov-outsource/service-kit) explains:

```bash
sed -i '' 's|git+ssh://git@github.com/|git+https://github.com/|g' package-lock.json
GIT_SSH_COMMAND=/usr/bin/false npm ci   # fails here if any ssh URL is left
```

## Built on

**[service-kit](https://github.com/sharapov-outsource/service-kit)** — the HTTP
shell, content negotiation, the closed policy, translations and design system.

## The rest of the family

[myip](https://myip.sharapov.biz) ·
[myssl](https://myssl.sharapov.biz) ·
[mydns](https://mydns.sharapov.biz) ·
[mymx](https://mymx.sharapov.biz) ·
[myheaders](https://myheaders.sharapov.biz) ·
[myneighbors](https://myneighbors.sharapov.biz) ·
[myredirectchecker](https://myredirectchecker.sharapov.biz) ·
myfaker

The family footer is drawn from the list in service-kit, so myfaker appears in
the others' footers — and is marked in its own — once a kit version that lists it
is released and the services are rebuilt against it.

## Licence

MIT. See [LICENSE](LICENSE).

---

## Русская версия

**[myfaker.sharapov.biz](https://myfaker.sharapov.biz)** — тестовые люди для
заполнения форм: имена, адреса, телефоны и документы в том виде, в каком их пишут
в каждой стране, с контрольными цифрами, которые проходят проверку.

Без рекламы, регистрации и аккаунтов. Ничего не хранится. Лицензия MIT, двенадцать
языков, свой экземпляр — одной командой `docker run`.

```bash
curl myfaker.sharapov.biz/ru
```

### Зачем ещё один генератор

Форма с проверкой ввода отвергает `123456789012` в поле ИНН раньше, чем курсор
покинет поле, и тест, который вводит случайные цифры, дальше этого поля не
проходит. Генераторы общего назначения знают, как выглядят имя и адрес, но редко
знают, что серия российского паспорта начинается с кода региона и года выдачи,
что французский номер социального страхования — это записанные пол, месяц и
место рождения человека, или какие телефоны записаны в точности как настоящие и
при этом никому не принадлежат.

Поэтому каждая страна здесь сделана по своим правилам:

- **Имена** — как они устроены в стране: отчество в России, Украине и Казахстане,
  две фамилии в Испании и Мексике, имя отца в Саудовской Аравии, фамилия впереди в
  Китае и Японии. Фамилия согласуется с полом там, где этого требует язык, —
  Иванова, Kowalska, Яворська. Латиницей — там, где письменность не латинская, и по
  той системе, которой пользуются паспорта этой страны: ICAO 9303 в России
  (Юлия → Iuliia), национальная система 2010 года в Украине (Юлія → Yuliia).
  Японские имена идут с чтением катаканой — фуриганой, которую спрашивает любая
  японская форма.
- **Адреса** — в порядке, принятом в стране, с индексом, который принадлежит
  городу: почтовый город заглавными на отдельной строке в Великобритании, колония
  на своей строке в Мексике, этаж и дверь после номера дома в Испании,
  национальный адрес с номером здания и дополнительным номером в Саудовской Аравии —
  по-арабски и латиницей. Каждый адрес есть и одной строкой — в том порядке, в
  каком его ждёт единственное поле «Адрес».
- **Телефоны** — в точности в том виде, в каком их пишут в стране, в
  национальном, международном формате и E.164, и никому не принадлежат; как это
  сделано и в каких двух странах это невозможно — ниже.
- **Документы** собраны так, как их собирает выдающий орган. Если номер кодирует
  человека, то кодирует именно этого: дата рождения и пол внутри PESEL, CURP,
  китайского удостоверения, украинского РНОКПП, казахстанского ИИН; место рождения
  внутри codice fiscale, NIR, CURP, китайского удостоверения — причём код района,
  который существовал в год рождения. Каждая контрольная цифра посчитана по
  алгоритму именно этого документа.
- **Карта и банковский счёт** — карта той платёжной системы, которой пользуются в
  стране (Мир в России, JCB в Японии, RuPay в Индии, TROY в Турции, UnionPay из
  диапазона настоящего банка в Китае), счёт — так, как его спрашивает форма
  перевода в этой стране: IBAN, у которого правильны и национальные контрольные
  цифры (ключ RIB во Франции, CIN в Италии, DC в Испании, NIB в Португалии),
  расчётный счёт, проходящий проверку ключа по БИК банка в России, CLABE в
  Мексике, routing number в США, IFSC в Индии.
- **Компания** — для всех старше восемнадцати, с регистрационными и налоговыми
  номерами, которые спрашивают B2B-формы: ИНН, КПП и ОГРН; SIREN, SIRET и
  выведенный из них номер НДС; GSTIN, внутри которого PAN компании; CNPJ; единый
  код социального кредита с обоими контрольными символами.

### Страны

| | Личные документы | Деньги | Компания |
|---|---|---|---|
| **br** Бразилия | CPF (девятая цифра — фискальный регион штата), PIS/PASEP, RG в штате Сан-Паулу | карта | CNPJ |
| **cn** Китай | номер удостоверения личности | карта UnionPay настоящего банка | единый код социального кредита |
| **de** Германия | Steuer-ID, номер социального страхования, Personalausweis | IBAN | запись в Handelsregister и суд, USt-IdNr. |
| **es** Испания | DNI, номер социального страхования | IBAN с правильным CCC | NIF компании |
| **fr** Франция | NIR, numéro fiscal | IBAN с правильным ключом RIB | SIREN, SIRET, номер НДС |
| **gb** Великобритания | National Insurance number, номер NHS (CHI в Шотландии, H&C в Северной Ирландии), номер водительских прав | sort code, счёт, IBAN | номер Companies House, номер НДС |
| **in** Индия | Aadhaar, PAN | счёт и IFSC | GSTIN, PAN, CIN |
| **it** Италия | codice fiscale, carta d'identità | IBAN с правильным CIN | partita IVA |
| **jp** Япония | My Number | код банка, отделение, счёт | корпоративный номер |
| **kz** Казахстан | ИИН, удостоверение личности | IBAN | БИН |
| **mx** Мексика | CURP, RFC, NSS | CLABE | RFC юрлица |
| **nl** Нидерланды | BSN | IBAN, счёт которого проходит тест одиннадцати | номер KvK, номер НДС |
| **pl** Польша | PESEL, dowód osobisty | IBAN с правильным номером отделения | NIP, REGON, KRS |
| **pt** Португалия | NIF, NISS, Cartão de Cidadão | IBAN с правильным NIB | NIPC |
| **ru** Россия | ИНН, СНИЛС, паспорт с датой выдачи, органом и кодом подразделения | счёт, БИК, корреспондентский счёт | ИНН, КПП, ОГРН |
| **sa** Саудовская Аравия | национальное удостоверение | IBAN | коммерческая регистрация, номер НДС |
| **tr** Турция | T.C. Kimlik No | IBAN | VKN и налоговая инспекция |
| **ua** Украина | РНОКПП, ID-картка с УНЗР | IBAN | ЄДРПОУ |
| **us** США | SSN | routing number и счёт | EIN |

Документов, для которых человек слишком молод, нет: паспорта РФ — до четырнадцати,
карты — до четырнадцати, компании — до восемнадцати.

### Что здесь настоящее, а что нет

- **Номера документов** проходят любую проверку, которую форма может сделать
  без обращения к реестру. Ни один из них никому не выдавался, и ни один реестр его
  не подтвердит. Homoclave мексиканского RFC и две контрольные буквы номера
  британских прав назначает ведомство по неопубликованным правилам, поэтому эти
  символы выдуманы; всё вокруг них — нет.
- **Адреса почты** — на `example.com`, `example.net` и `example.org`,
  зарезервированных RFC 2606: письмо туда никуда не уходит, что бы ни делала с ним
  тестируемая система.
- **Телефоны** записаны в точности так, как их пишут в стране, и никому не
  принадлежат. В США они берутся из блока 555-0100–0199, в Великобритании — из
  07700 900000–900999, во Франции — из 06 39 98: это блоки, отведённые для
  вымысла. В остальных странах — из блоков, которые план нумерации не выделил ни
  одному оператору: 0154 в Германии, 090-0… в Японии, 052 в Саудовской Аравии,
  несуществующий код города в Бразилии и Мексике и так далее. Цена:
  libphonenumber, которым большинство сайтов проверяет поле телефона, знает, что
  эти блоки пусты, и отвергает все такие номера, кроме американских, — форма с
  проверкой номера их не примет. **В России и Индии** таких блоков нет: все
  мобильные префиксы там действующие, поэтому номера берутся из настоящих
  диапазонов и **могут кому-то принадлежать** — не звоните на них и не
  отправляйте SMS. У каждого телефона есть поле `range`: `fiction`, `unallocated`
  или `in-service`. «Не выделен ни одному оператору» верно для плана нумерации в
  том виде, в каком его сегодня знают метаданные libphonenumber; регулятор может
  открыть блок позже.
- **Номера карт** начинаются с настоящего префикса платёжной системы и проходят
  проверку Луна; они не привязаны ни к какому счёту, и платёж не пройдёт. Для
  тестового режима платёжного сервиса берите тестовые карты, которые он публикует.

### Seed

Ничто в человеке не берётся из `Math.random`. Каждое значение даёт небольшой
генератор, инициализированный строкой, и у каждой части человека — имени, адреса,
документов — свой генератор, инициализированный seed, страной, номером человека и
названием части. Поэтому:

- тот же seed, страна и параметры дают тех же людей на любой машине;
- третий человек из десяти — тот же, что третий из пяти;
- новое поле адреса в следующей версии меняет адрес и больше ничего.

Запрос без seed получает новый, и отчёт его называет. Страница кладёт seed в
адресную строку, как только вы о чём-то попросили, так что перезагрузка или
ссылка коллеге возвращают тех же людей. Даты рождения отсчитываются от текущего
года, а не от сегодняшнего дня: дни рождения у seed не меняются весь год, а люди
стареют вместе со всеми.

### API

```bash
curl myfaker.sharapov.biz/ru                                   # один человек, JSON
curl "myfaker.sharapov.biz/api/de?count=10&gender=female&age=25-35"
curl "myfaker.sharapov.biz/api/us?seed=my-fixture&count=5"     # одни и те же пятеро
curl "myfaker.sharapov.biz/api/br?count=50&output=csv" > people.csv
curl "myfaker.sharapov.biz/api/jp?output=yaml"
```

| Параметр | | |
|---|---|---|
| `count` | `1`–`100` | сколько людей; по умолчанию один |
| `gender` | `female`, `male` | по умолчанию любой |
| `age` | `30`, `18-25` | возраст или диапазон от 0 до 100; по умолчанию 18–75 |
| `seed` | до 64 букв, цифр, `-`, `_` | те же люди снова |
| `output` | `json`, `yaml`, `csv` | `?download=1` добавляет имя файла |
| `lang` | `ru`, `de`, … | подписи на другом языке; люди остаются теми же |

Страна — её код ISO в любом регистре; подходят и `ru-RU`, `pt_BR`, а `uk` означает
Великобританию. Бессмысленное значение отклоняется с причиной — `unknown-country`,
`bad-count`, `unknown-gender`, `bad-age`, `bad-seed`, — а не подменяется молча.

У каждого документа есть постоянный `id`, `name` — как его называют в стране,
`kind` (`tax`, `social`, `national-id`, `id-card`, `health`, `driving`,
`company-reg`, `vat`) и `value` — как его написал бы человек; если там пробелы или
дефисы, в `raw` те же символы без них, для поля с маской ввода.

```bash
curl -s "myfaker.sharapov.biz/api/ru?count=3" | jq '.people[] | [.name.full, (.documents[] | select(.id=="snils") | .value)]'
```

В CSV по столбцу на каждое поле, которое есть у людей в нём, документы — по своим
`id`: `inn`, `snils`, `passport_issued`, — и по строке на человека. Значения
записаны так, как их ввёл бы человек, номера карт — с пробелами, поэтому таблица
оставляет их текстом. С `?download=1` файл начинается с метки порядка байтов —
без неё Excel не читает UTF-8; тип каждого столбца таблица всё равно угадывает,
так что столбцы телефонов, начинающиеся с `+`, импортируйте как текст.

Кэша нет: сотня людей придумывается за несколько миллисекунд.

### Запуск своего экземпляра

```bash
docker run -d --name myfaker -p 127.0.0.1:3031:3031 ghcr.io/sharapov-outsource/myfaker:latest
```

| Переменная | По умолчанию | Что делает |
|---|---|---|
| `PORT` | `3031` | порт |
| `TRUST_PROXY` | `true` | брать адрес клиента из заголовков прокси. **Выключите**, если сервис смотрит прямо в интернет |
| `RATE_SCAN_MAX` | `120` | запросов людей в минуту с клиента — щедро: тестировщик жмёт «Сгенерировать» куда чаще, чем кто-то перепроверяет домен |
| `RATE_MAX` | `120` | всех запросов в минуту с клиента |
| `METRIKA_ID` | — | счётчик аналитики; без него аналитики нет, а политика строже |
| `HSTS` | — | `true` за TLS |

Контейнер работает только на чтение, без привилегий и ничего не пишет.

### Разработка

```bash
npm install
npm start
npm test                                        # синтаксис, переводы, юнит-тесты, smoke
npm run fake -- ru                              # генератор без веб-сервера
npm run fake -- de 10 --gender=female --age=25-35 --seed=demo
npm run fake -- br 50 --csv > people.csv
```

Каждый алгоритм контрольной цифры проверяется на номерах, которые опубликовал
кто-то другой: примеры из документации
[python-stdnum](https://github.com/arthurdejong/python-stdnum), образцы IBAN из
банковских памяток, образец CLABE от Banxico, ИНН и ОГРН Сбербанка, — и никогда только на
номерах, которые он сам же и выдал: это ничего не доказывает, ведь неверный вес
порождает неверные номера и с тем же успехом их принимает. Второе, независимое
мнение — одна команда:

```bash
pip install python-stdnum phonenumbers
python3 scripts/cross-check.py                  # тысячи людей, каждый номер перепроверен
```

Скрипт генерирует людей для каждой страны и проверяет каждый документ через
python-stdnum, а каждый телефон — через libphonenumber (номер из «киношного» или
невыделенного блока должен быть правильной длины и неизвестен ему); то, для чего в stdnum нет
модуля, — СНИЛС, ИИН, УНЗР, немецкий номер социального страхования, польское
удостоверение — сверяет с собственными реализациями, написанными отдельно от
`server/`. И ещё проверяет, что дата рождения, пол и место рождения внутри номера —
те же, что у человека.

Чтобы добавить страну, напишите `server/countries/<код>.js` — устройство описано в
`server/countries/index.js`, — зарегистрируйте её там, добавьте в `COUNTRIES` в
`public/app.js` и дайте её видам документов слова в `public/i18n.js`; `npm test`
укажет, что пропущено.

Общий пакет — зависимость из git, поэтому `npm install` нужен `git`. После смены его
версии перепишите адреса в lock-файле, как объясняет
[README service-kit](https://github.com/sharapov-outsource/service-kit):

```bash
sed -i '' 's|git+ssh://git@github.com/|git+https://github.com/|g' package-lock.json
GIT_SSH_COMMAND=/usr/bin/false npm ci   # упадёт здесь, если остался адрес ssh
```

### На чём построено

**[service-kit](https://github.com/sharapov-outsource/service-kit)** — HTTP-оболочка,
выбор формата ответа, закрытая политика безопасности, переводы и дизайн-система.

### Остальная семья

[myip](https://myip.sharapov.biz) ·
[myssl](https://myssl.sharapov.biz) ·
[mydns](https://mydns.sharapov.biz) ·
[mymx](https://mymx.sharapov.biz) ·
[myheaders](https://myheaders.sharapov.biz) ·
[myneighbors](https://myneighbors.sharapov.biz) ·
[myredirectchecker](https://myredirectchecker.sharapov.biz) ·
myfaker

Подвал семьи рисуется по списку из service-kit, поэтому myfaker появится в
подвалах остальных — и будет отмечен в своём, — когда выйдет версия пакета, в
которой он есть, и сервисы пересоберут с ней.

### Лицензия

MIT. См. [LICENSE](LICENSE).
