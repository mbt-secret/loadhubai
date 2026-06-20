import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLoadMessage } from '../src/server/parser.mjs';

const baseDate = new Date('2026-06-16T09:00:00.000Z');

test('extracts RO-DE route, truck, tonnage, price and contact', () => {
  const result = parseLoadMessage('Cursa Arad - Germania, 24t prelata, incarcare 18.06, pret 1200 EUR, tel +40 722 111 222', {
    baseDate
  });

  assert.equal(result.loadCity, 'Arad');
  assert.equal(result.loadCountry, 'Romania');
  assert.equal(result.unloadCountry, 'Germania');
  assert.equal(result.truckType, 'Prelata');
  assert.equal(result.weightTons, 24);
  assert.equal(result.price, '1200 EUR');
  assert.equal(result.contact, '+40 722 111 222');
  assert.equal(result.loadDate, '2026-06-18');
  assert.ok(result.confidence >= 0.7);
});

test('extracts country-only RO-IT route', () => {
  const result = parseLoadMessage('Romania Italia prelata 24000 kg plata la descarcare', { baseDate });

  assert.equal(result.loadCountry, 'Romania');
  assert.equal(result.unloadCountry, 'Italia');
  assert.equal(result.truckType, 'Prelata');
  assert.equal(result.weightTons, 24);
});

test('extracts country-only RO-MD route', () => {
  const result = parseLoadMessage('Romania Moldova prelata 24t', { baseDate });

  assert.equal(result.loadCountry, 'Romania');
  assert.equal(result.unloadCountry, 'Moldova');
  assert.equal(result.truckType, 'Prelata');
  assert.equal(result.weightTons, 24);
});

test('extracts explicit UA-MD route from russian cargo fields', () => {
  const result = parseLoadMessage(
    'Груз Дата погр. - 18-06-2026 Место погр. - UA Sumy Место разгр. - MD Drumul de acces spre satul Boldurești-G94 Вес - 23.0 т / объем - 86.0 м3 Тип машины - Тент Компания - AMT EUROTRUCKS SRL Контактное лицо - Евгений AMT EUROTRUCKS SRL Номер тел. - +37368593504 https://cargo.md/loads#incarcare-view?e8ee96c4d5e44501a4804843894bd8ab',
    { baseDate }
  );

  assert.equal(result.loadCity, 'Sumy');
  assert.equal(result.loadCountry, 'Ucraina');
  assert.equal(result.unloadCountry, 'Moldova');
  assert.equal(result.truckType, 'Prelata');
  assert.equal(result.weightTons, 23);
  assert.equal(result.contact, '+37368593504');
  assert.ok(result.confidence >= 0.85);
});

test('extracts explicit RO-MD route from russian cargo fields with city codes', () => {
  const result = parseLoadMessage(
    'Груз Дата погр. - 16-06-2026 Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т / объем - 0 м3 Тип машины - Тент Тип загрузки - Полная (FTL) Фрахт - EUR Комментарий - Детал ... https://cargo.md/loads#incarcare-view?ef3254c541d74faaa5c005a4783c82c4',
    { baseDate }
  );

  assert.equal(result.loadCity, 'Brasov');
  assert.equal(result.loadCountry, 'Romania');
  assert.equal(result.unloadCity, 'Cahul');
  assert.equal(result.unloadCountry, 'Moldova');
  assert.equal(result.truckType, 'Prelata');
  assert.equal(result.weightTons, 23);
  assert.equal(result.loadDate, '2026-06-16');
});

test('extracts city after country code even when city is not in dictionary', () => {
  const result = parseLoadMessage('Место погр. - BY Minsk Место разгр. - MD Chișinău Вес - 22.0 т', { baseDate });

  assert.equal(result.loadCity, 'Minsk');
  assert.equal(result.loadCountry, 'Belarus');
  assert.equal(result.unloadCity, 'Chisinau');
  assert.equal(result.unloadCountry, 'Moldova');
});

test('extracts Georgia country and city from route text', () => {
  const result = parseLoadMessage('Loc incar. - RO Brasov Loc desc. - GE Tbilisi prelata 22t', { baseDate });

  assert.equal(result.loadCity, 'Brasov');
  assert.equal(result.loadCountry, 'Romania');
  assert.equal(result.unloadCity, 'Tbilisi');
  assert.equal(result.unloadCountry, 'Georgia');
});

test('extracts relative date and frigo truck', () => {
  const result = parseLoadMessage('Frigo Austria maine, descarcare Wien, contact Mihai', { baseDate });

  assert.equal(result.truckType, 'Frigo');
  assert.equal(result.loadDate, '2026-06-17');
  assert.equal(result.unloadCity, 'Wien');
  assert.equal(result.unloadCountry, 'Austria');
});

test('keeps incomplete messages with low confidence', () => {
  const result = parseLoadMessage('Disponibil dupa pranz, revenim cu detalii', { baseDate });

  assert.equal(result.loadCity, null);
  assert.equal(result.unloadCity, null);
  assert.ok(result.confidence < 0.25);
});
