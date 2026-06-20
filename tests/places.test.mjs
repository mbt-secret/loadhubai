import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openDatabase } from '../src/server/db.mjs';
import { insertPlacesBulk, listPlaceEntriesForParser, searchPlaces } from '../src/server/places.mjs';
import { parseLoadMessage, setPlaceEntries } from '../src/server/parser.mjs';
import { parseSearchQuery, savedSearchMatchesLoad, searchLoads } from '../src/server/search.mjs';

function tempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'loadhub-places-'));
  const db = openDatabase(join(dir, 'test.sqlite'));
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

const fixturePlaces = [
  { geonameId: 1, name: 'Brasov', asciiName: 'Brasov', countryCode: 'RO', countryName: 'Romania', lat: 45.65, lon: 25.6, population: 253200, aliases: ['Brașov'] },
  { geonameId: 2, name: 'Cahul', asciiName: 'Cahul', countryCode: 'MD', countryName: 'Moldova', lat: 45.9, lon: 28.19, population: 30000, aliases: [] },
  { geonameId: 3, name: 'Chisinau', asciiName: 'Chisinau', countryCode: 'MD', countryName: 'Moldova', lat: 47.01, lon: 28.86, population: 635994, aliases: ['Chișinău'] },
  { geonameId: 4, name: 'Tbilisi', asciiName: 'Tbilisi', countryCode: 'GE', countryName: 'Georgia', lat: 41.69, lon: 44.83, population: 1049498, aliases: [] },
  { geonameId: 5, name: 'Istanbul', asciiName: 'Istanbul', countryCode: 'TR', countryName: 'Turcia', lat: 41.01, lon: 28.95, population: 14804116, aliases: [] },
  { geonameId: 6, name: 'Kyiv', asciiName: 'Kyiv', countryCode: 'UA', countryName: 'Ucraina', lat: 50.45, lon: 30.52, population: 2797553, aliases: ['Kiev'] },
  { geonameId: 7, name: 'Munchen', asciiName: 'Munchen', countryCode: 'DE', countryName: 'Germania', lat: 48.14, lon: 11.58, population: 1260391, aliases: ['Munich', 'Muenchen'] },
  { geonameId: 8, name: 'Fundu Moldovei', asciiName: 'Fundu Moldovei', countryCode: 'RO', countryName: 'Romania', lat: 47.53, lon: 25.4, population: 3800, aliases: [] }
];

test('places search returns local cities by aliases', () => {
  const { db, cleanup } = tempDb();
  try {
    insertPlacesBulk(db, fixturePlaces, { clearSource: null });

    assert.equal(searchPlaces(db, { q: 'Munich', type: 'city' })[0].label, 'Munchen');
    assert.equal(searchPlaces(db, { q: 'Chisinau', type: 'city' })[0].countryName, 'Moldova');
    assert.equal(searchPlaces(db, { q: 'Germania', type: 'country' })[0].label, 'Germania');
  } finally {
    cleanup();
  }
});

test('parser uses place database entries and keeps unknown explicit cities unverified', () => {
  const { db, cleanup } = tempDb();
  try {
    insertPlacesBulk(db, fixturePlaces, { clearSource: null });
    setPlaceEntries(listPlaceEntriesForParser(db));

    const parsed = parseLoadMessage('Груз Дата погр. - 16-06-2026 Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т Тип машины - Тент');
    assert.equal(parsed.loadCity, 'Brasov');
    assert.equal(parsed.loadCountry, 'Romania');
    assert.equal(parsed.unloadCity, 'Cahul');
    assert.equal(parsed.unloadCountry, 'Moldova');
    assert.equal(parsed.loadCityVerified, true);
    assert.equal(parsed.unloadCityVerified, true);
    assert.equal(parsed.weightTons, 23);
    assert.equal(parsed.truckType, 'Prelata');

    const unknown = parseLoadMessage('Место погр. - RO SatNecunoscut Место разгр. - MD Cahul');
    assert.equal(unknown.loadCity, 'Satnecunoscut');
    assert.equal(unknown.loadCountry, 'Romania');
    assert.equal(unknown.loadCityVerified, false);
    assert.equal(unknown.unloadCityVerified, true);
  } finally {
    setPlaceEntries([]);
    cleanup();
  }
});

test('search stays strict for route countries and city aliases', () => {
  const { db, cleanup } = tempDb();
  try {
    insertPlacesBulk(db, fixturePlaces, { clearSource: null });
    setPlaceEntries(listPlaceEntriesForParser(db));

    const loads = [
      {
        id: 1,
        loadCity: 'Brasov',
        loadCountry: 'Romania',
        unloadCity: 'Cahul',
        unloadCountry: 'Moldova',
        truckType: 'Prelata',
        weightTons: 23,
        price: null,
        groupName: 'Test',
        originalText: 'RO Brasov -> MD Cahul',
        translatedText: null,
        aiSummary: null,
        capturedAt: '2026-06-17T10:00:00.000Z'
      },
      {
        id: 2,
        loadCity: 'Brasov',
        loadCountry: 'Romania',
        unloadCity: 'Tbilisi',
        unloadCountry: 'Georgia',
        truckType: 'Prelata',
        weightTons: 24,
        price: null,
        groupName: 'Test',
        originalText: 'RO Brasov -> GE Tbilisi',
        translatedText: null,
        aiSummary: null,
        capturedAt: '2026-06-17T09:00:00.000Z'
      }
    ];

    assert.deepEqual(searchLoads(loads, 'Romania Moldova').map((load) => load.id), [1]);
    assert.deepEqual(parseSearchQuery('din romania catre Moldova').locations.map((location) => location.label), ['Romania', 'Moldova']);
    assert.equal(savedSearchMatchesLoad(loads[0], { query: 'din romania catre Moldova', notificationsEnabled: true }), true);
    assert.deepEqual(searchLoads(loads, 'Brasov Cahul').map((load) => load.id), [1]);
    assert.deepEqual(searchLoads(loads, 'Romania Georgia').map((load) => load.id), [2]);
    assert.deepEqual(searchLoads(loads, 'Kyiv Moldova').map((load) => load.id), []);
  } finally {
    setPlaceEntries([]);
    cleanup();
  }
});
