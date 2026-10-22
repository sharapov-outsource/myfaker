/**
 * India.
 *
 * Names in Latin letters, as forms there are filled in. An address with the
 * flat and building first and the six-digit PIN code of the city after the
 * city's name. An Aadhaar number with its Verhoeff check digit; a PAN whose
 * fourth letter says it belongs to a person and whose fifth is the initial of
 * the surname; an account with a real bank's IFSC; a RuPay card now and then;
 * and for a business a GSTIN that opens with the state's code, carries the
 * company's PAN and closes with its base-36 check character.
 */

import { verhoeffDigit } from '../parts.js';

const MALE = ('Aarav Vivaan Aditya Vihaan Arjun Sai Reyansh Ayaan Krishna Ishaan Rahul Amit Rajesh Suresh ' +
  'Vikram Sanjay Anil Rohit Manish Deepak Arun Karthik Pradeep Nikhil Varun Siddharth Harish Ravi Ajay Mohit').split(' ');

const FEMALE = ('Saanvi Aanya Aadhya Ananya Pari Diya Myra Sara Ira Priya Neha Pooja Anjali Sneha Divya ' +
  'Kavya Shreya Riya Meera Lakshmi Sunita Anita Kavita Rekha Deepa Nisha Swati Pallavi Aishwarya Ishita').split(' ');

const SURNAMES = ('Sharma Verma Gupta Singh Kumar Patel Shah Mehta Joshi Mishra Reddy Rao Nair Iyer Menon ' +
  'Pillai Das Banerjee Chatterjee Mukherjee Bose Ghosh Sen Kapoor Malhotra Khanna Chopra Agarwal Jain ' +
  'Desai Kulkarni Patil Pandey Tiwari Yadav Chauhan Thakur Naidu Saxena Bhat').split(' ');

/* gst — the state's code, which opens a GSTIN; cin — its letters in a company number. */
const CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', pin: [400001, 400104], gst: '27', cin: 'MH' },
  { city: 'Pune', state: 'Maharashtra', pin: [411001, 411062], gst: '27', cin: 'MH' },
  { city: 'New Delhi', state: 'Delhi', pin: [110001, 110096], gst: '07', cin: 'DL' },
  { city: 'Bengaluru', state: 'Karnataka', pin: [560001, 560103], gst: '29', cin: 'KA' },
  { city: 'Chennai', state: 'Tamil Nadu', pin: [600001, 600127], gst: '33', cin: 'TN' },
  { city: 'Kolkata', state: 'West Bengal', pin: [700001, 700160], gst: '19', cin: 'WB' },
  { city: 'Hyderabad', state: 'Telangana', pin: [500001, 500098], gst: '36', cin: 'TG' },
  { city: 'Ahmedabad', state: 'Gujarat', pin: [380001, 380061], gst: '24', cin: 'GJ' },
  { city: 'Jaipur', state: 'Rajasthan', pin: [302001, 302039], gst: '08', cin: 'RJ' },
  { city: 'Lucknow', state: 'Uttar Pradesh', pin: [226001, 226031], gst: '09', cin: 'UP' },
  { city: 'Kochi', state: 'Kerala', pin: [682001, 682041], gst: '32', cin: 'KL' },
  { city: 'Chandigarh', state: 'Chandigarh', pin: [160001, 160036], gst: '04', cin: 'CH' },
];

const BUILDINGS = 'Shanti|Sai Krupa|Sunrise|Green Valley|Lake View|Royal Palm|Krishna|Ganga|Silver Oak|Palm Grove|Sagar|Kailash'.split('|');
const BUILDING_TYPES = ['Apartments', 'Residency', 'Heights', 'Towers', 'Enclave'];
const ROADS = ('MG Road|Station Road|Park Street|Nehru Road|Link Road|Ring Road|Church Street|Temple Road|' +
  'Main Road|College Road|Market Road|Lake Road|Hill Road|Gandhi Road|Netaji Subhash Marg').split('|');

/* IFSC: four letters for the bank, a 0, six characters for the branch. */
const BANKS = [
  { name: 'State Bank of India', ifsc: 'SBIN', digits: 11 },
  { name: 'HDFC Bank', ifsc: 'HDFC', digits: 14 },
  { name: 'ICICI Bank', ifsc: 'ICIC', digits: 12 },
  { name: 'Axis Bank', ifsc: 'UTIB', digits: 15 },
  { name: 'Kotak Mahindra Bank', ifsc: 'KKBK', digits: 10 },
  { name: 'Punjab National Bank', ifsc: 'PUNB', digits: 16 },
];

const COMPANY_WORDS = 'Infotech|Solutions|Enterprises|Industries|Traders|Technologies|Exports|Foods|Textiles|Logistics'.split('|');

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Aadhaar: eleven digits that do not start with 0 or 1, and the Verhoeff digit. */
export const aadhaar = eleven => eleven + verhoeffDigit(eleven);

/**
 * PAN: three letters, the holder's category (P for a person, C for a
 * company), the initial of the surname or name, four digits and a letter.
 */
export const pan = (r, category, initial) =>
  r.from(UPPER, 3) + category + initial.toUpperCase() + r.digits(4) + r.from(UPPER);

const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The last character of a GSTIN: a Luhn-style sum in base 36. */
export function gstinCheck(fourteen) {
  let sum = 0;
  [...fourteen].forEach((ch, i) => {
    const product = BASE36.indexOf(ch) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  });
  return BASE36[(36 - (sum % 36)) % 36];
}

function name(r, gender) {
  const first = r.pick(gender === 'female' ? FEMALE : MALE);
  const last = r.pick(SURNAMES);
  return { first, last, full: `${first} ${last}` };
}

function address(r, place) {
  const apartment = String(r.int(1, 16) * 100 + r.int(1, 8));
  const building = `${r.pick(BUILDINGS)} ${r.pick(BUILDING_TYPES)}`;
  const street = r.pick(ROADS);
  const postalCode = String(r.int(...place.pin));
  const lines = [`Flat ${apartment}, ${building}`, street, `${place.city} - ${postalCode}`, place.state];
  return {
    street, building, apartment, city: place.city, region: place.state, postalCode,
    lines, line: `Flat ${apartment}, ${building}, ${street}, ${place.city}, ${place.state} ${postalCode}`,
  };
}

/*
 * India keeps no block for fiction, and every mobile series a number could
 * open with is in service: a number written as an Indian mobile may belong to
 * somebody, and the report says so. These openings are mobile whatever follows.
 */
const MOBILE = ['70', '72', '74', '84', '85', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];

function phone(r) {
  const number = r.pick(MOBILE) + r.digits(8);
  const spaced = `${number.slice(0, 5)} ${number.slice(5)}`;
  return { national: `0${spaced}`, international: `+91 ${spaced}`, e164: `+91${number}`, range: 'in-service' };
}

function documents(r, p) {
  let eleven;
  do { eleven = String(r.int(2, 9)) + r.digits(10); } while (eleven === [...eleven].reverse().join(''));
  const number = aadhaar(eleven);
  return [
    { id: 'aadhaar', name: 'Aadhaar', kind: 'national-id', value: `${number.slice(0, 4)} ${number.slice(4, 8)} ${number.slice(8)}`, raw: number },
    { id: 'pan', name: 'PAN', kind: 'tax', value: pan(r, 'P', p.name.last[0]) },
  ];
}

function bank(r) {
  const chosen = r.pick(BANKS);
  return {
    name: chosen.name,
    fields: [
      { id: 'account', name: 'Account number', value: String(r.int(1, 9)) + r.digits(chosen.digits - 1) },
      { id: 'ifsc', name: 'IFSC', value: `${chosen.ifsc}0${r.digits(6)}` },
    ],
  };
}

function company(r, p) {
  const word = r.pick(COMPANY_WORDS);
  const owner = r.pick(SURNAMES);
  const companyPan = pan(r, 'C', owner[0]);
  const fourteen = p.place.gst + companyPan + r.int(1, 9) + 'Z';
  const year = r.int(1995, p.today.getUTCFullYear() - 1);
  return {
    name: `${owner} ${word} Private Limited`,
    documents: [
      { id: 'gstin', name: 'GSTIN', kind: 'vat', value: fourteen + gstinCheck(fourteen) },
      { id: 'pan', name: 'PAN', kind: 'tax', value: companyPan },
      { id: 'cin', name: 'CIN', kind: 'company-reg', value: `U${r.digits(5)}${p.place.cin}${year}PTC${r.digits(6)}` },
    ],
  };
}

export default {
  id: 'in',
  locale: 'en-IN',
  dateFormat: 'DD/MM/YYYY',
  place: r => r.pick(CITIES),
  name,
  address,
  phone,
  documents,
  bank,
  cards: ['rupay', 'rupay', 'visa', 'mastercard'],
  company,
};
