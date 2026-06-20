import assert from 'node:assert/strict';
import test from 'node:test';
import { filterLoadsByMessageAge, searchLoads, searchLoadsStructured } from '../src/server/search.mjs';

const loads = [
  {
    id: 1,
    loadCity: 'Arad',
    unloadCity: null,
    loadCountry: 'Romania',
    unloadCountry: 'Germania',
    truckType: 'Prelata',
    weightTons: 24,
    price: '1200 EUR',
    groupName: 'Curse Germania',
    originalText: 'Arad Germania 24t prelata',
    capturedAt: '2026-06-16T08:00:00.000Z',
    loadDate: '2026-06-18'
  },
  {
    id: 2,
    loadCity: 'Bucuresti',
    unloadCity: 'Milano',
    loadCountry: 'Romania',
    unloadCountry: 'Italia',
    truckType: 'Prelata',
    weightTons: 22,
    price: '900 EUR',
    groupName: 'Italia transport',
    originalText: 'Bucuresti Milano prelata',
    capturedAt: '2026-06-16T07:00:00.000Z',
    loadDate: '2026-06-20'
  },
  {
    id: 3,
    loadCity: null,
    unloadCity: 'Wien',
    loadCountry: null,
    unloadCountry: 'Austria',
    truckType: 'Frigo',
    weightTons: null,
    price: null,
    groupName: 'Frigo EU',
    originalText: 'Frigo Austria maine',
    capturedAt: '2026-06-16T09:00:00.000Z',
    loadDate: '2026-06-17'
  },
  {
    id: 4,
    loadCity: null,
    unloadCity: null,
    loadCountry: 'Romania',
    unloadCountry: 'Moldova',
    truckType: 'Prelata',
    weightTons: 24,
    price: '700 EUR',
    groupName: 'Curse Moldova',
    originalText: 'Romania Moldova prelata 24t',
    capturedAt: '2026-06-16T10:00:00.000Z',
    loadDate: '2026-06-19'
  },
  {
    id: 5,
    loadCity: null,
    unloadCity: null,
    loadCountry: 'Bulgaria',
    unloadCountry: 'Romania',
    truckType: 'Prelata',
    weightTons: 24,
    price: '800 EUR',
    groupName: 'Balkan',
    originalText: 'Bulgaria Romania prelata 24t',
    capturedAt: '2026-06-16T11:00:00.000Z',
    loadDate: '2026-06-19'
  },
  {
    id: 6,
    loadCity: null,
    unloadCity: null,
    loadCountry: 'Romania',
    unloadCountry: 'Italia',
    truckType: 'Prelata',
    weightTons: 24,
    price: '900 EUR',
    groupName: 'Bursa Moldova',
    originalText: 'Romania Italia prelata 24t',
    capturedAt: '2026-06-16T12:00:00.000Z',
    loadDate: '2026-06-19'
  },
  {
    id: 7,
    loadCity: null,
    unloadCity: null,
    loadCountry: null,
    unloadCountry: null,
    truckType: 'Prelata',
    weightTons: 24,
    price: '600 EUR',
    groupName: 'CARGO.MD',
    originalText: 'Loc incar. - MD Edinet Loc desc. - RO Botosani prelata 24t https://cargo.md/loads',
    capturedAt: '2026-06-16T13:00:00.000Z',
    loadDate: '2026-06-19'
  },
  {
    id: 8,
    loadCity: null,
    unloadCity: 'Oradea',
    loadCountry: 'Romania',
    unloadCountry: 'Romania',
    truckType: 'Prelata',
    weightTons: 24,
    price: '650 EUR',
    groupName: 'CARGO.MD',
    originalText: 'Loc incar. - RO Oradea Loc desc. - MD Orhei prelata 24t',
    capturedAt: '2026-06-16T14:00:00.000Z',
    loadDate: '2026-06-19'
  },
  {
    id: 9,
    loadCity: null,
    unloadCity: null,
    loadCountry: 'Romania',
    unloadCountry: null,
    truckType: null,
    weightTons: 23,
    price: null,
    groupName: 'CARGO.MD',
    originalText: 'Loc incar. - MD Edinet Loc desc. - RO Botosani 23t https://cargo.md/loads',
    translatedText: 'Loc incar. - MD Edinet Loc desc. - RO Botosani 23t https://cargo.md/loads',
    aiSummary: 'Romania · 23t · incarcare 2026-06-17.',
    capturedAt: '2026-06-16T15:00:00.000Z',
    loadDate: '2026-06-17'
  },
  {
    id: 10,
    loadCity: null,
    unloadCity: null,
    loadCountry: null,
    unloadCountry: null,
    truckType: 'Prelata',
    weightTons: 23,
    price: null,
    groupName: 'CARGO.MD',
    originalText:
      'Груз Дата погр. - 18-06-2026 Место погр. - UA Sumy Место разгр. - MD Drumul de acces spre satul Boldurești-G94 Вес - 23.0 т Тип машины - Тент',
    capturedAt: '2026-06-16T16:00:00.000Z',
    loadDate: '2026-06-18'
  },
  {
    id: 12,
    loadCity: 'Brasov',
    unloadCity: 'Tbilisi',
    loadCountry: 'Romania',
    unloadCountry: 'Georgia',
    truckType: 'Prelata',
    weightTons: 22,
    price: null,
    groupName: 'Caucaz transport',
    originalText: 'Loc incar. - RO Brasov Loc desc. - GE Tbilisi prelata 22t',
    capturedAt: '2026-06-16T18:00:00.000Z',
    loadDate: '2026-06-21'
  }
];

const baseDate = new Date('2026-06-16T09:00:00.000Z');

test('filters loads by captured message age windows', () => {
  const now = new Date('2026-06-16T12:00:00.000Z');
  const recencyLoads = [
    { id: 'invalid', capturedAt: 'not-a-date' },
    { id: '9m', capturedAt: '2026-06-16T11:51:00.000Z' },
    { id: '10m', capturedAt: '2026-06-16T11:50:00.000Z' },
    { id: '30m', capturedAt: '2026-06-16T11:30:00.000Z' },
    { id: '2h', capturedAt: '2026-06-16T10:00:00.000Z' },
    { id: '20h', capturedAt: '2026-06-15T16:00:00.000Z' },
    { id: '26h', capturedAt: '2026-06-15T10:00:00.000Z' }
  ];

  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, '10m', now).map((load) => load.id), ['9m', '10m']);
  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, '1h', now).map((load) => load.id), ['9m', '10m', '30m']);
  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, '5h', now).map((load) => load.id), ['9m', '10m', '30m', '2h']);
  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, '1d', now).map((load) => load.id), ['9m', '10m', '30m', '2h', '20h']);
  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, 'Oricand', now).map((load) => load.id), recencyLoads.map((load) => load.id));
  assert.deepEqual(filterLoadsByMessageAge(recencyLoads, 'unknown', now).map((load) => load.id), recencyLoads.map((load) => load.id));
});

test('message age filter composes with text search', () => {
  const recent = filterLoadsByMessageAge(loads, '1h', new Date('2026-06-16T12:30:00.000Z'));
  const results = searchLoads(recent, 'Romania Italia prelata', { baseDate });

  assert.deepEqual(results.map((load) => load.id), [6]);
});

test('matches natural query with city, country and tonnage', () => {
  const results = searchLoads(loads, 'Arad Germania 24t', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [1]);
});

test('matches country and truck type query', () => {
  const results = searchLoads(loads, 'Romania Italia prelata', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [6, 2]);
});

test('requires both countries in a route query', () => {
  const results = searchLoads(loads, 'Romania Moldova', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [4, 8]);
  const fallbackResult = results.find((load) => load.id === 8);
  assert.equal(fallbackResult.loadCountry, 'Romania');
  assert.equal(fallbackResult.unloadCountry, 'Moldova');
});

test('matches origin-only query against loading side', () => {
  const results = searchLoads(loads, 'din Romania', { baseDate });
  assert.ok(results.some((load) => load.id === 4));
  assert.equal(results.some((load) => load.id === 5), false);
});

test('matches country names against route country codes in message text', () => {
  const results = searchLoads(loads, 'Ucraina Moldova', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [10]);
  assert.equal(results[0].loadCountry, 'Ucraina');
  assert.equal(results[0].unloadCountry, 'Moldova');
});

test('matches Romania Georgia as a strict two-country route', () => {
  const results = searchLoads(loads, 'Romania Georgia', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [12]);
  assert.equal(results[0].loadCountry, 'Romania');
  assert.equal(results[0].unloadCountry, 'Georgia');
});

test('does not treat the Romanian word de as Germany country code', () => {
  const moldovaLoad = {
    id: 13,
    loadCity: 'Ramnicu Valcea',
    unloadCity: 'Chisinau',
    loadCountry: 'Romania',
    unloadCountry: 'Moldova',
    truckType: 'Prelata',
    weightTons: 13,
    price: null,
    groupName: 'GeoTrans.md',
    originalText: 'Ramnicu Valcea, Romania -> Chisinau, Moldova. Loc de incarcare azi.',
    capturedAt: '2026-06-16T19:00:00.000Z',
    loadDate: '2026-06-18'
  };

  assert.deepEqual(searchLoads([moldovaLoad], 'Romania Germania', { baseDate }), []);

  const moldovaResults = searchLoads([moldovaLoad], 'Romania Moldova', { baseDate });
  assert.deepEqual(moldovaResults.map((load) => load.id), [13]);
  assert.equal(moldovaResults[0].unloadCountry, 'Moldova');
});

test('structured search treats loading as origin and unloading as destination', () => {
  const badSavedGermany = {
    id: 14,
    loadCity: 'Ramnicu Valcea',
    unloadCity: 'Chisinau',
    loadCountry: 'Romania',
    unloadCountry: 'Germania',
    truckType: 'Prelata',
    weightTons: 13,
    price: null,
    groupName: 'GeoTrans.md',
    originalText: 'Ramnicu Valcea, Romania -> Chisinau, Moldova. Loc de incarcare azi.',
    capturedAt: '2026-06-16T19:00:00.000Z',
    loadDate: '2026-06-18'
  };
  const realGermany = {
    id: 15,
    loadCity: 'Arad',
    unloadCity: 'Munchen',
    loadCountry: 'Romania',
    unloadCountry: 'Germania',
    truckType: 'Prelata',
    weightTons: 24,
    price: null,
    groupName: 'Curse Germania',
    originalText: 'Arad, Romania -> Munchen, Germania 24t prelata',
    capturedAt: '2026-06-16T20:00:00.000Z',
    loadDate: '2026-06-18'
  };

  const results = searchLoadsStructured([badSavedGermany, realGermany], {
    origin: 'Romania',
    destination: 'Germania',
    destinationType: 'country'
  });

  assert.deepEqual(results.map((load) => load.id), [15]);
});

test('structured search can filter only by loading side when destination is all', () => {
  const results = searchLoadsStructured(loads, {
    origin: 'Romania',
    destination: '',
    destinationType: 'all'
  });

  assert.ok(results.some((load) => load.id === 1));
  assert.equal(results.some((load) => load.loadCountry === 'Ucraina'), false);
});

test('structured fallback from original text cannot replace a known loading country', () => {
  const multiRouteTurkeyRomania = {
    id: 16,
    loadCity: 'Bolu',
    unloadCity: 'Buftea',
    loadCountry: 'Turcia',
    unloadCountry: 'Romania',
    truckType: null,
    weightTons: null,
    price: '1800 euro',
    groupName: 'GeoTrans.md',
    originalText:
      'BOLU BUFTEA RO -6 tir // 1800 euro ISTANBUL TARGU-MURES RO -1 tir // 1900 euro TEKIRDAG CALARASI RO -2 tir // 1550 euro',
    capturedAt: '2026-06-16T21:00:00.000Z',
    loadDate: '2026-06-18'
  };

  const results = searchLoadsStructured([multiRouteTurkeyRomania], {
    origin: 'Romania',
    destination: 'Moldova',
    destinationType: 'country'
  });

  assert.deepEqual(results, []);
});

test('does not broaden known filters when a free token is unmatched', () => {
  const results = searchLoads(loads, 'Romania Atlantida', { baseDate });
  assert.deepEqual(results, []);
});

test('overlays corrected route from original text for old bad saved route', () => {
  const oldBadSavedLoad = [
    {
      id: 11,
      loadCity: null,
      unloadCity: 'Brasov',
      loadCountry: 'Romania',
      unloadCountry: 'Romania',
      truckType: null,
      weightTons: 23,
      price: null,
      groupName: 'CARGO.MD',
      originalText:
        'Груз Дата погр. - 16-06-2026 Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т Тип машины - Тент',
      capturedAt: '2026-06-16T17:00:00.000Z',
      loadDate: '2026-06-16'
    }
  ];

  const routeResults = searchLoads(oldBadSavedLoad, 'Brasov Cahul', { baseDate });
  assert.deepEqual(routeResults.map((load) => load.id), [11]);
  assert.equal(routeResults[0].loadCity, 'Brasov');
  assert.equal(routeResults[0].loadCountry, 'Romania');
  assert.equal(routeResults[0].unloadCity, 'Cahul');
  assert.equal(routeResults[0].unloadCountry, 'Moldova');

  assert.deepEqual(searchLoads(oldBadSavedLoad, 'Romania Germania', { baseDate }), []);
  assert.deepEqual(searchLoads(oldBadSavedLoad, 'Moldova 23t', { baseDate }).map((load) => load.id), [11]);
});

test('matches relative date query', () => {
  const results = searchLoads(loads, 'Frigo Austria maine', { baseDate });
  assert.deepEqual(results.map((load) => load.id), [3]);
});
