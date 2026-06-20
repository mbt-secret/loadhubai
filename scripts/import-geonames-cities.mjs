import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { openDatabase, updateSettings } from '../src/server/db.mjs';
import {
  COUNTRY_NAMES_RO,
  EUROPE_TRANSPORT_COUNTRIES,
  insertPlacesBulk
} from '../src/server/places.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(rootDir, 'data', 'geonames');
const defaultZipPath = resolve(dataDir, 'cities1000.zip');
const sourceUrl = 'https://download.geonames.org/export/dump/cities1000.zip';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function downloadIfNeeded(targetPath) {
  if (existsSync(targetPath)) return targetPath;
  mkdirSync(dirname(targetPath), { recursive: true });
  console.log(`Descarc ${sourceUrl}`);
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Nu pot descarca GeoNames: HTTP ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(targetPath));
  return targetPath;
}

function findZipEntry(buffer, expectedName = 'cities1000.txt') {
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Arhiva zip nu are director central valid.');

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Intrare zip invalida.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name === expectedName || name.endsWith(`/${expectedName}`)) {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Header local zip invalid.');
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return compressed.toString('utf8');
      if (method === 8) return inflateRawSync(compressed).toString('utf8');
      throw new Error(`Metoda zip ${method} nu este suportata.`);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`${expectedName} nu exista in arhiva.`);
}

function readSourceText(sourcePath) {
  const buffer = readFileSync(sourcePath);
  if (sourcePath.toLowerCase().endsWith('.zip')) {
    return findZipEntry(buffer);
  }
  return buffer.toString('utf8');
}

function parseGeonames(text) {
  const selectedCountries = new Set(EUROPE_TRANSPORT_COUNTRIES);
  const places = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const columns = line.split('\t');
    const countryCode = columns[8];
    if (!selectedCountries.has(countryCode)) continue;

    const featureClass = columns[6];
    if (featureClass !== 'P') continue;

    const name = columns[1];
    const asciiName = columns[2];
    const aliases = columns[3] ? columns[3].split(',').filter(Boolean).slice(0, 40) : [];
    const population = Number(columns[14] || 0);
    if (population < 1000) continue;

    places.push({
      geonameId: Number(columns[0]),
      name,
      asciiName,
      countryCode,
      countryName: COUNTRY_NAMES_RO[countryCode] || countryCode,
      lat: Number(columns[4]),
      lon: Number(columns[5]),
      population,
      aliases,
      source: 'geonames'
    });
  }

  return places;
}

const dbPath = argValue('--db') || process.env.LOADHUB_DB_PATH;
const explicitSource = argValue('--source');
const sourcePath = explicitSource ? resolve(explicitSource) : await downloadIfNeeded(defaultZipPath);
const text = readSourceText(sourcePath);
const places = parseGeonames(text);

if (!places.length) {
  throw new Error('Nu am gasit orase GeoNames pentru import.');
}

const db = openDatabase(dbPath);
insertPlacesBulk(db, places, { clearSource: 'geonames' });
updateSettings(db, {
  placesImportedAt: new Date().toISOString(),
  placesImportedCount: places.length
});

console.log(`Import finalizat: ${places.length} orase. Reporneste serverul pentru indexul parserului.`);
