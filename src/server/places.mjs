import { setPlaceEntries, normalizeText } from './parser.mjs';

export const EUROPE_TRANSPORT_COUNTRIES = [
  'AD', 'AL', 'AM', 'AT', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ',
  'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE',
  'IS', 'IT', 'KZ', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT',
  'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR',
  'UA', 'VA', 'XK'
];

export const COUNTRY_NAMES_RO = {
  AD: 'Andorra',
  AL: 'Albania',
  AM: 'Armenia',
  AT: 'Austria',
  AZ: 'Azerbaidjan',
  BA: 'Bosnia si Hertegovina',
  BE: 'Belgia',
  BG: 'Bulgaria',
  BY: 'Belarus',
  CH: 'Elvetia',
  CY: 'Cipru',
  CZ: 'Cehia',
  DE: 'Germania',
  DK: 'Danemarca',
  EE: 'Estonia',
  ES: 'Spania',
  FI: 'Finlanda',
  FR: 'Franta',
  GB: 'Regatul Unit',
  GE: 'Georgia',
  GR: 'Grecia',
  HR: 'Croatia',
  HU: 'Ungaria',
  IE: 'Irlanda',
  IS: 'Islanda',
  IT: 'Italia',
  KZ: 'Kazahstan',
  LI: 'Liechtenstein',
  LT: 'Lituania',
  LU: 'Luxemburg',
  LV: 'Letonia',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Muntenegru',
  MK: 'Macedonia de Nord',
  MT: 'Malta',
  NL: 'Olanda',
  NO: 'Norvegia',
  PL: 'Polonia',
  PT: 'Portugalia',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Rusia',
  SE: 'Suedia',
  SI: 'Slovenia',
  SK: 'Slovacia',
  SM: 'San Marino',
  TR: 'Turcia',
  UA: 'Ucraina',
  VA: 'Vatican',
  XK: 'Kosovo'
};

const MANUAL_CITY_ALIASES = {
  Bucuresti: ['Bucharest', 'București'],
  Munchen: ['Munich', 'Muenchen', 'München'],
  Kyiv: ['Kiev', 'Kiyev'],
  Chisinau: ['Chișinău', 'Chisinău', 'Kishinev', 'Kishineu'],
  Brasov: ['Brașov', 'Kronstadt'],
  Tbilisi: ['Tiflis'],
  Istanbul: ['Stambul'],
  Vienna: ['Wien', 'Viena'],
  Prague: ['Praha', 'Praga'],
  Warsaw: ['Warszawa', 'Varsovia'],
  Krakow: ['Kraków', 'Cracovia'],
  Cologne: ['Koln', 'Koeln', 'Köln'],
  Nuremberg: ['Nurnberg', 'Nuernberg', 'Nürnberg'],
  Milan: ['Milano'],
  Rome: ['Roma'],
  Turin: ['Torino'],
  Naples: ['Napoli']
};

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueAliases(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizedAliasBlob(values) {
  return uniqueAliases(values).map((value) => normalizeText(value)).join('|');
}

export function countryNameFromCode(code) {
  const normalized = String(code || '').toUpperCase();
  return COUNTRY_NAMES_RO[normalized] || normalized;
}

export function normalizePlaceRecord(place) {
  const name = String(place.name || '').trim();
  const asciiName = String(place.asciiName || place.ascii_name || name).trim();
  const countryCode = String(place.countryCode || place.country_code || '').toUpperCase();
  const countryName = place.countryName || place.country_name || countryNameFromCode(countryCode);
  const manualAliases = MANUAL_CITY_ALIASES[name] || MANUAL_CITY_ALIASES[asciiName] || [];
  const aliases = uniqueAliases([name, asciiName, ...(place.aliases || []), ...manualAliases]);

  return {
    geonameId: place.geonameId ?? place.geoname_id ?? null,
    name,
    asciiName,
    countryCode,
    countryName,
    lat: place.lat ?? null,
    lon: place.lon ?? null,
    population: Number(place.population || 0),
    aliases,
    normalizedAliases: normalizedAliasBlob(aliases),
    source: place.source || 'manual'
  };
}

function rowToPlace(row) {
  if (!row) return null;
  const aliases = parseJsonArray(row.aliases);
  return {
    id: row.id,
    geonameId: row.geoname_id,
    name: row.name,
    asciiName: row.ascii_name,
    label: row.name,
    code: row.country_code,
    type: 'city',
    countryCode: row.country_code,
    countryName: row.country_name,
    lat: row.lat,
    lon: row.lon,
    population: row.population || 0,
    aliases,
    verified: true,
    keywords: uniqueAliases([row.name, row.ascii_name, row.country_name, row.country_code, ...aliases]).join(' ')
  };
}

function countryOption(code) {
  const name = countryNameFromCode(code);
  return {
    label: name,
    code,
    type: 'country',
    countryCode: code,
    countryName: name,
    verified: true,
    keywords: `${name} ${code}`
  };
}

export function upsertPlace(db, input) {
  const place = normalizePlaceRecord(input);
  if (!place.name || !place.countryCode) return null;

  const now = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO places (
      geoname_id, name, ascii_name, country_code, country_name, lat, lon,
      population, aliases, normalized_aliases, source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(geoname_id) DO UPDATE SET
      name = excluded.name,
      ascii_name = excluded.ascii_name,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      lat = excluded.lat,
      lon = excluded.lon,
      population = excluded.population,
      aliases = excluded.aliases,
      normalized_aliases = excluded.normalized_aliases,
      source = excluded.source,
      updated_at = excluded.updated_at
  `);

  const result = statement.run(
    place.geonameId,
    place.name,
    place.asciiName,
    place.countryCode,
    place.countryName,
    place.lat,
    place.lon,
    place.population,
    JSON.stringify(place.aliases),
    place.normalizedAliases,
    place.source,
    now
  );

  const id = place.geonameId
    ? db.prepare('SELECT id FROM places WHERE geoname_id = ?').get(place.geonameId)?.id
    : result.lastInsertRowid;
  reindexPlace(db, id);
  return id;
}

export function reindexPlace(db, id) {
  if (!id) return;
  const row = db.prepare('SELECT * FROM places WHERE id = ?').get(id);
  if (!row) return;
  db.prepare('DELETE FROM places_fts WHERE place_id = ?').run(id);
  db.prepare(`
    INSERT INTO places_fts (place_id, name, ascii_name, country_name, aliases)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, row.name, row.ascii_name || '', row.country_name || '', parseJsonArray(row.aliases).join(' '));
}

export function insertPlacesBulk(db, places, { clearSource = 'geonames' } = {}) {
  const now = new Date().toISOString();
  const insertPlace = db.prepare(`
    INSERT INTO places (
      geoname_id, name, ascii_name, country_code, country_name, lat, lon,
      population, aliases, normalized_aliases, source, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(geoname_id) DO UPDATE SET
      name = excluded.name,
      ascii_name = excluded.ascii_name,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      lat = excluded.lat,
      lon = excluded.lon,
      population = excluded.population,
      aliases = excluded.aliases,
      normalized_aliases = excluded.normalized_aliases,
      source = excluded.source,
      updated_at = excluded.updated_at
  `);

  db.exec('BEGIN');
  try {
    if (clearSource) {
      db.prepare('DELETE FROM places_fts WHERE place_id IN (SELECT id FROM places WHERE source = ?)').run(clearSource);
      db.prepare('DELETE FROM places WHERE source = ?').run(clearSource);
    }
    for (const record of places) {
      const place = normalizePlaceRecord(record);
      if (!place.name || !place.countryCode) continue;
      insertPlace.run(
        place.geonameId,
        place.name,
        place.asciiName,
        place.countryCode,
        place.countryName,
        place.lat,
        place.lon,
        place.population,
        JSON.stringify(place.aliases),
        place.normalizedAliases,
        place.source,
        now
      );
    }
    db.prepare('DELETE FROM places_fts').run();
    db.prepare(`
      INSERT INTO places_fts (place_id, name, ascii_name, country_name, aliases)
      SELECT id, name, COALESCE(ascii_name, ''), country_name, aliases
      FROM places
    `).run();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function searchCountryOptions(query, limit) {
  const normalized = normalizeText(query);
  return EUROPE_TRANSPORT_COUNTRIES
    .map(countryOption)
    .filter((option) => {
      if (!normalized) return true;
      return normalizeText(`${option.label} ${option.code}`).includes(normalized);
    })
    .slice(0, limit);
}

function buildFtsQuery(query) {
  const tokens = normalizeText(query)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/gi, ''))
    .filter((token) => token.length >= 2)
    .slice(0, 5);
  return tokens.length ? tokens.map((token) => `${token}*`).join(' AND ') : '';
}

export function searchPlaces(db, { q = '', type = 'city', limit = 50 } = {}) {
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  if (type === 'country') {
    return searchCountryOptions(q, cappedLimit);
  }
  if (type === 'postal') {
    return [];
  }

  const ftsQuery = buildFtsQuery(q);
  let rows = [];
  if (ftsQuery) {
    try {
      rows = db.prepare(`
        SELECT p.*
        FROM places_fts f
        JOIN places p ON p.id = f.place_id
        WHERE places_fts MATCH ?
        ORDER BY p.population DESC, p.name ASC
        LIMIT ?
      `).all(ftsQuery, cappedLimit);
    } catch {
      rows = [];
    }
  }

  if (!rows.length) {
    const normalized = normalizeText(q);
    if (normalized) {
      rows = db.prepare(`
        SELECT *
        FROM places
        WHERE normalized_aliases LIKE ?
           OR lower(country_name) LIKE lower(?)
           OR lower(country_code) = lower(?)
        ORDER BY population DESC, name ASC
        LIMIT ?
      `).all(`%${normalized}%`, `%${q}%`, q, cappedLimit);
    } else {
      rows = db.prepare(`
        SELECT *
        FROM places
        ORDER BY population DESC, name ASC
        LIMIT ?
      `).all(cappedLimit);
    }
  }

  return rows.map(rowToPlace).filter(Boolean);
}

export function listPlaceEntriesForParser(db) {
  const rows = db.prepare(`
    SELECT name, ascii_name, country_name, lat, lon, aliases
    FROM places
    ORDER BY population DESC, name ASC
  `).all();

  const entries = [];
  for (const row of rows) {
    const aliases = uniqueAliases([row.name, row.ascii_name, ...parseJsonArray(row.aliases)]).slice(0, 12);
    for (const alias of aliases) {
      entries.push({
        alias,
        city: row.name,
        country: row.country_name,
        cityVerified: true,
        lat: row.lat,
        lon: row.lon
      });
    }
  }
  return entries;
}

export function loadPlacesIntoParser(db) {
  const count = db.prepare('SELECT COUNT(*) as count FROM places').get()?.count || 0;
  if (!count) {
    setPlaceEntries([]);
    return { count: 0 };
  }
  const entries = listPlaceEntriesForParser(db);
  setPlaceEntries(entries);
  return { count, aliases: entries.length };
}

export function findPlaceCoordinates(db, cityName, countryName) {
  const normalized = normalizeText(cityName);
  if (!normalized) return null;
  const country = String(countryName || '').trim();
  const row = db.prepare(`
    SELECT lat, lon
    FROM places
    WHERE lat IS NOT NULL AND lon IS NOT NULL
      AND (
        '|' || normalized_aliases || '|' LIKE ?
        OR lower(name) = lower(?)
        OR lower(ascii_name) = lower(?)
      )
    ORDER BY (CASE WHEN lower(country_name) = lower(?) THEN 0 ELSE 1 END), population DESC
    LIMIT 1
  `).get(`%|${normalized}|%`, cityName, cityName, country);
  return row ? { lat: row.lat, lon: row.lon } : null;
}

export function placeStats(db) {
  const row = db.prepare(`
    SELECT COUNT(*) as count, COUNT(DISTINCT country_code) as countries
    FROM places
  `).get();
  return {
    count: row?.count || 0,
    countries: row?.countries || 0
  };
}
