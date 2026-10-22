/**
 * The report as a table, for a spreadsheet or a database fixture.
 *
 * One row per person. The columns are whatever the people in this report
 * have, in the order they first appear: a country whose people carry an ИНН
 * gets an `inn` column, one whose people carry a CPF gets `cpf`. A document
 * only some people hold — a passport not yet issued to a child — leaves its
 * cell empty for the rest.
 *
 * Values are written the way a person would type them (`value`, not `raw`):
 * a form takes the formatted SNILS as readily as the bare digits, and leading
 * zeros survive a spreadsheet only as text.
 */

const column = id => String(id).replace(/[^a-z0-9]+/gi, '_').toLowerCase();

function flatten(person) {
  const row = {};
  const put = (key, value) => {
    if (value !== undefined && value !== null && value !== '') row[key] = String(value);
  };
  const { name, address, phone } = person;

  put('n', person.index + 1);
  put('gender', person.gender);
  put('first_name', name.first);
  put('middle_name', name.middle);
  put('last_name', name.last);
  put('second_surname', name.second);
  put('full_name', name.full);
  put('latin_name', name.latin?.full);
  put('kana_name', name.kana?.full);
  put('birth_date', person.birth.date);
  put('age', person.birth.age);
  put('birth_place', person.birth.place);

  put('address', address.line);
  put('street', address.street);
  put('building', address.building);
  put('apartment', address.apartment);
  put('district', address.district);
  put('city', address.city);
  put('region', address.region);
  put('postal_code', address.postalCode);
  put('address_latin', address.latin?.line);

  put('phone', phone.national);
  put('phone_international', phone.international);
  put('phone_e164', phone.e164);
  put('email', person.email);
  put('username', person.username);
  put('password', person.password);

  for (const doc of person.documents || []) {
    put(column(doc.id), doc.value);
    for (const detail of doc.details || []) put(`${column(doc.id)}_${column(detail.id)}`, detail.value);
  }

  if (person.card) {
    put('card_network', person.card.networkName);
    put('card_number', person.card.raw);
    put('card_expiry', person.card.expiry);
    put('card_cvv', person.card.cvv);
    put('card_holder', person.card.holder);
    put('card_bank', person.card.bank);
  }
  if (person.bank) {
    put('bank', person.bank.name);
    for (const field of person.bank.fields) put(`bank_${column(field.id)}`, field.raw ?? field.value);
  }
  if (person.company) {
    put('company', person.company.name);
    put('company_latin', person.company.nameLatin);
    for (const doc of person.company.documents) {
      put(`company_${column(doc.id)}`, doc.value);
      for (const detail of doc.details || []) put(`company_${column(doc.id)}_${column(detail.id)}`, detail.value);
    }
  }
  return row;
}

/** RFC 4180: quoted when it has to be, quotes doubled, lines ended with CRLF. */
const cell = value => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(report) {
  const rows = report.people.map(flatten);
  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); columns.push(key); }
    }
  }
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map(key => cell(row[key] ?? '')).join(','));
  return lines.join('\r\n') + '\r\n';
}
