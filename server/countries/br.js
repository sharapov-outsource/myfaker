/**
 * Brazil.
 *
 * A given name and two surnames. An address as the Correios print it: street
 * and number, the bairro, city and state, and a CEP that belongs to that city;
 * a mobile number with the ninth digit, under an area code that does not
 * exist, so that it rings nowhere. A CPF whose ninth
 * digit names the fiscal region of the state the person lives in, followed by
 * its two check digits; a PIS/PASEP number; in São Paulo state an RG with the
 * check digit SSP-SP uses; and for a business a CNPJ for its head office.
 */

import { pad, weightedSum } from '../parts.js';

const MALE = ('Miguel Arthur Gael Heitor Theo Davi Gabriel Bernardo Samuel João Pedro Lucas Matheus ' +
  'Rafael Gustavo Felipe Bruno Rodrigo Leonardo Thiago Diego Eduardo Marcelo Ricardo Fernando Carlos ' +
  'Paulo Antônio José Vinícius').split(' ');

const FEMALE = ('Helena|Alice|Laura|Maria Alice|Valentina|Heloísa|Maria Clara|Maria Cecília|Júlia|Sophia|' +
  'Ana|Beatriz|Mariana|Larissa|Camila|Amanda|Bruna|Letícia|Fernanda|Gabriela|Juliana|Patrícia|Aline|' +
  'Vanessa|Jéssica|Daniela|Carolina|Isabela|Luana|Rafaela').split('|');

const SURNAMES = ('Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gomes Costa Ribeiro ' +
  'Martins Carvalho Almeida Lopes Soares Fernandes Vieira Barbosa Rocha Dias Nascimento Andrade Moreira ' +
  'Nunes Marques Machado Mendes Freitas Cardoso Ramos Gonçalves Santana Teixeira Araújo Pinto Moura ' +
  'Cavalcanti Monteiro').split(' ');

/* fiscal — the CPF digit of the state's fiscal region. */
const CITIES = [
  { city: 'São Paulo', uf: 'SP', state: 'São Paulo', cep: [1000000, 5999999], fiscal: '8' },
  { city: 'Campinas', uf: 'SP', state: 'São Paulo', cep: [13000001, 13139999], fiscal: '8' },
  { city: 'Rio de Janeiro', uf: 'RJ', state: 'Rio de Janeiro', cep: [20000000, 23799999], fiscal: '7' },
  { city: 'Belo Horizonte', uf: 'MG', state: 'Minas Gerais', cep: [30000000, 31999999], fiscal: '6' },
  { city: 'Salvador', uf: 'BA', state: 'Bahia', cep: [40000000, 42599999], fiscal: '5' },
  { city: 'Fortaleza', uf: 'CE', state: 'Ceará', cep: [60000000, 61599999], fiscal: '3' },
  { city: 'Brasília', uf: 'DF', state: 'Distrito Federal', cep: [70000000, 72799999], fiscal: '1' },
  { city: 'Curitiba', uf: 'PR', state: 'Paraná', cep: [80000000, 82999999], fiscal: '9' },
  { city: 'Recife', uf: 'PE', state: 'Pernambuco', cep: [50000000, 52999999], fiscal: '4' },
  { city: 'Porto Alegre', uf: 'RS', state: 'Rio Grande do Sul', cep: [90000000, 91999999], fiscal: '0' },
  { city: 'Manaus', uf: 'AM', state: 'Amazonas', cep: [69000000, 69099999], fiscal: '2' },
  { city: 'Belém', uf: 'PA', state: 'Pará', cep: [66000000, 66999999], fiscal: '2' },
  { city: 'Goiânia', uf: 'GO', state: 'Goiás', cep: [74000000, 74899999], fiscal: '1' },
  { city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina', cep: [88000000, 88099999], fiscal: '9' },
];

const BAIRROS = ('Centro|Jardim América|Vila Nova|Boa Vista|Santa Mônica|Jardim das Flores|Vila Esperança|' +
  'Parque São Jorge|Bela Vista|Cidade Nova|Jardim Europa|Santo Antônio|São José|Planalto|Industrial').split('|');

const STREETS = ('Rua das Flores|Rua São João|Avenida Brasil|Rua Sete de Setembro|Rua Quinze de Novembro|' +
  'Rua Dom Pedro II|Rua Tiradentes|Rua Rui Barbosa|Rua Santos Dumont|Avenida Getúlio Vargas|' +
  'Rua Marechal Deodoro|Rua Duque de Caxias|Rua Castro Alves|Rua Bahia|Rua Amazonas|Avenida Independência|' +
  'Rua das Palmeiras|Rua dos Andradas|Rua Barão do Rio Branco|Rua Floriano Peixoto|Rua José Bonifácio').split('|');

const COMPANY_WORDS = 'Horizonte Aurora Atlântico Cruzeiro Estrela Progresso Primavera Bandeirantes Ipê Jequitibá Pioneira Serra'.split(' ');

const mod11 = (text, weights) => {
  const rest = weightedSum(text, weights) % 11;
  return String(rest < 2 ? 0 : 11 - rest);
};

/** CPF: nine digits, the ninth the fiscal region, then two check digits. */
export function cpf(nine) {
  const ten = nine + mod11(nine, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return ten + mod11(ten, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
}

/** CNPJ: the eight-digit root, the branch, and two check digits. */
export function cnpj(twelve) {
  const thirteen = twelve + mod11(twelve, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return thirteen + mod11(thirteen, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}

/** PIS/PASEP/NIT: ten digits and one check digit. */
export function pis(ten) {
  const check = 11 - (weightedSum(ten, [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11);
  return ten + String(check >= 10 ? 0 : check);
}

/** An RG of São Paulo: eight digits weighted 2 to 9, and X when the digit would be 10. */
export function rgSp(eight) {
  const check = 11 - (weightedSum(eight, [2, 3, 4, 5, 6, 7, 8, 9]) % 11);
  return eight + (check === 10 ? 'X' : check === 11 ? '0' : String(check));
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = `${r.pick(SURNAMES)} ${r.pick(SURNAMES)}`;
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const street = r.pick(STREETS);
  const building = String(r.int(1, 3500));
  const apartment = r.chance(0.4) ? `Apto ${r.int(1, 30)}${r.int(1, 8)}` : undefined;
  const district = r.pick(BAIRROS);
  const cep = pad(r.int(...place.cep), 8);
  const postalCode = `${cep.slice(0, 5)}-${cep.slice(5)}`;
  const lines = [
    `${street}, ${building}${apartment ? `, ${apartment}` : ''}`,
    district,
    `${place.city} - ${place.uf}`,
    postalCode,
  ];
  return {
    street, building, apartment, district, city: place.city, region: place.state, regionCode: place.uf,
    postalCode, lines, line: lines.join(', '),
  };
}

/*
 * Area codes Anatel has never assigned. A mobile number under one is written
 * exactly as a real one — (DDD) 9XXXX-XXXX — and reaches nobody; the price is
 * that its area code no longer matches the city.
 */
const UNASSIGNED_DDD = ['20', '23', '25', '26', '29', '30', '36', '39', '40', '50', '52', '56', '57', '58', '59', '60', '70', '72', '76', '78', '80'];

function phone(r) {
  const ddd = r.pick(UNASSIGNED_DDD);
  const rest = '9' + r.from('6789') + r.digits(7);
  const local = `${rest.slice(0, 5)}-${rest.slice(5)}`;
  return {
    national: `(${ddd}) ${local}`, international: `+55 ${ddd} ${local}`, e164: `+55${ddd}${rest}`,
    range: 'unallocated',
  };
}

function documents(r, p) {
  let eight;
  do { eight = r.digits(8); } while (/^(\d)\1+$/.test(eight));
  const c = cpf(eight + p.place.fiscal);
  const n = pis('1' + r.digits(9));
  const list = [
    { id: 'cpf', name: 'CPF', kind: 'tax', value: `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`, raw: c },
    { id: 'pis', name: 'PIS/PASEP', kind: 'social', value: `${n.slice(0, 3)}.${n.slice(3, 8)}.${n.slice(8, 10)}-${n.slice(10)}`, raw: n },
  ];
  if (p.place.uf === 'SP') {
    const rg = rgSp(String(r.int(10000000, 59999999)));
    list.push({ id: 'rg', name: 'RG', kind: 'id-card', value: `${rg.slice(0, 2)}.${rg.slice(2, 5)}.${rg.slice(5, 8)}-${rg.slice(8)}`, raw: rg });
  }
  return list;
}

function company(r) {
  const number = cnpj(r.digits(8) + '0001');
  return {
    name: r.weighted([[`${r.pick(COMPANY_WORDS)} Comércio Ltda.`, 3], [`${r.pick(SURNAMES)} & ${r.pick(SURNAMES)} Ltda.`, 2], [`${r.pick(COMPANY_WORDS)} S.A.`, 1]]),
    documents: [{
      id: 'cnpj', name: 'CNPJ', kind: 'company-reg',
      value: `${number.slice(0, 2)}.${number.slice(2, 5)}.${number.slice(5, 8)}/${number.slice(8, 12)}-${number.slice(12)}`,
      raw: number,
    }],
  };
}

export default {
  id: 'br',
  locale: 'pt-BR',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  cards: ['visa', 'mastercard', 'mastercard'],
  company,
};
