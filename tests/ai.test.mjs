import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeMessage, detectLanguage, translateLocally } from '../src/server/ai.mjs';

test('detects non-Romanian load messages', () => {
  assert.equal(detectLanguage('Load Arad to Germany tomorrow 24t curtain'), 'en');
  assert.equal(detectLanguage('Ladung Arad Deutschland morgen 24t Plane'), 'de');
  assert.equal(detectLanguage('Груз Место погр. - UA Sumy Место разгр. - MD Orhei Вес - 23.0 т'), 'ru');
  assert.equal(
    detectLanguage(
      'Груз Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т https://cargo.md/loads#incarcare-view?abc'
    ),
    'ru'
  );
});

test('translates common freight terms locally', () => {
  const translated = translateLocally('Load Arad Germany tomorrow 24t curtain price 2400 EUR');
  assert.match(translated, /incarcare/i);
  assert.match(translated, /maine/i);
  assert.match(translated, /prelata/i);
  assert.match(translated, /pret/i);
});

test('translates russian freight terms without partial word damage', () => {
  const translated = translateLocally(
    'Груз Дата погр. - 16-06-2026 Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т Тип машины - Тент Тип загрузки - Полная (FTL) Фрахт - EUR Комментарий - Детал https://cargo.md/loads#incarcare-view?abc'
  );

  assert.match(translated, /marfa/i);
  assert.match(translated, /loc incarcare/i);
  assert.match(translated, /loc descarcare/i);
  assert.match(translated, /tip camion/i);
  assert.match(translated, /tip incarcare/i);
  assert.match(translated, /completa/i);
  assert.match(translated, /pret transport/i);
  assert.match(translated, /detalii/i);
  assert.doesNotMatch(translated, /заmarfa|загрузки/i);
  assert.doesNotMatch(translated, /https?:\/\//i);
});

test('analyzes foreign message with local AI fallback', async () => {
  const result = await analyzeMessage('Load Arad Germany tomorrow 24t curtain price 2400 EUR', {
    aiEnabled: false,
    aiMode: 'local'
  });

  assert.equal(result.detectedLanguage, 'en');
  assert.equal(result.aiProvider, 'local');
  assert.match(result.translatedText, /incarcare/i);
  assert.equal(result.parsed.loadCity, 'Arad');
  assert.equal(result.parsed.unloadCountry, 'Germania');
  assert.equal(result.parsed.truckType, 'Prelata');
  assert.equal(result.parsed.weightTons, 24);
});

test('analyzes russian cargo fields from original message', async () => {
  const result = await analyzeMessage(
    'Груз Дата погр. - 18-06-2026 Место погр. - UA Sumy Место разгр. - MD Drumul de acces spre satul Boldurești-G94 Вес - 23.0 т / объем - 86.0 м3 Тип машины - Тент Номер тел. - +37368593504',
    {
      aiEnabled: false,
      aiMode: 'local'
    }
  );

  assert.equal(result.detectedLanguage, 'ru');
  assert.equal(result.parsed.loadCity, 'Sumy');
  assert.equal(result.parsed.loadCountry, 'Ucraina');
  assert.equal(result.parsed.unloadCountry, 'Moldova');
  assert.equal(result.parsed.truckType, 'Prelata');
  assert.equal(result.parsed.weightTons, 23);
  assert.equal(result.parsed.contact, '+37368593504');
});

test('analyzes screenshot RO-MD cargo fields as Romanian translation and local route', async () => {
  const result = await analyzeMessage(
    'Груз Дата погр. - 16-06-2026 Место погр. - RO Brasov Место разгр. - MD Cahul Вес - 23.0 т / объем - 0 м3 Тип машины - Тент Тип загрузки - Полная (FTL) Фрахт - EUR Комментарий - Детал ... https://cargo.md/loads#incarcare-view?ef3254c541d74faaa5c005a4783c82c4',
    {
      aiEnabled: false,
      aiMode: 'local'
    }
  );

  assert.equal(result.detectedLanguage, 'ru');
  assert.match(result.translatedText, /loc incarcare - RO Brasov/i);
  assert.match(result.translatedText, /loc descarcare - MD Cahul/i);
  assert.equal(result.parsed.loadCity, 'Brasov');
  assert.equal(result.parsed.loadCountry, 'Romania');
  assert.equal(result.parsed.unloadCity, 'Cahul');
  assert.equal(result.parsed.unloadCountry, 'Moldova');
  assert.match(result.aiSummary, /Brasov, Romania -> Cahul, Moldova/);
});
