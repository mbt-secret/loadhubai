import assert from 'node:assert/strict';
import test from 'node:test';
import { GEOTRANS_SOURCE_NAME, mapGeotransCargoItem } from '../src/server/geotrans.mjs';

test('maps a GeoTrans cargo item to a local load message with structured route data', () => {
  const message = mapGeotransCargoItem({
    itemId: 7200257,
    refDate: '2026-06-16T20:17:50.000Z',
    from: {
      countryName: 'ROMANIA',
      countryAbbr: 'RO',
      city: 'Ploiesti',
      date: '2026-06-17T00:00:00.000Z'
    },
    to: {
      countryName: 'MOLDOVA',
      countryAbbr: 'MD',
      city: 'Chisinau',
      date: '2026-06-20T00:00:00.000Z'
    },
    cargo: {
      name: 'Bauturi nealcoolice',
      price: '800 EUR',
      weight: 20,
      weightUnit: 't',
      volume: '86',
      volumeUnit: 'm3',
      info: 'prelata'
    },
    transportTypes: ['138'],
    userFullName: 'Ion Test',
    companyName: 'Test SRL'
  });

  assert.equal(message.groupName, GEOTRANS_SOURCE_NAME);
  assert.equal(message.whatsappMessageId, 'geotrans:7200257');
  assert.equal(message.parsedPatch.loadCity, 'Ploiesti');
  assert.equal(message.parsedPatch.loadCountry, 'Romania');
  assert.equal(message.parsedPatch.unloadCity, 'Chisinau');
  assert.equal(message.parsedPatch.unloadCountry, 'Moldova');
  assert.equal(typeof message.parsedPatch.loadLat, 'number');
  assert.equal(typeof message.parsedPatch.loadLon, 'number');
  assert.ok(Math.abs(message.parsedPatch.unloadLat - 47.0105) < 0.01);
  assert.equal(message.parsedPatch.loadDate, '2026-06-17');
  assert.equal(message.parsedPatch.truckType, 'Prelata');
  assert.equal(message.parsedPatch.weightTons, 20);
  assert.equal(message.parsedPatch.price, '800 EUR');
  assert.match(message.text, /Incarcare: Ploiesti, Romania/);
  assert.match(message.text, /Descarcare: Chisinau, Moldova/);
});
