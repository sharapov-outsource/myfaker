/**
 * France.
 *
 * An address laid out as the AFNOR standard and La Poste want it: the flat on a
 * line of its own, the town in capitals without accents after the postcode,
 * and in Paris, Marseille and Lyon a postcode that names the arrondissement.
 * The social security number (NIR) is the person written down — sex, year and
 * month of birth, the département and commune they were born in — closed by
 * its key; the tax number carries its own check. Mobile numbers come from
 * 06 39 98, the block ARCEP keeps for fiction: they reach nobody, and
 * libphonenumber, which knows that, refuses them. An IBAN whose RIB key is right
 * as well as its IBAN check, and for a business a SIREN, a SIRET and a VAT
 * number that agree with each other.
 */

import { pad, luhnDigit, ascii, iban, ibanFields } from '../parts.js';

const MALE = ('Gabriel Louis Raphaël Jules Adam Lucas Léo Hugo Arthur Nathan Thomas Nicolas Julien ' +
  'Pierre Antoine Alexandre Maxime Mathieu Romain Guillaume Philippe Laurent Christophe Olivier ' +
  'Sébastien Frédéric Jean Michel François Éric').split(' ');

const FEMALE = ('Emma Jade Louise Alice Chloé Lina Léa Manon Camille Inès Sarah Julie Marie Laura ' +
  'Pauline Mathilde Claire Charlotte Céline Sophie Isabelle Nathalie Sandrine Valérie Stéphanie ' +
  'Aurélie Émilie Catherine Anne Hélène').split(' ');

const SURNAMES = ('Martin Bernard Thomas Petit Robert Richard Durand Dubois Moreau Laurent Simon ' +
  'Michel Lefebvre Leroy Roux David Bertrand Morel Fournier Girard Bonnet Dupont Lambert Fontaine ' +
  'Rousseau Vincent Muller Lefèvre Faure André Mercier Blanc Guérin Boyer Garnier Chevalier ' +
  'François Legrand Gauthier Garcia Perrin Robin Clément Morin Nicolas Henry Roussel Mathieu Masson').split(' ');

/*
 * dept and commune are the INSEE codes a NIR is written with. Paris, Marseille
 * and Lyon are written by arrondissement, both in the NIR and in the postcode,
 * so for them `arrondissements` gives the count and `postal` and `commune`
 * the base each is added to.
 */
const CITIES = [
  { city: 'Paris', region: 'Île-de-France', dept: '75', arrondissements: 20, postal: 75000, commune: 100 },
  { city: 'Marseille', region: "Provence-Alpes-Côte d'Azur", dept: '13', arrondissements: 16, postal: 13000, commune: 200 },
  { city: 'Lyon', region: 'Auvergne-Rhône-Alpes', dept: '69', arrondissements: 9, postal: 69000, commune: 380 },
  { city: 'Toulouse', region: 'Occitanie', dept: '31', commune: 555, codes: ['31000', '31100', '31200', '31300', '31400', '31500'] },
  { city: 'Nice', region: "Provence-Alpes-Côte d'Azur", dept: '06', commune: 88, codes: ['06000', '06100', '06200', '06300'] },
  { city: 'Nantes', region: 'Pays de la Loire', dept: '44', commune: 109, codes: ['44000', '44100', '44200', '44300'] },
  { city: 'Strasbourg', region: 'Grand Est', dept: '67', commune: 482, codes: ['67000', '67100', '67200'] },
  { city: 'Montpellier', region: 'Occitanie', dept: '34', commune: 172, codes: ['34000', '34070', '34080', '34090'] },
  { city: 'Bordeaux', region: 'Nouvelle-Aquitaine', dept: '33', commune: 63, codes: ['33000', '33100', '33200', '33300', '33800'] },
  { city: 'Lille', region: 'Hauts-de-France', dept: '59', commune: 350, codes: ['59000', '59160', '59260', '59800'] },
  { city: 'Rennes', region: 'Bretagne', dept: '35', commune: 238, codes: ['35000', '35200', '35700'] },
  { city: 'Reims', region: 'Grand Est', dept: '51', commune: 454, codes: ['51100'] },
];

const STREETS = ("rue de la Paix|rue Victor Hugo|rue de la République|avenue Jean Jaurès|rue Pasteur|" +
  "boulevard Gambetta|rue du Général de Gaulle|place de la Mairie|rue des Écoles|rue de l'Église|" +
  "avenue de la Gare|rue Jules Ferry|rue Voltaire|rue Émile Zola|avenue Foch|rue Nationale|" +
  "rue du Moulin|chemin des Vignes|allée des Tilleuls|impasse des Lilas|boulevard Victor Hugo|rue Saint-Michel")
  .split('|');

const BANKS = [
  { name: 'BNP Paribas', code: '30004', bic: 'BNPAFRPPXXX' },
  { name: 'Société Générale', code: '30003', bic: 'SOGEFRPPXXX' },
  { name: 'LCL', code: '30002', bic: 'CRLYFRPPXXX' },
  { name: 'La Banque Postale', code: '20041', bic: 'PSSTFRPPXXX' },
  { name: 'CIC', code: '30066', bic: 'CMCIFRPPXXX' },
];

const COMPANY_WORDS = 'Lumière Horizon Azur Provence Atlantique Belvédère Rivage Étoile Hexagone Lavande Mistral Océane'.split(' ');

/** The two-digit key that closes a NIR: 97 minus the first thirteen digits modulo 97. */
export function nirKey(thirteen) {
  return pad(97 - Number(BigInt(thirteen) % 97n), 2);
}

/** The numéro fiscal: its last three digits are the first ten modulo 511. */
export const taxNumber = ten => ten + pad(Number(BigInt(ten) % 511n), 3);

/** The RIB key, which a French IBAN carries inside it. */
export function ribKey(bank, branch, account) {
  const rest = (89 * Number(bank) + 15 * Number(branch) + 3 * Number(account)) % 97;
  return pad(97 - rest, 2);
}

export function siren(eight) {
  return eight + luhnDigit(eight);
}

/** The VAT number is the SIREN with a key worked out from it. */
export const tvaKey = sirenNumber => pad((12 + 3 * (Number(sirenNumber) % 97)) % 97, 2);

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

/** The postcode and, for the three cities written by arrondissement, which one. */
function district(r, place) {
  if (place.arrondissements) {
    const n = r.int(1, place.arrondissements);
    return { postalCode: String(place.postal + n).padStart(5, '0'), commune: place.commune + n };
  }
  return { postalCode: r.pick(place.codes), commune: place.commune };
}

function address(r, place) {
  const { postalCode } = district(r, place);
  const street = r.pick(STREETS);
  const building = String(r.int(1, 120)) + (r.chance(0.08) ? r.pick([' bis', ' ter']) : '');
  const apartment = r.chance(0.5) ? String(r.int(1, 60)) : undefined;
  const lines = [
    apartment ? `Appartement ${apartment}` : null,
    `${building} ${street}`,
    `${postalCode} ${ascii(place.city).toUpperCase()}`,
  ].filter(Boolean);
  return { street, building, apartment, city: place.city, region: place.region, postalCode, lines, line: lines.join(', ') };
}

function phone(r) {
  const rest = r.digits(4);
  const tail = `${rest.slice(0, 2)} ${rest.slice(2)}`;
  return {
    national: `06 39 98 ${tail}`,
    international: `+33 6 39 98 ${tail}`,
    e164: `+3363998${rest}`,
    range: 'fiction',
  };
}

function documents(r, p) {
  const born = district(r, p.birthPlace);
  const thirteen = (p.gender === 'female' ? '2' : '1') + String(p.birth.getUTCFullYear()).slice(2) +
    pad(p.birth.getUTCMonth() + 1, 2) + p.birthPlace.dept + pad(born.commune, 3) + pad(r.int(1, 999), 3);
  const nir = thirteen + nirKey(thirteen);
  const fiscal = taxNumber(String(r.int(0, 3)) + r.digits(9));
  return [
    {
      id: 'nir', name: 'Numéro de sécurité sociale', kind: 'social',
      value: `${nir[0]} ${nir.slice(1, 3)} ${nir.slice(3, 5)} ${nir.slice(5, 7)} ${nir.slice(7, 10)} ${nir.slice(10, 13)} ${nir.slice(13)}`,
      raw: nir,
    },
    {
      id: 'nif', name: 'Numéro fiscal', kind: 'tax',
      value: `${fiscal.slice(0, 2)} ${fiscal.slice(2, 4)} ${fiscal.slice(4, 7)} ${fiscal.slice(7, 10)} ${fiscal.slice(10)}`,
      raw: fiscal,
    },
  ];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  const branch = r.digits(5);
  const account = r.digits(11);
  const value = iban('FR', chosen.code + branch + account + ribKey(chosen.code, branch, account));
  return { name: chosen.name, fields: ibanFields(value, chosen.bic) };
}

function company(r) {
  const number = siren(String(r.int(3, 9)) + r.digits(7));
  const nic = pad(r.int(1, 999), 4);
  const siret = number + nic + luhnDigit(number + nic);
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} SAS`, 3], [`${r.pick(SURNAMES)} et Fils SARL`, 2], [`Cabinet ${r.pick(SURNAMES)} & Associés`, 1]]),
    documents: [
      { id: 'siren', name: 'SIREN', kind: 'company-reg', value: `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`, raw: number },
      { id: 'siret', name: 'SIRET', kind: 'company-reg', value: `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)} ${siret.slice(9)}`, raw: siret },
      { id: 'tva', name: 'N° TVA intracommunautaire', kind: 'vat', value: `FR${tvaKey(number)}${number}` },
    ],
  };
}

export default {
  id: 'fr',
  locale: 'fr-FR',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['visa', 'visa', 'mastercard'],
  company,
};
