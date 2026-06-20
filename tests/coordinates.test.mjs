import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveKnownCoordinates } from '../src/server/coordinates.mjs';

test('resolves known city coordinates with noisy names', () => {
  const coords = resolveKnownCoordinates('Istanbul (european Side)', 'Turcia');
  assert.equal(typeof coords?.lat, 'number');
  assert.equal(typeof coords?.lon, 'number');
  assert.ok(Math.abs(coords.lat - 41.0082) < 0.01);
});

test('falls back to country coordinates when city is unknown', () => {
  const coords = resolveKnownCoordinates('Sat necunoscut', 'Romania');
  assert.equal(typeof coords?.lat, 'number');
  assert.equal(typeof coords?.lon, 'number');
});
